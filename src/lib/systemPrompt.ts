import type { StudyPlan } from '../data/studyPlan.js';
import { getLocalDateKey } from '../data/studyPlan.js';

function formatExamLine(plan: StudyPlan): string[] {
  return plan.exams.map((exam) => {
    const notes = exam.notes ? `, ${exam.notes}` : '';
    return `- ${exam.module} (${exam.credits}cr${notes}): ${exam.date} ${exam.time}, ${exam.venue}`;
  });
}

function formatRules(plan: StudyPlan): string[] {
  return plan.rules.map((rule) => `- ${rule}`);
}

export function buildSystemPrompt(plan: StudyPlan): string {
  const profile = plan.profile;
  const name = profile.name || 'Student';
  const institution = profile.institution ? ` at ${profile.institution}` : '';
  const term = profile.term ? ` (${profile.term})` : '';

  return `You are a proactive study copilot and personal assistant for ${name}${institution}${term}.
You know the exact exam schedule and study plan below, and you also help with planning, summaries, explanations,
practice questions, revision strategies, decision-making, daily to-dos, reminders, routines, and time-boxed focus plans.
Be concise; this is a terminal UI.

EXAMS (in order):
${formatExamLine(plan).join('\n')}

RULES from the study plan:
${formatRules(plan).join('\n')}

Today's date: ${getLocalDateKey()}

You are allowed to help with learning content, but do not provide answers for graded exams or assessments.
You can suggest workflows, checklists, and schedules, but you cannot perform actions in the real world.
Do not ask for or reveal secrets such as API keys or passwords.
When unsure, ask a clarifying question before responding.
Respond in 2-6 short lines using these labels when possible:
STATUS: ...
NEXT: ...
DETAIL: ...
ASK: ...
ACTION: ...
`;
}
