import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme, type Theme } from '@/lib/theme';

export const fonts = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  semibold: 'Heebo_600SemiBold',
  bold: 'Heebo_700Bold',
} as const;

type Variant = 'display' | 'title' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label';
type Weight = keyof typeof fonts;
type ToneName = 'text' | 'muted' | 'faint' | 'danger' | 'success' | 'warning' | 'link' | 'onPrimary';

const variants: Record<Variant, { size: number; line: number; weight: Weight }> = {
  display: { size: 30, line: 38, weight: 'bold' },
  title: { size: 22, line: 30, weight: 'bold' },
  h2: { size: 18, line: 26, weight: 'semibold' },
  h3: { size: 16, line: 23, weight: 'semibold' },
  body: { size: 15, line: 22, weight: 'regular' },
  small: { size: 13, line: 19, weight: 'regular' },
  caption: { size: 12, line: 17, weight: 'regular' },
  label: { size: 13, line: 18, weight: 'medium' },
};

function toneColor(theme: Theme, tone: ToneName) {
  return theme[tone];
}

export type AppTextProps = TextProps & {
  variant?: Variant;
  weight?: Weight;
  tone?: ToneName;
  color?: string;
  center?: boolean;
};

export function Text({ variant = 'body', weight, tone = 'text', color, center, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const v = variants[variant];
  const base: TextStyle = {
    fontFamily: fonts[weight ?? v.weight],
    fontSize: v.size,
    lineHeight: v.line,
    color: color ?? toneColor(theme, tone),
    textAlign: center ? 'center' : 'left',
    writingDirection: 'rtl',
  };
  return <RNText maxFontSizeMultiplier={1.4} {...rest} style={[base, style]} />;
}
