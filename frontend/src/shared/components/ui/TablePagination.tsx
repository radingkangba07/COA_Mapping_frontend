import React from 'react';
import { Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { tint } from '@/features/master-data-wizard/utils/colorMix';
import { getPageNumbers } from '@/shared/utils/pagination.utils';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 15, 25, 50];

interface TablePaginationProps {
  /** Current page, 0-indexed. */
  readonly page: number;
  readonly pageCount: number;
  /** 1-indexed row numbers for "Showing X–Y of Z" — 0 when there are no rows. */
  readonly startRow: number;
  readonly endRow: number;
  readonly total: number;
  /** Trailing noun in "Showing X–Y of Z {itemLabel}" — both current
   *  consumers (Profile's FieldsTable, Mapping's MappingTable) use
   *  "fields", so it's the default rather than a required prop. */
  readonly itemLabel?: string;
  readonly onPageChange: (page: number) => void;
  readonly pageSize: number;
  readonly pageSizeOptions?: readonly number[];
  readonly onPageSizeChange: (size: number) => void;
  readonly testID?: string;
}

/**
 * Extracted from `FieldsTable`'s own Prev/numbered/Next footer (byte-for-
 * byte same markup/testIDs) so Mapping's `MappingTable` didn't need a
 * second copy of it. Renders nothing when there's only one page — callers
 * don't need their own `total > pageSize` guard.
 */
export function TablePagination({
  page,
  pageCount,
  startRow,
  endRow,
  total,
  itemLabel = 'fields',
  onPageChange,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  testID,
}: TablePaginationProps): React.JSX.Element | null {
  if (pageCount <= 1) return null;

  return (
    <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-border px-[14px] py-[11px]">
      <Text className="text-xs text-muted-foreground">
        Showing <Text className="font-mono text-xs text-foreground">{startRow}–{endRow}</Text> of{' '}
        <Text className="font-mono text-xs text-foreground">{total}</Text> {itemLabel}
      </Text>
      <View className="flex-row items-center gap-[5px]">
        <Select
          options={pageSizeOptions.map((n) => ({ label: `${n} per page`, value: String(n) }))}
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
          triggerClassName="h-auto rounded-[7px] px-[11px] py-[6px]"
          dropdownWidth={140}
          testID={testID !== undefined ? `${testID}-page-size` : undefined}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-auto rounded-[7px] px-[11px] py-[6px]"
          disabled={page <= 0}
          onPress={() => onPageChange(page - 1)}
          testID={testID !== undefined ? `${testID}-prev` : undefined}
        >
          <View className="flex-row items-center gap-[5px]">
            <ChevronLeft size={14} color={colors.foreground} />
            <Text className="text-xs font-medium text-foreground">Prev</Text>
          </View>
        </Button>
        {getPageNumbers(page, pageCount).map((token, i) => {
          if (token === 'ellipsis') {
            return (
              <Text key={`ellipsis-${i}`} className="px-1 font-mono text-xs text-muted-foreground">
                …
              </Text>
            );
          }
          const pageIndex = token;
          const isActive = pageIndex === page;
          return (
            <Button
              key={pageIndex}
              variant="outline"
              size="sm"
              onPress={() => onPageChange(pageIndex)}
              className="h-auto min-w-8 rounded-[7px] px-[9px] py-[6px] hover:border-accent hover:bg-card"
              style={
                isActive
                  ? { borderColor: colors.accent, backgroundColor: tint(colors.accent, 12) }
                  : undefined
              }
              testID={testID !== undefined ? `${testID}-page-${pageIndex + 1}` : undefined}
            >
              <Text
                className="font-mono text-xs font-semibold"
                style={{ color: isActive ? colors.accent : colors.foreground }}
              >
                {pageIndex + 1}
              </Text>
            </Button>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="h-auto rounded-[7px] px-[11px] py-[6px]"
          disabled={page >= pageCount - 1}
          onPress={() => onPageChange(page + 1)}
          testID={testID !== undefined ? `${testID}-next` : undefined}
        >
          <View className="flex-row items-center gap-[5px]">
            <Text className="text-xs font-medium text-foreground">Next</Text>
            <ChevronRight size={14} color={colors.foreground} />
          </View>
        </Button>
      </View>
    </View>
  );
}
