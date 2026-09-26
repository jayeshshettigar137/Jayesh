/**
 * External integrations behind interfaces. Mock adapters are the default everywhere (deployment
 * stage 1, TRD §11); real adapters are opt-in by configuration.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  /** Provider-level idempotency so a retried send is never delivered twice. */
  idempotencyKey: string;
}

export interface EmailAdapter {
  readonly name: string;
  send(msg: EmailMessage): Promise<{ providerMessageId: string }>;
}

export interface PaymentLinkRequest {
  product: string;
  priceId?: string;
  amountCents: number;
  description: string;
  idempotencyKey: string;
}

export interface PaymentsAdapter {
  readonly name: string;
  createPaymentLink(req: PaymentLinkRequest): Promise<{ id: string; url: string; livemode: boolean }>;
}

export interface DeployAdapter {
  readonly name: string;
  deploy(env: "staging" | "production", ref: string): Promise<{ deploymentId: string }>;
}

export interface PublishAdapter {
  readonly name: string;
  publish(item: { id: string; channel: string; title: string; body: string }): Promise<{ url: string }>;
}

export interface TestRunnerAdapter {
  readonly name: string;
  run(suite: string): Promise<{ passed: number; failed: number }>;
}

export interface Adapters {
  email: EmailAdapter;
  payments: PaymentsAdapter;
  deploy: DeployAdapter;
  publish: PublishAdapter;
  tests: TestRunnerAdapter;
}

/** Records messages instead of delivering them. Dedupes by idempotency key like real providers. */
export class MockEmailAdapter implements EmailAdapter {
  readonly name = "mock-email";
  readonly outbox: (EmailMessage & { providerMessageId: string })[] = [];
  /** Set to simulate a provider outage. */
  failWith: Error | null = null;

  async send(msg: EmailMessage) {
    if (this.failWith) throw this.failWith;
    const existing = this.outbox.find((m) => m.idempotencyKey === msg.idempotencyKey);
    if (existing) return { providerMessageId: existing.providerMessageId };
    const providerMessageId = `mock_${this.outbox.length + 1}`;
    this.outbox.push({ ...msg, providerMessageId });
    return { providerMessageId };
  }
}

export class MockPaymentsAdapter implements PaymentsAdapter {
  readonly name = "mock-payments";
  readonly links: PaymentLinkRequest[] = [];
  failWith: Error | null = null;
  async createPaymentLink(req: PaymentLinkRequest) {
    if (this.failWith) throw this.failWith;
    this.links.push(req);
    return { id: `plink_mock_${this.links.length}`, url: `https://example.test/pay/${this.links.length}`, livemode: false };
  }
}

export class MockDeployAdapter implements DeployAdapter {
  readonly name = "mock-deploy";
  readonly deployments: { env: string; ref: string }[] = [];
  async deploy(env: "staging" | "production", ref: string) {
    this.deployments.push({ env, ref });
    return { deploymentId: `dep_mock_${this.deployments.length}` };
  }
}

export class MockPublishAdapter implements PublishAdapter {
  readonly name = "mock-publish";
  readonly published: { id: string; channel: string; title: string }[] = [];
  async publish(item: { id: string; channel: string; title: string; body: string }) {
    this.published.push({ id: item.id, channel: item.channel, title: item.title });
    return { url: `https://example.test/content/${item.id}` };
  }
}

export class MockTestRunner implements TestRunnerAdapter {
  readonly name = "mock-tests";
  async run() {
    return { passed: 1, failed: 0 };
  }
}

export function mockAdapters(): {
  email: MockEmailAdapter; payments: MockPaymentsAdapter; deploy: MockDeployAdapter;
  publish: MockPublishAdapter; tests: MockTestRunner;
} {
  return {
    email: new MockEmailAdapter(),
    payments: new MockPaymentsAdapter(),
    deploy: new MockDeployAdapter(),
    publish: new MockPublishAdapter(),
    tests: new MockTestRunner(),
  };
}
