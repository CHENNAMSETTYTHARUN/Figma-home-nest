from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.database import init_db
from backend.routes.auth_routes import router as auth_router
from backend.routes.inquiry_routes import router as inquiry_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Initializing MySQL Database...")
    init_db()
    yield
    print("[Shutdown] Server shutting down...")

app = FastAPI(
    title="Stackly Real Estate - Backend API",
    description="FastAPI backend with MySQL database storing user login, registration, and inquiry messages.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(inquiry_router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "Stackly Backend", "database": "MySQL"}

BASE_DIR = Path(__file__).resolve().parent.parent

css_dir = BASE_DIR / "css"
js_dir = BASE_DIR / "js"
img_dir = BASE_DIR / "img"

if css_dir.exists():
    app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
if js_dir.exists():
    app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")
if img_dir.exists():
    app.mount("/img", StaticFiles(directory=str(img_dir)), name="img")

def serve_html(filename: str):
    file_path = BASE_DIR / filename
    if file_path.exists():
        return FileResponse(str(file_path))
    return {"error": f"Page '{filename}' not found"}

@app.get("/", tags=["Pages"])
def serve_index():
    return serve_html("index.html")

@app.get("/{page_name}.html", tags=["Pages"])
def serve_page(page_name: str):
    return serve_html(f"{page_name}.html")
