import React, { useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutTemplate, File as FileIcon, ArrowLeft, ArrowRight, Server } from 'lucide-react-native';
import type { ProjectsStackParamList } from '@/navigation/types';
import { getERPById } from '@/shared/constants/erp-systems';
import { MigrationLayout } from '@/features/migration/components/MigrationLayout';
import { useProjectDetail } from '@/features/projects/hooks/useProjectDetail';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import { createProjectId } from '@/shared/types/common.types';
import { useEntityPack } from '../hooks/useEntityPack';
import { useMcpFetch } from '../hooks/useMcpFetch';
import { STEPS } from '../dp-kit/react/taxonomy';
import { toStepRail } from '../mappers/toStepRail';
import { StepRail } from '@/shared/components/ui/StepRail';
import { colors } from '@/config/theme';
import type { StepId } from '../types/wizard.types';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { FileTargetCard } from '@/shared/components/ui/FileUploader';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { createPipelineRun, getActivePipelineRun, isPipelineRunConflict } from '../services/entity-pack.service';
import { useToast } from '@/shared/hooks/useToast';
import { useWizardStore } from '../store/wizard.store';
import type { EntityId } from '../types/entity-pack.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type McpFetchRoute = RouteProp<ProjectsStackParamList, 'McpFetch'>;
type McpFetchNav = NativeStackNavigationProp<ProjectsStackParamList, 'McpFetch'>;

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

// entityId values from the wizard use camelCase; the pipeline scope validator expects snake_case.
function toPipelineScope(entityId: string): string {
  return entityId === 'fixedAssets' ? 'fixed_assets' : entityId;
}

