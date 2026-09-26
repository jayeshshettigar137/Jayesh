"""Runtime settings, read from environment variables."""

import os
from dataclasses import dataclass, field


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


@dataclass(frozen=True)
class Settings:
    database_path: str = field(default_factory=lambda: _env("RELAYFLOW_DB", "relayflow.db"))
    secret_key: str = field(default_factory=lambda: _env("RELAYFLOW_SECRET_KEY", "dev-insecure-change-me"))
    base_url: str = field(default_factory=lambda: _env("RELAYFLOW_BASE_URL", "http://localhost:8000"))
    secure_cookies: bool = field(default_factory=lambda: _env("RELAYFLOW_SECURE_COOKIES") == "1")

    # AI: "anthropic" uses Claude; "template" uses the deterministic offline drafter.
    ai_provider: str = field(
        default_factory=lambda: _env(
            "RELAYFLOW_AI_PROVIDER", "anthropic" if _env("ANTHROPIC_API_KEY") else "template"
        )
    )
    ai_model: str = field(default_factory=lambda: _env("RELAYFLOW_AI_MODEL", "claude-opus-5"))

    # Email: "outbox" records sends without delivering; "smtp" delivers via SMTP.
    mail_mode: str = field(default_factory=lambda: _env("RELAYFLOW_MAIL_MODE", "outbox"))
    smtp_host: str = field(default_factory=lambda: _env("SMTP_HOST"))
    smtp_port: int = field(default_factory=lambda: int(_env("SMTP_PORT", "587")))
    smtp_user: str = field(default_factory=lambda: _env("SMTP_USER"))
    smtp_password: str = field(default_factory=lambda: _env("SMTP_PASSWORD"))
    mail_from: str = field(default_factory=lambda: _env("MAIL_FROM", "RelayFlow <no-reply@example.com>"))

    # Stripe
    stripe_secret_key: str = field(default_factory=lambda: _env("STRIPE_SECRET_KEY"))
    stripe_webhook_secret: str = field(default_factory=lambda: _env("STRIPE_WEBHOOK_SECRET"))
    stripe_price_id: str = field(default_factory=lambda: _env("STRIPE_PRICE_ID"))

    @property
    def billing_enabled(self) -> bool:
        return bool(self.stripe_secret_key and self.stripe_price_id)


def load_settings() -> Settings:
    return Settings()
