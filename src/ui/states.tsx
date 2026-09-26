import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { errorMessage, isNetworkError } from '@/lib/api';
import { radius, space, useTheme } from '@/lib/theme';
import { Button, type IconName } from './primitives';
import { Text } from './Text';

export function Skeleton({
  width = '100%',
  height = 14,
  rounded = radius.sm,
}: {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
}) {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width, height, borderRadius: rounded, backgroundColor: theme.skeleton, opacity }}
    />
  );
}

export function ListSkeleton({ rows = 6, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <View style={{ gap: space.lg, padding: space.lg }} accessibilityLabel="טוען">
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          {avatar ? <Skeleton width={44} height={44} rounded={12} /> : null}
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="85%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.cardsGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ flex: 1, minWidth: 150 }}>
          <Skeleton height={112} rounded={radius.lg} />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.stateIcon, { backgroundColor: theme.sunken }]}>
        <Ionicons name={icon} size={28} color={theme.muted} />
      </View>
      <Text variant="h3" center>
        {title}
      </Text>
      {message ? (
        <Text tone="muted" center>
          {message}
        </Text>
      ) : null}
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" /> : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const theme = useTheme();
  const network = isNetworkError(error);
  return (
    <View style={styles.center}>
      <View style={[styles.stateIcon, { backgroundColor: theme.dangerBg }]}>
        <Ionicons
          name={network ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={28}
          color={theme.danger}
        />
      </View>
      <Text variant="h3" center>
        {network ? 'אין חיבור לשרת' : 'משהו השתבש'}
      </Text>
      <Text tone="muted" center>
        {errorMessage(error)}
      </Text>
      <Button label="נסו שוב" icon="refresh" onPress={onRetry} variant="secondary" />
    </View>
  );
}

export function OfflineBanner() {
  const theme = useTheme();
  const net = useNetInfo();
  if (net.isConnected !== false) return null;
  return (
    <View style={[styles.banner, { backgroundColor: theme.warningBg, borderRadius: radius.md }]} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={16} color={theme.warning} />
      <Text variant="small" weight="medium" color={theme.warning} style={{ flex: 1 }}>
        אין חיבור לאינטרנט. הנתונים יתעדכנו כשהחיבור יחזור.
      </Text>
    </View>
  );
}

export function InlineNotice({
  tone = 'warning',
  icon = 'warning-outline',
  title,
  message,
}: {
  tone?: 'warning' | 'danger' | 'info' | 'success';
  icon?: IconName;
  title: string;
  message?: string;
}) {
  const theme = useTheme();
  const fg = theme[tone];
  const bg = theme[`${tone}Bg` as const];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={fg} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="semibold" color={fg}>
          {title}
        </Text>
        {message ? (
          <Text variant="small" color={fg}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
    minHeight: 280,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  notice: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
});
