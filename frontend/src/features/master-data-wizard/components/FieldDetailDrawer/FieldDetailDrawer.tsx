import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Sheet } from '@/shared/components/ui/Sheet';
import { Tabs } from '@/shared/components/ui/Tabs';
import { DrawerHeader } from './DrawerHeader';
import { OverviewTab } from './OverviewTab';
import { DistributionTab } from './DistributionTab';
import { IssuesTab } from './IssuesTab';
import { DRAWER_TABS, type DrawerTabId } from '../../utils/taxonomy';
import type { Decision } from '../../store/sourceProfile.store';
import type { EntityField } from '../../dp-kit/types/entity';

const DRAWER_WIDTH = 480;

interface FieldDetailDrawerProps {
  readonly field: EntityField | null;
  readonly rowCount: number;
  readonly decisions: readonly Decision[];
  // Set when something other than a plain row-open (e.g. the Copilot)
  // wants the drawer to land on a specific tab instead of Overview.
  readonly initialTab?: DrawerTabId | null;
  readonly onClose: () => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly testID?: string;
}

export const FieldDetailDrawer = ({
  field,
  rowCount,
  decisions,
  initialTab,
  onClose,
  onPrev,
  onNext,
  testID,
}: FieldDetailDrawerProps): React.JSX.Element => {
  const [activeTab, setActiveTab] = useState<DrawerTabId>('overview');
  const wasOpenRef = useRef(false);

  // Reset to Overview (or `initialTab`, when given) only on a closed -> open
  // transition, never on prev/next navigation between fields while the
  // drawer stays open — matches the reference's own drawerNav (which never
  // touches drawerTab).
  useEffect(() => {
    const isOpen = field !== null;
    if (isOpen && !wasOpenRef.current) {
      setActiveTab(initialTab ?? 'overview');
    }
    wasOpenRef.current = isOpen;
  }, [field, initialTab]);

  return (
    <Sheet visible={field !== null} onClose={onClose} side="right" width={DRAWER_WIDTH} testID={testID}>
      {field ? (
        <>
          <DrawerHeader
            field={field}
            decisions={decisions}
            onClose={onClose}
            onPrev={onPrev}
            onNext={onNext}
            testID={testID}
          />
          <Sheet.Content className="flex-1 p-0">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DrawerTabId)} variant="underline">
              {/* Reference bundles the name/role rows and the tab row into
                  one continuous "chrome" block, ending in a border that
                  separates it from the scrollable body below — margin-
                  top:12px above the tabs, not the body's own top padding. */}
              <Tabs.List className="mt-3 w-full border-b border-border px-[22px]">
                {DRAWER_TABS.map((tab) => (
                  <Tabs.Trigger key={tab.id} value={tab.id} testID={testID !== undefined ? `${testID}-tab-${tab.id}` : undefined}>
                    {tab.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <ScrollView className="flex-1 px-[22px] py-[18px]">
                <Tabs.Content value="overview">
                  <OverviewTab field={field} rowCount={rowCount} />
                </Tabs.Content>
                <Tabs.Content value="distribution">
                  <DistributionTab field={field} rowCount={rowCount} />
                </Tabs.Content>
                <Tabs.Content value="issues">
                  <IssuesTab field={field} />
                </Tabs.Content>
                <Tabs.Content value="ai">
                  <View testID={testID !== undefined ? `${testID}-tab-ai-content` : undefined} />
                </Tabs.Content>
              </ScrollView>
            </Tabs>
          </Sheet.Content>
        </>
      ) : null}
    </Sheet>
  );
};
