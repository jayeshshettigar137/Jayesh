import pg from "pg";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A transaction handle. All domain SQL runs through one of these. */
export class Tx {
  constructor(
    private readonly client: pg.PoolClient,
    /** The workspace this transaction is scoped to (RLS), or null for system transactions. */
    readonly workspaceId: string | null,
  ) {}

  async rows<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R[]> {
    const res = await this.client.query(sql, params);
    return res.rows as R[];
  }

  async maybeOne<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R | null> {
    const rows = await this.rows<R>(sql, params);
    return rows[0] ?? null;
  }

  async one<R = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<R> {
    const row = await this.maybeOne<R>(sql, params);
    if (!row) throw new Error("expected one row, got none");
    return row;
  }

  async exec(sql: string, params: unknown[] = []): Promise<number> {
    const res = await this.client.query(sql, params);
    return res.rowCount ?? 0;
  }
}

export class Db {
  constructor(readonly pool: pg.Pool) {}

  static connect(url: string, max = 10): Db {
    return new Db(new pg.Pool({ connectionString: url, max }));
  }

  /**
   * Run `fn` in a transaction scoped to one workspace. Row-level security limits every
   * statement to that workspace's rows, whatever the SQL says.
   */
  async withWorkspace<T>(workspaceId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    if (!UUID_RE.test(workspaceId)) throw new Error("invalid workspace id");
    return this.transaction(workspaceId, fn);
  }

  /** Run `fn` with no workspace scope: only system tables and definer functions are visible. */
  async system<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.transaction(null, fn);
  }

  private async transaction<T>(workspaceId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.workspace_id', $1, true)", [workspaceId ?? ""]);
      const result = await fn(new Tx(client, workspaceId));
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
