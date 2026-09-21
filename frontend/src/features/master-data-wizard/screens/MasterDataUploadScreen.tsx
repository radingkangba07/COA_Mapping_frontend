import React, { useCallback, useEffect, useRef, useState } from 'react';
import {View, Text, ScrollView,} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutTemplate, File as FileIcon, ArrowLeft, ArrowRight } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { ProjectsStackParamList } from '@/navigation/types';
import type { MasterDataWizardStackParamList } from '../navigation/masterDataWizardStack.types';
import { stepIdToWizardRoute } from '../navigation/masterDataWizardStack.types';
import { isWeb } from '@/shared/utils/platform.utils';
import { getERPById } from '@/shared/constants/erp-systems';
import { useProjectDetail } from '@/features/projects/hooks/useProjectDetail';
import { createProjectId } from '@/shared/types/common.types';
import { useEntityPack } from '../hooks/useEntityPack';
import { useSourceFileUpload } from '../hooks/useSourceFileUpload';
import { useOrgProjectFiles } from '../hooks/useOrgProjectFiles';
import { useDeleteFile } from '../hooks/useDeleteFile';
import { usePersistedFilePreview } from '../hooks/usePersistedFilePreview';
import { createPipelineRun, getActivePipelineRun, isPipelineRunConflict } from '../services/entity-pack.service';
import { useToast } from '@/shared/hooks/useToast';
import { buildEntityKey, useWizardStore } from '../store/wizard.store';
import { STEPS } from '../dp-kit/react/taxonomy';
import { toStepRail } from '../mappers/toStepRail';
import { StepRail } from '@/shared/components/ui/StepRail';
import { parseCSV } from '../utils/csv';
import { missingColumns } from '../utils/columnCheck';
import { formatPreviewHeader, formatPreviewValue, isNumericColumn } from '../utils/previewFormat';
import { colors } from '@/config/theme';
import type { StepId } from '../types/wizard.types';
import type { EntityId } from '../types/entity-pack.types';
import type { UploadResult } from '../types/upload.types';
import { Button } from '@/shared/components/ui/Button';
import { Spinner } from '@/shared/components/ui/Spinner';
import { FileUploadField, FileTargetCard, type UploadedFile } from '@/shared/components/ui/FileUploader';
import { NetworkErrorFallback } from '@/shared/components/feedback/NetworkErrorFallback';
import { SampleFileCard } from '@/shared/components/ui/SampleFileCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadNav = NativeStackNavigationProp<MasterDataWizardStackParamList, 'Upload'>;

