#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt

echo "Starting FastAPI on http://localhost:8000 ..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!
trap "kill $API_PID 2>/dev/null || true" EXIT

sleep 2
echo "Starting Streamlit on http://localhost:8501 ..."
API_URL="http://localhost:8000" streamlit run frontend/app.py
