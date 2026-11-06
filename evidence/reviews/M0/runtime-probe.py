"""Review-only probe. Does not modify product source or the user's .env."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
result = {"checkedAt": datetime.now(timezone.utc).isoformat(), "services": {}, "configuration": {}}
flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0

def port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]

def probe(name, command, cwd, request_path, environment=None):
    log_path = OUT / f"{name}.log"
    with log_path.open("w", encoding="utf-8") as log:
        proc = subprocess.Popen(command, cwd=cwd, env=environment, stdout=log, stderr=subprocess.STDOUT, creationflags=flags)
        try:
            base_port = command[command.index("--port") + 1]
            url = f"http://127.0.0.1:{base_port}{request_path}"
            deadline = time.monotonic() + 12
            last_error = ""
            while time.monotonic() < deadline:
                if proc.poll() is not None:
                    last_error = f"Process exited with {proc.returncode}"
                    break
                try:
                    with urllib.request.urlopen(url, timeout=1) as response:
                        body = response.read().decode("utf-8")
                        data = {"url": url, "status": response.status, "processStarted": True}
                        if name == "api":
                            data["payload"] = json.loads(body)
                            with urllib.request.urlopen(url.replace(request_path, "/openapi.json"), timeout=2) as spec:
                                data["routes"] = list(json.load(spec)["paths"])
                        else:
                            data["containsFoundationReady"] = "Foundation ready" in body
                        result["services"][name] = data
                        return
                except Exception as error:
                    last_error = repr(error)
                time.sleep(.15)
            result["services"][name] = {"error": last_error, "log": str(log_path.relative_to(ROOT))}
        finally:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=3)

env = dict(os.environ)
env.pop("MAISON_ENV", None)
env.pop("MAISON_CORS_ORIGINS", None)
env["PYTHONPATH"] = str(ROOT / "backend")
with tempfile.TemporaryDirectory(prefix="env-probe-", dir=OUT) as directory:
    Path(directory, ".env").write_text("MAISON_ENV=review_invalid_value\nMAISON_CORS_ORIGINS=http://review.invalid\n", encoding="utf-8")
    code = "import json; from app.main import _ENVIRONMENT,_read_cors_origins; print(json.dumps({'environment':_ENVIRONMENT,'cors':_read_cors_origins()}))"
    run = subprocess.run([sys.executable, "-c", code], cwd=directory, env=env, capture_output=True, text=True, timeout=15, creationflags=flags)
    result["configuration"]["dotenvOnly"] = {"exitCode": run.returncode, "stdout": run.stdout.strip(), "stderr": run.stderr.strip(), "envFile": "MAISON_ENV=review_invalid_value; MAISON_CORS_ORIGINS=http://review.invalid", "expectation": "If .env is loaded, invalid MAISON_ENV must fail; silently starting with defaults reproduces the review finding."}
    env["MAISON_ENV"] = "review_invalid_value"
    exported = subprocess.run([sys.executable, "-c", code], cwd=directory, env=env, capture_output=True, text=True, timeout=15, creationflags=flags)
    result["configuration"]["exportedEnvironment"] = {"exitCode": exported.returncode, "reportsInvalidEnvironment": "Invalid MAISON_ENV" in exported.stderr}
env.pop("MAISON_ENV", None)
api_port = port()
probe("api", [sys.executable, "-m", "uvicorn", "app.main:app", "--app-dir", str(ROOT / "backend"), "--host", "127.0.0.1", "--port", str(api_port)], ROOT, "/api/v1/health", env)
web_port = port()
probe("web", [shutil.which("node"), str(ROOT / "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", str(web_port)], ROOT / "apps/web", "/")
logo = ROOT / "assets/brand/lavish-logo-primary-294x294-rgb.png"
result["logo"] = {"path": str(logo.relative_to(ROOT)), "sha256": hashlib.sha256(logo.read_bytes()).hexdigest()}
files = ["package.json", "package-lock.json", "apps/web/package.json", "apps/web/tsconfig.json", "apps/web/next.config.mjs", "apps/web/app/layout.tsx", "apps/web/app/page.tsx", "backend/pyproject.toml", "backend/app/main.py", ".env.example", "scripts/check-contract.mjs", "contracts/openapi.json"]
result["reviewedSourceHashes"] = {file: hashlib.sha256((ROOT / file).read_bytes()).hexdigest() for file in files}
(OUT / "runtime-results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
