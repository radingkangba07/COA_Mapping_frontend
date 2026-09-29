import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AlertCircle, ArrowLeft, ArrowRight, Play, RotateCcw } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Button } from '@/shared/components/ui/Button';
import { StepRail } from '@/shared/components/ui/StepRail';
import { Sheet } from '@/shared/components/ui/Sheet';
import { ScrollArea } from '@/shared/components/ui/ScrollArea';
import { useQuery } from '@tanstack/react-query';
import { MCPConnectionPanel } from '@/features/projects/components/MCPConnectionPanel';
import { createInitialMcpForm } from '@/features/projects/services/mcp.service';
import { getProject, getOrgProject } from '@/features/projects/services/projects.service';
import { useProjectScopeStore } from '@/features/projects/store/project-scope.store';
import { httpClient } from '@/shared/services/http/http.instance';
import { createProjectId } from '@/shared/types/common.types';
import { CopilotPanelShell } from '@/shared/components/ui/CopilotPanelShell/CopilotPanelShell';
import { toStepRail } from '../mappers/toStepRail';
import { getStep, STEPS } from '../utils/taxonomy';
import { useWizardStore } from '../store/wizard.store';
import { useEntityPackPreview } from '../hooks/useEntityPackPreview';
import { useSyncWizardRightPanel } from '../hooks/useSyncWizardRightPanel';
import { useTestImport } from '../hooks/useTestImport';
import type { EntityId } from '../dp-kit/types/entity';
import type { StepId } from '../types/wizard.types';
import type { ImportErrorDto } from '../services/test_import.service';
import { StatStrip } from '../components/StatStrip';
import { ImportResultPanel } from '../components/ImportResultPanel';
import { ErrorDetailDrawer } from '../components/ErrorDetailDrawer';

interface TestImportScreenProps {
  readonly entityId?: EntityId;
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
}