export function McpFetchScreen(): React.JSX.Element {
  const route = useRoute<McpFetchRoute>();
  const navigation = useNavigation<McpFetchNav>();
  const { orgProjectId, entityId, parentProjectId, workstreamId } = route.params;

  const sourceConnectionId = useProjectScopeStore((s) => s.sourceConnectionId);
  const sourceCredentials = useProjectScopeStore((s) => s.sourceCredentials);

  const { pack, refetch: refetchPack } = useEntityPack(orgProjectId, entityId);
  const {
    project,
    isLoading: isProjectLoading,
    isFetching: isProjectFetching,
    error: projectError,
    refetch: refetchProject,
  } = useProjectDetail(createProjectId(parentProjectId));

  const mcpFetch = useMcpFetch(sourceConnectionId, sourceCredentials, entityId, workstreamId);

  const hydrationError = projectError;
  const isHydrating = isProjectLoading || (hydrationError !== null && isProjectFetching);
  const retryHydration = useCallback((): void => {
    refetchPack();
    refetchProject();
  }, [refetchPack, refetchProject]);

  // Show all fetched records — no preview cap for MCP fetch.
  const MAX_PREVIEW = mcpFetch.records.length;

  const uploadStep = STEPS.find(s => s.id === 'upload')!;
  const profileStep = STEPS.find(s => s.id === 'profile')!;
  const stepRail = toStepRail(uploadStep.id as StepId, STEPS);

  const spec = pack?.spec ?? {};
  const entityLabel = pack?.label.plural ?? entityId.charAt(0).toUpperCase() + entityId.slice(1);
  const hasRecords = mcpFetch.records.length > 0;

  const targetErpInfo = pack?.target.record
    ? { name: pack.target.record, record: spec.targetNote ?? pack.target.record }
    : {
      name: (() => { const e = getERPById(project?.targetErp ?? ''); return e?.name ?? (toTitleCase((project?.targetErp ?? '').replace(/_/g, ' ')) || '—'); })(),
      record: pack?.target.record ?? '',
    };

  const sourceErpInfo = getERPById(project?.sourceErp ?? '');
  const sourceErpName = sourceErpInfo?.name
    ?? (toTitleCase((project?.sourceErp ?? '').replace(/_/g, ' ')) || 'source ERP');
  const sourceErpKey = project?.sourceErp ?? '';

  const recordStep = useWizardStore((s) => s.recordStep);
  const setPipelineRunId = useWizardStore((s) => s.setPipelineRunId);
  const setWizardContext = useWizardStore((s) => s.setWizardContext);
  const pipelineRunIdByEntity = useWizardStore((s) => s.pipelineRunIdByEntity);
  const toast = useToast();
  const [isCreatingRun, setIsCreatingRun] = React.useState(false);

  const handleBack = useCallback((): void => { navigation.goBack(); }, [navigation]);

  const handleContinue = useCallback(async (): Promise<void> => {
    // Seed wizard context first so recordStep writes under the correct project key.
    setWizardContext({ entityId: entityId as EntityId, orgProjectId, parentProjectId, workstreamId });

    const scope = toPipelineScope(entityId);

    // 1. Reuse an existing run stored locally (same device, persisted across sessions).
    const entityKey = `${parentProjectId}:${entityId}`;
    const existingRunId = pipelineRunIdByEntity[entityKey];
    if (existingRunId) {
      recordStep(entityId as EntityId, 'profile');
      navigation.navigate('MasterDataWizard', { orgProjectId, entityId, parentProjectId, workstream_id: workstreamId });
      return;
    }

    // 2. If the user did NOT explicitly fetch new data in this session (e.g. storage was
    //    cleared on another device), check the backend for an already-completed run.
    //    This prevents creating a duplicate run when a completed profile already exists.
    if (!mcpFetch.hasFetchedInSession) {
      const latestResult = await getActivePipelineRun(orgProjectId, scope);
      if (latestResult.ok && latestResult.data.status === 'complete') {
        setPipelineRunId(entityId as EntityId, latestResult.data.id);
        recordStep(entityId as EntityId, 'profile');
        navigation.navigate('MasterDataWizard', { orgProjectId, entityId, parentProjectId, workstream_id: workstreamId });
        return;
      }
    }

    const storagePath = mcpFetch.snapshotStoragePath;
    if (!storagePath) {
      toast.showError('No snapshot available', 'Fetch records from the ERP before continuing.');
      return;
    }

    setIsCreatingRun(true);
    let result = await createPipelineRun(workstreamId, scope, storagePath);
    if (!result.ok && isPipelineRunConflict(result.error)) {
      result = await getActivePipelineRun(orgProjectId, scope);
    }
    setIsCreatingRun(false);

    if (!result.ok) {
      toast.showError('Could not start profiler', result.error.message);
      return;
    }

    setPipelineRunId(entityId as EntityId, result.data.id);
    recordStep(entityId as EntityId, 'profile');
    navigation.navigate('MasterDataWizard', { orgProjectId, entityId, parentProjectId, workstream_id: workstreamId });
  }, [navigation, orgProjectId, entityId, parentProjectId, workstreamId, recordStep, setPipelineRunId, setWizardContext, pipelineRunIdByEntity, mcpFetch.snapshotStoragePath, mcpFetch.hasFetchedInSession, toast]);

  const stepCounter = `Step ${uploadStep.n} of ${STEPS.length}`;
  const continueLabel = `Continue to ${profileStep.label}`;
  const headerLine = hasRecords
    ? `${mcpFetch.total} records · ${entityId}`
    : 'No records fetched';

  const targetErpKey = (project?.targetErp ?? '').toLowerCase();
  const erpInfo = getERPById(targetErpKey);
  const erpBadge = erpInfo
    ? { bg: erpInfo.brandColor, fg: colors.primaryForeground }
    : undefined;
  const erpInitial = targetErpInfo.name.slice(0, 2).toUpperCase();

  if (isHydrating) {
    return (
      <MigrationLayout title="DataPortation" projectId={parentProjectId} onBack={handleBack} testID="mcp-fetch-screen">
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
          <Text className="mt-4 font-body text-sm text-muted-foreground">Loading project data...</Text>
        </View>
      </MigrationLayout>
    );
  }

  if (hydrationError) {
    return (
      <MigrationLayout title="DataPortation" projectId={parentProjectId} onBack={handleBack} testID="mcp-fetch-screen">
        <NetworkErrorFallback error={new Error(hydrationError.message)} onRetry={retryHydration} testID="mcp-fetch-error" />
      </MigrationLayout>
    );
  }

  return (
    <MigrationLayout
      title="DataPortation"
      projectId={parentProjectId}
      onBack={handleBack}
      testID="mcp-fetch-screen"
      sourceRowCount={hasRecords ? mcpFetch.total : undefined}
    >
      <View className="flex-1 flex-col bg-background">
        <ScrollView className="flex-1 pr-5" keyboardShouldPersistTaps="handled">

          {/* ── Wizard stepper (all 8 taxonomy steps) ───────────────────────── */}
          <StepRail rail={stepRail} />

          {/* ── Page header ────────────────────────────────────────────── */}
          <View className="mt-8 mb-5 flex-row items-start gap-4 flex-wrap bg-card">
            <View className="flex-1 gap-2">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-lg font-bold tracking-tight font-heading text-foreground">{uploadStep.label}</Text>
                <Text className="text-xs font-body text-muted-foreground">{stepCounter}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <FileIcon size={14} color={colors.mutedForeground} strokeWidth={2} />
                <Text className="text-xs font-mono text-muted-foreground" numberOfLines={1}>{headerLine}</Text>
              </View>
            </View>
            <View className="flex-row items-end gap-2">
              <View className="flex-row items-center justify-center align-center gap-3">
                <Button
                  variant="outline"
                  onPress={handleBack}
                  testID="mcp-fetch-back-button"
                >
                  <ArrowLeft size={16} color={colors.foreground} />
                  <Text className="font-body text-sm font-medium text-foreground ml-1">
                    Back
                  </Text>
                </Button>
                <Button
                  onPress={() => void handleContinue()}
                  disabled={!hasRecords || isCreatingRun}
                  testID="mcp-fetch-continue-button"
                >
                  <Text className="font-body text-sm font-medium text-primary-foreground mr-1">
                    {isCreatingRun ? 'Starting profiler…' : continueLabel}
                  </Text>
                  <ArrowRight size={16} color={colors.primaryForeground} />
                </Button>
              </View>
            </View>
          </View>

          {/* ── Main panel ───────────────────────────────────────────── */}
          <View className="border border-border rounded-xl p-5 self-stretch">
            <View className="flex-col gap-6 flex-wrap md:flex-row">
              <View className="flex-1">
                <Text className="text-base font-bold mb-1 font-heading text-foreground">
                  {'1. Source '}
                  <Text className="text-foreground">{entityLabel}</Text>
                  {': MCP Connection '}
                  <Text className="text-destructive">*</Text>
                </Text>
                <Text className="text-xs mb-3 font-body text-muted-foreground">
                  Fetch live data from your connected ERP
                </Text>

                {sourceConnectionId === null ? (
                  <View className="border border-border rounded-xl p-6 bg-surface-highlight">
                    <Text className="text-sm font-body text-muted-foreground">
                      No MCP connection tested. Go back and test the connection first.
                    </Text>
                  </View>
                ) : (
                  <View className="border border-border rounded-xl p-6">
                    <View className="flex-row items-center gap-3">
                      <View className="w-9 h-9 rounded-lg items-center justify-center shrink-0 bg-find-info">
                        <Server size={18} color={colors.accent} strokeWidth={2} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold font-body text-foreground" numberOfLines={1}>
                          Connected via MCP
                        </Text>
                        <Text className="text-xs mt-1 font-mono text-muted-foreground" numberOfLines={1}>
                          {`${sourceErpKey || 'unknown'} · ${sourceErpName}`}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 items-center">
                      <Button
                        onPress={() => void mcpFetch.fetch()}
                        disabled={mcpFetch.isFetching}
                        testID="mcp-fetch-button"
                      >
                        <Text className="font-body text-sm font-medium text-primary-foreground">
                          {mcpFetch.isFetching ? 'Fetching…' : `Fetch from ${sourceErpName}`}
                        </Text>
                      </Button>
                    </View>

                    {mcpFetch.isFetching && (
                      <Text className="text-xs mt-3 text-center font-body text-muted-foreground">
                        Fetching records…
                      </Text>
                    )}
                    {mcpFetch.error !== null && (
                      <View className="mt-3 rounded-lg p-3 bg-find-warn">
                        <Text className="text-xs leading-normal font-body text-warning">
                          {`Error: ${mcpFetch.error}`}
                        </Text>
                      </View>
                    )}
                    {hasRecords && (
                      <View className="mt-3 self-center rounded-full px-3 py-1 bg-impact-clean">
                        <Text className="text-xs font-bold tracking-wide font-body text-success">
                          {`${mcpFetch.total} records fetched`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <FileTargetCard
                label="2. Target System Format"
                subLabel="Set when the project was created"
                badgeText={erpInitial}
                badgeTone={erpBadge}
                title={targetErpInfo.name}
                subtitle={targetErpInfo.record}
                description={`The fetched ${entityLabel.toLowerCase()} data will be converted into this system's format. To change the target, edit the project settings.`}
              />
            </View>
          </View>

          {/* Fetched records preview */}
          {hasRecords && (
            <View className="border rounded-xl overflow-hidden self-stretch mt-8 bg-card border-border">
              <View className="flex-row items-center gap-3 flex-wrap p-4">
                <LayoutTemplate size={17} color={colors.primary} strokeWidth={1.8} />
                <Text className="text-base font-bold font-heading text-foreground">ERP Data Preview</Text>
                <View className="border rounded-full px-3 py-1 border-border">
                  <Text className="text-xs font-mono text-muted-foreground">
                    {`${mcpFetch.total} records`}
                  </Text>
                </View>
              </View>
              <Text className="text-xs px-4 mb-2 font-body text-muted-foreground">
                Check the field names and a few sample values before continuing. Fields are matched to target fields in the next step.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="flex-grow">
                <View className="flex-1">
                  <View className="flex-row border-b bg-surface border-b-border">
                    <View className="w-14 shrink-0 px-3 py-3">
                      <Text className="text-xs font-bold uppercase tracking-wider font-body text-muted-foreground">SRC #</Text>
                    </View>
                    {mcpFetch.fields.map((col, i) => (
                      <View key={i} className="flex-1 px-3 py-3">
                        <Text className="text-xs font-bold uppercase tracking-wider font-body text-muted-foreground" numberOfLines={1}>{col}</Text>
                      </View>
                    ))}
                  </View>
                  {mcpFetch.records.slice(0, MAX_PREVIEW).map((record, ri) => (
                    <View key={ri} className="flex-row border-b border-b-border">
                      <View className="w-14 shrink-0 px-3 py-3">
                        <Text className="text-xs font-mono text-muted-foreground">{ri + 1}</Text>
                      </View>
                      {mcpFetch.fields.map((field, ci) => (
                        <View key={ci} className="flex-1 px-3 py-3">
                          <Text className="text-xs font-mono text-foreground" numberOfLines={1}>{
                            (() => {
                              const v = record[field];
                              if (v === null || v === undefined) return '—';
                              if (typeof v === 'object') return JSON.stringify(v);
                              return String(v);
                            })()
                          }</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <Text className="text-xs py-1 font-mono text-muted-foreground">
            {hasRecords
              ? `${sourceErpName} → ${targetErpInfo.name}`
              : `Waiting for ${(pack?.label.singular ?? entityId).toLowerCase()} records from ${sourceErpName}…`}
          </Text>
        </ScrollView>
      </View>
    </MigrationLayout>
  );
}
