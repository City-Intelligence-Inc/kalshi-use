"""Append-only JSONL log for prediction analyses."""

import json
import os
from datetime import datetime, timezone

LOG_PATH = os.environ.get("PREDICTION_LOG_PATH", os.path.join(os.path.dirname(__file__), "prediction_log.jsonl"))


def log_prediction(data: dict) -> None:
    """Append one JSON line to the prediction log file.

    Adds a `logged_at` timestamp automatically.
    """
    entry = {**data, "logged_at": datetime.now(timezone.utc).isoformat()}
    with open(LOG_PATH, "a") as f:
        f.write(json.dumps(entry, default=str) + "\n")
