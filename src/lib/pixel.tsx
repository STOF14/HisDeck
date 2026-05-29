import React from 'react';
import { Box, Text, useStdout } from 'ink';

export const COLOR_ENABLED = !process.env.NO_COLOR && process.env.HISDECK_NO_COLOR !== '1';

const BASE_THEME = {
  ink: '#1B2336',
  skyLight: '#B7D9F7',
  sky: '#8DBAE8',
  skyDark: '#5C7FAE',
  cloud: '#F2FBFF',
  cloudMid: '#D4E6F6',
  cloudDark: '#9DBAD6',
  accent: '#3A6EA5',
  dim: '#647691',
  text: '#EAF6FF',
  warn: '#E6A86D',
} as const;

export const THEME: Record<keyof typeof BASE_THEME, string | undefined> = Object.fromEntries(
  Object.entries(BASE_THEME).map(([key, value]) => [key, COLOR_ENABLED ? value : undefined]),
) as Record<keyof typeof BASE_THEME, string | undefined>;

type Shade = 'top' | 'mid' | 'base' | 'bot';
type SpriteLine = { text: string; shade: Shade };
type Sprite = SpriteLine[];

const B = '██';

function row(indent: number, filled: number, ...rest: number[]): string {
  let output = ' '.repeat(indent * 2);
  let paint = true;
  for (const count of [filled, ...rest]) {
    output += paint ? B.repeat(count) : ' '.repeat(count * 2);
    paint = !paint;
  }
  return output;
}

export const CLOUD_XL: Sprite = [
  { shade: 'top', text: row(4, 2) },
  { shade: 'top', text: row(3, 4, 2, 2) },
  { shade: 'mid', text: row(2, 8, 1, 2) },
  { shade: 'base', text: row(1, 13) },
  { shade: 'base', text: row(0, 16) },
  { shade: 'bot', text: row(0, 16) },
];

export const CLOUD_LG: Sprite = [
  { shade: 'top', text: row(3, 2) },
  { shade: 'top', text: row(2, 4, 1, 2) },
  { shade: 'mid', text: row(1, 6, 1, 2) },
  { shade: 'base', text: row(0, 12) },
  { shade: 'base', text: row(0, 12) },
  { shade: 'bot', text: row(0, 12) },
];

export const CLOUD_MD: Sprite = [
  { shade: 'top', text: row(2, 2) },
  { shade: 'top', text: row(1, 4, 1, 2) },
  { shade: 'base', text: row(0, 10) },
  { shade: 'base', text: row(0, 10) },
  { shade: 'bot', text: row(0, 10) },
];

export const CLOUD_SM: Sprite = [
  { shade: 'top', text: row(1, 2) },
  { shade: 'mid', text: row(0, 4, 1, 2) },
  { shade: 'base', text: row(0, 8) },
  { shade: 'bot', text: row(0, 8) },
];

export const CLOUD_XS: Sprite = [
  { shade: 'mid', text: row(0, 2, 1, 1) },
  { shade: 'base', text: row(0, 6) },
  { shade: 'bot', text: row(0, 6) },
];

export const CLOUD_WIDE: Sprite = [
  { shade: 'top', text: row(3, 1, 3, 1, 3, 1, 1) },
  { shade: 'mid', text: row(1, 2, 1, 4, 1, 4, 1, 2) },
  { shade: 'base', text: row(0, 20) },
  { shade: 'bot', text: row(0, 20) },
];

export const CLOUD_PUFF: Sprite = [
  { shade: 'top', text: row(1, 2) },
  { shade: 'base', text: row(0, 4) },
  { shade: 'bot', text: row(0, 4) },
];

function shadeColor(shade: Shade): string | undefined {
  switch (shade) {
    case 'top':
      return THEME.cloudDark;
    case 'mid':
      return THEME.cloudMid;
    case 'base':
      return THEME.cloud;
    case 'bot':
      return THEME.cloudDark;
    default:
      return THEME.cloud;
  }
}

