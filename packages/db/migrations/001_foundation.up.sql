-- RelayOS foundation schema (TRD §4).
-- Isolation model: every customer-owned table carries workspace_id and has a row-level
-- security policy keyed on the per-transaction setting app.workspace_id. The app connects
-- as relayos_app (no BYPASSRLS), so a query that forgets a WHERE clause still cannot see
-- another workspace's rows.

CREATE OR REPLACE FUNCTION current_workspace_id() RETURNS uuid
LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.workspace_id', true), '')::uuid $$;

CREATE TABLE workspaces (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    niche text NOT NULL DEFAULT 'hvac',
    business_profile text NOT NULL DEFAULT '',
    approved_facts jsonb NOT NULL DEFAULT '[]',
    reply_to text NOT NULL DEFAULT '',
    intake_token text NOT NULL UNIQUE,
    subscription_status text NOT NULL DEFAULT 'none',
    stripe_customer_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Global identities. Access to workspaces is granted only through memberships.
CREATE TABLE users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE CHECK (email = lower(email)),
    name text NOT NULL DEFAULT '',
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leads (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    phone text NOT NULL DEFAULT '',
    address text NOT NULL DEFAULT '',
    service text NOT NULL DEFAULT '',
    message text NOT NULL DEFAULT '',
    source text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'booked', 'lost')),
    category text NOT NULL DEFAULT '',
    urgency text NOT NULL DEFAULT 'unknown',
    summary text NOT NULL DEFAULT '',
    checklist jsonb NOT NULL DEFAULT '[]',
    unsubscribed_at timestamptz,
    first_response_at timestamptz,
    booked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_ws_created ON leads (workspace_id, created_at DESC);

CREATE TABLE lead_events (
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    type text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}',
    actor_type text NOT NULL,
    actor_id text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lead_events_lead ON lead_events (lead_id, id);

CREATE TABLE approvals (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tool text NOT NULL,
    payload jsonb NOT NULL,
    payload_hash text NOT NULL,
    risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'consumed', 'expired')),
    requested_by_type text NOT NULL,
    requested_by_id text NOT NULL,
    decided_by uuid REFERENCES users(id),
    decided_at timestamptz,
    decision_note text NOT NULL DEFAULT '',
    consumed_at timestamptz,
    subject_type text NOT NULL DEFAULT '',
    subject_id text NOT NULL DEFAULT '',
    correlation_id text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX approvals_ws_status ON approvals (workspace_id, status, created_at DESC);

