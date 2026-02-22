import logging
import sys

from fastapi import FastAPI
from backend.routes import router

# Configure logging so all output (including errors) appears in App Runner logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    stream=sys.stdout,
)

app = FastAPI()

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
