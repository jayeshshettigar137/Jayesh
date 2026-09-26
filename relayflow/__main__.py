"""Operator CLI.

    python -m relayflow serve [--host 0.0.0.0] [--port 8000]
    python -m relayflow tick              # agent: prepare new leads, draft due follow-ups (never sends)
    python -m relayflow backup DEST.db    # consistent online backup of the database
"""

import argparse
import json
import os
import sys

from . import db, service
from .config import load_settings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="relayflow")
    sub = parser.add_subparsers(dest="cmd", required=True)
    serve = sub.add_parser("serve")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)
    sub.add_parser("tick")
    backup = sub.add_parser("backup")
    backup.add_argument("dest")
    args = parser.parse_args(argv)
    settings = load_settings()

    if args.cmd == "serve":
        import uvicorn

        from .app import create_app
        uvicorn.run(create_app(settings), host=args.host, port=args.port)
    elif args.cmd == "tick":
        conn = db.connect(settings.database_path)
        print(json.dumps(service.run_agent_tick(conn, settings)))
    elif args.cmd == "backup":
        if os.path.exists(args.dest):
            print(f"refusing to overwrite existing file {args.dest}", file=sys.stderr)
            return 1
        conn = db.connect(settings.database_path)
        db.backup(conn, args.dest)
        print(f"backed up {settings.database_path} -> {args.dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
