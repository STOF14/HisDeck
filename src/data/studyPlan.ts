export type Exam = {
  module: string;
  date: string;
  time: string;
  venue: string;
  credits: number;
  notes?: string;
};

export type StudyProfile = {
  name: string;
  institution?: string;
  term?: string;
};

export type StudyPlan = {
  version?: 1;
  profile: StudyProfile;
  rules: string[];
  exams: Exam[];
  schedule: Record<string, string[]>;
};

export const DEFAULT_PLAN: StudyPlan = {
  version: 1,
  profile: {
    name: 'Sample Student',
    institution: 'Sample University',
    term: '2026 Semester 1',
  },
  rules: [
    '3 blocks per day, about 2 hours each',
    '50 min on / 10 min break',
    'Module with the next exam gets Block 1',
    'Sleep 7-8 hours; non-negotiable',
  ],
  exams: [
    { module: 'MATH 101', date: '2026-06-01', time: '09:00', venue: 'Main Hall', credits: 12 },
    { module: 'PHYS 101', date: '2026-06-05', time: '13:30', venue: 'Science Building', credits: 12 },
    { module: 'CS 101', date: '2026-06-09', time: '08:00', venue: 'Lab A', credits: 16 },
  ],
  schedule: {
    '2026-05-28': ['MATH 101', 'PHYS 101', 'CS 101'],
    '2026-05-29': ['MATH 101', 'PHYS 101', 'CS 101'],
    '2026-05-30': ['MATH 101', 'PHYS 101', 'CS 101'],
  },
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function getLocalDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getNextExam(plan: StudyPlan): Exam | null {
  const today = parseLocalDate(getLocalDateKey());
  return plan.exams.find((exam) => parseLocalDate(exam.date) >= today) ?? null;
}

export function getDaysUntil(dateString: string): number {
  const today = parseLocalDate(getLocalDateKey());
  const target = parseLocalDate(dateString);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getTodaySchedule(plan: StudyPlan): string[] {
  const todayKey = getLocalDateKey();
  return plan.schedule[todayKey] ?? ['No schedule found for today'];
}

export function applyProfile(plan: StudyPlan, profile: StudyProfile): StudyPlan {
  return {
    ...plan,
    profile: {
      ...plan.profile,
      ...profile,
    },
  };
}