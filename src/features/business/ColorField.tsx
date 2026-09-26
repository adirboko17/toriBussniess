import { Pressable, StyleSheet, View } from 'react-native';
import { space, useTheme } from '@/lib/theme';
import { Field } from '@/ui/inputs';

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const PRESETS = ['#111111', '#6bff85', '#bfff51', '#0cffbe', '#ff5c8a', '#c084fc', '#60a5fa', '#f59e0b', '#ef4444', '#a3a3a3'];

export function ColorField({
  value,
  onChange,
  label = 'צבע ראשי',
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const theme = useTheme();
  const valid = HEX_COLOR.test(value);
  return (
    <View style={{ gap: space.sm }}>
      <Field
        label={label}
        value={value}
        onChangeText={(text) => {
          const clean = text.replace(/[^#0-9a-fA-F]/g, '').slice(0, 7);
          onChange(clean && !clean.startsWith('#') ? `#${clean}` : clean);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="#RRGGBB"
        maxLength={7}
        ltr
        error={value && !valid ? 'נדרש פורמט HEX כמו #1A2B3C' : null}
        trailing={
          <View
            style={[
              styles.swatch,
              { backgroundColor: valid ? value : 'transparent', borderColor: theme.border },
            ]}
          />
        }
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {PRESETS.map((color) => {
          const active = value.toLowerCase() === color;
          return (
            <Pressable
              key={color}
              onPress={() => onChange(color)}
              accessibilityRole="button"
              accessibilityLabel={`צבע ${color}`}
              accessibilityState={{ selected: active }}
              style={[
                styles.preset,
                { backgroundColor: color, borderColor: active ? theme.text : theme.border, borderWidth: active ? 3 : 1 },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swatch: { width: 26, height: 26, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth },
  preset: { width: 34, height: 34, borderRadius: 17 },
});
