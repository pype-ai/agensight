from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import logging
from typing import Dict
from flask import Flask
from starlette.middleware.wsgi import WSGIMiddleware

# Import routers from route modules
from .routes.config import config_router, config_bp
from .routes.trace import trace_router, trace_bp
from .routes.prompt import prompt_router, prompt_bp
from .routes.metrics import metrics_router
from fastapi.responses import FileResponse
# Import data migration utility
from .migration_util import import_mock_data
# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Create FastAPI app
app = FastAPI(title="AgenSight API",debug=True)
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost","http://0.0.0.0","http://localhost:5001","http://0.0.0.0:3000","http://localhost:3000","http://0.0.0.0:5001","http://0.0.0.0:5000","http://localhost:5000"],  # Allow all origins
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
class NoCacheStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
# Register FastAPI routes
app.include_router(config_router, prefix="/api")
app.include_router(trace_router, prefix="/api")
app.include_router(prompt_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
# Create Flask app for backward compatibility
flask_app = Flask(__name__)
flask_app.register_blueprint(config_bp)
flask_app.register_blueprint(prompt_bp)
flask_app.register_blueprint(trace_bp)
# Mount Flask app for backward compatibility
# This allows both FastAPI and Flask routes to work
app.mount("/flask-compat", WSGIMiddleware(flask_app))
# Serve static files
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../_ui/out"))
if os.path.exists(os.path.join(static_dir, "_next")):
    app.mount("/_next", NoCacheStaticFiles(directory=os.path.join(static_dir, "_next"), html=True), name="next")
if os.path.exists(os.path.join(static_dir, "static")):
    app.mount("/static", NoCacheStaticFiles(directory=os.path.join(static_dir, "static"), html=True), name="static")
@app.get("/favicon.ico")
async def favicon():
    file_path = os.path.join(static_dir, "favicon.ico")
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return Response(status_code=404)
@app.get("/{page_name}")
async def serve_html_or_static(page_name: str):
    # Serve /foo as /foo.html if it exists
    html_file = os.path.join(static_dir, f"{page_name}.html")
    static_file = os.path.join(static_dir, page_name)
    if os.path.isfile(html_file):
        return FileResponse(html_file)
    if os.path.isfile(static_file):
        return FileResponse(static_file)
    return None
# --- SPA fallback for all other unmatched routes ---
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str, request: Request):
    return FileResponse(os.path.join(static_dir, "index.html"))
@app.on_event("startup")
async def startup_event():
    """Run startup tasks"""
    logger.info("Server starting up...")
    # Initialize the configuration system (file-based only)
    try:
        from .utils.config_utils import initialize_config, ensure_version_directory
        logger.info("Ensuring version directory exists...")
        ensure_version_directory()
        # Check if agensight.config.json exists in the project root
        user_dir = os.getcwd()  # This should be the project root
        user_config_path = os.path.join(user_dir, 'agensight.config.json')
        if os.path.exists(user_config_path):
            logger.info(f"Found user config at: {user_config_path}")
            # Create .agensight directory if it doesn't exist
            agensight_dir = os.path.join(user_dir, '.agensight')
            os.makedirs(agensight_dir, exist_ok=True)
            # Copy the config to the .agensight directory
            internal_config_path = os.path.join(agensight_dir, 'config.json')
            import shutil
            shutil.copy2(user_config_path, internal_config_path)
            logger.info(f"Copied user config to: {internal_config_path}")
        logger.info("Initializing configuration system...")
        config = initialize_config()
        logger.info(f"Configuration initialized with {len(config.get('agents', []))} agents")
    except Exception as e:
        logger.error(f"Error initializing configuration: {str(e)}")
    logger.info("Server startup complete")
@app.get("/debug/data")
async def debug_data():
    """Debug endpoint to check data import"""
    from .data_source import data_source
    try:
        # Get counts from database
        conn = data_source._get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM traces")
        trace_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM spans")
        span_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM config_versions")
        config_count = cursor.fetchone()[0]
        conn.close()
        return {
            "status": "success",
            "database_stats": {
                "trace_count": trace_count,
                "span_count": span_count,
                "config_count": config_count
            },
            "first_trace": data_source.get_all_traces()[:1] if trace_count > 0 else None,
            "config_versions": data_source.get_config_versions() if config_count > 0 else None
        }
    except Exception as e:
        logger.error(f"Error in debug endpoint: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }


def start_server():
    """Start the server on an available port"""
    try:
        uvicorn.run("agensight._server.app:app", host="0.0.0.0", port=5001, log_level="info")
    except Exception as e:
        print(f"Error starting server: {e}")
        raise

if __name__ == "__main__":
    start_server()