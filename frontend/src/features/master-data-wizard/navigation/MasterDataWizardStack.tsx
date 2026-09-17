/* ============================================================================
   MasterDataWizardStack.tsx  ·  The 8 wizard steps, nested under one screen
   ----------------------------------------------------------------------------
   Registered as the sole child of MasterDataWizardScreen, which owns the one
   MigrationLayout/sidebar instance every step shares. Adding step 3-8 means
   adding a <Stack.Screen> here (plus a param-free entry in
   masterDataWizardStack.types.ts) — ProjectsStack and its param list never
   change.

   Step screens read their session identifiers (entityId/orgProjectId/
   parentProjectId/workstreamId) from wizard.store, seeded once by
   MasterDataWizardScreen before this navigator is ever mounted — never from
   route params, which is why every route below is `undefined`.
   ========================================================================= */

import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MasterDataUploadScreen } from '../screens/MasterDataUploadScreen';
import { SourceDataProfileScreen } from '../screens/SourceDataProfileScreen';
import { useWizardStore } from '../store/wizard.store';
import type { EntityId } from '../types/entity-pack.types';
import type { MasterDataWizardStackParamList } from './masterDataWizardStack.types';

const Stack = createNativeStackNavigator<MasterDataWizardStackParamList>();

/**
 * SourceDataProfileScreen takes onBack/onContinue as plain callback props
 * rather than calling useNavigation() itself (see its own header comment) —
 * this wrapper is what supplies the real one when it's mounted for real,
 * inside a NavigationContainer. Step 3 (Mapping) doesn't exist yet, so
 * onContinue is intentionally left unset — same as before this refactor.
 */
function ProfileStep(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<MasterDataWizardStackParamList>>();
  const entityId = useWizardStore((s) => s.entityId) as EntityId;
  const recordStep = useWizardStore((s) => s.recordStep);
  const handleBack = useCallback((): void => {
    if (navigation.canGoBack()) {
      recordStep(entityId, 'upload');
    }
    navigation.goBack();
  }, [navigation, entityId, recordStep]);
  return <SourceDataProfileScreen onBack={handleBack} />;
}

export interface MasterDataWizardStackProps {
  /** Which step to open on — the entity's persisted resume point (see wizard.store.ts's stepByEntity). Defaults to 'Upload'. */
  readonly initialRouteName?: keyof MasterDataWizardStackParamList;
}

export function MasterDataWizardStack({ initialRouteName }: MasterDataWizardStackProps): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName ?? 'Upload'}>
      <Stack.Screen name="Upload" component={MasterDataUploadScreen} />
      <Stack.Screen name="Profile" component={ProfileStep} />
    </Stack.Navigator>
  );
}
