import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { FlatList, RefreshControl, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '@/lib/theme';
import { EmptyState, ErrorState, ListSkeleton, OfflineBanner } from './states';
import type { IconName } from './primitives';

export function DataList<T>({
  query,
  items,
  renderItem,
  keyExtractor,
  header,
  emptyTitle,
  emptyMessage,
  emptyIcon,
  footerSpace = 0,
  inverted,
}: {
  query: Pick<UseQueryResult<unknown>, 'isPending' | 'isError' | 'error' | 'refetch' | 'isRefetching'>;
  items: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  header?: ReactElement | null;
  emptyTitle: string;
  emptyMessage?: string;
  emptyIcon?: IconName;
  /** Extra bottom room, e.g. for a floating action button. */
  footerSpace?: number;
  inverted?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  let body: ReactNode = null;
  if (query.isPending) body = <ListSkeleton />;
  else if (query.isError && items.length === 0) body = <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  else if (items.length === 0) body = <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.page }}
      data={body ? [] : items}
      inverted={inverted}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          <OfflineBanner />
          {header}
        </View>
      }
      ListHeaderComponentStyle={{ marginBottom: space.md }}
      ListEmptyComponent={<>{body}</>}
      ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
      contentContainerStyle={{
        padding: space.lg,
        paddingBottom: space.xxl + insets.bottom + footerSpace,
        flexGrow: 1,
      }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching && !query.isPending}
          onRefresh={() => void query.refetch()}
          tintColor={theme.muted}
        />
      }
    />
  );
}