export function TestImportScreen({
  entityId: entityIdProp,
  onBack: onBackProp,
  onContinue,
}: TestImportScreenProps): React.JSX.Element {
  const storeEntityId = useWizardStore((s) => s.entityId);
  const entityId = (entityIdProp ?? storeEntityId) as EntityId;

  const parentProjectId = useWizardStore((s) => s.parentProjectId);
  const projectQuery = useQuery({
    queryKey: ['project', parentProjectId] as const,
    queryFn: async () => {
      const coaResult = await getProject(httpClient, createProjectId(parentProjectId as string));
      if (coaResult.ok) return coaResult;
      return getOrgProject(httpClient, parentProjectId as string);
    },
    enabled: parentProjectId != null,
    staleTime: 60_000,
  });
  const project = projectQuery.data?.ok ? projectQuery.data.data : null;
  const isMcpRequired = project?.targetConnectionMethodId === 'mcp_server';
  const isProjectLoading = projectQuery.isLoading && parentProjectId != null;

  const targetConnectionReady = useProjectScopeStore((s) => s.targetConnectionReady);
  const targetConnection = useProjectScopeStore((s) => s.draft.connection);
  const isMcpValidated = targetConnectionReady;

  useEffect(() => {
    if (isMcpRequired) {
      useProjectScopeStore.getState().setTargetConnectionReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMcpRequired]);

  useEffect(() => {
    if (project == null) return;
    const store = useProjectScopeStore.getState();
    if (project.sourceErp) store.setSource(project.sourceErp);
    if (project.targetErp) store.setTarget(project.targetErp);
  }, [project?.sourceErp, project?.targetErp]);

  // Clear credentials when leaving the step. Credentials persist across retries
  // within the same session so the user does not need to re-enter them after a
  // failed run. Clearing on unmount is the catch-all for any navigation path.
  useEffect(() => {
    return () => {
      useProjectScopeStore.getState().clearCredentials();
    };
  }, []);

  const mcpPanelSeed = useMemo(
    () => ({ ...createInitialMcpForm(), url: targetConnection.url, skipSSL: targetConnection.skipSSL, scope: 'target' as const }),
    [targetConnection.url, targetConnection.skipSSL],
  );

  const {
    importRun, batches, errors, records, connectorRequests,
    selectedBatch, setSelectedBatch,
    isLoading, isTriggering, error, triggerRun,
  } = useTestImport(entityId);

  const { pack: copilotPack } = useEntityPackPreview(entityId);
  useSyncWizardRightPanel(copilotPack ? <CopilotPanelShell pack={copilotPack} testID="test-import-copilot" /> : null);

  const showMcpWarning = isMcpRequired && !isMcpValidated && importRun == null;
  const [selectedError, setSelectedError] = useState<ImportErrorDto | null>(null);
  const [showMcpGate, setShowMcpGate] = useState(false);

  const handleRunPress = useCallback((): void => {
    if (isMcpRequired && !isMcpValidated) { setShowMcpGate(true); return; }
    triggerRun();
  }, [isMcpRequired, isMcpValidated, triggerRun]);

  const handleBack = useCallback((): void => { onBackProp?.(); }, [onBackProp]);

  const handleContinue = useCallback((): void => {
    useProjectScopeStore.getState().clearCredentials();
    onContinue?.();
  }, [onContinue]);

  const step = getStep('test');
  const stepRail = toStepRail('test' as StepId);
  const isRunning = importRun?.status === 'pending' || importRun?.status === 'running';
  const isComplete = importRun?.status === 'complete';
  const hasFailed = importRun?.status === 'failed';
  const hasUnresolvedErrors = isComplete && (importRun?.rows_failed ?? 0) > 0;

  return (
    <View className="flex-1 flex-col bg-background" testID="test-import-screen">

      <View className="px-5 pt-5 pb-2 gap-3">
        <StepRail rail={stepRail} />
        <View className="flex-row items-start justify-between gap-3 flex-wrap">
          <View className="gap-0.5">
            <View className="flex-row items-center gap-2">
              <Text className="font-heading text-[18px] font-bold text-foreground">{step.label}</Text>
              <Text className="font-body text-xs text-muted-foreground">
                {`Step ${String(step.n)} of ${String(STEPS.length)}`}
              </Text>
            </View>
            {importRun != null ? (
              <Text className="font-body text-xs text-muted-foreground">
                {`Simulated batch of ${String(importRun.batch_size)} records per batch — target IDs captured for rollback`}
              </Text>
            ) : (
              <Text className="font-body text-sm text-muted-foreground">
                Validate your field mappings against the ERP before committing to a live import.
              </Text>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            {onBackProp != null ? (
              <Button variant="outline" onPress={handleBack} testID="test-import-back">
                <View className="flex-row items-center gap-1.5">
                  <ArrowLeft size={14} color={colors.foreground} />
                  <Text className="text-sm font-medium text-foreground">Back</Text>
                </View>
              </Button>
            ) : null}
            <Button onPress={handleContinue} disabled={onContinue == null || !isComplete} testID="test-import-proceed">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-semibold text-primary-foreground">Proceed to Import</Text>
                <ArrowRight size={14} color={colors.primaryForeground} />
              </View>
            </Button>
          </View>
        </View>
        {showMcpWarning ? (
          <View className="flex-row items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertCircle size={16} color={colors.destructive} />
            <Text className="font-body text-sm text-destructive flex-1">
              Target MCP connection has not been validated. Click Start Simulated Import to open the connection validator first.
            </Text>
          </View>
        ) : null}
        {hasUnresolvedErrors ? (
          <View className="flex-row items-center gap-2">
            <AlertCircle size={16} color={colors.destructive} />
            <Text className="font-body text-sm font-semibold text-destructive">{'Test batch has unresolved failures  '}</Text>
            <Text className="font-body text-xs text-muted-foreground">
              {`${String(importRun?.rows_imported ?? 0)} of ${String(importRun?.rows_attempted ?? 0)} imported · ${String(importRun?.rows_failed ?? 0)} failed (${String(importRun?.rows_failed ?? 0)} open) · ${String(importRun?.rows_skipped ?? 0)} skipped · ${String(importRun?.rows_reconciled ?? 0)} reconciled`}
            </Text>
          </View>
        ) : null}
        {importRun != null ? <StatStrip run={importRun} /> : null}
      </View>

      <View className="flex-1 flex-col lg:flex-row">
        <View className="flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error != null && importRun == null ? (
            <View className="flex-1 px-5 py-6">
              <View className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 gap-3">
                <Text className="font-body text-sm text-destructive">{error.message}</Text>
                <Button variant="outline" onPress={handleRunPress} testID="test-import-retry">
                  <View className="flex-row items-center gap-1.5">
                    <RotateCcw size={14} color={colors.foreground} />
                    <Text className="text-sm font-medium text-foreground">Retry</Text>
                  </View>
                </Button>
              </View>
            </View>
          ) : isRunning ? (
            <View className="flex-1 items-center justify-center gap-3">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="font-body text-sm text-muted-foreground">Running simulated import…</Text>
            </View>
          ) : hasFailed ? (
            <View className="flex-1 px-5 py-6">
              <View className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 gap-3">
                <Text className="font-heading text-sm font-semibold text-destructive">Import run failed</Text>
                {importRun?.error_detail != null ? (
                  <Text className="font-body text-sm text-muted-foreground">{importRun.error_detail}</Text>
                ) : null}
                <Button variant="outline" onPress={handleRunPress} disabled={isTriggering} testID="test-import-retry">
                  <View className="flex-row items-center gap-1.5">
                    <RotateCcw size={14} color={colors.foreground} />
                    <Text className="text-sm font-medium text-foreground">Retry</Text>
                  </View>
                </Button>
              </View>
            </View>
          ) : importRun == null ? (
            <View className="flex-1 items-center justify-center px-5">
              <View className="rounded-lg border border-border bg-muted/30 p-8 items-center gap-4 max-w-md w-full">
                <Text className="font-body text-sm text-muted-foreground text-center">
                  Run a simulated import to validate your field mappings against the ERP connector. No production data is written — all requests are captured for audit.
                </Text>
                <Button onPress={handleRunPress} disabled={isTriggering || isProjectLoading} testID="test-import-run">
                  <View className="flex-row items-center gap-1.5">
                    {isTriggering || isProjectLoading ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Play size={14} color={colors.primaryForeground} />
                    )}
                    <Text className="text-sm font-semibold text-primary-foreground">
                      {isTriggering ? 'Starting…' : isProjectLoading ? 'Loading…' : 'Start Simulated Import'}
                    </Text>
                  </View>
                </Button>
              </View>
            </View>
          ) : (
            <ImportResultPanel
              importRun={importRun}
              batches={batches}
              errors={errors}
              records={records}
              connectorRequests={connectorRequests}
              selectedBatch={selectedBatch}
              onSelectBatch={setSelectedBatch}
              onSelectError={setSelectedError}
            />
          )}
        </View>
      </View>

      <ErrorDetailDrawer
        error={selectedError}
        records={records.items}
        connectorRequests={connectorRequests.items}
        onClose={() => setSelectedError(null)}
        onGoToStep={(stepId) => {
          setSelectedError(null);
          useWizardStore.getState().setCurrentStepId(stepId as StepId);
        }}
        onRetry={() => { setSelectedError(null); handleRunPress(); }}
      />

      <Sheet visible={showMcpGate} onClose={() => setShowMcpGate(false)} side="right" width={480} testID="mcp-gate-sheet">
        <Sheet.Header>
          <View className="flex-1 gap-0.5">
            <Text className="font-body text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              MCP Connection
            </Text>
            <Sheet.Title>Validate MCP Connection</Sheet.Title>
          </View>
          <Sheet.Close onPress={() => setShowMcpGate(false)} />
        </Sheet.Header>
        <ScrollArea className="flex-1">
          <Sheet.Content className="pt-4">
            <Text className="font-body text-sm text-muted-foreground mb-4">
              Test the target MCP connection before running the import. Once connected, click Start Import to begin the dry run against the live ERP.
            </Text>
            <MCPConnectionPanel fixedScope="target" value={mcpPanelSeed} testID="mcp-gate-panel" />
          </Sheet.Content>
        </ScrollArea>
        {isMcpValidated ? (
          <Sheet.Footer>
            <Button
              onPress={() => { setShowMcpGate(false); triggerRun(); }}
              disabled={isTriggering}
              testID="mcp-gate-start-import"
            >
              <View className="flex-row items-center gap-1.5">
                {isTriggering ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Play size={14} color={colors.primaryForeground} />
                )}
                <Text className="text-sm font-semibold text-primary-foreground">
                  {isTriggering ? 'Starting…' : 'Start Import'}
                </Text>
              </View>
            </Button>
          </Sheet.Footer>
        ) : null}
      </Sheet>
    </View>
  );
}
