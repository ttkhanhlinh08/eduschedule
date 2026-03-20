import time
import json
import os
from datetime import datetime

from typing import List, Dict, Tuple, Optional
from enum import Enum

from pydantic import BaseModel
from ortools.sat.python import cp_model
from collections import defaultdict

# ============================================================
# ENUMS
# ============================================================

class TeacherType(str, Enum):
    HOMEROOM = "Homeroom"
    NON_HOMEROOM = "Non-Homeroom"
    OUTSOURCED = "Outsourced"

class SubjectType(str, Enum):
    MAIN = "Main"
    EXTRA = "Extra"
    OPTIONAL = "Optional"

# ============================================================
# FRONTEND TYPES
# ============================================================

class BellSchedule(BaseModel):
    daysPerWeek: int
    morningPeriods: int
    morningBreakAfter: int
    afternoonPeriods: int
    afternoonBreakAfter: int
    hasFlagSalute: bool = False


class Subject(BaseModel):
    id: str
    name: str
    type: SubjectType
    maxPeriodsPerDay: int
    noConsecutiveDays: bool
    fixedSlots: List[Dict]
    optionalPayRate: Optional[int] = 0
    mustBeHomeroom: bool = False


class Grade(BaseModel):
    id: str
    name: str
    requiredPeriodsPerWeek: int
    subjects: List[Dict]


class Class(BaseModel):
    id: str
    name: str
    gradeId: str


class Teacher(BaseModel):
    id: str
    name: str
    type: TeacherType
    homeroomClassId: Optional[str] = None
    subjectIds: List[str]
    minPeriodsPerWeek: int
    payRate: float


class GlobalParams(BaseModel):
    extraPayMultiplier: float
    maxExtraPeriods: int

class ModelConfig(BaseModel):
    costWeight: int = 1
    homeroomPenaltyWeight: int = 100000
    minLoadPenaltyWeight: int = 200000


class SolveRequest(BaseModel):
    bell: BellSchedule
    params: GlobalParams
    subjects: List[Subject]
    grades: List[Grade]
    classes: List[Class]
    teachers: List[Teacher]
    language: str
    modelConfig: ModelConfig

# ============================================================
# OUTPUT TYPES
# ============================================================

class Assignment(BaseModel):
    classId: str
    subjectId: str
    teacherId: str
    day: int
    period: int

class Violation(BaseModel):
    code: str
    params: Dict[str, int | str]

class ScheduleResult(BaseModel):
    assignments: List[Assignment]
    status: str
    violatedConstraints: List[Violation]
    penalties: int

# ============================================================
# PERFORMANCE BENCHMARK
# ============================================================

class PerformanceCallback(cp_model.CpSolverSolutionCallback):
    def __init__(self, start_time):
        super().__init__()
        self.start_time = start_time

        self.first_solution_time = None
        self.first_objective = None

        self.best_solution_time = None
        self.best_objective = None

        self.best_objective_value = float('inf')

    def on_solution_callback(self):
        now = time.time()
        elapsed = now - self.start_time

        obj = self.ObjectiveValue()

        # First feasible solution
        if self.first_solution_time is None:
            self.first_solution_time = elapsed
            self.first_objective = obj

        # Best solution tracking
        if obj < self.best_objective_value:
            self.best_objective_value = obj
            self.best_solution_time = elapsed
            self.best_objective = obj

# ============================================================
# SOLVER
# ============================================================

