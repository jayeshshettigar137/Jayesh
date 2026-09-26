import os

import pytest

os.environ.setdefault("RELAYFLOW_AI_PROVIDER", "template")
os.environ.setdefault("RELAYFLOW_MAIL_MODE", "outbox")

from relayflow import db, service  # noqa: E402
from relayflow.config import Settings  # noqa: E402


@pytest.fixture
def settings(tmp_path):
    return Settings(database_path=str(tmp_path / "test.db"), secret_key="test-secret", ai_provider="template",
                    mail_mode="outbox", stripe_secret_key="", stripe_webhook_secret="whsec_test",
                    stripe_price_id="")


@pytest.fixture
def conn(settings):
    c = db.connect(settings.database_path)
    yield c
    c.close()


@pytest.fixture
def workspace(conn):
    ws, user_id = service.create_workspace(conn, "Cool Air HVAC", "owner@coolair.test", "Olive Owner",
                                           "correct horse battery")
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return ws, user
