const API_URL = "http://127.0.0.1:8000"; // local dev

import {
  BellSchedule,
  GlobalParams,
  Subject,
  Grade,
  Class,
  Teacher,
  ScheduleResult,
  Language,
  ModelConfig
} from '../types';

export async function fetchDataset() {
  const response = await fetch(`${API_URL}/load`);
  if (!response.ok) {
    throw new Error("Failed to load dataset");
  }
  return await response.json();
}

export async function generateSchedule(
  bell: BellSchedule,
  params: GlobalParams,
  subjects: Subject[],
  grades: Grade[],
  classes: Class[],
  teachers: Teacher[],
  language: Language = 'en',
  modelConfig: ModelConfig
): Promise<string> {

  const normalizedGrades = grades.map(g => ({
    ...g,
    requiredPeriodsPerWeek: g.subjects.reduce(
      (sum, s) => sum + s.periods,
      0
    )
  }));

  const startRes = await fetch(`${API_URL}/solve/start`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      bell,
      params,
      subjects,
      grades: normalizedGrades,
      classes,
      teachers,
      language,
      modelConfig
    })
  });

  ///if (!response.ok) {
  ///  throw new Error('Solver API error');
  ///}

  const { job_id } = await startRes.json();
  return job_id;
}

export async function saveDataset(
  bell: BellSchedule,
  params: GlobalParams,
  subjects: Subject[],
  grades: Grade[],
  classes: Class[],
  teachers: Teacher[],
  modelConfig: ModelConfig,
): Promise<void> {

  const normalizedGrades = grades.map(g => ({
    ...g,
    requiredPeriodsPerWeek: g.subjects.reduce(
      (sum, s) => sum + s.periods,
      0
    )
  }));

  await fetch(`${API_URL}/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bell,
      params,
      subjects,
      grades: normalizedGrades,
      classes,
      teachers,
      modelConfig
    })
  });
}

export async function getProgress(jobId: string) {
  const res = await fetch(`${API_URL}/solve/progress/${jobId}`);
  if (!res.ok) throw new Error("Progress fetch failed");
  return res.json();
}

export async function getResult(jobId: string) {
  const res = await fetch(`${API_URL}/solve/result/${jobId}`);
  if (!res.ok) throw new Error("Result fetch failed");
  return res.json();
}

export async function stopSolverAPI(jobId: string) {
  await fetch(`${API_URL}/solve/stop/${jobId}`, {
    method: 'POST'
  });
}
