import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Table } from '@/shared/components/ui/Table';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { UnsortedIcon } from '@/shared/components/icons/UnsortedIcon';
import { tint, mixHex } from '@/features/master-data-wizard/utils/colorMix';
import type { MappingSortDirection, MappingSortKey } from '@/features/master-data-wizard/utils/mappingRows';
import {
  CHECKBOX_WIDTH,
  ROW_NO_WIDTH,
  SOURCE_WIDTH,
  SAMPLE_WIDTH,
  ROLE_WIDTH,
  TARGET_WIDTH,
  EVIDENCE_WIDTH,
  CONFIDENCE_WIDTH,
  VALIDATION_WIDTH,
  STATUS_WIDTH,
  ACTIONS_WIDTH,
  FROZEN_LEFT,
  stickyLeft,
} from './MappingTableRow';

interface HeaderDef {
  readonly label: string;
  readonly sortKey: NonNullable<MappingSortKey>;
  readonly width: number;
  readonly tip: string;
}

// All 8 of the reference's sortable columns — DA-373/374/375 combined.
// Proposed target sits right after Source field per explicit request,
// diverging from the reference's own ordering (Sample values next).
const HEADERS: readonly HeaderDef[] = [
  { label: 'Source field', sortKey: 'name', width: SOURCE_WIDTH, tip: 'Source field name' },
  { label: 'Proposed target', sortKey: 'target', width: TARGET_WIDTH, tip: 'Proposed target field' },
  { label: 'Sample values', sortKey: 'sample', width: SAMPLE_WIDTH, tip: 'First sample value' },
  { label: 'Inferred role', sortKey: 'role', width: ROLE_WIDTH, tip: 'Inferred semantic role' },
  { label: 'Evidence', sortKey: 'evidence', width: EVIDENCE_WIDTH, tip: 'Number of evidence signals' },
  { label: 'Confidence', sortKey: 'conf', width: CONFIDENCE_WIDTH, tip: 'Confidence in the proposed mapping' },
  { label: 'Validation', sortKey: 'validation', width: VALIDATION_WIDTH, tip: 'Validation outcome, worst first' },
  { label: 'Status', sortKey: 'status', width: STATUS_WIDTH, tip: 'Mapping status, worst first' },
];

interface MappingTableHeaderProps {
  readonly sortKey: MappingSortKey;
  readonly sortDir: MappingSortDirection;
  readonly onToggleSort: (key: NonNullable<MappingSortKey>) => void;
  readonly allSelected: boolean;
  readonly onToggleSelectAll: () => void;
  /** `MappingTable`'s own container-width-driven value — overrides
   *  `HEADERS`' base `SAMPLE_WIDTH` entry so the header cell stays aligned
   *  with the body's own Sample values column. */
  readonly sampleWidth: number;
  readonly testID?: string;
}

/** The header row (select-all checkbox, #, sortable column headers) —
 *  split out of `MappingTable.tsx` to keep it near the 200-line
 *  guideline as DA-374 added a column. */
export function MappingTableHeader({
  sortKey,
  sortDir,
  onToggleSort,
  allSelected,
  onToggleSelectAll,
  sampleWidth,
  testID,
}: MappingTableHeaderProps): React.JSX.Element {
  const [hoveredSortKey, setHoveredSortKey] = useState<MappingSortKey>(null);
  // Matches FieldsTable.tsx's own header text exactly (shared `mixHex` —
  // the reference's literal `color:var(--muted)` reads too light against
  // this app's actual muted value at typical zoom, so it's darkened a
  // step toward `foreground`, per the same explicit user request that
  // shaped FieldsTable's header).
  const headerRestColor = mixHex(colors.mutedForeground, colors.foreground, 0.55);

  return (
    <Table.Header>
      <Table.Row>
        <Table.HeaderCell
          width={CHECKBOX_WIDTH}
          className="items-center bg-surface px-1 py-[11px]"
          style={stickyLeft(FROZEN_LEFT.checkbox)}
        >
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleSelectAll}
            size="sm"
            className="focus:ring-0 focus:ring-offset-0"
            accessibilityLabel="Select all on this page"
            testID={testID !== undefined ? `${testID}-select-all` : undefined}
          />
        </Table.HeaderCell>
        <Table.HeaderCell
          width={ROW_NO_WIDTH}
          className="items-center bg-surface px-1 py-[11px]"
          style={stickyLeft(FROZEN_LEFT.rowNo)}
        >
          <Text className="text-center font-body text-xs font-medium" style={{ color: headerRestColor }}>#</Text>
        </Table.HeaderCell>
        {HEADERS.map((h, index) => {
          const isActive = sortKey === h.sortKey;
          const isHovered = hoveredSortKey === h.sortKey;
          const fg = isActive ? colors.accent : isHovered ? colors.foreground : headerRestColor;
          const width = h.sortKey === 'sample' ? sampleWidth : h.width;
          return (
            <Table.HeaderCell
              key={h.label}
              width={width}
              className={index === 0 ? 'bg-surface p-0' : 'p-0'}
              style={index === 0 ? stickyLeft(FROZEN_LEFT.source) : undefined}
              testID={testID !== undefined ? `${testID}-header-${h.sortKey}` : undefined}
            >
              <Pressable
                onPress={() => onToggleSort(h.sortKey)}
                onHoverIn={() => setHoveredSortKey(h.sortKey)}
                onHoverOut={() => setHoveredSortKey((current) => (current === h.sortKey ? null : current))}
                className="h-full flex-row items-center justify-center gap-[5px] px-3 py-[11px]"
                style={{ backgroundColor: isActive ? tint(colors.accent, 12) : 'transparent' }}
                testID={testID !== undefined ? `${testID}-sort-${h.sortKey}` : undefined}
              >
                <Text className="text-center font-body text-xs font-medium" style={{ color: fg }} numberOfLines={2}>
                  {h.label}
                </Text>
                {isActive ? (
                  sortDir === 'asc' ? <ChevronUp size={12} color={fg} /> : <ChevronDown size={12} color={fg} />
                ) : (
                  <UnsortedIcon size={12} color={fg} />
                )}
              </Pressable>
            </Table.HeaderCell>
          );
        })}
        <Table.HeaderCell width={ACTIONS_WIDTH} className="items-center px-3 py-[11px]">
          <Text className="text-center font-body text-xs font-medium" style={{ color: headerRestColor }}>Actions</Text>
        </Table.HeaderCell>
      </Table.Row>
    </Table.Header>
  );
}
