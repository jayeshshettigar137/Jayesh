import { z } from "zod";

export const RiskLevel = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const BusinessLine = z.enum(["relayflow", "relayops", "relaylab"]);
export type BusinessLine = z.infer<typeof BusinessLine>;

export const ActorType = z.enum(["user", "agent", "system", "webhook", "public"]);
export type ActorType = z.infer<typeof ActorType>;

/** Who is acting. Agents are identified by their role name (e.g. "relayflow.support_agent"). */
export interface Actor {
  type: ActorType;
  id: string;
}

/** Every side-effecting operation carries this context (TRD §4). */
export interface ActionContext {
  workspaceId: string;
  actor: Actor;
  correlationId: string;
}
