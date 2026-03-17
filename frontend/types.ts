
export enum TeacherType {
  HOMEROOM = 'Homeroom',
  NON_HOMEROOM = 'Non-Homeroom',
  OUTSOURCED = 'Outsourced'
}

export enum SubjectType {
  MAIN = 'Main',
  EXTRA = 'Extra',
  OPTIONAL = 'Optional'
}

export type Language = 'en' | 'vi';

export interface BellSchedule {
  daysPerWeek: number;
  morningPeriods: number;
  morningBreakAfter: number; 
  afternoonPeriods: number;
  afternoonBreakAfter: number; 
  hasFlagSalute?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  type: SubjectType;
  maxPeriodsPerDay: number;
  noConsecutiveDays: boolean;
  fixedSlots: { day: number; period?: number }[];
  optionalPayRate?: number;
  mustBeHomeroom: boolean;
}

export interface Grade {
  id: string;
  name: string;
  requiredPeriodsPerWeek: number;
  subjects: { subjectId: string; periods: number }[];
}

export interface Class {
  id: string;
  name: string;
  gradeId: string;
}

export interface Teacher {
  id: string;
  name: string;
  type: TeacherType;
  homeroomClassId?: string;
  subjectIds: string[];
  minPeriodsPerWeek: number;
  payRate: number;
  //availability: { day: number; period: number }[]; // Blocked slots
}

export interface GlobalParams {
  extraPayMultiplier: number;
  maxExtraPeriods: number;
}

export interface ModelConfig {
  costWeight: number;
  homeroomPenaltyWeight: number;
  minLoadPenaltyWeight: number;
}

export interface Assignment {
  classId: string;
  subjectId: string;
  teacherId: string;
  day: number;
  period: number;
}

export interface Violation {
  code: string;
  params: Record<string, string | number>;
}

export interface ScheduleResult {
  assignments: Assignment[];
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  penalties: number;
  violatedConstraints: Violation[];
}
