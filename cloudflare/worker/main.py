from fastapi import FastAPI, HTTPException, Request
from workers import asgi

app = FastAPI(title="TABCO Admin API", version="2.0.0")


def get_db(request: Request):
    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env else None
    if db is None:
        raise HTTPException(status_code=503, detail="D1 database binding is not configured")
    return db


@app.get("/api/health")
async def health(request: Request):
    db = get_db(request)
    try:
        await db.prepare("SELECT 1 AS ok").run()
    except Exception:
        raise HTTPException(status_code=503, detail="D1 database is unavailable")
    return {"status": "ok", "service": "tabco-admin-api", "database": "connected"}


@app.get("/api")
async def api_root():
    return {"service": "TABCO Admin API", "version": "2.0.0"}


Default = asgi.entrypoint(app)
