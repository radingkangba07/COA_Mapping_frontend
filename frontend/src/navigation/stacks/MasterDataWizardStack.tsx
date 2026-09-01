import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary';
import { ProjectAsidePanel } from '@/features/master-data-wizard/components/ProjectAsidePanel/ProjectAsidePanel';
import { useAuthStore } from '@/features/auth/store/auth.store';
import type { User } from '@/features/auth/types/auth.types';
import { createProjectId, createUserId } from '@/shared/types/common.types';
import type { AccessResponse } from '@/features/projects/types/project-access.types';
import { SourceDataProfileScreen } from '@/features/master-data-wizard/screens/SourceDataProfileScreen';
import type { SourceProfilePreviewStackParamList } from '../types';

// TEMPORARY: standalone preview of the master-data wizard's Source Data
// Profile step, ahead of the real wizard shell/step rail landing. There is
// no agreed project/entityId route yet (see docs/handover/INTEGRATION.md),
// so the project aside is fed static mock data rather than a live project.
// ProjectAsidePanel (features/master-data-wizard/components/ProjectAsidePanel)
// is a wizard-owned replacement for features/migration's SidebarContent —
// built fresh rather than wrapping SidebarContent because that file is
// off-limits to modify from a wizard task (see CLAUDE.md), and matching the
// reference design's exact icon and merged header/collapse row required
// controlling that JSX directly. It reuses the same underlying, non-off-limits
// logic (useProjectAccess, AddMemberDialog, MemberBadge, ERPBadge's colour
// helpers) from features/projects/ and features/migration's ERPBadge module
// (read-only import, not a modification). projectId is a mock (non-existent)
// id rather than null so the Members button/list render as designed;
// useMockProjectAccessSeed below pre-seeds the shared TanStack Query cache for
// that id so useProjectAccess's live query never actually hits the backend —
// nothing here touches a real project. Reachable from its own drawer entry in
// navigation/drawers/AppDrawer.tsx. Delete this file, its drawer entry, and
// the param-list extension in navigation/types.ts once the real wizard shell
// supersedes it.

const MOCK_PROJECT_ID = 'preview-project-1';

const MOCK_SIDEBAR_PROPS = {
  projectId: MOCK_PROJECT_ID,
  projectName: 'Item Profile',
  createdAt: new Date('2026-06-01T09:00:00Z'),
  createdByName: 'Preview User',
  updatedAt: new Date('2026-07-28T19:28:00Z'),
  lastEditedBy: 'Preview User',
  sourceERP: { id: 'accpac', name: 'Accpac' },
  targetERP: { id: 'odoo', name: 'Odoo' },
  currentUser: { name: 'Preview User' },
} as const;

// Seeds the shared project-access query cache for MOCK_PROJECT_ID so
// ProjectAsidePanel's Members button/list and role check (canManage) resolve
// from static data instead of a real network call — this preview has no real
// project behind MOCK_PROJECT_ID. The seeded member includes the signed-in
// dev user's own id (with an 'admin' permission) so canManage evaluates true,
// matching the reference's "Members" button being visible.
function seedMockProjectAccess(queryClient: QueryClient, user: User): void {
  queryClient.setQueryDefaults(['project-access'], { staleTime: Infinity, retry: false });

  const members: AccessResponse[] = [
    {
      userId: createUserId(user.id),
      name: user.name,
      email: user.email,
      permission: 'admin',
    },
  ];

  queryClient.setQueryData(['project-access', createProjectId(MOCK_PROJECT_ID)], members);
}

function useMockProjectAccessSeed(): void {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // Seed synchronously on first render (a lazy useState initializer runs
  // during the parent's render, before ProjectAsidePanel mounts and its
  // useProjectAccess query fires) — a useEffect here would run too late:
  // child effects fire before parent effects, so the real (failing) network
  // call would already be in flight by the time an effect-based seed ran.
  useState(() => {
    if (currentUser) seedMockProjectAccess(queryClient, currentUser);
    return null;
  });

  // Fallback for the case where auth was still restoring on first render:
  // re-seed once currentUser becomes available. Harmless/idempotent if the
  // lazy initializer above already handled it.
  useEffect(() => {
    if (currentUser) seedMockProjectAccess(queryClient, currentUser);
  }, [queryClient, currentUser]);
}

function SourceProfilePreviewScreen(): React.JSX.Element {
  useMockProjectAccessSeed();
  const navigation = useNavigation();

  return (
    <View className="flex-1 flex-row bg-background">
      <ProjectAsidePanel {...MOCK_SIDEBAR_PROPS} testID="source-profile-preview-sidebar" />
      <View className="flex-1">
        <SourceDataProfileScreen entityId="items" onBack={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const SourceProfileStack = createNativeStackNavigator<SourceProfilePreviewStackParamList>();

export const SourceProfilePreviewStack = (): React.JSX.Element => (
  <ErrorBoundary>
    <SourceProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <SourceProfileStack.Screen
        name="SourceProfilePreview"
        component={SourceProfilePreviewScreen}
        options={{ title: 'Source Data Profile Preview' }}
      />
    </SourceProfileStack.Navigator>
  </ErrorBoundary>
);
