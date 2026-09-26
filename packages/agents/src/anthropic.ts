import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { LlmUnavailableError, type LlmProvider, type LlmRequest, type LlmResponse } from "./provider";

/** USD per million tokens (input, output). Claude Opus 5.5 list price. */
const PRICING: Record<string, [number, number]> = { "claude-opus-5-5": [4, 20] };

/**
 * Claude via the Anthropic API. Structured output keeps responses on-contract; the server-side
 * fallback chain answers when this model declines, so a refusal doesn't silently drop a lead.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(
    readonly model = "claude-opus-5-5",
    private readonly effort: "low" | "medium" | "high" = "low",
    client?: Anthropic,
  ) {
    this.client = client ?? new Anthropic();
  }

  async complete<T>(req: LlmRequest<T>): Promise<LlmResponse<T>> {
    let response;
    try {
      response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: req.maxTokens ?? 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: {
          effort: this.effort,
          format: { type: "json_schema", schema: jsonSchemaFor(req.schema) },
        },
        system: req.system,
        messages: [{ role: "user", content: req.user }],
      });
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError
        || err instanceof Anthropic.APIConnectionError) {
        throw new LlmUnavailableError(`anthropic unavailable: ${err.message}`, true);
      }
      if (err instanceof Anthropic.APIError) {
        throw new LlmUnavailableError(`anthropic error ${err.status}: ${err.message}`, false);
      }
      throw err;
    }
    if (response.stop_reason === "refusal") throw new LlmUnavailableError("model declined the request", false);
    if (response.stop_reason === "max_tokens") throw new LlmUnavailableError("response truncated", true);

    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new LlmUnavailableError("response was not valid JSON", true);
    }
    const parsed = req.schema.safeParse(json);
    if (!parsed.success) throw new LlmUnavailableError("response failed the output contract", true);

    const [inPrice, outPrice] = PRICING[this.model] ?? [4, 20];
    const { input_tokens, output_tokens } = response.usage;
    return {
      data: parsed.data,
      rawText: text,
      provider: this.name,
      model: response.model,
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      costUsd: (input_tokens * inPrice + output_tokens * outPrice) / 1_000_000,
    };
  }
}

function jsonSchemaFor(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  return rest;
}
