import { useColorScheme } from 'react-native';

const light = {
  scheme: 'light' as const,
  page: '#f8f8f6',
  card: '#ffffff',
  sunken: '#f1f0ee',
  text: '#171616',
  muted: '#6b6867',
  faint: '#94918f',
  border: '#e3e1df',
  primary: '#171616',
  onPrimary: '#ffffff',
  accent: '#bfff51',
  onAccent: '#171616',
  link: '#008765',
  success: '#008765',
  successBg: '#e9fff8',
  warning: '#a66200',
  warningBg: '#fff1d6',
  danger: '#b31e19',
  dangerBg: '#ffe5e3',
  info: '#0b6a80',
  infoBg: '#dff6fb',
  brandBg: '#f7ffe8',
  overlay: 'rgba(15, 14, 14, 0.55)',
  skeleton: '#ebe9e6',
  bubbleUser: '#ffffff',
  bubbleBot: '#f1f0ee',
  bubbleAgent: '#e9fff8',
};

export type Theme = Omit<typeof light, 'scheme'> & { scheme: 'light' | 'dark' };

const dark: Theme = {
  scheme: 'dark',
  page: '#0f0e0e',
  card: '#1b1a1a',
  sunken: '#242222',
  text: '#f8f8f6',
  muted: '#b0adab',
  faint: '#7d7a78',
  border: '#2e2c2c',
  primary: '#bfff51',
  onPrimary: '#171616',
  accent: '#bfff51',
  onAccent: '#171616',
  link: '#4dffc9',
  success: '#4dffc9',
  successBg: '#0d2b23',
  warning: '#ffb84d',
  warningBg: '#33240a',
  danger: '#ff7a73',
  dangerBg: '#3a1413',
  info: '#6fd6ee',
  infoBg: '#0c2a31',
  brandBg: '#1f2a0d',
  overlay: 'rgba(0, 0, 0, 0.65)',
  skeleton: '#262424',
  bubbleUser: '#242222',
  bubbleBot: '#1b1a1a',
  bubbleAgent: '#0d2b23',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

export function toneColors(theme: Theme, tone: Tone) {
  switch (tone) {
    case 'success':
      return { fg: theme.success, bg: theme.successBg };
    case 'warning':
      return { fg: theme.warning, bg: theme.warningBg };
    case 'danger':
      return { fg: theme.danger, bg: theme.dangerBg };
    case 'info':
      return { fg: theme.info, bg: theme.infoBg };
    case 'brand':
      return { fg: theme.scheme === 'dark' ? theme.accent : theme.success, bg: theme.brandBg };
    default:
      return { fg: theme.muted, bg: theme.sunken };
  }
}
