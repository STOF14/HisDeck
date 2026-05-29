import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { askGemini } from '../lib/gemini.js';
import { answerLocally } from '../lib/localAgent.js';
import { buildSystemPrompt } from '../lib/systemPrompt.js';
import { PixelHeader, THEME, useTerminalWidth } from '../lib/pixel.js';
import type { StudyPlan } from '../data/studyPlan.js';
import type { AppConfig } from '../lib/storage.js';
import { estimateTokens, recordUsage, type UsageDay } from '../lib/usage.js';
import { getLocalDateKey } from '../data/studyPlan.js';
import { loadHistory, saveHistory, type ChatMessage } from '../lib/history.js';

type Message = ChatMessage;

export const Agent = ({
  plan,
  config,
  onUsageUpdate,
  onBack,
}: {
  plan: StudyPlan;
  config: AppConfig;
  onUsageUpdate: (usage: UsageDay) => void;
  onBack: () => void;
}) => {
  const columns = useTerminalWidth();
  const compact = columns < 100;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const aiDisabled = process.env.HISDECK_NO_AI === '1';
  const [mode, setMode] = useState<'online' | 'offline'>(
    !aiDisabled && (config.geminiApiKey ?? process.env.GEMINI_API_KEY) ? 'online' : 'offline',
  );

  useEffect(() => {
    let active = true;
    loadHistory()
      .then((history) => {
        if (!active) {
          return;
        }
        if (history.length > 0) {
          setMessages(history);
        } else {
          setMessages([
            { role: 'agent', text: 'Personal study assistant ready. Ask for plans, reminders, or explanations.' },
          ]);
        }
      })
      .catch(() => {
        if (active) {
          setMessages([
            { role: 'agent', text: 'Personal study assistant ready. Ask for plans, reminders, or explanations.' },
          ]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    void saveHistory(messages);
  }, [messages]);

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();

    if (!trimmed || loading) {
      return;
    }

    if (trimmed === '/back') {
      onBack();
      return;
    }

    setMessages((previous) => [...previous, { role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const apiKey = aiDisabled ? undefined : config.geminiApiKey ?? process.env.GEMINI_API_KEY;
      const systemPrompt = buildSystemPrompt(plan);

      if (apiKey) {
        const reply = await askGemini(trimmed, {
          apiKey,
          systemPrompt,
          preferredModel: config.preferredModel,
        });
        const usageTokens = estimateTokens(trimmed, reply);
        const nextUsage = await recordUsage(getLocalDateKey(), usageTokens, 1);
        onUsageUpdate(nextUsage);
        setMode('online');
        setMessages((previous) => [...previous, { role: 'agent', text: reply }]);
      } else {
        setMode('offline');
        setMessages((previous) => [...previous, { role: 'agent', text: answerLocally(trimmed, plan) }]);
      }
    } catch {
      setMode('offline');
      const fallback = answerLocally(trimmed, plan);
      setMessages((previous) => [...previous, { role: 'agent', text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const visibleMessages = messages.slice(-6);

  const renderAgentLine = (line: string) => {
    const labelMatch = /^(PLAN|CONTEXT|ACTIONS|NEXT|ASK):\s*/.exec(line);
    if (!labelMatch) {
      return <Text color={THEME.text}>{line}</Text>;
    }

    const label = labelMatch[1];
    const rest = line.slice(labelMatch[0].length);
    return (
      <Text>
        <Text color={THEME.accent} bold>
          {label}:
        </Text>
        <Text color={THEME.text}> {rest}</Text>
      </Text>
    );
  };

  return (
    <Box flexDirection="column" paddingX={2} paddingTop={1}>
      <PixelHeader title="PERSONAL ASSISTANT" subtitle={`mode: ${mode}  command /back`} variant="playful" />

      <Box marginTop={1} flexDirection={compact ? 'column' : 'row'}>
        <Box flexDirection="column" width={compact ? undefined : 34}>
          <Panel title="Scope">
            <Text color={THEME.text}>Plans, routines, schedules, explanations</Text>
            <Text color={THEME.dim}>Claude-style flow: Plan, Context, Actions</Text>
            <Text color={THEME.dim}>No answers for graded assessments</Text>
            <Box marginTop={1}>
              <Text color={THEME.accent} bold>
                Commands
              </Text>
            </Box>
            <Text color={THEME.text}>/back  return to dashboard</Text>
            <Box marginTop={1}>
              <Text color={THEME.accent} bold>
                Quick prompts
              </Text>
            </Box>
            <Text color={THEME.text}>What do I study today?</Text>
            <Text color={THEME.text}>Build my evening routine</Text>
            <Text color={THEME.text}>Summarize Fourier series in 3 lines</Text>
            <Text color={THEME.text}>How many days till COS 212?</Text>
          </Panel>
        </Box>

        <Box flexDirection="column" flexGrow={1} marginLeft={compact ? 0 : 1} marginTop={compact ? 1 : 0}>
          <Panel title="Conversation">
            {visibleMessages.map((message, index) => (
              <Box key={`${message.role}-${index}`} marginBottom={1}>
                <Text color={message.role === 'user' ? THEME.accent : THEME.cloudDark} bold>
                  {message.role === 'user' ? 'YOU' : 'ASSIST'}
                </Text>
                <Text color={THEME.dim}> | </Text>
                <Box flexDirection="column">
                  {message.text.split('\n').map((line, lineIndex) => (
                    <Box key={`${index}-${lineIndex}`}>
                      {message.role === 'agent' ? renderAgentLine(line) : <Text color={THEME.text}>{line}</Text>}
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
            {loading ? (
              <Box>
                <Text color={THEME.accent}>
                  <Spinner type="dots" />
                </Text>
                <Text color={THEME.dim}> working</Text>
              </Box>
            ) : null}
          </Panel>

          <Box marginTop={1}>
            <Text color={THEME.accent} bold>
              &gt; 
            </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder="what do I study today?"
            />
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={THEME.dim}>Type </Text>
        <Text color={THEME.accent} bold>
          /back
        </Text>
        <Text color={THEME.dim}> to return</Text>
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