import sys
from pathlib import Path
import uvicorn

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import SERVER_HOST, SERVER_PORT

if __name__ == "__main__":

    print(f" Starting Stackly Backend Server")
    print(f" URL: http://localhost:{SERVER_PORT}")
    print(f" API Docs: http://localhost:{SERVER_PORT}/docs")
    print(f" Database: MySQL (homenest_db)")

    uvicorn.run("backend.main:app", host=SERVER_HOST, port=SERVER_PORT, reload=True)
