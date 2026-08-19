import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Upload, LayoutTemplate } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { ProjectsStackParamList } from '@/navigation/types';
import { isWeb } from '@/shared/utils/platform.utils';
import { getERPById } from '@/shared/constants/erp-systems';
import { useProjectDetail } from '@/features/projects/hooks/useProjectDetail';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useERPConfigStore } from '@/features/erp-config/store/erp-config.store';
import { createProjectId } from '@/shared/types/common.types';
import { colors } from '@/config/theme';
import { SidebarContent } from '@/features/migration/components/ProjectSidebar/SidebarContent';
import {
  StepItem,
  CIRCLE_SIZE,
} from '@/features/migration/components/MigrationStepper/MigrationStepperParts';
import type { StepStatus } from '@/features/migration/components/MigrationStepper/MigrationStepperParts';
import type { ERPInfo } from '@/features/migration/components/ProjectSidebar/sidebar.types';
import { useEntityPack } from '../hooks/useEntityPack';
import { WIZARD_STEPS } from '../config/steps';
import { dpTheme, semantic } from '../kit/dp-theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadRoute = RouteProp<ProjectsStackParamList, 'MasterDataUpload'>;
type UploadNav = NativeStackNavigationProp<ProjectsStackParamList, 'MasterDataUpload'>;

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cells.push(field); field = ''; }
      else if (ch === '\n') {
        cells.push(field); rows.push(cells);
        cells = []; field = '';
      } else if (ch !== '\r') { field += ch; }
    }
  }
  if (field || cells.length) { cells.push(field); rows.push(cells); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function missingColumns(uploaded: string[], expected: string[]): string[] {
  const norm = uploaded.map(normalise);
  return expected.filter(e => !norm.includes(normalise(e)));
}

// ─── Wizard stepper (reuses COA StepItem + ConnectorLine) ────────────────────

function WizardStepper({ currentStepN }: { currentStepN: number }): React.JSX.Element {
  return (
    <View
      className="items-start justify-center px-4 py-3 md:flex md:flex-row"
      style={{ flexDirection: 'row' }}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {WIZARD_STEPS.map((step, i) => {
          const status: StepStatus =
            step.n === currentStepN ? 'active' :
            step.n < currentStepN  ? 'completed' : 'upcoming';
          return (
            <React.Fragment key={step.id}>
              <StepItem
                index={i}
                label={step.label}
                status={status}
                isCompleted={step.n < currentStepN}
                onPress={() => { /* navigation handled via Back/Continue */ }}
              />
              {i < WIZARD_STEPS.length - 1 && (
                <View style={{
                  width: 40,
                  height: 2,
                  backgroundColor: step.n < currentStepN ? colors.primary : colors.border,
                  marginTop: CIRCLE_SIZE / 2 - 1,
                  flexShrink: 0,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Sidebar data hook ────────────────────────────────────────────────────────

function useWizardSidebarProps(parentProjectId: string) {
  const { project } = useProjectDetail(createProjectId(parentProjectId));
  const user = useAuthStore(s => s.user);
  const erpSystems = useERPConfigStore(s => s.erpSystems);

  function resolveERP(erpId: string): ERPInfo {
    const lower = erpId.toLowerCase();
    const hit = erpSystems.find(e => e.id.toLowerCase() === lower)
      ?? erpSystems.find(e => e.name.toLowerCase() === lower);
    const name = hit?.name ?? getERPById(erpId)?.name ?? toTitleCase(erpId.replace(/_/g, ' '));
    return { id: erpId, name, fieldCount: hit?.fields?.length ?? 0 };
  }

  return {
    projectId: project?.projectId ?? null,
    displayCode: project?.displayCode,
    orgId: project?.orgId,
    projectName: project?.name,
    createdAt: project?.createdAt,
    createdByName: project?.createdByName ?? user?.name,
    updatedAt: project?.updatedAt,
    lastEditedBy: project?.updatedByName ?? project?.createdByName ?? user?.name,
    sourceERP: project?.sourceErp ? resolveERP(project.sourceErp) : null,
    targetERP: project?.targetErp ? resolveERP(project.targetErp) : null,
    sourceRowCount: 0,
    targetRowCount: 0,
    currentUser: user ? { name: user.name, userId: user.userId } : null,
  };
}

// ─── Static entity sample fallbacks ─────────────────────────────────────────
// Used when the backend entity profile endpoint has not yet returned sample data.

const ENTITY_SAMPLE: Record<string, { name: string; description: string; content: string }> = {
  customers: {
    name: 'Source Customers Sample',
    description: 'Sample customer master data for a source ERP',
    content: [
      'Account No,Customer Name,VAT No,Email,Payment Terms,Currency,Credit Limit',
      'C-10045,Roboweeder Pty Ltd,4210192837,ap@roboweeder.co.za,Net 30,ZAR,250000.00',
      'C-10046,Acme Trading CC,4980112233,sales@acme.com,COD,ZAR,50000.00',
      'C-10047,Northwind Supplies,4771122334,info@northwind.co.za,30d,ZAR,75000.00',
      'C-10048,Baltic Imports BV,,accounts@baltic.eu,Net 60,EUR,120000.00',
      'C-10049,Summit Hardware,4661234567,,2/10 N30,ZAR,',
      'C-10050,Delta Logistics,4559876543,ar@deltalog.co.za,Immediate,USD,30000.00',
    ].join('\n'),
  },
  items: {
    name: 'Source Items Sample',
    description: 'Sample item master data for a source ERP',
    content: [
      'Item Code,Item Name,Category,Unit Price,Currency,Tax Code,Active',
      'ITM-001,Office Chair,Furniture,1200.00,ZAR,VAT15,true',
      'ITM-002,Laptop Stand,Electronics,350.00,ZAR,VAT15,true',
      'ITM-003,Notebook A4,Stationery,25.00,ZAR,VAT15,true',
      'ITM-004,Desk Lamp,Furniture,180.00,ZAR,VAT15,true',
      'ITM-005,USB Hub,Electronics,220.00,USD,VAT15,true',
      'ITM-006,Filing Cabinet,Furniture,850.00,ZAR,VAT15,false',
    ].join('\n'),
  },
};

// ─── ERP badge colours (hex) ──────────────────────────────────────────────────

const ERP_BADGE_HEX: Record<string, { bg: string; fg: string }> = {
  odoo:                  { bg: '#9333EA', fg: '#FFFFFF' },
  sap:                   { bg: '#2563EB', fg: '#FFFFFF' },
  accpac:                { bg: '#0891B2', fg: '#FFFFFF' },
  dynamics365:           { bg: '#16A34A', fg: '#FFFFFF' },
  oracle_netsuite:       { bg: '#F97316', fg: '#FFFFFF' },
  netsuite:              { bg: '#F97316', fg: '#FFFFFF' },
  xero:                  { bg: '#0EA5E9', fg: '#FFFFFF' },
  syspro:                { bg: '#E11D48', fg: '#FFFFFF' },
  quickbooks:            { bg: '#2CA01C', fg: '#FFFFFF' },
  sage:                  { bg: '#00B050', fg: '#FFFFFF' },
  acumatica:             { bg: '#B91C1C', fg: '#FFFFFF' },
  acumatica_cloud_erp:   { bg: '#B91C1C', fg: '#FFFFFF' },
  microsoft:             { bg: '#00A4EF', fg: '#FFFFFF' },
  infor:                 { bg: '#FF6900', fg: '#FFFFFF' },
  epicor:                { bg: '#004990', fg: '#FFFFFF' },
};

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function MasterDataUploadScreen(): React.JSX.Element {
  const route = useRoute<UploadRoute>();
  const navigation = useNavigation<UploadNav>();
  const { orgProjectId, entityId, parentProjectId } = route.params;
  const mode = 'light';

  const { pack } = useEntityPack(orgProjectId, entityId);
  const { project } = useProjectDetail(createProjectId(parentProjectId));
  const sidebarProps = useWizardSidebarProps(parentProjectId);

  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dropZoneRef = useRef<View>(null);

  const t = dpTheme[mode];
  const MAX_PREVIEW = 8;

  const uploadStep = WIZARD_STEPS.find(s => s.id === 'upload')!;
  const profileStep = WIZARD_STEPS.find(s => s.id === 'profile')!;

  const header = csvRows[0] ?? [];
  const dataRows = Math.max(0, csvRows.length - 1);
  const hasFile = fileName !== null;
  const spec = pack?.spec ?? {};
  const expectedCols = spec.expectedColumns ?? [];
  const columnWarning = hasFile && expectedCols.length > 0
    ? missingColumns(header, expectedCols)
    : [];

  const targetErpInfo = pack?.target.record
    ? { name: pack.target.record, record: spec.targetNote ?? pack.target.record }
    : {
        name: (() => { const e = getERPById(project?.targetErp ?? ''); return e?.name ?? (toTitleCase((project?.targetErp ?? '').replace(/_/g, ' ')) || '—'); })(),
        record: pack?.target.record ?? '',
      };

  const entityLabel = pack?.label.plural ?? entityId.charAt(0).toUpperCase() + entityId.slice(1);

  const fallbackSample = ENTITY_SAMPLE[entityId.toLowerCase()];
  const sampleContent = spec.sample?.content ?? fallbackSample?.content ?? null;
  const sampleName = spec.sample?.name ?? fallbackSample?.name ?? `Source ${entityLabel} Sample`;
  const sampleDesc = spec.sample?.description ?? fallbackSample?.description ?? `Sample ${entityLabel.toLowerCase()} master data for a source ERP`;

  // ── CSV loading ─────────────────────────────────────────────────────────────

  const loadContent = useCallback((content: string, name: string): void => {
    const rows = parseCSV(content);
    setFileName(name);
    setCsvRows(rows);
    setShowPreview(true);
  }, []);

  const handleWebFile = useCallback(async (file: File): Promise<void> => {
    const content = await file.text();
    loadContent(content, file.name);
  }, [loadContent]);

  const handleNativePick = useCallback(async (): Promise<void> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const content = await FileSystem.readAsStringAsync(asset.uri);
    loadContent(content, asset.name);
  }, [loadContent]);

  const handlePress = useCallback((): void => {
    if (hasFile) return;
    if (isWeb) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv,text/csv';
      input.onchange = (e: Event): void => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) void handleWebFile(file);
      };
      input.click();
    } else {
      void handleNativePick();
    }
  }, [hasFile, handleWebFile, handleNativePick]);

  const handleRemove = useCallback((): void => {
    setFileName(null);
    setCsvRows([]);
    setShowPreview(false);
  }, []);

  React.useEffect(() => {
    if (!isWeb || hasFile) return;
    const el = dropZoneRef.current as unknown as HTMLElement | null;
    if (!el) return;
    const onOver = (e: DragEvent): void => { e.preventDefault(); setIsDragOver(true); };
    const onLeave = (e: DragEvent): void => { e.preventDefault(); setIsDragOver(false); };
    const onDrop = (e: DragEvent): void => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) void handleWebFile(file);
    };
    el.addEventListener('dragover', onOver);
    el.addEventListener('dragleave', onLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onOver);
      el.removeEventListener('dragleave', onLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [isWeb, hasFile, handleWebFile]);

  const handleLoadSample = useCallback((): void => {
    if (!sampleContent) return;
    loadContent(sampleContent, `${entityId}-sample.csv`);
  }, [sampleContent, entityId, loadContent]);

  const handleDownloadSample = useCallback(async (): Promise<void> => {
    if (!sampleContent) return;
    const name = `${entityId}-sample.csv`;
    if (isWeb) {
      const blob = new Blob([sampleContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } else {
      const path = `${FileSystem.documentDirectory ?? ''}${name}`;
      await FileSystem.writeAsStringAsync(path, sampleContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path);
    }
  }, [sampleContent, entityId]);

  const handleBack = useCallback((): void => { navigation.goBack(); }, [navigation]);
  const handleContinue = useCallback((): void => { navigation.goBack(); }, [navigation]);

  const stepCounter = `Step ${uploadStep.n} of ${WIZARD_STEPS.length}`;
  const continueLabel = `Continue to ${profileStep.label}`;
  const fileLine = hasFile
    ? `${fileName ?? ''} · ${dataRows} rows`
    : `No source file selected · step ${uploadStep.n} of ${WIZARD_STEPS.length}`;

  const cleanChip = semantic('impact', 'clean', mode);
  const warnFind = semantic('find', 'warn', mode);
  const blockerTone = semantic('metricTone', 'blocker', mode);

  const targetErpKey = (project?.targetErp ?? '').toLowerCase();
  const erpBadge = ERP_BADGE_HEX[targetErpKey] ?? { bg: cleanChip.bg, fg: cleanChip.fg };
  const erpInitial = targetErpInfo.name.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: t.palette.bg }]}>

      {/* ── Body: sidebar (full height) + main ───────────────────────────── */}
      <View style={s.body}>

        {/* Sidebar reaches the very top — stepper is only in the main column */}
        {isWeb && (
          <View className="w-64 border-r border-border bg-card" style={{ flexShrink: 0 }}>
            <SidebarContent {...sidebarProps} />
          </View>
        )}

        {/* Main content */}
        <View style={s.main}>

          {/* ── Wizard stepper (COA style, inside main column only) ──────── */}
          <WizardStepper currentStepN={uploadStep.n} />

          {/* ── Page header ────────────────────────────────────────────── */}
          <View style={[s.header, { borderBottomColor: t.palette.border, backgroundColor: t.palette.card }]}>
            <View style={s.headerLeft}>
              <View style={s.titleRow}>
                <Text style={[s.pageTitle, { color: t.palette.fg }]}>{uploadStep.label}</Text>
                <Text style={[s.stepCounter, { color: t.palette.muted }]}>{stepCounter}</Text>
              </View>
              <View style={s.fileLineRow}>
                <Text style={[s.fileLine, { color: t.palette.muted }]} numberOfLines={1}>{fileLine}</Text>
              </View>
            </View>
            <View style={s.headerActions}>
              <Pressable
                onPress={handleBack}
                style={[s.btnOutline, { borderColor: t.palette.border, backgroundColor: t.palette.card }]}
              >
                <Text style={[s.btnText, { color: t.palette.fg }]}>← Back</Text>
              </Pressable>
              <Pressable
                onPress={handleContinue}
                disabled={!hasFile}
                style={[
                  s.btnPrimary,
                  hasFile ? { backgroundColor: t.palette.primary } : { backgroundColor: t.palette.surface },
                ]}
              >
                <Text style={[s.btnPrimaryText, hasFile ? { color: t.palette.primaryFg } : { color: t.palette.muted }]}>
                  {continueLabel} →
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ── Scrollable content ─────────────────────────────────────── */}
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

            {/* ── Main panel ───────────────────────────────────────────── */}
            <View style={[s.panel, { borderColor: t.palette.border, backgroundColor: t.palette.card }]}>
              <View style={s.panelGrid}>

                {/* 1. Source dropzone / file card */}
                <View style={s.panelCol}>
                  <Text style={[s.panelTitle, { color: t.palette.fg }]}>
                    {'1. Source '}
                    <Text style={{ color: t.palette.fg }}>{entityLabel}</Text>
                    {': Master Data '}
                    <Text style={{ color: blockerTone.fg }}>*</Text>
                  </Text>
                  <Text style={[s.panelSub, { color: t.palette.muted }]}>Upload a source CSV to continue</Text>

                  {!hasFile ? (
                    <Pressable onPress={handlePress} style={s.dropzoneWrap}>
                      <View
                        ref={dropZoneRef}
                        style={[
                          s.dropzone,
                          {
                            borderColor: isDragOver ? t.palette.accent : t.palette.border,
                            backgroundColor: t.palette.surfaceHi,
                          },
                        ]}
                      >
                        <View style={[s.dropzoneIcon, { backgroundColor: `${t.palette.accent}1A` }]}>
                          <Upload size={22} color={t.palette.accent} strokeWidth={2} />
                        </View>
                        <Text style={[s.dropzoneHeading, { color: t.palette.fg }]}>
                          {'Drag & drop your CSV here, or '}
                          <Text style={{ color: t.palette.accent, textDecorationLine: 'underline' }}>browse</Text>
                        </Text>
                        <Text style={[s.dropzoneHint, { color: t.palette.muted }]}>
                          CSV with a header row · up to 10 MB
                        </Text>
                        {expectedCols.length > 0 && (
                          <Text style={[s.dropzoneExpected, { color: t.palette.muted }]}>
                            {'expects: '}{expectedCols.slice(0, 4).join(', ')}{expectedCols.length > 4 ? ' …' : ''}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  ) : (
                    <View style={[s.fileCard, { borderColor: t.palette.border }]}>
                      <View style={s.fileCardRow}>
                        <View style={[s.csvBadge, { backgroundColor: cleanChip.bg }]}>
                          <Text style={[s.csvBadgeText, { color: cleanChip.fg }]}>CSV</Text>
                        </View>
                        <View style={s.fileCardMeta}>
                          <Text style={[s.fileName, { color: t.palette.fg }]} numberOfLines={1}>{fileName}</Text>
                          <Text style={[s.rowCount, { color: t.palette.muted }]}>{dataRows} rows loaded</Text>
                        </View>
                        <View style={[s.chip, { backgroundColor: t.palette.chip }]}>
                          <Text style={[s.chipLabel, { color: t.palette.chipFg }]}>SOURCE</Text>
                        </View>
                      </View>
                      {columnWarning.length > 0 && (
                        <View style={[s.warnBox, { backgroundColor: warnFind.bg }]}>
                          <Text style={[s.warnText, { color: warnFind.fg }]}>
                            {columnWarning.length} expected {columnWarning.length === 1 ? 'column is' : 'columns are'} not present:{' '}
                            {columnWarning.join(', ')}. Profiling will still run, but these fields cannot be mapped.
                          </Text>
                        </View>
                      )}
                      <View style={s.fileCardActions}>
                        <Pressable
                          onPress={() => setShowPreview(p => !p)}
                          style={[s.btnOutline, { flex: 1, borderColor: t.palette.border, backgroundColor: t.palette.card }]}
                        >
                          <Text style={[s.btnText, { color: t.palette.fg }]}>{showPreview ? 'Hide preview' : 'Preview'}</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleRemove}
                          style={[s.btnSquare, { borderColor: t.palette.border, backgroundColor: t.palette.card }]}
                        >
                          <Text style={{ color: blockerTone.fg, fontSize: 16 }}>✕</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>

                {/* 2. Target panel */}
                <View style={s.panelCol}>
                  <Text style={[s.panelTitle, { color: t.palette.fg }]}>2. Target System Format</Text>
                  <Text style={[s.panelSub, { color: t.palette.muted }]}>Set when the project was created</Text>

                  <View style={[s.targetCard, { borderColor: t.palette.border, backgroundColor: t.palette.surfaceHi }]}>
                    <View style={s.fileCardRow}>
                      <View style={[s.targetBadge, { backgroundColor: erpBadge.bg }]}>
                        <Text style={[s.csvBadgeText, { color: erpBadge.fg }]}>
                          {erpInitial}
                        </Text>
                      </View>
                      <View style={s.fileCardMeta}>
                        <Text style={[s.fileName, { color: t.palette.fg }]} numberOfLines={1}>
                          {targetErpInfo.name}
                        </Text>
                        {targetErpInfo.record.length > 0 && (
                          <Text style={[s.rowCount, { color: t.palette.muted }]} numberOfLines={1}>
                            {targetErpInfo.record}
                          </Text>
                        )}
                      </View>
                      <View style={[s.chip, { backgroundColor: cleanChip.bg }]}>
                        <Text style={[s.chipLabel, { color: cleanChip.fg }]}>✓ TARGET</Text>
                      </View>
                    </View>
                    <View style={[s.targetBlurb, { borderTopColor: t.palette.border }]}>
                      <Text style={[s.targetBlurbText, { color: t.palette.muted }]}>
                        {`The uploaded ${entityLabel.toLowerCase()} data will be converted into this system's format. To change the target, edit the project settings.`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Sample file row — always visible */}
              <View style={[s.sampleRow, { borderTopColor: t.palette.border }]}>
                <Text style={[s.panelTitle, { color: t.palette.fg }]}>Sample File</Text>
                <Text style={[s.panelSub, { color: t.palette.muted }]}>
                  Preview or download a sample source file for testing
                </Text>
                <View style={s.sampleContent}>
                  <View style={[s.csvBadgeSm, { backgroundColor: t.palette.surface }]}>
                    <Text style={[s.csvBadgeTextSm, { color: t.palette.muted }]}>CSV</Text>
                  </View>
                  <Text style={[s.sampleName, { color: t.palette.fg }]}>{sampleName}</Text>
                  <Text style={[s.sampleDesc, { color: t.palette.muted }]} numberOfLines={2}>
                    {sampleDesc}
                  </Text>
                  <View style={s.sampleButtons}>
                    <Pressable
                      onPress={handleLoadSample}
                      style={[s.btnOutline, { borderColor: t.palette.border, backgroundColor: t.palette.card }]}
                    >
                      <Text style={[s.btnText, { color: t.palette.fg }]}>Load</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleDownloadSample()}
                      style={[s.btnOutline, { borderColor: t.palette.border, backgroundColor: t.palette.card }]}
                    >
                      <Text style={[s.btnText, { color: t.palette.fg }]}>Download</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            {/* Source file preview */}
            {hasFile && showPreview && (
              <View style={[s.previewSection, { backgroundColor: t.palette.card, borderColor: t.palette.border }]}>
                <View style={s.previewHeaderRow}>
                  <LayoutTemplate size={17} color={t.palette.primary} strokeWidth={1.8} />
                  <Text style={[s.previewTitle, { color: t.palette.fg }]}>Source File Preview</Text>
                  <View style={[s.previewCountBadge, { borderColor: t.palette.border }]}>
                    <Text style={[s.previewCountText, { color: t.palette.muted }]}>
                      {`first ${Math.min(MAX_PREVIEW, dataRows)} of ${dataRows} rows`}
                    </Text>
                  </View>
                </View>
                <Text style={[s.previewSub, { color: t.palette.muted }]}>
                  Check the header row and a few sample values before continuing. Column names are matched to target fields in the next step.
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}>
                  <View style={{ flex: 1 }}>
                    <View style={[s.tableHeaderRow, { backgroundColor: t.palette.surface, borderBottomColor: t.palette.border }]}>
                      <View style={s.tableRowNum}>
                        <Text style={[s.tableHeaderCell, { color: t.palette.muted }]}>SRC #</Text>
                      </View>
                      {header.map((col, i) => (
                        <View key={i} style={s.tableCell}>
                          <Text style={[s.tableHeaderCell, { color: t.palette.muted }]} numberOfLines={1}>{col}</Text>
                        </View>
                      ))}
                    </View>
                    {csvRows.slice(1, 1 + MAX_PREVIEW).map((row, ri) => (
                      <View key={ri} style={[s.tableDataRow, { borderBottomColor: t.palette.border }]}>
                        <View style={s.tableRowNum}>
                          <Text style={[s.tableRowNumText, { color: t.palette.muted }]}>{ri + 1}</Text>
                        </View>
                        {row.map((cell, ci) => (
                          <View key={ci} style={s.tableCell}>
                            <Text style={[s.tableDataCell, { color: t.palette.fg }]} numberOfLines={1}>{cell}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <Text style={[s.statusText, { color: t.palette.muted }]}>
              {hasFile
                ? `${fileName ?? ''} → ${targetErpInfo.name}`
                : `Waiting for a source ${(pack?.label.singular ?? entityId).toLowerCase()} file…`}
            </Text>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:           { flex: 1 },
  body:             { flex: 1, flexDirection: 'row' },
  main:             { flex: 1, flexDirection: 'column' },

  header:           { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  headerLeft:       { flex: 1, minWidth: 200 },
  titleRow:         { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  pageTitle:        { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, fontFamily: 'Chivo' },
  stepCounter:      { fontSize: 12, fontFamily: 'Inter' },
  fileLineRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fileLine:         { fontSize: 12, fontFamily: 'JetBrainsMono' },
  headerActions:    { flexDirection: 'row', alignItems: 'center', gap: 10 },

  btnOutline:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnText:          { fontSize: 12, fontWeight: '500', fontFamily: 'Inter' },
  btnPrimary:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 8 },
  btnPrimaryText:   { fontSize: 12, fontWeight: '600', fontFamily: 'Inter' },
  btnSquare:        { width: 40, height: 40, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  scroll:           { flex: 1 },
  scrollContent:    { paddingHorizontal: 20, paddingVertical: 16, gap: 16, flexGrow: 1 },

  panel:            { borderWidth: 1, borderRadius: 12, padding: 18, alignSelf: 'stretch' },
  panelGrid:        { flexDirection: Platform.OS === 'web' ? 'row' : 'column', gap: 24, flexWrap: 'wrap' },
  panelCol:         { flex: 1, minWidth: 280 },
  panelTitle:       { fontSize: 15, fontWeight: '700', marginBottom: 2, fontFamily: 'Chivo' },
  panelSub:         { fontSize: 12, marginBottom: 12, fontFamily: 'Inter' },

  dropzoneWrap:     { flex: 1 },
  dropzone:         { flex: 1, minHeight: 140, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, padding: 22, alignItems: 'center', justifyContent: 'center', gap: 8 },
  dropzoneIcon:     { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dropzoneHeading:  { fontSize: 13, fontWeight: '600', textAlign: 'center', fontFamily: 'Chivo' },
  dropzoneHint:     { fontSize: 12, textAlign: 'center', fontFamily: 'Inter' },
  dropzoneExpected: { fontSize: 11, fontFamily: 'JetBrainsMono', textAlign: 'center', marginTop: 2 },

  fileCard:         { borderWidth: 1, borderRadius: 10, padding: 14 },
  fileCardRow:      { flexDirection: 'row', alignItems: 'center', gap: 11 },
  csvBadge:         { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  csvBadgeText:     { fontSize: 10, fontWeight: '700', fontFamily: 'JetBrainsMono' },
  fileCardMeta:     { flex: 1, minWidth: 0 },
  fileName:         { fontSize: 13, fontWeight: '600', fontFamily: 'Inter' },
  rowCount:         { fontSize: 12, marginTop: 2, fontFamily: 'JetBrainsMono' },
  chip:             { borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  chipLabel:        { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, fontFamily: 'Inter' },
  fileCardActions:  { flexDirection: 'row', gap: 9, marginTop: 12 },

  warnBox:          { marginTop: 11, borderRadius: 8, padding: 10 },
  warnText:         { fontSize: 12, lineHeight: 18, fontFamily: 'Inter' },

  targetCard:       { flex: 1, borderWidth: 1, borderRadius: 10, padding: 14 },
  targetBadge:      { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  targetBlurb:      { borderTopWidth: 1, marginTop: 13, paddingTop: 11 },
  targetBlurbText:  { fontSize: 12, lineHeight: 18, fontFamily: 'Inter' },

  sampleRow:        { borderTopWidth: 1, marginTop: 20, paddingTop: 16 },
  sampleContent:    { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 13, flexWrap: 'wrap' },
  csvBadgeSm:       { width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  csvBadgeTextSm:   { fontSize: 9, fontWeight: '700', fontFamily: 'JetBrainsMono' },
  sampleName:       { flex: 1, minWidth: 120, fontSize: 13, fontWeight: '600', fontFamily: 'Inter' },
  sampleDesc:       { flex: 1.4, minWidth: 160, fontSize: 12, fontFamily: 'Inter' },
  sampleButtons:    { flexDirection: 'row', gap: 9 },

  previewSection:   { borderWidth: 1, borderRadius: 12, overflow: 'hidden', alignSelf: 'stretch' },
  previewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 14 },
  previewIcon:      { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  previewTitle:     { fontSize: 16, fontWeight: '700', fontFamily: 'Chivo' },
  previewCountBadge: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 3 },
  previewCountText: { fontSize: 12, fontFamily: 'JetBrainsMono' },
  previewSub:       { fontSize: 12, paddingHorizontal: 14, marginBottom: 8, fontFamily: 'Inter' },
  tableHeaderRow:   { flexDirection: 'row', borderBottomWidth: 1 },
  tableDataRow:     { flexDirection: 'row', borderBottomWidth: 1 },
  tableRowNum:      { width: 56, flexShrink: 0, paddingHorizontal: 12, paddingVertical: 10 },
  tableRowNumText:  { fontSize: 12, fontFamily: 'JetBrainsMono' },
  tableCell:        { flex: 1, minWidth: 140, paddingHorizontal: 12, paddingVertical: 10 },
  tableHeaderCell:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: 'Inter' },
  tableDataCell:    { fontSize: 12, fontFamily: 'JetBrainsMono' },

  statusText:       { fontSize: 12, fontFamily: 'JetBrainsMono', paddingVertical: 4 },
});
