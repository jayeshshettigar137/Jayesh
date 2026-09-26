"""Append-only audit log. Every agent, user, webhook, and system action goes through here."""

import json
import sqlite3

from .db import now

ACTOR_USER = "user"
ACTOR_AGENT = "agent"
ACTOR_WEBHOOK = "webhook"
ACTOR_SYSTEM = "system"


def log(
    conn: sqlite3.Connection,
    workspace_id: int | None,
    actor_type: str,
    actor_id: str | int,
    action: str,
    entity_type: str = "",
    entity_id: str | int = "",
    **details,
) -> None:
    conn.execute(
        "INSERT INTO audit_log (workspace_id, actor_type, actor_id, action, entity_type, entity_id,"
        " details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (
            workspace_id,
            actor_type,
            str(actor_id),
            action,
            entity_type,
            str(entity_id),
            json.dumps(details, default=str, sort_keys=True),
            now(),
        ),
    )


def entries(conn: sqlite3.Connection, workspace_id: int, limit: int = 200, entity: tuple[str, str] | None = None):
    sql = "SELECT * FROM audit_log WHERE workspace_id = ?"
    args: list = [workspace_id]
    if entity:
        sql += " AND entity_type = ? AND entity_id = ?"
        args += [entity[0], str(entity[1])]
    sql += " ORDER BY id DESC LIMIT ?"
    args.append(limit)
    return conn.execute(sql, args).fetchall()
