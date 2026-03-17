import json
import os
import threading
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from solve import SolveRequest, solve_timetable

jobs = {}

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

# ===================== SOLVER JOB =====================

def run_solver_job(job_id: str, req: SolveRequest):

    def callback_update(best_solution, best_score):
        jobs[job_id]["best_solution"] = best_solution
        jobs[job_id]["best_score"] = best_score
        jobs[job_id]["feasible"] = True

    def should_stop():
        return jobs[job_id].get("stop", False)

    try:
        result = solve_timetable(
            req,
            progress_callback=callback_update,
            stop_callback=should_stop
        )

        jobs[job_id]["status"] = "finished"
        jobs[job_id]["result"] = result

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

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


@app.post("/solve/start")
def start_solve(req: SolveRequest):

    global app_state

    app_state = req.model_dump()
    save_data()

    job_id = str(uuid.uuid4())

    jobs[job_id] = {
        "status": "running",
        "best_score": None,
        "best_solution": None,
        "feasible": False,
        "stop": False
    }

    thread = threading.Thread(
        target=run_solver_job,
        args=(job_id, req),
        daemon=True
    )
    thread.start()

    return {"job_id": job_id}

@app.get("/solve/progress/{job_id}")
def get_progress(job_id: str):

    job = jobs.get(job_id)
    if not job:
        return {"error": "job not found"}

    return {
        "status": job["status"],
        "best_score": job["best_score"],
        "feasible": job["feasible"]
    }

@app.post("/solve/stop/{job_id}")
def stop_solver(job_id: str):

    if job_id in jobs:
        jobs[job_id]["stop"] = True
        return {"status": "stopping"}

    return {"error": "job not found"}

@app.get("/solve/result/{job_id}")
def get_result(job_id: str):

    job = jobs.get(job_id)
    if not job:
        return {"error": "job not found"}

    if job["status"] == "finished":
        return job["result"]

    # Return best feasible solution if still running
    if job["feasible"]:
        return {
            "status": "PARTIAL",
            "penalties": job["best_score"],
            "assignments": job["best_solution"]
        }

    return {"status": "running"}