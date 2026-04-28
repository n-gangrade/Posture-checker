import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


def post_json(url, payload):
    """POST JSON `payload` to `url` and return the parsed JSON response.

    Raises underlying urllib exceptions on network or HTTP errors.
    """
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def read_row_count(csv_path):
    """Return the number of data rows in a CSV file, or 0 if missing/empty."""
    if not csv_path.exists() or csv_path.stat().st_size == 0:
        return 0

    with open(csv_path, newline="", encoding="utf-8") as csv_file:
        return sum(1 for _ in csv.DictReader(csv_file))


def read_last_row(csv_path):
    """Return the last data row from a CSV file as a dict, or None."""
    with open(csv_path, newline="", encoding="utf-8") as csv_file:
        rows = list(csv.DictReader(csv_file))
    if not rows:
        return None
    return rows[-1]


def main():
    """Run a smoke test that starts and ends a backend session and verifies CSV output."""
    parser = argparse.ArgumentParser(
        description="Tiny smoke test for backend CSV session persistence.",
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--username", default="smoke_test_user")
    parser.add_argument(
        "--csv-path",
        default=str(Path(__file__).resolve().parent / "session_stats.csv"),
    )
    args = parser.parse_args()

    csv_path = Path(args.csv_path)
    before_count = read_row_count(csv_path)
    print(f"CSV rows before test: {before_count}")

    try:
        start_response = post_json(
            f"{args.base_url}/start-session",
            {"username": args.username},
        )
        time.sleep(1)
        end_response = post_json(f"{args.base_url}/end-session", {})
    except urllib.error.URLError as exc:
        print(f"FAIL: Could not connect to backend at {args.base_url}: {exc}")
        return 1
    except urllib.error.HTTPError as exc:
        print(f"FAIL: Backend returned HTTP error {exc.code}: {exc.reason}")
        return 1

    start_session_id = start_response.get("session_id")
    summary = end_response.get("summary", {})
    end_session_id = summary.get("session_id")

    if not csv_path.exists():
        print(f"FAIL: CSV file not found at {csv_path}")
        return 1

    after_count = read_row_count(csv_path)
    print(f"CSV rows after test: {after_count}")
    if after_count < before_count + 1:
        print("FAIL: CSV row count did not increase by at least one.")
        return 1

    last_row = read_last_row(csv_path)
    if last_row is None:
        print("FAIL: CSV has no data rows.")
        return 1

    if start_session_id and end_session_id and start_session_id != end_session_id:
        print("FAIL: session_id mismatch between start and end responses.")
        return 1

    if end_session_id and last_row.get("session_id") != end_session_id:
        print("FAIL: Last CSV row session_id does not match ended session.")
        return 1

    if last_row.get("username") != args.username:
        print("FAIL: Last CSV row username does not match test username.")
        return 1

    print("PASS: Backend session data was appended to CSV successfully.")
    print(f"Verified session_id: {end_session_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())