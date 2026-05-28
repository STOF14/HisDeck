import 'dotenv/config';
import React, { useEffect, useState } from 'react';
import { Box, Text, render, useApp, useInput } from 'ink';
import BigText from 'ink-big-text';
import { Agent } from './screens/Agent.js';
import { Dashboard } from './screens/Dashboard.js';
import { Setup } from './screens/Setup.js';
import { COLOR_ENABLED, PixelHeader, PixelKey, THEME } from './lib/pixel.js';
import { getConfigPath, loadConfig, loadPlan, type AppConfig } from './lib/storage.js';
import { loadUsage, type UsageDay } from './lib/usage.js';
import type { StudyPlan } from './data/studyPlan.js';
import { getDaysUntil, getLocalDateKey } from './data/studyPlan.js';

type Screen = 'splash' | 'dashboard' | 'agent';
type AppStatus = 'loading' | 'setup' | 'ready' | 'error';

const Splash = ({ plan, onDone }: { plan: StudyPlan; onDone: () => void }) => {
  const examCount = plan.exams.length;
  const lastExam = plan.exams[plan.exams.length - 1];
  const daysLeft = lastExam ? Math.max(0, getDaysUntil(lastExam.date)) : 0;
  const subtitle = `${plan.profile.name}${plan.profile.institution ? `  ${plan.profile.institution}` : ''}${plan.profile.term ? `  ${plan.profile.term}` : ''}`;

  useInput((_, key) => {
    if (key.return) {
      onDone();
    }
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingTop={1}>
      <PixelHeader title="STUDY PLAN" subtitle={subtitle} />
      <Box marginTop={1}>
        <BigText
          text="STUDY"
          font="block"
          colors={COLOR_ENABLED ? [THEME.accent ?? '#3E78B2'] : undefined}
        />
        <BigText
          text="PLAN"
          font="block"
          colors={COLOR_ENABLED ? [THEME.accent ?? '#3E78B2'] : undefined}
        />
      </Box>
      <Box marginTop={1}>
        <Text color={THEME.dim}>{examCount} exams  {daysLeft} days  press </Text>
        <PixelKey label="ENTER" />
        <Text color={THEME.dim}> to continue</Text>
      </Box>
    </Box>
  );
};

const App = () => {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [usageDay, setUsageDay] = useState<UsageDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('splash');
  const { exit } = useApp();

  useInput((input) => {
    if (input === 'q' && screen === 'dashboard') {
      exit();
    }
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        if (process.env.HISDECK_FORCE_SETUP === '1') {
          setStatus('setup');
          return;
        }

        const storedConfig = await loadConfig();
        if (!storedConfig) {
          setStatus('setup');
          return;
        }

        const storedPlan = await loadPlan(storedConfig.planPath);
        const usageStore = await loadUsage();
        const todayKey = getLocalDateKey();
        const dayUsage = usageStore.days[todayKey] ?? { date: todayKey, requests: 0, tokens: 0 };

        setConfig(storedConfig);
        setPlan(storedPlan);
        setUsageDay(dayUsage);
        setStatus('ready');
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load configuration.';
        setError(message);
        setStatus('error');
      }
    };

    void initialize();
  }, []);

  if (status === 'loading') {
    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <PixelHeader title="LOADING" subtitle="config and plan" />
        <Box marginTop={1}>
          <Text color={THEME.dim}>Reading local profile...</Text>
        </Box>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <PixelHeader title="CONFIG ERROR" subtitle="setup required" />
        <Box marginTop={1}>
          <Text color={THEME.warn}>{error ?? 'Unknown error'}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={THEME.dim}>Delete {getConfigPath()} to rerun setup.</Text>
        </Box>
      </Box>
    );
  }

  if (status === 'setup') {
    return (
      <Setup
        onComplete={(nextConfig, nextPlan) => {
          setConfig(nextConfig);
          setPlan(nextPlan);
          setUsageDay({ date: getLocalDateKey(), requests: 0, tokens: 0 });
          setStatus('ready');
          setScreen('splash');
        }}
      />
    );
  }

  if (!config || !plan || !usageDay) {
    return null;
  }

  if (screen === 'splash') {
    return <Splash plan={plan} onDone={() => setScreen('dashboard')} />;
  }

  if (screen === 'agent') {
    return (
      <Agent
        plan={plan}
        config={config}
        onUsageUpdate={(nextUsage) => setUsageDay(nextUsage)}
        onBack={() => setScreen('dashboard')}
      />
    );
  }

  return (
    <Dashboard plan={plan} config={config} usage={usageDay} onOpenAgent={() => setScreen('agent')} />
  );
};

render(<App />);