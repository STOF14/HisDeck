import type { Exam, StudyPlan } from '../data/studyPlan.js';
import { getDaysUntil, getLocalDateKey, getNextExam, getTodaySchedule } from '../data/studyPlan.js';

function normalize(text: string): string {
  return text.toLowerCase();
}

function findExam(plan: StudyPlan, query: string): Exam | null {
  const lowered = normalize(query);
  const direct = plan.exams.find((exam) => normalize(exam.module) === lowered);

  if (direct) {
    return direct;
  }

  return plan.exams.find((exam) => normalize(exam.module).includes(lowered)) ?? null;
}

function findExamFromPrompt(plan: StudyPlan, prompt: string): Exam | null {
  for (const exam of plan.exams) {
    if (normalize(prompt).includes(normalize(exam.module))) {
      return exam;
    }
  }

  return null;
}

function formatExamSummary(exam: Exam): string[] {
  const summary = `${exam.module} on ${exam.date} at ${exam.time}`;
  const venue = `Venue: ${exam.venue}`;
  return [summary, venue];
}

export function answerLocally(prompt: string, plan: StudyPlan): string {
  const lowered = normalize(prompt);

  if (lowered.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const schedule = plan.schedule[getLocalDateKey(tomorrow)] ?? ['No schedule found for tomorrow'];
    return `STATUS: tomorrow schedule\nNEXT: ${schedule.join(' | ')}`;
  }

  if (lowered.includes('rules') || lowered.includes('plan rules')) {
    return `STATUS: plan rules\nDETAIL: ${plan.rules.join(' | ')}`;
  }

  if (lowered.includes('exams') || lowered.includes('exam list')) {
    const list = plan.exams.map((exam) => `${exam.module} ${exam.date}`).join(' | ');
    return `STATUS: exam list\nDETAIL: ${list}`;
  }

  if (lowered.includes('modules') || lowered.includes('subjects')) {
    const list = plan.exams.map((exam) => exam.module).join(' | ');
    return `STATUS: modules\nDETAIL: ${list}`;
  }

  if (lowered.includes('today') || lowered.includes('study') || lowered.includes('block')) {
    const schedule = getTodaySchedule(plan);
    return `STATUS: ${getLocalDateKey()} schedule\nNEXT: ${schedule.join(' | ')}`;
  }

  if (lowered.includes('next exam') || lowered.includes('next')) {
    const nextExam = getNextExam(plan);
    if (!nextExam) {
      return 'STATUS: All exams complete\nNEXT: No upcoming exams';
    }

    const daysLeft = getDaysUntil(nextExam.date);
    return `STATUS: ${nextExam.module}\nNEXT: ${daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} away`}\nDETAIL: ${nextExam.date} ${nextExam.time}`;
  }

  if (lowered.includes('days') || lowered.includes('countdown')) {
    const target = findExamFromPrompt(plan, prompt) ?? getNextExam(plan);
    if (!target) {
      return 'STATUS: All exams complete\nNEXT: No upcoming exams';
    }

    const daysLeft = getDaysUntil(target.date);
    return `STATUS: ${target.module}\nNEXT: ${daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} away`}\nDETAIL: ${target.date} ${target.time}`;
  }

  if (lowered.includes('venue') || lowered.includes('where')) {
    const target = findExamFromPrompt(plan, prompt) ?? getNextExam(plan);
    if (!target) {
      return 'STATUS: All exams complete\nNEXT: No upcoming exams';
    }

    return `STATUS: ${target.module}\nNEXT: ${target.venue}`;
  }

  if (lowered.includes('when') || lowered.includes('time')) {
    const target = findExamFromPrompt(plan, prompt) ?? getNextExam(plan);
    if (!target) {
      return 'STATUS: All exams complete\nNEXT: No upcoming exams';
    }

    const details = formatExamSummary(target).join('\nDETAIL: ');
    return `STATUS: ${target.module}\nDETAIL: ${details}`;
  }

  const quick = findExam(plan, prompt);
  if (quick) {
    const details = formatExamSummary(quick).join('\nDETAIL: ');
    return `STATUS: ${quick.module}\nDETAIL: ${details}`;
  }

  return 'STATUS: Schedule assistant\nNEXT: Ask about today, countdowns, or venues';
}
