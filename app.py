from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).parent


class IDEHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/":
            self.send_error(404)
            return
        page = (ROOT / "index.html").read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(page)))
        self.end_headers()
        self.wfile.write(page)

    def do_POST(self):
        if self.path != "/run":
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length))
            code = payload.get("code", "")
            with tempfile.TemporaryDirectory() as directory:
                result = subprocess.run(
                    [sys.executable, "-I", "-c", code],
                    cwd=directory,
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
            response = {"output": result.stdout + result.stderr, "code": result.returncode}
        except subprocess.TimeoutExpired:
            response = {"output": "Execution timed out after 5 seconds.", "code": 124}
        except (ValueError, json.JSONDecodeError) as error:
            response = {"output": f"Invalid request: {error}", "code": 400}
        except Exception as error:
            response = {"output": str(error), "code": 500}
        body = json.dumps(response).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), IDEHandler)
    print(f"Python IDE running at http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()