CREATE TABLE tasks (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    task_type text NOT NULL,
    objective text NOT NULL,
    business_line text NOT NULL CHECK (business_line IN ('relayflow', 'relayops', 'relaylab')),
    risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    inputs jsonb NOT NULL DEFAULT '{}',
    expected_output_schema jsonb NOT NULL DEFAULT '{}',
    success_metric text NOT NULL,
    deadline timestamptz NOT NULL,
    requires_approval boolean NOT NULL,
    max_cost_usd numeric(10, 4) NOT NULL CHECK (max_cost_usd >= 0),
    owner text NOT NULL,
    status text NOT NULL DEFAULT 'idea',
    output jsonb,
    cost_usd numeric(10, 4) NOT NULL DEFAULT 0,
    attempts integer NOT NULL DEFAULT 0,
    last_error text NOT NULL DEFAULT '',
    approval_id uuid REFERENCES approvals(id),
    correlation_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_ws_status ON tasks (workspace_id, status);

CREATE TABLE agent_runs (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    task_id uuid REFERENCES tasks(id),
    agent text NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed')),
    input jsonb NOT NULL DEFAULT '{}',
    output jsonb,
    error text NOT NULL DEFAULT '',
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
    correlation_id text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
);
CREATE INDEX agent_runs_ws ON agent_runs (workspace_id, started_at DESC);

-- Full prompt/response transcript so every agent run can be replayed or explained.
CREATE TABLE agent_messages (
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    agent_run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tool_calls (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    tool text NOT NULL,
    actor_type text NOT NULL,
    actor_id text NOT NULL,
    input jsonb NOT NULL,
    input_hash text NOT NULL,
    dry_run boolean NOT NULL DEFAULT false,
    status text NOT NULL
        CHECK (status IN ('running', 'succeeded', 'failed', 'denied', 'pending_approval', 'dry_run')),
    reason text NOT NULL DEFAULT '',
    output jsonb,
    error text NOT NULL DEFAULT '',
    idempotency_key text,
    approval_id uuid REFERENCES approvals(id),
    correlation_id text NOT NULL,
    cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
);
CREATE INDEX tool_calls_ws_created ON tool_calls (workspace_id, tool, created_at DESC);
-- At most one in-flight or successful execution per idempotency key.
CREATE UNIQUE INDEX tool_calls_idempotency ON tool_calls (workspace_id, tool, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND status IN ('running', 'succeeded');

CREATE TABLE outbound_messages (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    channel text NOT NULL DEFAULT 'email',
    to_addr text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'sent', 'rejected', 'failed', 'cancelled')),
    flags jsonb NOT NULL DEFAULT '[]',
    created_by_type text NOT NULL,
    created_by_id text NOT NULL,
    agent_run_id uuid REFERENCES agent_runs(id),
    approval_id uuid REFERENCES approvals(id),
    provider_message_id text,
    error text NOT NULL DEFAULT '',
    correlation_id text NOT NULL,
    sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbound_ws_status ON outbound_messages (workspace_id, status);

-- Append-only: the app role gets SELECT and INSERT only (see grants below).
CREATE TABLE audit_events (
    id bigserial PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_type text NOT NULL CHECK (actor_type IN ('user', 'agent', 'system', 'webhook', 'public')),
    actor_id text NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL DEFAULT '',
    entity_id text NOT NULL DEFAULT '',
    approval_id uuid,
    correlation_id text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_ws ON audit_events (workspace_id, id DESC);
CREATE INDEX audit_correlation ON audit_events (correlation_id);

-- Durable job queue (system table; payloads carry workspace_id).
CREATE TABLE jobs (
    id uuid PRIMARY KEY,
    type text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'dead')),
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL DEFAULT 5,
    run_at timestamptz NOT NULL DEFAULT now(),
    locked_at timestamptz,
    last_error text NOT NULL DEFAULT '',
    idempotency_key text UNIQUE,
    correlation_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_due ON jobs (status, run_at);

-- Company-level sales (RelayLab products, RelayOps payment links). Not customer-owned.
CREATE TABLE orders (
    id uuid PRIMARY KEY,
    product text NOT NULL,
    stripe_session_id text UNIQUE,
    customer_email text NOT NULL DEFAULT '',
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'usd',
    status text NOT NULL,
    livemode boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Row-level security on every workspace-owned table.
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON workspaces
    USING (id = current_workspace_id()) WITH CHECK (id = current_workspace_id());

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['memberships', 'leads', 'lead_events', 'approvals', 'tasks', 'agent_runs',
                             'agent_messages', 'tool_calls', 'outbound_messages', 'audit_events']
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY workspace_isolation ON %I USING (workspace_id = current_workspace_id())'
                       ' WITH CHECK (workspace_id = current_workspace_id())', t);
    END LOOP;
END $$;

-- Narrow, audited escape hatches for lookups that happen before a workspace is known.
CREATE FUNCTION resolve_intake_token(p_token text) RETURNS TABLE (id uuid, name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id, name, slug FROM workspaces WHERE intake_token = p_token
$$;

CREATE FUNCTION resolve_workspace_slug(p_slug text) RETURNS TABLE (id uuid, name text, niche text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id, name, niche FROM workspaces WHERE slug = p_slug
$$;

CREATE FUNCTION user_memberships(p_user uuid) RETURNS TABLE (workspace_id uuid, role text, workspace_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT m.workspace_id, m.role, w.name FROM memberships m JOIN workspaces w ON w.id = m.workspace_id
    WHERE m.user_id = p_user ORDER BY m.created_at
$$;

CREATE FUNCTION slug_taken(p_slug text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM workspaces WHERE slug = p_slug)
$$;

REVOKE ALL ON FUNCTION resolve_intake_token(text), resolve_workspace_slug(text), user_memberships(uuid),
    slug_taken(text) FROM PUBLIC;

-- Grants for the application role.
GRANT USAGE ON SCHEMA public TO relayos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON workspaces, users, memberships, sessions, leads, lead_events, approvals,
    tasks, agent_runs, agent_messages, tool_calls, outbound_messages, jobs, orders TO relayos_app;
GRANT SELECT, INSERT ON audit_events TO relayos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO relayos_app;
GRANT EXECUTE ON FUNCTION current_workspace_id(), resolve_intake_token(text), resolve_workspace_slug(text),
    user_memberships(uuid), slug_taken(text) TO relayos_app;