// Stable reference for the zustand selector fallback below — a fresh `[]`
// literal on every call makes useWizardStore's snapshot compare unequal to
// itself every render (nothing ever "settles"), which forces React into
// "Maximum update depth exceeded". Same pattern as SourceDataProfileScreen's
// own EMPTY_STEP_IDS.
const EMPTY_STEP_IDS: readonly StepId[] = [];

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
  vendors: {
    name: 'Source Vendors Sample',
    description: 'Sample vendor master data for a source ERP',
    content: [
      'Vendor Code,Vendor Name,VAT No,Email,Payment Terms,Currency,Bank Account',
      'V-2001,Steel Dynamics Ltd,4302198765,payables@steeldyn.co.za,Net 30,ZAR,1234567890',
      'V-2002,Global Parts Inc,,orders@globalparts.com,Net 60,USD,9988776655',
      'V-2003,Nordic Freight AB,5560012233,billing@nordicfreight.se,Net 45,EUR,4455667788',
      'V-2004,Cape Office Supplies,4890123456,,COD,ZAR,',
      'V-2005,TechSource Distributors,4123456789,accounts@techsource.co.za,2/10 N30,ZAR,3322114455',
      'V-2006,Everest Packaging CC,,sales@everestpack.co.za,Net 30,ZAR,6677889900',
    ].join('\n'),
  },
  locations: {
    name: 'Source Locations Sample',
    description: 'Sample location master data for a source ERP',
    content: [
      'Location Code,Location Name,Type,Address,City,Country,Active',
      'LOC-01,Main Warehouse,Warehouse,12 Industrial Rd,Johannesburg,South Africa,true',
      'LOC-02,Cape Town DC,Distribution Center,45 Harbour St,Cape Town,South Africa,true',
      'LOC-03,Durban Depot,Depot,7 Dock Ave,Durban,South Africa,true',
      'LOC-04,Retail Store 4,Retail,89 Main St,Pretoria,South Africa,false',
      'LOC-05,Regional Office,Office,,Bloemfontein,South Africa,true',
      'LOC-06,Overseas Hub,Warehouse,220 Trade Blvd,Rotterdam,Netherlands,true',
    ].join('\n'),
  },
  contacts: {
    name: 'Source Contacts Sample',
    description: 'Sample contact master data for a source ERP',
    content: [
      'Contact ID,Full Name,Company,Email,Phone,Role,Active',
      'CT-001,Sarah Naidoo,Roboweeder Pty Ltd,sarah.naidoo@roboweeder.co.za,+27 82 555 0101,Accounts Manager,true',
      'CT-002,John Smith,Acme Trading CC,john.smith@acme.com,,Sales Rep,true',
      'CT-003,Lena Berg,Nordic Freight AB,lena.berg@nordicfreight.se,+46 70 555 2211,Logistics Coordinator,true',
      'CT-004,,Baltic Imports BV,accounts@baltic.eu,+31 20 555 3344,Finance Contact,true',
      'CT-005,Thabo Mokoena,Cape Office Supplies,thabo.m@capeoffice.co.za,+27 83 555 4455,Procurement,false',
      'CT-006,Amy Chen,TechSource Distributors,amy.chen@techsource.co.za,+27 84 555 6677,Account Executive,true',
    ].join('\n'),
  },
  vehicles: {
    name: 'Source Vehicles Sample',
    description: 'Sample vehicle fleet master data for a source ERP',
    content: [
      'Vehicle ID,Registration No,Make,Model,Year,Fuel Type,Active',
      'VEH-01,CA 123-456,Toyota,Hilux,2022,Diesel,true',
      'VEH-02,GP 789-012,Ford,Ranger,2021,Diesel,true',
      'VEH-03,KZN 345-678,Isuzu,D-Max,2023,Diesel,true',
      'VEH-04,WC 901-234,Nissan,NV350,2019,Petrol,false',
      'VEH-05,GP 567-890,Toyota,Corolla,2020,Petrol,true',
      'VEH-06,,Mercedes-Benz,Sprinter,2022,Diesel,true',
    ].join('\n'),
  },
  equipment: {
    name: 'Source Equipment Sample',
    description: 'Sample equipment master data for a source ERP',
    content: [
      'Equipment ID,Equipment Name,Category,Serial No,Location,Status,Purchase Date',
      'EQ-1001,Forklift A,Material Handling,FLA-99231,Main Warehouse,Active,2021-03-15',
      'EQ-1002,Conveyor Belt 1,Production,CB1-77410,Cape Town DC,Active,2020-07-01',
      'EQ-1003,Air Compressor,Maintenance,AC-55210,Durban Depot,Under Repair,2019-11-20',
      'EQ-1004,Generator 5kVA,Power,GEN5-33012,Regional Office,Active,',
      'EQ-1005,Pallet Jack,Material Handling,,Main Warehouse,Active,2022-01-10',
      'EQ-1006,CNC Machine,Production,CNC-88123,Overseas Hub,Decommissioned,2015-05-05',
    ].join('\n'),
  },
  fixedassets: {
    name: 'Source Fixed Assets Sample',
    description: 'Sample fixed asset register data for a source ERP',
    content: [
      'Asset Code,Asset Name,Category,Acquisition Cost,Acquisition Date,Depreciation Method,Book Value',
      'FA-500,Office Building A,Buildings,4500000.00,2015-06-01,Straight Line,3200000.00',
      'FA-501,Delivery Truck 1,Vehicles,650000.00,2019-02-14,Reducing Balance,210000.00',
      'FA-502,Server Rack,IT Equipment,180000.00,2021-09-01,Straight Line,90000.00',
      'FA-503,Warehouse Racking,Furniture & Fixtures,95000.00,2018-04-10,Straight Line,38000.00',
      'FA-504,Executive Desk Set,Furniture & Fixtures,25000.00,2022-01-01,,20000.00',
      'FA-505,Manufacturing Press,Machinery,1200000.00,2016-08-20,Straight Line,',
    ].join('\n'),
  },
};

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function MasterDataUploadScreen(): React.JSX.Element {
  const navigation = useNavigation<UploadNav>();
  // Seeded once by MasterDataWizardScreen (the single ProjectsStack route
  // this nested stack lives inside — see masterDataWizardStack.types.ts)
  // before this step is ever allowed to mount, so these are never null here.
  const entityId = useWizardStore((s) => s.entityId) as EntityId;
  const orgProjectId = useWizardStore((s) => s.orgProjectId) as string;
  const parentProjectId = useWizardStore((s) => s.parentProjectId) as string;
  const workstreamId = useWizardStore((s) => s.workstreamId) as string;

  const { pack, refetch: refetchPack } = useEntityPack(orgProjectId, entityId);
  const {
    upload: uploadSourceFileToServer,
    result: uploadResult,
    isUploading,
    error: uploadError,
    reset: resetUpload,
  } = useSourceFileUpload({ orgProjectId, workstreamId, fileType: 'source_erp' });
  // Keyed by project+entity (see wizard.store.ts's buildEntityKey) — local
  // step/run bookkeeping only (below); never the uploaded file itself, see
  // discoveredFiles.
  const entityKey = buildEntityKey(parentProjectId, entityId as EntityId);
  // GET /api/v1/storage/org-project/{org_project_id}/files is the single
  // source of truth for the FileUploader's state. useOrgProjectFiles filters
  // its response by file.workstreamId === workstreamId — a file failing
  // that check is never shown, even if it belongs to this same org project.
  // Because this hook's own query key includes workstreamId/entityId,
  // changing either re-evaluates and refreshes the displayed file
  // immediately — never a stale file left over from a different
  // entity/workstream selection.
  const discoveredFiles = useOrgProjectFiles(orgProjectId, workstreamId, entityId);
  // files[0] after that filter — the ONE record this screen may ever
  // display. null means no file matches this exact workstream, full stop;
  // nothing else (a local CSV parse, the upload mutation's own response, a
  // file loaded for a different entity/workstream) may substitute for it.
  const matchedFile = discoveredFiles.latestFile;
  const hasFile = matchedFile !== null;
  // The matched file's OWN workstreamId, extracted from the record itself
  // rather than assumed from the current selection — used for subsequent
  // file operations (delete, below) so they always act on the workstream
  // the backend actually associated with this file. Falls back to the
  // selected workstreamId only while the backend doesn't yet echo
  // workstream_id back on the file object.
  const matchedWorkstreamId = matchedFile?.workstreamId ?? workstreamId;
  const { remove: removeFile } = useDeleteFile({ orgProjectId, workstreamId: matchedWorkstreamId, entityId });
  // Kept entirely separate from the uploaded file's own state above — see
  // loadPreviewByEntity's doc comment in wizard.store.ts. Loading the sample
  // must never write into, or be overwritten by, the actual uploaded file's
  // own preview state.
  const loadPreview = useWizardStore((s) => s.loadPreviewByEntity[entityKey]);
  const setLoadPreview = useWizardStore((s) => s.setLoadPreview);
  const pipelineRunIdByEntity = useWizardStore((s) => s.pipelineRunIdByEntity);
  const setPipelineRunId = useWizardStore((s) => s.setPipelineRunId);
  const clearPipelineRunId = useWizardStore((s) => s.clearPipelineRunId);
  const recordStep = useWizardStore((s) => s.recordStep);
  const completeStep = useWizardStore((s) => s.completeStep);
  const completedStepIds = useWizardStore(
    (s) => s.completedStepIdsByEntity[buildEntityKey(parentProjectId ?? '', entityId)] ?? EMPTY_STEP_IDS,
  );
  const setUploadedFile = useWizardStore((s) => s.setUploadedFile);
  const clearUploadedFile = useWizardStore((s) => s.clearUploadedFile);
  const setSourceCsv = useWizardStore((s) => s.setSourceCsv);
  const clearSourceCsv = useWizardStore((s) => s.clearSourceCsv);
  const { project, isLoading: isProjectLoading, isFetching: isProjectFetching, error: projectError, refetch: refetchProject } = useProjectDetail(createProjectId(parentProjectId));
  // The entity-pack profile fetch is deliberately excluded from this gate:
  // the backend has no GET /projects/{id}/entities/{id}/profile route yet,
  // so `pack` is treated as optional everywhere below (spec ?? {}, pack?.*,
  // ENTITY_SAMPLE fallback) rather than blocking Step 1 on a 404.
  const hydrationError = projectError;
  // TanStack Query's `isLoading` is only true on the very first fetch (it's
  // `isPending && isFetching`, and `isPending` goes false forever once a
  // query first settles). Once an error has been hit, a retry only flips
  // `isFetching` — so fold that in here, but only while an error is present,
  // to avoid the spinner flashing on ordinary background refetches.
  const isHydrating = isProjectLoading
    || (hydrationError !== null && isProjectFetching);
  const retryHydration = useCallback((): void => {
    refetchPack();
    refetchProject();
  }, [refetchPack, refetchProject]);

  const [fileName, setFileName] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  // Hidden by default (see loadContent's own comment) — the user opts in via
  // FileUploadField's Preview/Hide-preview toggle.
  const [showPreview, setShowPreview] = useState(false);
  // Toggled by the Sample File card's Load button — independent of
  // showPreview above (Source File Preview's own toggle). The underlying
  // sample rows stay in loadPreviewByEntity either way; this only controls
  // whether the Load Preview panel is currently shown.
  const [showLoadPreview, setShowLoadPreview] = useState(false);
  const [isCreatingRun, setIsCreatingRun] = useState(false);
  const toast = useToast();

  // After a successful upload, immediately re-run discovery and let ITS
  // response — not the raw mutation result — become what the screen shows.
  // This is what makes "just uploaded, this tab" and "opened fresh in a
  // second tab/browser" resolve through the exact same code path.
  useEffect(() => {
    if (uploadResult) {
      discoveredFiles.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadResult]);

  // React Navigation returning focus to an already-mounted screen doesn't
  // remount it, so this is what makes coming back from Profile (or any
  // other step) re-evaluate the discovery response instead of showing
  // whatever it last happened to hold.
  useFocusEffect(
    useCallback(() => {
      discoveredFiles.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgProjectId, workstreamId, entityId]),
  );

  // A failed discovery fetch (expired session, no access to this org
  // project, backend unreachable) previously left this screen looking
  // exactly like "no file uploaded yet" — indistinguishable from the real
  // empty state. `toast.showError` is stable across renders even though
  // useToast()'s returned object isn't, so `toast` is deliberately left out
  // of the dependency array below.
  useEffect(() => {
    if (!discoveredFiles.error) return;
    toast.showError('Could not load your uploaded file', discoveredFiles.error.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoveredFiles.error]);

  const effectiveUploadResult: UploadResult | null = matchedFile
    ? {
        fileId: matchedFile.id,
        fileName: matchedFile.originalFilename,
        fileType: matchedFile.fileType,
        contentType: matchedFile.contentType,
        sizeBytes: matchedFile.sizeBytes,
        status: matchedFile.status,
        rowCount: matchedFile.rowCount,
        storagePath: matchedFile.storagePath,
        createdAt: matchedFile.createdAt,
      }
    : null;

  const MAX_PREVIEW = 8;

  const uploadStep = STEPS.find(s => s.id === 'upload')!;
  const profileStep = STEPS.find(s => s.id === 'profile')!;
  const stepRail = toStepRail(uploadStep.id as StepId, STEPS, completedStepIds);
  // StepRail only ever calls this for a 'complete' or 'active' dot (see
  // StepRail.tsx's own clickable check) — an 'upcoming' step is never
  // pressable, so this never needs to guard against jumping ahead.
  // recordStep persists the jump (survives a refresh) the same way
  // handleBack/handleContinue already do elsewhere in this wizard.
  const handleStepPress = useCallback(
    (stepId: StepId): void => {
      recordStep(entityId, stepId);
      navigation.navigate(stepIdToWizardRoute(stepId));
    },
    [recordStep, entityId, navigation],
  );

  // Local CSV parse when this browser tab actually read the file (this
  // session's own upload/sample-load); otherwise download and parse the
  // persisted file's actual bytes (GET /api/v1/storage/download/{fileId})
  // for a project reopened with no local parse to work from (a refresh, a
  // new tab, revisiting from another route). The discovery response alone
  // can't cover this: it only ever returns column names and a row count,
  // never the actual row values.
  const { rows: persistedRows } = usePersistedFilePreview(
    orgProjectId,
    entityId,
    workstreamId,
    csvRows.length === 0 ? (matchedFile?.id ?? null) : null,
  );
  const effectiveRows = csvRows.length > 0 ? csvRows : persistedRows;
  const header = effectiveRows[0] ?? matchedFile?.columns ?? [];
  // Row count itself always comes from the discovery response (matchedFile),
  // never the upload mutation's own response — see discoveredFiles' own
  // header comment. effectiveRows still drives the actual preview table
  // content (real cell values, which the discovery response never carries),
  // just not the displayed count.
  const dataRows = effectiveRows.length > 0 ? Math.max(0, effectiveRows.length - 1) : (matchedFile?.rowCount ?? 0);
  const previewDataRows = effectiveRows.slice(1, 1 + MAX_PREVIEW);
  // Numeric columns render left-aligned, text columns center-aligned (headers
  // are always left-aligned, above) — a column only counts as numeric when
  // every non-empty cell within the previewed rows looks like a plain number.
  const columnIsNumeric = header.map((_, colIdx) => isNumericColumn(previewDataRows.map((row) => row[colIdx] ?? '')));

  // Load Preview — entirely independent of header/dataRows/previewDataRows
  // above, which are the uploaded file's own preview. Never derived from,
  // or falls back to, csvRows/persistedRows.
  const loadPreviewRows = loadPreview?.rows ?? [];
  const loadPreviewHeader = loadPreviewRows[0] ?? [];
  const loadPreviewDataCount = loadPreviewRows.length > 0 ? Math.max(0, loadPreviewRows.length - 1) : 0;
  const loadPreviewDataRows = loadPreviewRows.slice(1, 1 + MAX_PREVIEW);

  const displayFileName = matchedFile?.originalFilename ?? null;
  const spec = pack?.spec ?? {};
  const expectedCols = spec.expectedColumns ?? [];
  const columnWarning = hasFile && expectedCols.length > 0
    ? missingColumns(header, expectedCols)
    : [];

  // Always the project's own target ERP selection — never the entity pack's
  // JSON fixture data (pack.target.record / spec.targetNote), so this card
  // reflects what the project was actually configured with, not a fixture
  // value that happens to be present for some entities and not others.
  const targetErpInfo = {
    name: (() => { const e = getERPById(project?.targetErp ?? ''); return e?.name ?? (toTitleCase((project?.targetErp ?? '').replace(/_/g, ' ')) || '—'); })(),
    record: '',
  };

  const entityLabel = pack?.label.plural ?? entityId.charAt(0).toUpperCase() + entityId.slice(1);

  const fallbackSample = ENTITY_SAMPLE[entityId.toLowerCase()];
  const sampleContent = spec.sample?.content ?? fallbackSample?.content ?? null;
  const sampleName = spec.sample?.name ?? fallbackSample?.name ?? `Source ${entityLabel} Sample`;
  const sampleDesc = spec.sample?.description ?? fallbackSample?.description ?? `Sample ${entityLabel.toLowerCase()} master data for a source ERP`;

  // ── CSV loading ─────────────────────────────────────────────────────────────

  // Identifies the "current" file pick. handleFilePicked/handleLoadSample bump
  // this before starting a (possibly async, on native) content read;
  // loadContent only applies its result if the pick it captured is still
  // current. Without this, a slow file read that's still in flight when the
  // server upload fails fast (see the uploadError effect below) — or when the
  // user hits Remove before the read finishes — would resolve afterwards and
  // silently re-show the preview as if the file had been accepted.
  const activePickRef = useRef(0);

  const loadContent = useCallback((content: string, name: string, pick: number): void => {
    if (activePickRef.current !== pick) return;
    const rows = parseCSV(content);
    setFileName(name);
    setCsvRows(rows);
    // Persisted so the preview survives this screen losing its local state
    // (see the rehydrate effect above) — kept in step with uploadedFileByEntity,
    // which is what actually confirms this parse matches the server's file.
    setSourceCsv(entityId as EntityId, rows);
  }, [entityId, setSourceCsv]);

  const handleFilePicked = useCallback((file: UploadedFile): void => {
    const pick = ++activePickRef.current;
    if (file instanceof File) {
      void file.text().then((content) => loadContent(content, file.name, pick));
    } else {
      void FileSystem.readAsStringAsync(file.uri).then((content) =>
        loadContent(content, file.name, pick),
      );
    }
    // A previously confirmed fileId (and any profiler run it started)
    // belongs to the file being replaced — drop both now so neither can be
    // read while this new upload is still in flight (or if it fails).
    clearUploadedFile(entityId as EntityId);
    clearSourceCsv(entityId as EntityId);
    clearPipelineRunId(entityId as EntityId);
    uploadSourceFileToServer(file);
  }, [loadContent, uploadSourceFileToServer, clearUploadedFile, clearSourceCsv, clearPipelineRunId, entityId]);

  // The single point where a backend-confirmed upload becomes part of wizard
  // state — mirrors is the source of truth for later steps, never the local
  // CSV preview parsed in loadContent (which the server never sees).
  useEffect(() => {
    if (uploadResult) {
      setUploadedFile(entityId as EntityId, uploadResult);
    }
  }, [uploadResult, entityId, setUploadedFile]);

  // A failed server upload (e.g. the backend is unreachable) must not leave
  // the local CSV preview looking like an accepted file — drop it so the
  // dropzone reverts to "no file selected" instead of showing
  // "<name> · N rows loaded" for a file the server never actually received.
  useEffect(() => {
    if (uploadError) {
      // Invalidate any read still in flight for the pick that just failed —
      // see activePickRef's comment above.
      activePickRef.current += 1;
      setFileName(null);
      setCsvRows([]);
      setShowPreview(true);
    }
  }, [uploadError, clearSourceCsv, entityId]);

  const handleRemove = useCallback((): void => {
    activePickRef.current += 1;
    setFileName(null);
    setCsvRows([]);
    setShowPreview(false);
    resetUpload();
    clearUploadedFile(entityId as EntityId);
    clearSourceCsv(entityId as EntityId);
    clearPipelineRunId(entityId as EntityId);
    // Actually deletes the persisted file server-side (DELETE
    // /api/v1/storage/files/{fileId}) — the local-state clearing above is
    // this screen's own optimistic reset, not a substitute for it.
    // effectiveUploadResult is itself derived only from matchedFile (see
    // above), so this is the same id either way. useDeleteFile's own
    // onSuccess is what actually flips hasFile back to false, by
    // invalidating the discovery query this screen reads matchedFile from.
    if (matchedFile) {
      removeFile(matchedFile.id);
    }
  }, [resetUpload, clearPipelineRunId, entityId, matchedFile, removeFile]);

  // Toggles open/closed on repeated presses, same as FileUploadField's own
  // Preview/Hide-preview button (handleToggleSourcePreview below) — a second
  // press on Load previously just re-loaded and re-showed the same rows,
  // with no way to close the panel back from this button.
  const handleLoadSample = useCallback((): void => {
    if (showLoadPreview) {
      setShowLoadPreview(false);
      return;
    }
    if (!sampleContent) return;
    const rows = parseCSV(sampleContent);
    setLoadPreview(entityId as EntityId, `${entityId}-sample.csv`, rows);
    // Mutual exclusion with the uploaded file's own preview — see this
    // section's own header comment ("never both at once").
    setShowPreview(false);
    setShowLoadPreview(true);
  }, [showLoadPreview, sampleContent, entityId, setLoadPreview]);

  // FileUploadField's own Preview/Hide-preview toggle — closes showLoadPreview
  // when turning the upload's own preview on, for the same reason.
  const handleToggleSourcePreview = useCallback((): void => {
    setShowPreview((prev) => {
      const next = !prev;
      if (next) setShowLoadPreview(false);
      return next;
    });
  }, []);

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

  // Step 1 is only ever entered from ProjectOverview (see useOpenWorkstream),
  // so Back always means "return to that project's overview". `navigation`
  // here is scoped to the nested wizard stack (Upload/Profile/...), which
  // has no 'ProjectOverview' route of its own — reach the outer ProjectsStack
  // via getParent() rather than navigation.goBack(), which would instead
  // replay whatever the nested stack happens to have under Upload.
  const handleBack = useCallback((): void => {
    const parent = navigation.getParent<NativeStackNavigationProp<ProjectsStackParamList>>();
    if (parent) {
      parent.navigate('ProjectOverview', { projectId: parentProjectId });
    } else {
      // Should never happen given the nesting this screen assumes (see
      // comment above) — fall back to goBack() rather than silently doing
      // nothing if that assumption is ever violated.
      navigation.goBack();
    }
  }, [navigation, parentProjectId]);
  // A real stack navigation within the nested wizard stack (not a local
  // content swap) — this is what keeps the step actually on screen in sync
  // with the stack's own navigation state. Profile reads its own session
  // data (entityId, runId, ...) straight from wizard.store, so this step
  // transition carries no params of its own — see
  // navigation/masterDataWizardStack.types.ts.
  const handleContinue = useCallback(async (): Promise<void> => {
    if (!effectiveUploadResult) return;

    // Reaching this point at all means the upload already succeeded —
    // idempotent (wizard.store.ts's completeStep no-ops if 'upload' is
    // already in the set), so this is safe to call on every Continue press,
    // not just the very first one. Called unconditionally, before the
    // existingRunId early return below, so a revisit (Back then Continue
    // again, or reopening the project) still marks Upload complete instead
    // of leaving Profile's step rail showing it as undone.
    completeStep(entityId, 'upload');

    // This upload already has a run (an earlier Continue press created one) —
    // reuse it instead of hitting POST /api/v1/pipeline/runs again.
    const existingRunId = pipelineRunIdByEntity[entityKey];
    if (existingRunId) {
      recordStep(entityId, 'profile');
      navigation.navigate('Profile');
      return;
    }

    setIsCreatingRun(true);
    let result = await createPipelineRun(workstreamId, entityId, effectiveUploadResult.storagePath);
    // A run for this workstream+scope may already be in progress (e.g. the
    // user went Back and hit Continue again before the earlier run
    // finished) — the backend 409s in that case. Recover the existing run
    // instead of blocking the user with an error.
    if (!result.ok && isPipelineRunConflict(result.error)) {
      result = await getActivePipelineRun(orgProjectId, entityId);
    }
    setIsCreatingRun(false);
    if (!result.ok) {
      toast.showError('Could not start profiler', result.error.message);
      return;
    }
    setPipelineRunId(entityId as EntityId, result.data.id);
    recordStep(entityId, 'profile');
    navigation.navigate('Profile');
  }, [navigation, orgProjectId, entityId, entityKey, workstreamId, effectiveUploadResult, toast, pipelineRunIdByEntity, setPipelineRunId, recordStep, completeStep]);

  const stepCounter = `Step ${uploadStep.n} of ${STEPS.length}`;
  const continueLabel = `Continue to ${profileStep.label}`;
  const fileLine = hasFile
    ? `${displayFileName ?? ''} · ${dataRows} rows`
    : `No source ${entityId} file selected`;

  const targetErpKey = (project?.targetErp ?? '').toLowerCase();
  const erpInfo = getERPById(targetErpKey);
  const erpBadge = erpInfo
    ? { bg: erpInfo.brandColor, fg: colors.primaryForeground }
    : undefined;
  const erpInitial = targetErpInfo.name.slice(0, 2).toUpperCase();

  if (isHydrating) {
    return (
      <View className="flex-1 items-center justify-center" testID="master-data-upload-screen">
        <Spinner size="lg" />
        <Text className="mt-4 font-body text-sm text-muted-foreground">Loading project data...</Text>
      </View>
    );
  }

  if (hydrationError) {
    return (
      <View className="flex-1" testID="master-data-upload-screen">
        <NetworkErrorFallback error={new Error(hydrationError.message)} onRetry={retryHydration} testID="master-data-upload-error" />
      </View>
    );
  }
  return (
      <View className="flex-1 flex-col bg-background" testID="master-data-upload-screen">
        <ScrollView className="flex-1 pr-5" keyboardShouldPersistTaps="handled">

          {/* ── Wizard stepper (all 8 taxonomy steps) ───────────────────────── */}
          <StepRail rail={stepRail} onStepPress={handleStepPress} />

          {/* ── Page header ────────────────────────────────────────────── */}
          <View className="mt-8 mb-5 flex-row items-start gap-4 flex-wrap bg-card">
            <View className="flex-1 gap-2">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-lg font-bold tracking-tight font-heading text-foreground">{uploadStep.label}</Text>
                <Text className="text-xs font-body text-muted-foreground">{stepCounter}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <FileIcon size={14} color={colors.mutedForeground} strokeWidth={2} />
                <Text className="text-xs font-mono text-muted-foreground" numberOfLines={1}> 
                {fileLine}
                </Text>
              </View>
            </View>
            <View className="flex-row items-end gap-2">
              <View className="flex-row items-center justify-center align-center gap-3">
                <Button
                  variant="outline"
                  onPress={handleBack}
                  testID="upload-back-button"
                >
                  <ArrowLeft size={14} color={colors.foreground} />
                  <Text className="font-body text-sm font-medium text-foreground ml-1">
                    Back
                  </Text>
                </Button>
                <Button
                  onPress={() => void handleContinue()}
                  disabled={!hasFile || isUploading || !effectiveUploadResult || Boolean(uploadError) || isCreatingRun}
                  testID="upload-continue-button"
                >
                  <Text className="font-body text-sm font-medium text-primary-foreground mr-1">
                    {isUploading ? 'Uploading…' : uploadError ? 'Upload failed — retry' : isCreatingRun ? 'Starting profiler…' : continueLabel}
                  </Text>
                  <ArrowRight size={14} color={colors.primaryForeground} />

                </Button>
              </View>
            </View>
          </View>


          {/* ── Main panel ───────────────────────────────────────────── */}
          <View className="border border-border rounded-xl p-5 self-stretch">
            <View className="flex-col gap-6 flex-wrap md:flex-row">
              <FileUploadField
                label={
                  <>
                    {'1. Source '}
                    <Text className="text-foreground">{entityLabel}</Text>
                    {': Master Data '}
                    <Text className="text-destructive">*</Text>
                  </>
                }
                subLabel="Upload a source CSV to continue"
                hasFile={hasFile}
                fileName={fileName ?? displayFileName}
                rowCount={dataRows}
                tagClassName="bg-chip text-chip-foreground"
                expectedColumns={expectedCols}
                columnWarning={columnWarning}
                showPreview={showPreview}
                onFilePicked={handleFilePicked}
                onTogglePreview={handleToggleSourcePreview}
                onRemove={handleRemove}
                testID="master-data-upload-dropzone"
              />
              <FileTargetCard
                label="2. Target System Format"
                subLabel="Set when the project was created"
                badgeText={erpInitial}
                badgeTone={erpBadge}
                title={targetErpInfo.name}
                subtitle={targetErpInfo.record}
                description={`The uploaded ${entityLabel.toLowerCase()} data will be converted into this system's format. To change the target, edit the project settings.`}
              />
            </View>

            {/* Sample file row — always visible */}
            <SampleFileCard
              sampleName={sampleName}
              sampleDesc={sampleDesc}
              onLoad={handleLoadSample}
              onDownload={() => void handleDownloadSample()}
            />
          </View>

          {/* Source File Preview — the single shared preview section. Shows
             either this tab's own uploaded-file preview (csvRows/
             persistedRows) or, when the Sample File "Load" button is toggled
             on, the loaded sample's preview (loadPreviewByEntity) — never
             both at once (see the mutual-exclusion in handleLoadSample /
             handleToggleSourcePreview below). The two data sources
             themselves stay fully separate — loadPreviewByEntity is never
             written into csvRows or vice versa (see loadPreviewByEntity's
             doc comment in wizard.store.ts) — this only reuses the one
             display section to show whichever preview the user last asked
             for. */}
          {(() => {
            const isLoadPreview = showLoadPreview && loadPreviewRows.length > 0;
            const isUploadPreview = !isLoadPreview && hasFile && showPreview && effectiveRows.length > 0;
            if (!isLoadPreview && !isUploadPreview) return null;

            const previewHeader = isLoadPreview ? loadPreviewHeader : header;
            const previewRows = isLoadPreview ? loadPreviewDataRows : previewDataRows;
            const previewRowCount = isLoadPreview ? loadPreviewDataCount : dataRows;

            return (
              <View className="border rounded-xl overflow-hidden self-stretch mt-5 bg-card border-border">
                <View className="flex-row items-center gap-3 flex-wrap p-4">
                  <LayoutTemplate size={17} color={colors.primary} strokeWidth={1.8} />
                  <Text className="text-base font-bold font-heading text-foreground">Source File Preview</Text>
                  <View className="border rounded-full px-3 py-1 border-border">
                    <Text className="text-xs font-mono text-muted-foreground">
                      {`first ${Math.min(MAX_PREVIEW, previewRowCount)} of ${previewRowCount} rows`}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs px-4 mb-2 font-body text-muted-foreground">
                  Check the header row and a few sample values before continuing. Column names are matched to target fields in the next step.
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator contentContainerClassName="flex-grow">
                  <View className="flex-1">
                    <View className="flex-row border-b bg-surface border-b-border">
                      <View className="w-15 shrink-0 px-3 py-3">
                        <Text className="text-xs font-bold uppercase tracking-wider font-body text-muted-foreground text-left">SRC #</Text>
                      </View>
                      {previewHeader.map((col, i) => (
                        <View key={i} className="flex-1 px-3 py-3">
                          <Text className="text-xs text-wrap font-bold uppercase tracking-wider font-body text-muted-foreground text-left" >{formatPreviewHeader(col)}</Text>
                        </View>
                      ))}
                    </View>
                    {previewRows.map((row, ri) => (
                      <View key={ri} className="flex-row border-b border-b-border">
                        <View className="w-14 shrink-0 px-3 py-3">
                          <Text className="text-xs text-wrap font-mono text-muted-foreground text-left">{ri + 1}</Text>
                        </View>
                        {row.map((cell, ci) => (
                          <View key={ci} className="flex-1 px-3 py-3">
                            <Text className="text-xs text-wrap font-mono text-foreground text-left">
                              {formatPreviewValue(cell)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            );
          })()}

          <Text className="text-xs py-1 font-mono text-muted-foreground">
            {hasFile
              ? `${displayFileName ?? ''} → ${targetErpInfo.name}`
              : `Waiting for a source ${(pack?.label.singular ?? entityId).toLowerCase()} file…`}
          </Text>
        </ScrollView>
      </View>
  );
}