export const CloudSprite = ({ sprite }: { sprite: Sprite }) => (
  <Box flexDirection="column">
    {sprite.map((line, index) => (
      <Text key={`${line.shade}-${index}`} color={shadeColor(line.shade)}>
        {line.text}
      </Text>
    ))}
  </Box>
);

const SKY_BANDS = [
  { pattern: '.:..', color: THEME.skyLight },
  { pattern: '::..', color: THEME.sky },
  { pattern: '..::', color: THEME.skyDark },
  { pattern: '.::.', color: THEME.sky },
];

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

interface CloudPlacement {
  sprite: Sprite;
  offsetX?: number;
}

export const CloudScene = ({
  clouds,
  width,
}: {
  clouds: CloudPlacement[];
  width: number;
}) => {
  const maxRows = Math.max(...clouds.map((cloud) => cloud.sprite.length));
  const rows: React.ReactNode[] = [];

  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    const segments: React.ReactNode[] = [];
    let cursor = 0;

    clouds.forEach((cloud, cloudIndex) => {
      if (rowIndex >= cloud.sprite.length) {
        return;
      }

      const line = cloud.sprite[rowIndex];
      const offsetX = cloud.offsetX ?? 0;
      if (offsetX > cursor) {
        segments.push(
          <Text key={`gap-${cloudIndex}-${rowIndex}`} color={THEME.sky}>
            {' '.repeat(offsetX - cursor)}
          </Text>,
        );
        cursor = offsetX;
      }

      segments.push(
        <Text key={`cloud-${cloudIndex}-${rowIndex}`} color={shadeColor(line.shade)}>
          {line.text}
        </Text>,
      );
      cursor += line.text.length;
    });

    if (cursor < width) {
      segments.push(
        <Text key={`end-${rowIndex}`} color={THEME.sky}>
          {' '.repeat(width - cursor)}
        </Text>,
      );
    }

    rows.push(
      <Box key={`row-${rowIndex}`} flexDirection="row">
        {segments}
      </Box>,
    );
  }

  return <Box flexDirection="column">{rows}</Box>;
};

export const PixelHeader = ({
  title,
  subtitle,
  variant = 'playful',
}: {
  title: string;
  subtitle?: string;
  variant?: 'playful' | 'serious';
}) => {
  const columns = useTerminalWidth();
  const contentWidth = getContentWidth(columns);
  const compact = contentWidth < 60;
  const bands = variant === 'serious'
    ? compact
      ? SKY_BANDS.slice(0, 1)
      : SKY_BANDS.slice(0, 2)
    : compact
      ? SKY_BANDS.slice(0, 2)
      : SKY_BANDS;

  return (
    <Box flexDirection="column">
      {bands.map((band, index) => (
        <Text key={`${band.pattern}-${index}`} color={band.color}>
          {repeatToWidth(band.pattern, contentWidth)}
        </Text>
      ))}
      {variant === 'serious' ? (
        <CloudScene
          width={contentWidth}
          clouds={[{ sprite: CLOUD_XS, offsetX: Math.max(2, contentWidth - 18) }]}
        />
      ) : compact ? (
        <CloudScene width={contentWidth} clouds={[{ sprite: CLOUD_SM, offsetX: 2 }]} />
      ) : (
        <CloudScene
          width={contentWidth}
          clouds={[
            { sprite: CLOUD_XS, offsetX: 2 },
            { sprite: CLOUD_LG, offsetX: Math.floor(contentWidth / 4) },
            { sprite: CLOUD_MD, offsetX: Math.floor(contentWidth / 2) },
            { sprite: CLOUD_XS, offsetX: Math.floor(contentWidth * 0.8) },
          ]}
        />
      )}
      <Box marginTop={1}>
        <Text color={THEME.accent} bold>
          {title}
        </Text>
        {subtitle ? <Text color={THEME.dim}>  {subtitle}</Text> : null}
      </Box>
    </Box>
  );
};
