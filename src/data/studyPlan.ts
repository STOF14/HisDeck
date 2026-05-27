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
  profile: StudyProfile;
  rules: string[];
  exams: Exam[];
  schedule: Record<string, string[]>;
};

export const DEFAULT_PLAN: StudyPlan = {
  profile: {
    name: 'Sample Student',
    institution: 'Sample University',
    term: '2026 Semester 1',
  },
  rules: [
    '3 blocks per day, about 2 hours each',
    '50 min on / 10 min break',
    'The module with the next exam gets Block 1 every day',
    'PHY 255 always appears because it has two papers',
    'Max 2 hours per module per session',
    'Sleep 7-8 hours; non-negotiable',
    'Hard stop by 20:00 on nights before 07:30 exams',
  ],
  exams: [
    { module: 'WTW 211', date: '2026-06-01', time: '15:00', venue: 'Roos Hall', credits: 12 },
    { module: 'PHY 255 P1', date: '2026-06-03', time: '11:15', venue: 'NS1 5-42', credits: 24 },
    { module: 'COS 210', date: '2026-06-05', time: '07:30', venue: 'IT Building CBT Labs', credits: 8 },
    { module: 'COS 212', date: '2026-06-08', time: '11:15', venue: 'Large Chemistry Hall', credits: 16, notes: 'Open book' },
    { module: 'PHY 255 P2', date: '2026-06-10', time: '07:30', venue: 'NS1 5-42', credits: 24 },
    { module: 'WTW 218', date: '2026-06-13', time: '07:30', venue: 'Thuto 1-1', credits: 12 },
  ],
  schedule: {
    '2026-05-28': ['WTW 211', 'PHY 255', 'COS 210'],
    '2026-05-29': ['WTW 211', 'COS 212', 'PHY 255'],
    '2026-05-30': ['WTW 211', 'WTW 218', 'COS 210'],
    '2026-05-31': ['WTW 211', 'PHY 255', 'COS 212'],
    '2026-06-01': ['WTW 211 final prep', 'WTW 211 exam 15:00', 'PHY 255'],
    '2026-06-02': ['PHY 255 P1', 'PHY 255 P1', 'COS 210'],
    '2026-06-03': ['PHY 255 P1 exam 11:15', 'REST', 'PHY 255 P2 light'],
    '2026-06-04': ['COS 210', 'COS 210', 'PHY 255 P2'],
    '2026-06-05': ['COS 210 exam 07:30', 'REST', 'COS 212'],
    '2026-06-06': ['COS 212', 'PHY 255 P2', 'WTW 218'],
    '2026-06-07': ['COS 212', 'PHY 255 P2', 'WTW 218'],
    '2026-06-08': ['COS 212 exam 11:15', 'REST', 'PHY 255 P2'],
    '2026-06-09': ['PHY 255 P2', 'PHY 255 P2', 'WTW 218'],
    '2026-06-10': ['PHY 255 P2 exam 07:30', 'REST', 'WTW 218'],
    '2026-06-11': ['WTW 218', 'WTW 218', 'WTW 218'],
    '2026-06-12': ['WTW 218', 'WTW 218', 'REST'],
    '2026-06-13': ['WTW 218 exam 07:30', '—', '—'],
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