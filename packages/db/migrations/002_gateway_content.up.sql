-- Approvals record the tool category so approver permissions can be checked (money and
-- production need owner/admin). Content items back the draft/publish-after-approval tools.
ALTER TABLE approvals ADD COLUMN category text NOT NULL DEFAULT 'internal_write';

CREATE TABLE content_items (
    id uuid PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    business_line text NOT NULL DEFAULT 'relaylab',
    channel text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    cta text NOT NULL DEFAULT '',
    -- Researched claims keep their source URL and retrieval time (TRD §8).
    sources jsonb NOT NULL DEFAULT '[]',
    originality_confirmed boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'withdrawn')),
    published_url text,
    created_by_type text NOT NULL,
    created_by_id text NOT NULL,
    correlation_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
);
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_isolation ON content_items
    USING (workspace_id = current_workspace_id()) WITH CHECK (workspace_id = current_workspace_id());
GRANT SELECT, INSERT, UPDATE, DELETE ON content_items TO relayos_app;
