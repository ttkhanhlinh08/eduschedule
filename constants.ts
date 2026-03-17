
import { BellSchedule, GlobalParams, SubjectType, TeacherType, ModelConfig } from './types';

export const DEFAULT_BELL_SCHEDULE: BellSchedule = {
  daysPerWeek: 5,
  morningPeriods: 4,
  morningBreakAfter: 2,
  afternoonPeriods: 3,
  afternoonBreakAfter: 2,
  hasFlagSalute: true,
};

export const DEFAULT_GLOBAL_PARAMS: GlobalParams = {
  extraPayMultiplier: 1.5,
  maxExtraPeriods: 5,
};

export const INITIAL_SUBJECTS = [
  { id: '1', name: 'Mathematics', type: SubjectType.MAIN, maxPeriodsPerDay: 1, noConsecutiveDays: false, fixedSlots: [] },
  { id: '2', name: 'Science', type: SubjectType.MAIN, maxPeriodsPerDay: 1, noConsecutiveDays: false, fixedSlots: [] },
  { id: '3', name: 'English', type: SubjectType.MAIN, maxPeriodsPerDay: 1, noConsecutiveDays: false, fixedSlots: [] },
  { id: '4', name: 'Physical Education', type: SubjectType.EXTRA, maxPeriodsPerDay: 1, noConsecutiveDays: true, fixedSlots: [] },
  { id: '5', name: 'Art', type: SubjectType.EXTRA, maxPeriodsPerDay: 1, noConsecutiveDays: true, fixedSlots: [] },
];

export const INITIAL_GRADES = [
  { 
    id: 'G1', 
    name: 'Grade 1', 
    requiredPeriodsPerWeek: 15, 
    subjects: [
      { subjectId: '1', periods: 5 },
      { subjectId: '2', periods: 4 },
      { subjectId: '3', periods: 4 },
      { subjectId: '4', periods: 1 },
      { subjectId: '5', periods: 1 },
    ] 
  }
];

export const INITIAL_CLASSES = [
  { id: 'C1A', name: 'Class 1-A', gradeId: 'G1' },
  { id: 'C1B', name: 'Class 1-B', gradeId: 'G1' },
];

export const INITIAL_TEACHERS = [
  {
    id: 'T1',
    name: 'John Doe',
    type: TeacherType.HOMEROOM,
    homeroomClassId: 'C1A',
    subjectIds: ['1', '2', '3'],
    minPeriodsPerWeek: 10,
    payRate: 50,
    availability: [],
  },
  {
    id: 'T2',
    name: 'Jane Smith',
    type: TeacherType.NON_HOMEROOM,
    subjectIds: ['1', '2', '3', '4'],
    minPeriodsPerWeek: 15,
    payRate: 45,
    //availability: [],
  }
];

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  costWeight: 1,
  homeroomPenaltyWeight: 100000,
  minLoadPenaltyWeight: 200000
};
