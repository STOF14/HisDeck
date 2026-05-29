import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { applyProfile, DEFAULT_PLAN, type StudyPlan } from '../data/studyPlan.js';
import { PixelDivider, PixelHeader, PixelKey, THEME } from '../lib/pixel.js';
import { askGemini, MODEL_CANDIDATES } from '../lib/gemini.js';
import {
  getConfigPath,
  getDefaultPlanPath,
  loadPlan,
  saveConfig,
  savePlan,
  type AppConfig,
} from '../lib/storage.js';

type Step =
  | 'welcome'
  | 'name'
  | 'institution'
  | 'term'
  | 'apiKey'
  | 'model'
  | 'planChoice'
  | 'planPath'
  | 'planPaste'
  | 'planParse'
  | 'planFollowup'
  | 'saving'
  | 'done'
  | 'error';

type Choice = { label: string; value: 'sample' | 'import' | 'paste' | 'guided' };

const planChoices: Choice[] = [
  { label: 'Use the sample plan', value: 'sample' },
  { label: 'Import an existing plan JSON', value: 'import' },
  { label: 'Paste timetable text (AI builds plan)', value: 'paste' },
  { label: 'Guided setup (AI asks 1-3 questions)', value: 'guided' },
];

export const Setup = ({ onComplete }: { onComplete: (config: AppConfig, plan: StudyPlan) => void }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [term, setTerm] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [preferredModel, setPreferredModel] = useState<string>(MODEL_CANDIDATES[0]);
  const [planPath, setPlanPath] = useState('');
  const [pasteLine, setPasteLine] = useState('');
  const [pasteLines, setPasteLines] = useState<string[]>([]);
  const [planMode, setPlanMode] = useState<'paste' | 'guided'>('paste');
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [followupIndex, setFollowupIndex] = useState(0);
  const [followupAnswers, setFollowupAnswers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedConfig, setSavedConfig] = useState<AppConfig | null>(null);
  const [savedPlan, setSavedPlan] = useState<StudyPlan | null>(null);

  useInput((input, key) => {
    if (step === 'welcome' && key.return) {
      setStep('name');
      return;
    }

    if (step === 'done' && key.return) {
      if (savedConfig && savedPlan) {
        onComplete(savedConfig, savedPlan);
      }
    }

    if (step === 'error' && key.return) {
      setError(null);
      setStep('welcome');
    }
  });

  const handleSavePlan = async (plan: StudyPlan, targetPath: string) => {
    setStep('saving');
    try {
      const config: AppConfig = {
        version: 1,
        planPath: targetPath,
        geminiApiKey: apiKey.trim() || undefined,
        preferredModel,
        requestLimitPerDay: 1500,
        tokenLimitPerDay: 1000000,
      };
      await savePlan(plan, targetPath);
      await saveConfig(config);
      setSavedConfig(config);
      setSavedPlan(plan);
      setPlanPath(targetPath);
      setStep('done');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save setup.';
      setError(message);
      setStep('error');
    }
  };

  const handlePlanChoice = async (choice: Choice) => {
    if (choice.value === 'sample') {
      const plan = applyProfile(DEFAULT_PLAN, {
        name: name || 'Student',
        institution: institution.trim() || undefined,
        term: term.trim() || undefined,
      });
      await handleSavePlan(plan, getDefaultPlanPath());
    } else if (choice.value === 'paste' || choice.value === 'guided') {
      setPasteLines([]);
      setPasteLine('');
      setFollowupQuestions([]);
      setFollowupIndex(0);
      setFollowupAnswers([]);
      setPlanMode(choice.value === 'guided' ? 'guided' : 'paste');
      setStep('planPaste');
    } else {
      setStep('planPath');
    }
  };

  const handlePlanPath = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Plan path cannot be empty.');
      setStep('error');
      return;
    }

    try {
      const plan = await loadPlan(trimmed);
      await handleSavePlan(plan, trimmed);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load plan.';
      setError(message);
      setStep('error');
    }
  };

  const resolveApiKey = (): string | undefined => {
    const trimmed = apiKey.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
    const envKey = process.env.GEMINI_API_KEY;
    return envKey && envKey.trim().length > 0 ? envKey : undefined;
  };

  const buildPlanParserPrompt = (
    rawText: string,
    allowQuestions: boolean,
    followups: string[],
  ): string => {
    const profileLine = `Profile name: ${name || 'Student'}\nInstitution: ${institution || 'n/a'}\nTerm: ${term || 'n/a'}`;
    const followupBlock = followups.length > 0 ? `\nFOLLOW-UP ANSWERS:\n${followups.join('\n')}` : '';
    const questionRule = allowQuestions
      ? '- If essential info is missing, return up to 3 short questions in a "questions" array.\n'
      : '- Do not ask questions; make best-effort assumptions.\n';

    return `Convert the study plan text into JSON only (no markdown, no code fences).

Schema:
{
  "plan": {
    "version": 1,
    "profile": { "name": string, "institution": string | null, "term": string | null },
    "rules": string[],
    "exams": [
      { "module": string, "date": "YYYY-MM-DD", "time": "HH:MM", "venue": string, "credits": number, "notes"?: string }
    ],
    "schedule": { "YYYY-MM-DD": string[] }
  },
  "questions"?: string[]
}

Rules:
- Use ISO dates (YYYY-MM-DD) and 24h times (HH:MM).
- Extract as much as possible even if some sections are missing.
- If the source text is empty, ask 1-3 questions to collect exams, dates, and any schedule hints.
- If a date is missing, infer from context or omit the entry.
- Keep exam modules short (e.g. "COS 210").
- Populate schedule blocks when the text includes a day plan.
- Include rules only if they exist; otherwise use an empty array.
- Use REST or EXAM as plain strings in schedule blocks when relevant.
${questionRule}- Output valid JSON only.

${profileLine}

SOURCE TEXT:
${rawText}${followupBlock}
`;
  };

  const extractJsonPayload = (text: string): string => {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('AI response did not include JSON.');
    }
    return text.slice(start, end + 1);
  };

  const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

  const normalizeDate = (value: unknown): string | null => {
    if (!isNonEmptyString(value)) {
      return null;
    }

    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeTime = (value: unknown): string => {
    if (!isNonEmptyString(value)) {
      return '09:00';
    }

    const trimmed = value.trim();
    if (/^\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(`1970-01-01T${trimmed}`);
    if (Number.isNaN(parsed.getTime())) {
      return '09:00';
    }

    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const coercePlanFromAi = (value: unknown): StudyPlan => {
    const raw = (value ?? {}) as Partial<StudyPlan>;
    const rules = Array.isArray(raw.rules)
      ? raw.rules.filter((rule): rule is string => isNonEmptyString(rule))
      : [];

    const exams = Array.isArray(raw.exams)
      ? raw.exams.flatMap((exam) => {
          if (!exam || typeof exam !== 'object') {
            return [];
          }

          const payload = exam as Record<string, unknown>;
          const moduleName = isNonEmptyString(payload.module) ? payload.module.trim() : '';
          const date = normalizeDate(payload.date);
          const time = normalizeTime(payload.time);
          const venue = isNonEmptyString(payload.venue) ? payload.venue.trim() : 'TBD';
          const creditsValue = typeof payload.credits === 'number'
            ? payload.credits
            : Number.parseInt(String(payload.credits ?? ''), 10);
          const credits = Number.isFinite(creditsValue) ? creditsValue : 0;

          if (!moduleName || !date) {
            return [];
          }

          const notes = isNonEmptyString(payload.notes) ? payload.notes.trim() : undefined;

          return [
            {
              module: moduleName,
              date,
              time,
              venue,
              credits,
              ...(notes ? { notes } : {}),
            },
          ];
        })
      : [];

    const schedule: Record<string, string[]> = {};
    if (raw.schedule && typeof raw.schedule === 'object') {
      for (const [key, value] of Object.entries(raw.schedule)) {
        if (!isNonEmptyString(key)) {
          continue;
        }
        if (Array.isArray(value)) {
          const blocks = value.filter((entry): entry is string => isNonEmptyString(entry));
          if (blocks.length > 0) {
            schedule[key] = blocks;
          }
        }
      }
    }

    return {
      version: 1,
      profile: {
        name: name || 'Student',
        institution: institution.trim() || undefined,
        term: term.trim() || undefined,
      },
      rules,
      exams,
      schedule,
    };
  };

  const handlePlanPaste = async () => {
    if (pasteLines.length === 0 && planMode !== 'guided') {
      setError('Paste at least one line before finishing.');
      setStep('error');
      return;
    }

    const apiKeyValue = resolveApiKey();
    if (!apiKeyValue) {
      setError('Add a Gemini API key to parse pasted text, or use the sample/import options.');
      setStep('error');
      return;
    }

    setStep('planParse');

    try {
      const prompt = buildPlanParserPrompt(pasteLines.join('\n'), planMode === 'guided', []);
      const reply = await askGemini(prompt, {
        apiKey: apiKeyValue,
        systemPrompt: 'You output JSON only.',
        preferredModel,
      });
      const payload = extractJsonPayload(reply);
      const parsed = JSON.parse(payload) as unknown;
      const parsedRoot = parsed as Record<string, unknown>;
      const questions = Array.isArray(parsedRoot.questions)
        ? parsedRoot.questions.filter((question) => isNonEmptyString(question))
        : [];
      const planPayload = parsedRoot.plan ?? parsedRoot;
      const plan = coercePlanFromAi(planPayload);

      if (planMode === 'guided' && questions.length > 0) {
        setFollowupQuestions(questions.slice(0, 3));
        setFollowupIndex(0);
        setFollowupAnswers([]);
        setStep('planFollowup');
        return;
      }

      if (plan.exams.length === 0) {
        throw new Error('No exams detected. Try pasting more detail.');
      }

      await handleSavePlan(plan, getDefaultPlanPath());
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Failed to parse pasted plan.';
      setError(message);
      setStep('error');
    }
  };

  const handleFollowupAnswer = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const question = followupQuestions[followupIndex] ?? 'Question';
    const nextAnswers = [...followupAnswers, `Q: ${question}`, `A: ${trimmed}`];
    setFollowupAnswers(nextAnswers);

    const nextIndex = followupIndex + 1;
    if (nextIndex < followupQuestions.length) {
      setFollowupIndex(nextIndex);
      return;
    }

    setStep('planParse');

    try {
      const apiKeyValue = resolveApiKey();
      if (!apiKeyValue) {
        throw new Error('Missing Gemini API key for follow-up parsing.');
      }

      const prompt = buildPlanParserPrompt(pasteLines.join('\n'), false, nextAnswers);
      const reply = await askGemini(prompt, {
        apiKey: apiKeyValue,
        systemPrompt: 'You output JSON only.',
        preferredModel,
      });
      const payload = extractJsonPayload(reply);
      const parsed = JSON.parse(payload) as unknown;
      const parsedRoot = parsed as Record<string, unknown>;
      const planPayload = parsedRoot.plan ?? parsedRoot;
      const plan = coercePlanFromAi(planPayload);

      if (plan.exams.length === 0) {
        throw new Error('No exams detected. Try adding more detail.');
      }

      await handleSavePlan(plan, getDefaultPlanPath());
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'Failed to parse pasted plan.';
      setError(message);
      setStep('error');
    }
  };

  const handlePasteLineSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setPasteLine('');
      return;
    }

    if (trimmed === '/done') {
      setPasteLine('');
      await handlePlanPaste();
      return;
    }

    if (trimmed === '/clear') {
      setPasteLines([]);
      setPasteLine('');
      return;
    }

    if (trimmed === '/back') {
      setPasteLines([]);
      setPasteLine('');
      setStep('planChoice');
      return;
    }

    setPasteLines((previous) => [...previous, trimmed]);
    setPasteLine('');
  };

  return (
    <Box flexDirection="column" paddingX={2} paddingTop={1}>
      <PixelHeader title="FIRST RUN SETUP" subtitle="per-person config" variant="serious" />
      <PixelDivider tone="light" />

      {step === 'welcome' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.text}>This wizard creates a local profile and plan file.</Text>
          <Text color={THEME.dim}>All data stays on your machine.</Text>
          <Box marginTop={1}>
            <Text color={THEME.dim}>Press </Text>
            <PixelKey label="ENTER" />
            <Text color={THEME.dim}> to start</Text>
          </Box>
        </Box>
      )}

      {step === 'name' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Profile name
          </Text>
          <Text color={THEME.dim}>Used in headers and prompts.</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={name} onChange={setName} onSubmit={() => setStep('institution')} />
          </Box>
        </Box>
      )}

      {step === 'institution' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Institution (optional)
          </Text>
          <Text color={THEME.dim}>Press Enter to skip.</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={institution} onChange={setInstitution} onSubmit={() => setStep('term')} />
          </Box>
        </Box>
      )}

      {step === 'term' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Term label (optional)
          </Text>
          <Text color={THEME.dim}>Example: 2026 Semester 1</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={term} onChange={setTerm} onSubmit={() => setStep('apiKey')} />
          </Box>
        </Box>
      )}

      {step === 'apiKey' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Gemini API key (optional)
          </Text>
          <Text color={THEME.dim}>Leave blank to use offline mode.</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={apiKey} onChange={setApiKey} onSubmit={() => setStep('model')} />
          </Box>
        </Box>
      )}

      {step === 'model' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Preferred model
          </Text>
          <Text color={THEME.dim}>Used when AI is enabled. Default is fine.</Text>
          <Box marginTop={1}>
            <SelectInput
              items={MODEL_CANDIDATES.map((model) => ({ label: model, value: model }))}
              onSelect={(item) => {
                setPreferredModel(item.value);
                setStep('planChoice');
              }}
            />
          </Box>
        </Box>
      )}

      {step === 'planChoice' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Plan source
          </Text>
          <Box marginTop={1}>
            <SelectInput items={planChoices} onSelect={handlePlanChoice} />
          </Box>
        </Box>
      )}

      {step === 'planPath' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Plan JSON path
          </Text>
          <Text color={THEME.dim}>Enter the full path to your plan file.</Text>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={planPath} onChange={setPlanPath} onSubmit={handlePlanPath} />
          </Box>
        </Box>
      )}

      {step === 'planPaste' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            {planMode === 'guided' ? 'Tell us about your exams and schedule' : 'Paste your timetable or plan text'}
          </Text>
          <Text color={THEME.dim}>
            Paste any format (markdown is fine). Type /done when finished.
          </Text>
          <Text color={THEME.dim}>
            {planMode === 'guided'
              ? 'You can skip pasting and type /done for the easiest setup.'
              : 'Commands: /done  /clear  /back'}
          </Text>
          {planMode === 'guided' ? (
            <Text color={THEME.dim}>AI will ask up to 3 quick questions if anything is missing.</Text>
          ) : null}
          {planMode === 'guided' ? (
            <Text color={THEME.dim}>Commands: /done  /clear  /back</Text>
          ) : null}
          <Box marginTop={1}>
            <Text color={THEME.text}>Lines captured: {pasteLines.length}</Text>
          </Box>
          {pasteLines.length > 0 ? (
            <Box marginTop={1} flexDirection="column">
              <Text color={THEME.dim}>Last lines:</Text>
              {pasteLines.slice(-4).map((line, index) => (
                <Text key={`${line}-${index}`} color={THEME.text}>
                  {line}
                </Text>
              ))}
            </Box>
          ) : null}
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={pasteLine} onChange={setPasteLine} onSubmit={handlePasteLineSubmit} />
          </Box>
        </Box>
      )}

      {step === 'planParse' && (
        <Box marginTop={1}>
          <Text color={THEME.dim}>Parsing your timetable into a study plan...</Text>
        </Box>
      )}

      {step === 'planFollowup' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.accent} bold>
            Quick setup question
          </Text>
          <Text color={THEME.dim}>Answer in one line. AI needs 1-3 answers max.</Text>
          <Box marginTop={1}>
            <Text color={THEME.text}>{followupQuestions[followupIndex] ?? 'Answer this question'}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={THEME.accent}>&gt; </Text>
            <TextInput value={pasteLine} onChange={setPasteLine} onSubmit={handleFollowupAnswer} />
          </Box>
        </Box>
      )}

      {step === 'saving' && (
        <Box marginTop={1}>
          <Text color={THEME.dim}>Saving setup files...</Text>
        </Box>
      )}

      {step === 'done' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.text}>Setup complete.</Text>
          <Text color={THEME.dim}>Config saved to {getConfigPath()}.</Text>
          <Text color={THEME.dim}>Plan saved to {planPath || getDefaultPlanPath()}.</Text>
          <Text color={THEME.dim}>Edit config to change usage limits.</Text>
          <Box marginTop={1}>
            <Text color={THEME.dim}>Press </Text>
            <PixelKey label="ENTER" />
            <Text color={THEME.dim}> to continue</Text>
          </Box>
        </Box>
      )}

      {step === 'error' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={THEME.warn}>Setup failed</Text>
          <Text color={THEME.dim}>{error ?? 'Unknown error'}</Text>
          <Box marginTop={1}>
            <Text color={THEME.dim}>Press </Text>
            <PixelKey label="ENTER" />
            <Text color={THEME.dim}> to retry</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
