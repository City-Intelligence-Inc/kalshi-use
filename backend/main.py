import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.position_monitor import monitor_positions_loop
from backend.routes import router

# Configure logging so all output (including errors) appears in App Runner logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    stream=sys.stdout,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(monitor_positions_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
