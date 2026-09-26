import { router } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { useTheme } from '@/lib/theme';
import { Text } from './Text';

export function HeaderClose({ disabled }: { disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="סגירה"
      hitSlop={12}
      style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.6 : 1, paddingHorizontal: 4 })}
    >
      <Text weight="medium" color={theme.link}>
        סגירה
      </Text>
    </Pressable>
  );
}

/** iOS modal sheets have no back button; Android keeps its own back arrow. */
export const modalOptions = {
  presentation: 'modal' as const,
  ...(Platform.OS === 'ios' ? { headerLeft: () => <HeaderClose /> } : null),
};
