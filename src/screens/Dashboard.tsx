import React from 'react';
import { Box, Text, useInput } from 'ink';
import {
  type StudyPlan,
  getDaysUntil,
  getLocalDateKey,
  getNextExam,
  getTodaySchedule,
} from '../data/studyPlan.js';
import { PixelDivider, PixelHeader, PixelKey, THEME, useTerminalWidth } from '../lib/pixel.js';
import type { AppConfig } from '../lib/storage.js';
import type { UsageDay } from '../lib/usage.js';

export const Dashboard = ({
  plan,
  config,
  usage,
  onOpenAgent,
}: {
  plan: StudyPlan;
  config: AppConfig;
  usage: UsageDay;
  onOpenAgent: () => void;
}) => {
  const columns = useTerminalWidth();
  const compact = columns < 100;
  const nextExam = getNextExam(plan);
  const daysLeft = nextExam ? getDaysUntil(nextExam.date) : 0;
  const todayBlocks = getTodaySchedule(plan);
  const todayKey = getLocalDateKey();

  const urgency = nextExam ? Math.max(0, 10 - daysLeft) : 0;
  const urgencyBar = buildBar(urgency, 10, 12);
  const requestLimit = config.requestLimitPerDay ?? 1500;
  const tokenLimit = config.tokenLimitPerDay ?? 1000000;
  const requestsLeft = Math.max(0, requestLimit - usage.requests);
  const tokensLeft = Math.max(0, tokenLimit - usage.tokens);
  const requestBar = buildBar(requestsLeft, requestLimit, 12);
  const tokenBar = buildBar(tokensLeft, tokenLimit, 12);

  useInput((input) => {
    if (input === 'a') {
      onOpenAgent();
    }
  });

  const BlocksPanel = (
    <Panel title="Study blocks">
      {todayBlocks.map((block, index) => (
        <Box key={`${block}-${index}`}>
          <Text color={THEME.dim}>Block {index + 1}  </Text>
          <Text color={THEME.text}>{block}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color={THEME.dim}>50 min on  10 min off  sleep by 22:30</Text>
      </Box>
    </Panel>
  );

  const NextExamPanel = (
    <Panel title="Next exam">
      {nextExam ? (
        <Box flexDirection="column">
          <Text color={THEME.text} bold>
            {nextExam.module}
          </Text>
          <Text color={THEME.text}>
            {nextExam.date}  {nextExam.time}
          </Text>
          <Text color={THEME.text}>{nextExam.venue}</Text>
          {nextExam.notes ? <Text color={THEME.dim}>{nextExam.notes}</Text> : null}
          <Box marginTop={1}>
            <Text color={THEME.accent} bold>
              Countdown
            </Text>
            <Text color={daysLeft <= 2 ? THEME.warn : THEME.text}>
              {daysLeft === 0 ? 'TODAY' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} away`}
            </Text>
            <Text color={THEME.dim}>{urgencyBar} urgency</Text>
          </Box>
        </Box>
      ) : (
        <Text color={THEME.dim}>All exams complete</Text>
      )}
    </Panel>
  );

  const AllExamsPanel = (
    <Panel title="All exams">
      {plan.exams.map((exam) => {
        const examDays = getDaysUntil(exam.date);
        const label = examDays === 0 ? 'D0' : `D-${examDays}`;

        return (
          <Box key={exam.module}>
            <Text color={THEME.dim}>{label.padEnd(4)} </Text>
            <Text color={THEME.text}>{exam.date}</Text>
            <Text color={THEME.dim}>  </Text>
            <Text color={THEME.text}>{exam.module}</Text>
          </Box>
        );
      })}
    </Panel>
  );

  const UsagePanel = (
    <Panel title="Usage">
      <Box>
        <Text color={THEME.text}>Requests left </Text>
        <Text color={THEME.dim}>{requestBar}</Text>
      </Box>
      <Text color={THEME.dim}>Used {usage.requests} / {requestLimit}</Text>
      <Box marginTop={1}>
        <Text color={THEME.text}>Tokens left </Text>
        <Text color={THEME.dim}>{tokenBar}</Text>
      </Box>
      <Text color={THEME.dim}>Est. used {usage.tokens} / {tokenLimit}</Text>
    </Panel>
  );

  return (
    <Box flexDirection="column" paddingX={2} paddingTop={1}>
      <PixelHeader
        title="STUDY PLAN"
        subtitle={`${plan.profile.name}${plan.profile.institution ? `  ${plan.profile.institution}` : ''}${plan.profile.term ? `  ${plan.profile.term}` : ''}`}
      />
      <PixelDivider tone="light" />

      <Box marginTop={1} borderStyle="double" borderColor={THEME.skyDark} paddingX={2} paddingY={1}>
        <Text color={THEME.dim}>DATE </Text>
        <Text color={THEME.text}>{todayKey}</Text>
        <Text color={THEME.dim}>  NEXT </Text>
        <Text color={THEME.text}>{nextExam ? nextExam.module : 'none'}</Text>
        <Text color={THEME.dim}>  DAYS </Text>
        <Text color={THEME.text}>{nextExam ? String(daysLeft) : '-'}</Text>
      </Box>

      <Box marginTop={1} flexDirection={compact ? 'column' : 'row'}>
        <Box flexDirection="column" flexGrow={1}>
          {BlocksPanel}
        </Box>
        {compact ? <Box marginTop={1}>{NextExamPanel}</Box> : <Box marginLeft={1}>{NextExamPanel}</Box>}
      </Box>

      <Box marginTop={1} flexDirection={compact ? 'column' : 'row'}>
        <Box flexGrow={1}>{AllExamsPanel}</Box>
        {compact ? <Box marginTop={1}>{UsagePanel}</Box> : <Box marginLeft={1}>{UsagePanel}</Box>}
      </Box>

      <Box marginTop={1}>
        <Text color={THEME.dim}>Press </Text>
        <PixelKey label="A" />
        <Text color={THEME.dim}> agent  </Text>
        <PixelKey label="Q" />
        <Text color={THEME.dim}> quit</Text>
      </Box>
    </Box>
  );
};

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box flexDirection="column" borderStyle="double" borderColor={THEME.skyDark} paddingX={2} paddingY={1}>
    <Text color={THEME.accent} bold>
      {title}
    </Text>
    <Box marginTop={1} flexDirection="column">
      {children}
    </Box>
  </Box>
);

const buildBar = (value: number, max: number, width: number): string => {
  if (max <= 0) {
    return `[${'.'.repeat(width)}]`;
  }

  const safeValue = Math.min(Math.max(value, 0), max);
  const filled = Math.round((safeValue / max) * width);
  return `[${'#'.repeat(filled)}${'.'.repeat(width - filled)}]`;
};