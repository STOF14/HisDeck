import React from 'react';
import { Box, Text, useStdout } from 'ink';

export const THEME = {
  ink: '#1B2A3A',
  skyLight: '#A7D1F4',
  sky: '#7FB1E3',
  skyDark: '#4F79A4',
  cloud: '#EAF6FF',
  cloudMid: '#CFE3F7',
  cloudDark: '#9BB7D3',
  accent: '#3E78B2',
  dim: '#6C7F99',
  text: '#EAF6FF',
  warn: '#F2B872',
};

const SKY_BANDS = [
  { pattern: '.:..', color: THEME.skyLight },
  { pattern: '::..', color: THEME.sky },
  { pattern: '..::', color: THEME.skyDark },
  { pattern: '.::.', color: THEME.sky },
];

const CLOUD_LINE_1 = '      _.-._           _.-._            _.-._      ';
const CLOUD_LINE_2 = '   .-(     )-.     .-(     )-.      .-(     )-.   ';
const CLOUD_LINE_3 = '  (___.-.___)     (___.-.___)      (___.-.___)    ';

function repeatToWidth(pattern: string, width: number): string {
  if (width <= 0) {
    return '';
  }

  let output = '';

  while (output.length < width) {
    output += pattern;
  }

  return output.slice(0, width);
}

function centerLine(line: string, width: number): string {
  if (line.length >= width) {
    return line.slice(0, width);
  }

  const leftPad = Math.floor((width - line.length) / 2);
  const rightPad = width - line.length - leftPad;

  return `${' '.repeat(leftPad)}${line}${' '.repeat(rightPad)}`;
}

export function useTerminalWidth(): number {
  const { stdout } = useStdout();
  return stdout?.columns ?? 80;
}

export function getContentWidth(columns: number): number {
  return Math.max(44, Math.min(columns - 4, 112));
}

export const PixelDivider = ({ tone = 'light' }: { tone?: 'light' | 'dark' }) => {
  const columns = useTerminalWidth();
  const width = getContentWidth(columns);
  const color = tone === 'dark' ? THEME.skyDark : THEME.sky;

  return <Text color={color}>{repeatToWidth('=.', width)}</Text>;
};

export const PixelKey = ({ label }: { label: string }) => (
  <Text color={THEME.accent} bold>
    [{label}]
  </Text>
);

export const PixelHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => {
  const columns = useTerminalWidth();
  const contentWidth = getContentWidth(columns);

  return (
    <Box flexDirection="column">
      {SKY_BANDS.map((band, index) => (
        <Text key={`${band.pattern}-${index}`} color={band.color}>
          {repeatToWidth(band.pattern, contentWidth)}
        </Text>
      ))}
      <Text color={THEME.cloudDark}>{centerLine(CLOUD_LINE_1, contentWidth)}</Text>
      <Text color={THEME.cloudMid}>{centerLine(CLOUD_LINE_2, contentWidth)}</Text>
      <Text color={THEME.cloud}>{centerLine(CLOUD_LINE_3, contentWidth)}</Text>
      <Box marginTop={1}>
        <Text color={THEME.accent} bold>
          {title}
        </Text>
        {subtitle ? <Text color={THEME.dim}>  {subtitle}</Text> : null}
      </Box>
    </Box>
  );
};
