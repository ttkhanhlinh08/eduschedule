import json
import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from solve import SolveRequest, solve_timetable

DATA_FILE = "timetable_data.json"

app_state = {
    "bell": None,
    "params": None,
    "subjects": [],
    "grades": [],
    "classes": [],
    "teachers": [],
    "language": "en",
    "modelConfig": None
}


# ===================== PERSISTENCE =====================

def load_data():
    global app_state
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            saved = json.load(f)
            if "data" in saved:
                app_state = saved["data"]


def save_data():
    payload = {
        "metadata": {
            "last_modified": datetime.now(timezone.utc).isoformat()
        },
        "data": app_state
    }

    temp_file = DATA_FILE + ".tmp"

    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=4, ensure_ascii=False)

    os.replace(temp_file, DATA_FILE)


# ===================== FASTAPI =====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_data()
    yield


app = FastAPI(
    title="School Timetable CP-SAT Solver",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===================== ROUTES =====================

@app.get("/load")
def get_last_saved():
    return app_state


@app.post("/save")
def save_dataset(data: dict):
    global app_state
    app_state = data
    save_data()
    return {"status": "saved"}


@app.post("/solve")
def solve(req: SolveRequest):
    global app_state

    app_state = req.model_dump()
    save_data()

    result = solve_timetable(req)
    return result