def solve_timetable(req: SolveRequest) -> ScheduleResult:

    # ============================================================
    # MODEL INITIALIZATION
    # ============================================================

    model = cp_model.CpModel()

    add = model.Add
    new_bool = model.NewBoolVar

    config = req.modelConfig

    USE_COST = config.costWeight != 0
    USE_MIN_LOAD = config.minLoadPenaltyWeight != 0
    USE_HOMEROOM_PENALTY = config.homeroomPenaltyWeight != 0

    days = req.bell.daysPerWeek
    periods = req.bell.morningPeriods + req.bell.afternoonPeriods

    subject_map = {s.id: s for s in req.subjects}
    grade_map = {g.id: g for g in req.grades}
    class_map = {c.id: c for c in req.classes}
    teacher_map = {t.id: t for t in req.teachers}
    homeroom_map = {
        t.homeroomClassId: t.id
        for t in req.teachers
        if t.type == TeacherType.HOMEROOM and t.homeroomClassId
    }

    # ============================================================
    # BUILD CLASS SUBJECT REQUIREMENTS
    # ============================================================

    class_requirements: Dict[Tuple[str, str], int] = {}

    for c in req.classes:
        grade = grade_map[c.gradeId]
        for subj in grade.subjects:
            class_requirements[(c.id, subj["subjectId"])] = subj["periods"]

    # ============================================================
    # DECISION VARIABLES
    # ============================================================

    X = {}

    # Fast lookup indexes
    class_slot_index = defaultdict(list)       # (cId, d, p)
    teacher_slot_index = defaultdict(list)     # (tId, d, p)
    class_subject_day_index = defaultdict(list) # (cId, sId, d)
    class_subject_index = defaultdict(list)    # (cId, sId)
    class_subject_slot_index = defaultdict(list)  # (cId, sId, d, p)
    teacher_compulsory_index = defaultdict(list) # tId -> list of var
    teacher_optional_index = defaultdict(list) # tId -> list of (var, sId, p)
    class_subject_teacher_index = defaultdict(list)
    teacher_subject_index = defaultdict(list) # sId -> list of teachers
    classes_subject_index = defaultdict(list)


    for (cId, sId) in class_requirements:
        classes_subject_index[sId].append(cId)

    for t in req.teachers:
        for sId in t.subjectIds:
            if sId not in classes_subject_index:
                continue
            teacher_subject_index[sId].append(t.id)

    for t in req.teachers:
        for sId in t.subjectIds:
            if sId not in classes_subject_index:
                continue

            for cId in classes_subject_index[sId]:
                if (cId, sId) not in class_requirements:
                    continue

                for d in range(days):
                    for p in range(periods):

                        key = (t.id, cId, sId, d, p)
                        var = new_bool(
                            f"x_{t.id}_{cId}_{sId}_{d}_{p}"
                        )

                        X[key] = var

                        # Populate indexes
                        class_slot_index[(cId, d, p)].append(var)
                        teacher_slot_index[(t.id, d, p)].append(var)
                        class_subject_day_index[(cId, sId, d)].append(var)
                        class_subject_index[(cId, sId)].append(var)
                        if subject_map[sId].type == SubjectType.OPTIONAL:
                            teacher_optional_index[t.id].append((var, sId, p))
                        else:
                            teacher_compulsory_index[t.id].append(var)
                        class_subject_slot_index[(cId, sId, d, p)].append(var)
                        class_subject_teacher_index[(cId, sId, t.id)].append((var, d, p))

    # ============================================================
    # CONSTRAINTS
    # ============================================================

    # ------------------------------------------------------------
    # 0. FLAG SALUTE (Monday period 1 blocked)
    # ------------------------------------------------------------

    if req.bell.hasFlagSalute:
        for c in req.classes:
            vars_slot = class_slot_index[(c.id, 0, 0)]
            if vars_slot:
                add(sum(vars_slot) == 0)

    # ------------------------------------------------------------
    # 1. A class can have at most 1 subject per time slot
    # ------------------------------------------------------------
    for c in req.classes:
        for d in range(days):
            for p in range(periods):
                vars_slot = class_slot_index[(c.id, d, p)]
                if len(vars_slot) > 1:
                    add(sum(vars_slot) <= 1)

    # ------------------------------------------------------------
    # 2. A teacher can teach at most 1 class per time slot
    # ------------------------------------------------------------
    for t in req.teachers:
        for d in range(days):
            for p in range(periods):
                vars_slot = teacher_slot_index[(t.id, d, p)]
                if vars_slot:
                    add(sum(vars_slot) <= 1)

    # ------------------------------------------------------------
    # 3. Maximum periods per subject per day
    # ------------------------------------------------------------
    for (cId, sId), required in class_requirements.items():
        subject = subject_map[sId]
        for d in range(days):
            vars_day = class_subject_day_index[(cId, sId, d)]
            if vars_day:
                model.Add(sum(vars_day) <= subject.maxPeriodsPerDay)

    # ------------------------------------------------------------
    # 4. No consecutive teaching days (if enabled)
    # ------------------------------------------------------------
    for (cId, sId), required in class_requirements.items():

        subject = subject_map[sId]

        if not subject.noConsecutiveDays:
            continue

        daily_presence = []

        for d in range(days):

            day_vars = class_subject_day_index[(cId, sId, d)]

            has_day = model.NewBoolVar(
                f"has_{cId}_{sId}_day_{d}"
            )

            if day_vars:
                model.Add(sum(day_vars) >= 1).OnlyEnforceIf(has_day)
                model.Add(sum(day_vars) == 0).OnlyEnforceIf(has_day.Not())
            else:
                model.Add(has_day == 0)

            daily_presence.append(has_day)

        for d in range(days - 1):
            model.Add(
                daily_presence[d] + daily_presence[d+1] <= 1
            )

    # ------------------------------------------------------------
    # 5. Fixed slots enforcement
    # ------------------------------------------------------------
    for s in req.subjects:

        if not s.fixedSlots:
            continue

        for slot in s.fixedSlots:

            day = slot["day"] - 1
            period = slot.get("period")

            if period is not None:
                period -= 1

            for c in req.classes:

                if (c.id, s.id) not in class_requirements:
                    continue

                if period is None:
                    vars_fixed = class_subject_day_index[(c.id, s.id, day)]
                else:
                    vars_fixed = class_subject_slot_index[(c.id, s.id, day, period)]

                if not vars_fixed:
                    model.AddBoolOr([])
                else:
                    model.Add(sum(vars_fixed) == 1)

    # ------------------------------------------------------------
    # 6. Subjects that MUST be taught by homeroom teacher
    # ------------------------------------------------------------

    for (cId, sId), _ in class_requirements.items():

        subject = subject_map[sId]

        if not subject.mustBeHomeroom:
            continue

        homeroom_teacher = homeroom_map.get(cId)
        if not homeroom_teacher:
            continue

        for tId in teacher_subject_index[sId]:

            if tId == homeroom_teacher:
                continue

            for var, _, _ in class_subject_teacher_index[(cId, sId, tId)]:
                add(var == 0)

    # ------------------------------------------------------------
    # 7. Subject requirements fulfillment
    # ------------------------------------------------------------

    for (cId, sId), required in class_requirements.items():

        vars_req = class_subject_index[(cId, sId)]

        if not vars_req:
            model.Add(0 == 1)
        else:
            model.Add(sum(vars_req) == required)

    # ------------------------------------------------------------
    # 8. Teacher upper load limit (compulsory subjects only)
    # ------------------------------------------------------------

    cost_terms = []
    min_load_violation_meta = []
    homeroom_violation_terms = []
    homeroom_violation_meta = []


    for t in req.teachers:

        compulsory_vars = teacher_compulsory_index[t.id]

        compulsory_load = model.NewIntVar(0, days * periods, f"comp_load_{t.id}")

        if compulsory_vars:
            model.Add(compulsory_load == sum(compulsory_vars))
        else:
            model.Add(compulsory_load == 0)

        model.Add(compulsory_load <= t.minPeriodsPerWeek + req.params.maxExtraPeriods)

        # =====================================================
        # UNDERLOAD (Soft constraint)
        # =====================================================
        if USE_MIN_LOAD:
            shortage = model.NewIntVar(0, days * periods, f"shortage_{t.id}")

            model.Add(shortage >= t.minPeriodsPerWeek - compulsory_load)

            min_load_violation_meta.append((t.id, shortage))

        # =====================================================
        # SALARY CALCULATION (Soft constraint)
        # =====================================================

        if USE_COST:
            # Base salary (compulsory)
            base_cost = compulsory_load * int(t.payRate)

            # Overtime on compulsory subjects only
            overtime = model.NewIntVar(0, days * periods, f"ot_{t.id}")

            model.Add(overtime >= compulsory_load - t.minPeriodsPerWeek)

            extra_cost = int(t.payRate * req.params.extraPayMultiplier) * overtime

            optional_cost = sum(
                int(subject_map[sId].optionalPayRate) * var
                for var, sId, _ in teacher_optional_index[t.id]
            )

            cost_terms.append(base_cost + extra_cost + optional_cost)

        # ============================================================
        # HOMEROOM VIOLATIONS (Soft constraint)
        # ============================================================

    if USE_HOMEROOM_PENALTY:
        for (cId, sId), required in class_requirements.items():

            subject = subject_map[sId]

            if subject.type != SubjectType.MAIN:
                continue

            homeroom_teacher = homeroom_map.get(cId)
            if not homeroom_teacher:
                continue

            for tId in teacher_subject_index[sId]:

                if tId == homeroom_teacher:
                    continue

                vars_block = class_subject_teacher_index[(cId, sId, tId)]

                for var, d, p in vars_block:
                    homeroom_violation_terms.append(var)
                    homeroom_violation_meta.append((tId, cId, sId, d, p))

        total_homeroom_penalty = sum(homeroom_violation_terms)

    # ============================================================
    # OBJECTIVE
    # ============================================================

    objective_terms = []

    if USE_COST and cost_terms:
        objective_terms.append(config.costWeight * sum(cost_terms))

    if USE_HOMEROOM_PENALTY:
        objective_terms.append(
            config.homeroomPenaltyWeight * total_homeroom_penalty
        )

    if USE_MIN_LOAD and min_load_violation_meta:
        objective_terms.append(
            config.minLoadPenaltyWeight *
            sum(v for _, v in min_load_violation_meta)
        )

    if objective_terms:
        model.Minimize(sum(objective_terms))

    # ============================================================
    # SOLVE
    # ============================================================

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 900
    """solver.parameters.num_search_workers = 12"""  
    solver.parameters.log_search_progress = False
    solver.parameters.cp_model_presolve = True
    solver.parameters.linearization_level = 2

    start_time = time.time()

    callback = PerformanceCallback(start_time)

    status = solver.Solve(model, callback)

    end_time = time.time()
    total_runtime = end_time - start_time

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return ScheduleResult(
            assignments=[],
            status="FAILED",
            violatedConstraints=[
                Violation(code="MODEL_INFEASIBLE", params={})
            ],
            penalties=0
        )

    # ============================================================
    # EXTRACT ASSIGNMENTS
    # ============================================================

    assignments = []

    for k, var in X.items():
        if solver.Value(var) == 1:
            tId, cId, sId, d, p = k
            assignments.append(
                Assignment(
                    teacherId=tId,
                    classId=cId,
                    subjectId=sId,
                    day=d+1,
                    period=p+1
                )
            )

    # ============================================================
    # EXTRACT VIOLATIONS
    # ============================================================

    violations = []

    # Teacher underload
    for tId, shortage in min_load_violation_meta:
        val = solver.Value(shortage)
        if val > 0:
            violations.append(
                Violation(
                    code="TEACHER_UNDERLOAD",
                    params={
                        "teacherId": tId,
                        "teacherName": teacher_map[tId].name,
                        "missingPeriods": val
                    }
                )
            )

    # Homeroom violations
    for idx, var in enumerate(homeroom_violation_terms):
        if solver.Value(var) == 1:
            tId, cId, sId, d, p = homeroom_violation_meta[idx]
            violations.append(
                Violation(
                    code="HOMEROOM_VIOLATION",
                    params={
                        "teacherId": tId,
                        "teacherName": teacher_map[tId].name,
                        "classId": cId,
                        "className": class_map[cId].name,
                        "subjectId": sId,
                        "subjectName": subject_map[sId].name,
                        "day": d+1,
                        "period": p+1
                    }
                )
            )

    total_penalty_value = solver.ObjectiveValue()

    # ============================================================
    # EXPORT PERFORMANCE METRICS
    # ============================================================

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    file_name = f"solver_benchmark_{timestamp}.json"

    os.makedirs("benchmark_results", exist_ok=True)

    file_path = os.path.join("benchmark_results", file_name)

    fixed_slots_count = sum(len(s.fixedSlots or []) for s in req.subjects)

    result_json = {
        "input_summary": {
            "num_teachers": len(req.teachers),
            "num_classes": len(req.classes),
            "num_subjects": len(req.subjects),
            "days_per_week": days,
            "periods_per_day": periods,
            "cost_weight": config.costWeight,
            "min_load_penalty_weight": config.minLoadPenaltyWeight,
            "homeroom_penalty_weight": config.homeroomPenaltyWeight
        },

        "problem_size": {
            "num_variables": len(X),
            "num_class_subject_pairs": len(class_requirements),
            "num_teacher_subject_pairs": sum(len(t.subjectIds) for t in req.teachers)
        },

        "constraint_profile": {
            "constraint_density": len(X) / (days * periods),
            "fixed_slots_count": fixed_slots_count,
            "fixed_slot_ratio": fixed_slots_count / len(X)  if len(X) > 0 else 0,
            "subjects_with_no_consecutive_days": sum(1 for s in req.subjects if s.noConsecutiveDays),
            "subjects_with_max_per_day_limit": sum(1 for s in req.subjects if s.maxPeriodsPerDay < 10),
            "homeroom_required_subjects": sum(1 for s in req.subjects if s.mustBeHomeroom),
            "avg_min_load": sum(t.minPeriodsPerWeek for t in req.teachers) / len(req.teachers),
            "total_min_load": sum(t.minPeriodsPerWeek for t in req.teachers),
            "max_extra_periods": req.params.maxExtraPeriods
        },

        "performance": {
            "time_to_first_feasible": callback.first_solution_time,
            "time_to_best": callback.best_solution_time,
            "total_runtime": total_runtime
        },

        "first_solution": {
            "total_cost": callback.first_objective
        },

        "best_solution": {
            "total_cost": solver.ObjectiveValue()
        },

        "solver_status": str(status)
    }

    with open(file_path, "w") as f:
        json.dump(result_json, f, indent=4)

    return ScheduleResult(
        assignments=assignments,
        status="SUCCESS",
        violatedConstraints=violations,
        penalties=int(total_penalty_value)
    )

