import { useState, useCallback, useEffect, useMemo } from "react";
import "@/App.css";
import axios from "axios";
import { Toaster, toast } from "sonner";
import { 
  Database, 
  ArrowRight, 
  UploadCloud, 
  ArrowLeftRight, 
  Download,
  CheckCircle2,
  FileSpreadsheet,
  Settings2,
  FileDown,
  Sparkles,
  ChevronsUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Eye,
  X,
  Save,
  Plus,
  Trash2,
  Edit3,
  PanelLeftClose,
  PanelLeft,
  Briefcase,
  Filter,
  ArrowLeft,
  Building2
} from "lucide-react";

// Auth Context
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Project Sidebar Component (Collapsible - Starts Below Header)
const ProjectSidebar = ({ isOpen, onToggle, projectId, sourceERP, targetERP, activeProject, currentUser }) => {
  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Toggle button when collapsed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-24 z-40 bg-white border border-l-0 rounded-r-lg p-2 shadow-md hover:bg-gray-50 transition-colors"
          data-testid="sidebar-toggle-open"
        >
          <PanelLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}
      
      {/* Sidebar - starts below header (top-16 = 64px for header) */}
      <div className={`fixed left-0 top-16 h-[calc(100vh-64px)] bg-white border-r shadow-lg z-40 transition-all duration-300 overflow-y-auto ${
        isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
      }`}>
        <div className="p-4 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Project Info</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 hover:bg-gray-100 rounded"
              data-testid="sidebar-toggle-close"
            >
              <PanelLeftClose className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Project Details */}
          <div className="space-y-3 flex-1">
            {/* Current User */}
            {currentUser && (
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xs text-indigo-600 uppercase tracking-wide mb-1">Current User</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{currentUser.name || currentUser.user_id}</p>
                    <p className="text-xs text-gray-500">{currentUser.user_id}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Project ID */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Project ID</p>
              <p className="font-mono text-sm font-medium text-gray-900">{projectId || 'COA-001'}</p>
            </div>

            {/* Created At & By */}
            {activeProject?.created_at && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Created At</p>
                <p className="text-sm text-gray-900">{formatDate(activeProject.created_at)}</p>
                {activeProject?.created_by_name && (
                  <p className="text-xs text-gray-500 mt-1">by {activeProject.created_by_name}</p>
                )}
              </div>
            )}

            {/* Last Edited */}
            {activeProject?.updated_at && (
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">Last Edited</p>
                <p className="text-sm text-gray-900">{formatDate(activeProject.updated_at)}</p>
                {activeProject?.last_edited_by && (
                  <p className="text-xs text-gray-500 mt-1">by {activeProject.last_edited_by}</p>
                )}
              </div>
            )}
            
            {/* Source ERP */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 uppercase tracking-wide mb-1">Source ERP</p>
              {sourceERP ? (
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded ${ERP_COLORS[sourceERP.id]} flex items-center justify-center text-white font-bold text-sm`}>
                    {ERP_ICONS[sourceERP.id]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{sourceERP.name}</p>
                    <p className="text-xs text-gray-500">{sourceERP.fields?.length || 0} fields</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Not selected</p>
              )}
            </div>
            
            {/* Target ERP */}
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 uppercase tracking-wide mb-1">Target ERP</p>
              {targetERP ? (
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded ${ERP_COLORS[targetERP.id]} flex items-center justify-center text-white font-bold text-sm`}>
                    {ERP_ICONS[targetERP.id]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{targetERP.name}</p>
                    <p className="text-xs text-gray-500">{targetERP.fields?.length || 0} fields</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Not selected</p>
              )}
            </div>
            
            {/* Migration Direction */}
            {sourceERP && targetERP && (
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Migration Path</p>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="font-medium">{sourceERP.name}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{targetERP.name}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ERP System logos/icons mapping
const ERP_ICONS = {
  sap: "S",
  oracle_netsuite: "N",
  microsoft_dynamics: "D",
  quickbooks: "Q",
  sage: "S",
  xero: "X"
};

const ERP_COLORS = {
  sap: "bg-blue-600",
  oracle_netsuite: "bg-orange-500",
  microsoft_dynamics: "bg-green-600",
  quickbooks: "bg-emerald-500",
  sage: "bg-teal-600",
  xero: "bg-sky-500"
};

// Step Indicator Component - Clickable
const StepIndicator = ({ currentStep, steps, onStepClick, completedSteps }) => {
  return (
    <div className="flex items-center justify-center mb-8" data-testid="step-indicator">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index) || index < currentStep;
        const isClickable = isCompleted || index === currentStep;
        
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <button
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={`step-dot ${
                  index < currentStep ? 'completed' : 
                  index === currentStep ? 'active' : 'pending'
                } ${isClickable ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-not-allowed'}`}
                data-testid={`step-${index}`}
              >
                {index < currentStep ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </button>
              <span className={`text-xs mt-1 ${
                index <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-400'
              } ${isClickable ? 'cursor-pointer' : ''}`}
              onClick={() => isClickable && onStepClick(index)}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`step-line w-16 ${
                index < currentStep ? 'completed' : 'pending'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ERP Combobox Component - Searchable dropdown
const ERPCombobox = ({ erpSystems, value, onChange, placeholder, excludeId, label }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredSystems = erpSystems.filter(erp => {
    if (excludeId && erp.id === excludeId) return false;
    if (searchQuery.length >= 1) {
      const query = searchQuery.toLowerCase();
      return erp.name.toLowerCase().includes(query) || 
             erp.id.toLowerCase().includes(query);
    }
    return true;
  });

  const selectedERP = erpSystems.find(erp => erp.id === value);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-12 text-left"
            data-testid={`erp-combobox-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {selectedERP ? (
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded ${ERP_COLORS[selectedERP.id]} flex items-center justify-center text-white font-bold text-sm`}>
                  {ERP_ICONS[selectedERP.id]}
                </div>
                <div>
                  <span className="font-medium">{selectedERP.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({selectedERP.fields.length} fields)</span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Type to search (e.g., SAP, Net, Dyn...)" 
              value={searchQuery}
              onValueChange={setSearchQuery}
              data-testid={`erp-search-${label.toLowerCase().replace(/\s+/g, '-')}`}
            />
            <CommandList>
              <CommandEmpty>No ERP system found.</CommandEmpty>
              <CommandGroup>
                {filteredSystems.map((erp) => (
                  <CommandItem
                    key={erp.id}
                    value={erp.id}
                    onSelect={() => {
                      onChange(erp);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                    className="cursor-pointer"
                    data-testid={`erp-option-${erp.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-8 h-8 rounded ${ERP_COLORS[erp.id]} flex items-center justify-center text-white font-bold text-sm`}>
                        {ERP_ICONS[erp.id]}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{erp.name}</div>
                        <div className="text-xs text-muted-foreground">{erp.description}</div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {erp.fields.length} fields
                      </Badge>
                    </div>
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        value === erp.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// File Upload Component for multiple files
const MultiFileUpload = ({ 
  sourceFile, 
  targetFile, 
  mappingFile,
  onSourceUpload, 
  onTargetUpload, 
  onMappingUpload,
  onPreview,
  loading,
  sourceERP,
  targetERP,
  sourceData,
  targetData,
  mappingData
}) => {
  const [downloading, setDownloading] = useState({});
  const [loadingAll, setLoadingAll] = useState(false);

  // Sample files configuration
  const sampleFiles = [
    {
      id: 'source',
      name: `${sourceERP?.name || 'Source'} COA Sample`,
      description: 'Sample Chart of Accounts for source ERP',
      erpId: sourceERP?.id,
      fileName: `sample_coa_${sourceERP?.id || 'source'}.xlsx`
    },
    {
      id: 'target', 
      name: `${targetERP?.name || 'Target'} COA Sample`,
      description: 'Sample Chart of Accounts for target ERP',
      erpId: targetERP?.id,
      fileName: `sample_coa_${targetERP?.id || 'target'}.xlsx`
    },
    {
      id: 'mapping',
      name: 'Account Type Mapping Sample',
      description: 'Sample mapping between source and target types',
      erpId: 'mapping',
      fileName: 'account_type_mapping.csv'
    }
  ];

  const handleDownloadSample = async (fileConfig) => {
    setDownloading(prev => ({ ...prev, [fileConfig.id]: true }));
    try {
      if (fileConfig.id === 'mapping') {
        // Create sample mapping CSV
        const mappingContent = `Source Type,Target Type
Bank,BANK
Accounts Receivable,CURRENT
Other Current Assets,CURRENT
Fixed Assets,FIXED
Accounts Payable,CURRLIAB
Credit Card,CURRLIAB
Other Current Liability,CURRLIAB
Long Term Liability,TERMLIAB
Equity,EQUITY
Income,REVENUE
Other Income,OTHERINCOME
Cost of Goods Sold,DIRECTCOSTS
Expenses,OVERHEADS
Other Expense,EXPENSE`;
        const blob = new Blob([mappingContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileConfig.fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Mapping sample downloaded!');
      } else {
        const response = await axios.get(`${API}/sample-data/${fileConfig.erpId}/download`, {
          responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileConfig.fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`${fileConfig.name} downloaded!`);
      }
    } catch (error) {
      toast.error(`Failed to download ${fileConfig.name}`);
    } finally {
      setDownloading(prev => ({ ...prev, [fileConfig.id]: false }));
    }
  };

  const handlePreviewSample = async (fileConfig) => {
    setDownloading(prev => ({ ...prev, [`preview_${fileConfig.id}`]: true }));
    try {
      let data = [];
      if (fileConfig.id === 'mapping') {
        // Sample mapping data for preview
        data = [
          { 'Source Type': 'Bank', 'Target Type': 'BANK' },
          { 'Source Type': 'Accounts Receivable', 'Target Type': 'CURRENT' },
          { 'Source Type': 'Other Current Assets', 'Target Type': 'CURRENT' },
          { 'Source Type': 'Fixed Assets', 'Target Type': 'FIXED' },
          { 'Source Type': 'Accounts Payable', 'Target Type': 'CURRLIAB' },
          { 'Source Type': 'Credit Card', 'Target Type': 'CURRLIAB' },
          { 'Source Type': 'Equity', 'Target Type': 'EQUITY' },
          { 'Source Type': 'Income', 'Target Type': 'REVENUE' },
          { 'Source Type': 'Expenses', 'Target Type': 'OVERHEADS' }
        ];
      } else {
        const response = await axios.get(`${API}/sample-data/${fileConfig.erpId}/download`, {
          responseType: 'blob'
        });
        const blob = response.data;
        const file = new File([blob], fileConfig.fileName, { type: blob.type });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source_erp', 'preview');
        formData.append('target_erp', 'preview');
        const parseResponse = await axios.post(`${API}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        data = parseResponse.data.sample_data || [];
      }
      onPreview(null, fileConfig.name, data);
    } catch (error) {
      toast.error(`Failed to preview ${fileConfig.name}`);
    } finally {
      setDownloading(prev => ({ ...prev, [`preview_${fileConfig.id}`]: false }));
    }
  };

  const handleLoadAllSamples = async () => {
    if (!sourceERP || !targetERP) return;
    setLoadingAll(true);
    try {
      // Load source sample
      const sourceResponse = await axios.get(`${API}/sample-data/${sourceERP.id}/download`, {
        responseType: 'blob'
      });
      const sourceBlob = sourceResponse.data;
      const sourceFileObj = new File([sourceBlob], `sample_coa_${sourceERP.id}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      onSourceUpload(sourceFileObj);

      // Load target sample
      const targetResponse = await axios.get(`${API}/sample-data/${targetERP.id}/download`, {
        responseType: 'blob'
      });
      const targetBlob = targetResponse.data;
      const targetFileObj = new File([targetBlob], `sample_coa_${targetERP.id}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      onTargetUpload(targetFileObj);

      // Create sample mapping file
      const mappingDataContent = `Source Type,Target Type
Bank,BANK
Accounts Receivable,CURRENT
Other Current Assets,CURRENT
Fixed Assets,FIXED
Accounts Payable,CURRLIAB
Credit Card,CURRLIAB
Other Current Liability,CURRLIAB
Long Term Liability,TERMLIAB
Equity,EQUITY
Income,REVENUE
Other Income,OTHERINCOME
Cost of Goods Sold,DIRECTCOSTS
Expenses,OVERHEADS
Other Expense,EXPENSE`;
      const mappingBlob = new Blob([mappingDataContent], { type: 'text/csv' });
      const mappingFileObj = new File([mappingBlob], 'account_type_mapping.csv', { type: 'text/csv' });
      onMappingUpload(mappingFileObj);

      toast.success('All sample files loaded!');
    } catch (error) {
      toast.error('Failed to load sample data');
    } finally {
      setLoadingAll(false);
    }
  };

  const FileUploadBox = ({ label, description, file, onUpload, accept, testId, dataCount }) => {
    const [dragOver, setDragOver] = useState(false);
    const inputId = `file-input-${testId}`;

    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) onUpload(f);
    };
    const handleFileSelect = (e) => {
      const f = e.target.files[0];
      if (f) onUpload(f);
    };

    return (
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-700 mb-2 block">{label}</label>
        {!file ? (
          <div
            className={`upload-zone h-36 ${dragOver ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid={testId}
          >
            <input
              type="file"
              accept={accept}
              onChange={handleFileSelect}
              className="hidden"
              id={inputId}
            />
            <label htmlFor={inputId} className="cursor-pointer flex flex-col items-center justify-center h-full">
              <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">{description}</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv</p>
            </label>
          </div>
        ) : (
          <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4 h-36 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800 text-sm truncate">{file.name}</span>
              </div>
              {dataCount > 0 && (
                <p className="text-xs text-green-600 mt-1 ml-7">{dataCount} rows loaded</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPreview(file, label)}
                className="flex-1 bg-white"
                data-testid={`preview-${testId}`}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onUpload(null)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Three file upload boxes */}
      <div className="grid grid-cols-3 gap-4">
        <FileUploadBox
          label="1. Source ERP COA"
          description={`Upload ${sourceERP?.name || 'Source'} COA`}
          file={sourceFile}
          onUpload={onSourceUpload}
          accept=".xlsx,.xls,.csv"
          testId="source-file-upload"
          dataCount={sourceData?.length || 0}
        />
        <FileUploadBox
          label="2. Target ERP COA"
          description={`Upload ${targetERP?.name || 'Target'} COA`}
          file={targetFile}
          onUpload={onTargetUpload}
          accept=".xlsx,.xls,.csv"
          testId="target-file-upload"
          dataCount={targetData?.length || 0}
        />
        <FileUploadBox
          label="3. Account Type Mapping"
          description="Upload type mapping CSV"
          file={mappingFile}
          onUpload={onMappingUpload}
          accept=".xlsx,.xls,.csv"
          testId="mapping-file-upload"
          dataCount={mappingData?.length || 0}
        />
      </div>

      {/* Sample Files Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Sample Files</CardTitle>
            </div>
            <Button
              onClick={handleLoadAllSamples}
              disabled={loadingAll || loading || !sourceERP || !targetERP}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="load-all-samples-btn"
            >
              {loadingAll ? (
                <span className="flex items-center">
                  <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Loading...
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Load All
                </>
              )}
            </Button>
          </div>
          <CardDescription>Preview or download sample files for testing</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">File Name</TableHead>
                <TableHead className="w-[35%]">Description</TableHead>
                <TableHead className="w-[25%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                      {file.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{file.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewSample(file)}
                        disabled={downloading[`preview_${file.id}`] || (file.id !== 'mapping' && !file.erpId)}
                        data-testid={`preview-sample-${file.id}`}
                      >
                        {downloading[`preview_${file.id}`] ? (
                          <div className="spinner w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" />
                            Preview
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadSample(file)}
                        disabled={downloading[file.id] || (file.id !== 'mapping' && !file.erpId)}
                        data-testid={`download-sample-${file.id}`}
                      >
                        {downloading[file.id] ? (
                          <div className="spinner w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Confidence Badge Component
const ConfidenceBadge = ({ score }) => {
  let className = 'confidence-low';
  let label = 'Low';
  
  if (score >= 90) {
    className = 'confidence-high';
    label = 'High';
  } else if (score >= 70) {
    className = 'confidence-medium';
    label = 'Medium';
  }
  
  return (
    <Badge className={`${className} mono text-xs`} data-testid={`confidence-${score}`}>
      {Math.round(score)}% {label}
    </Badge>
  );
};

// Account Type Group Component (Collapsible) - with account-level scores and edit functionality
const AccountTypeGroup = ({ 
  group, 
  targetTypes, 
  onTypeChange, 
  onAccountNameChange,
  onDeleteAccount,
  sourceERP,
  targetERP,
  targetData,
  targetAccountNames
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editingRow, setEditingRow] = useState(null); // Track which row is being edited
  
  // Calculate match score for an account name against target data
  const calculateAccountScore = (sourceName, targetName) => {
    if (!targetName || targetName === 'unmatched' || targetName === '') return 0;
    
    const sourceNameLower = sourceName.toLowerCase().trim();
    const targetNameLower = targetName.toLowerCase().trim();
    
    // Exact match
    if (sourceNameLower === targetNameLower) return 100;
    
    // Find matching account in target data
    const nameCol = targetData && targetData.length > 0 ? Object.keys(targetData[0]).find(k => 
      k.toLowerCase().includes('name') || k.toLowerCase().includes('title')
    ) : null;
    
    if (!nameCol) {
      // Fallback scoring without target data
      const sourceWords = sourceNameLower.split(/\s+/);
      const targetWords = targetNameLower.split(/\s+/);
      const commonWords = sourceWords.filter(w => targetWords.includes(w));
      
      if (commonWords.length === sourceWords.length) return 95;
      if (commonWords.length > 0) {
        return Math.min(90, 60 + (commonWords.length / Math.max(sourceWords.length, targetWords.length)) * 30);
      }
      if (sourceNameLower.includes(targetNameLower) || targetNameLower.includes(sourceNameLower)) return 80;
      return 50;
    }
    
    const targetNames = targetData.map(r => String(r[nameCol] || '').toLowerCase().trim());
    
    // Exact match in target list
    if (targetNames.includes(targetNameLower)) {
      // Calculate similarity to source
      if (sourceNameLower === targetNameLower) return 100;
      
      // Check word overlap
      const sourceWords = sourceNameLower.split(/\s+/);
      const targetWords = targetNameLower.split(/\s+/);
      const commonWords = sourceWords.filter(w => targetWords.includes(w));
      
      if (commonWords.length === sourceWords.length) return 95;
      if (commonWords.length > 0) {
        return Math.min(90, 60 + (commonWords.length / Math.max(sourceWords.length, targetWords.length)) * 30);
      }
      
      // Contains check
      if (sourceNameLower.includes(targetNameLower) || targetNameLower.includes(sourceNameLower)) return 80;
      
      return 70;
    }
    
    // Partial match
    const hasPartialMatch = targetNames.some(tn => 
      tn.includes(targetNameLower) || targetNameLower.includes(tn)
    );
    if (hasPartialMatch) return 65;
    
    return 40;
  };

  const handleEditClick = (idx) => {
    setEditingRow(editingRow === idx ? null : idx);
  };

  const handleSelectChange = (idx, value) => {
    onAccountNameChange(group.source_type, idx, value === 'unmatched' ? '' : value);
    setEditingRow(null); // Close dropdown after selection
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg mb-3">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500" />
            )}
            <FolderTree className="w-5 h-5 text-blue-600" />
            <div>
              <span className="font-semibold text-gray-900">{group.source_type}</span>
              <Badge variant="outline" className="ml-2 text-xs">
                {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ArrowRight className="w-4 h-4 text-gray-400" />
            {group.target_type && group.target_type !== 'unmatched' ? (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
                {group.target_type}
              </Badge>
            ) : (
              <span className="text-sm text-gray-400 italic">Not mapped</span>
            )}
            <Badge variant="outline" className={`text-xs ${
              group.target_type && group.target_type !== 'unmatched' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-600 border-red-200'
            }`}>
              {group.target_type && group.target_type !== 'unmatched' ? 'Mapped' : 'Unmapped'}
            </Badge>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-gray-50/50 pl-4">
          {group.accounts.map((account, idx) => {
            const score = calculateAccountScore(account.source_name, account.target_name);
            const scoreColor = score >= 90 ? 'text-green-600 bg-green-100' : 
                              score >= 70 ? 'text-yellow-600 bg-yellow-100' : 
                              score >= 50 ? 'text-orange-600 bg-orange-100' : 'text-red-600 bg-red-100';
            const isEditing = editingRow === idx;
            
            // Determine remark based on how the mapping was set
            // Show user name if changed by a user
            const remark = account.user_changed 
                          ? (account.changed_by_name ? `Changed by ${account.changed_by_name}` : 'User Changed')
                          : account.name_confidence >= 70 ? 'AI Suggestion' 
                          : 'Account Name Mapping';
            const remarkColor = account.user_changed ? 'text-purple-600 bg-purple-100' : 
                               account.name_confidence >= 70 ? 'text-blue-600 bg-blue-100' : 
                               'text-gray-600 bg-gray-100';
            
            return (
              <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-2 border-b last:border-b-0 hover:bg-white items-center">
                <div className="col-span-1 font-mono text-xs text-gray-500">
                  {account.source_number || '-'}
                </div>
                <div className="col-span-3 text-sm">{account.source_name}</div>
                <div className="col-span-1 text-center">
                  <ArrowRight className="w-5 h-5 text-gray-700 mx-auto stroke-[2.5]" />
                </div>
                <div className="col-span-2">
                  {isEditing ? (
                    <Select
                      value={account.target_name || "unmatched"}
                      onValueChange={(value) => handleSelectChange(idx, value)}
                    >
                      <SelectTrigger className="w-full text-sm h-8">
                        <SelectValue placeholder="Select target account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unmatched">-- Select Account --</SelectItem>
                        {targetAccountNames.map((name, i) => (
                          <SelectItem key={i} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`text-sm ${account.target_name ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {account.target_name || 'Not mapped'}
                    </span>
                  )}
                </div>
                <div className="col-span-1 text-center">
                  <Badge className={`${scoreColor} text-xs font-mono`}>
                    {score}%
                  </Badge>
                </div>
                <div className="col-span-2 text-center">
                  <Badge variant="outline" className={`${remarkColor} text-xs`}>
                    {remark}
                  </Badge>
                </div>
                <div className="col-span-2 text-center flex items-center justify-center gap-1">
                  <Button
                    size="sm"
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => handleEditClick(idx)}
                    className="h-7 px-2"
                  >
                    {isEditing ? (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDeleteAccount(group.source_type, idx, account)}
                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Main App Component
function COAMappingApp({ activeProject, onBackToDashboard }) {
  const { getAuthHeaders, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [erpSystems, setErpSystems] = useState([]);
  const [sourceERP, setSourceERP] = useState(null);
  const [targetERP, setTargetERP] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [sampleData, setSampleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Multiple file uploads
  const [sourceFile, setSourceFile] = useState(null);
  const [targetFile, setTargetFile] = useState(null);
  const [mappingFile, setMappingFile] = useState(null);
  const [sourceData, setSourceData] = useState([]);
  const [targetData, setTargetData] = useState([]);
  const [mappingData, setMappingData] = useState([]);
  
  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewData, setPreviewData] = useState([]);
  
  // Hierarchical mapping state
  const [groupedMappings, setGroupedMappings] = useState([]);
  const [targetTypes, setTargetTypes] = useState([]);
  
  // Completed steps tracking
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // Type mapping editor state
  const [typeMappingRows, setTypeMappingRows] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectId, setProjectId] = useState(`COA-${Date.now().toString().slice(-6)}`);
  
  // Confidence filter state for COA Mapping page
  const [confidenceFilter, setConfidenceFilter] = useState(null); // null = all, 'high', 'medium', 'low'
  
  // Confirmation tracking for account names
  const [confirmedHigh, setConfirmedHigh] = useState(false);
  const [confirmedMedium, setConfirmedMedium] = useState(false);
  const [confirmedLow, setConfirmedLow] = useState(false);
  const [showFinalPreview, setShowFinalPreview] = useState(false);
  const [editingFinalPreview, setEditingFinalPreview] = useState(false);
  const [deletedAccounts, setDeletedAccounts] = useState([]); // Track deleted accounts

  // Updated steps - now 5 steps with Type Mapping review
  const steps = [
    { id: 'systems', label: 'Select Systems' },
    { id: 'upload', label: 'Upload Files' },
    { id: 'type-mapping', label: 'Type Mapping' },
    { id: 'mapping', label: 'Map COA' },
    { id: 'export', label: 'Export' }
  ];

  // Load existing project data if opening from dashboard
  useEffect(() => {
    if (activeProject) {
      setProjectId(activeProject.id);
      // Find and set source/target ERP from the project
      if (activeProject.source_erp) {
        const srcERP = erpSystems.find(e => e.id === activeProject.source_erp);
        if (srcERP) setSourceERP(srcERP);
      }
      if (activeProject.target_erp) {
        const tgtERP = erpSystems.find(e => e.id === activeProject.target_erp);
        if (tgtERP) setTargetERP(tgtERP);
      }
      // Load saved mappings if available
      if (activeProject.mappings && activeProject.mappings.length > 0) {
        // Convert flat mappings to grouped format for display
        const grouped = {};
        activeProject.mappings.forEach(m => {
          const type = m.source_account_type || 'Unknown';
          if (!grouped[type]) {
            grouped[type] = {
              source_type: type,
              target_type: m.target_account_type || '',
              confidence: m.confidence_score || 0,
              isOpen: true,
              accounts: []
            };
          }
          grouped[type].accounts.push({
            source_number: m.source_account_number || '',
            source_name: m.source_account_name,
            target_name: m.target_account_name || m.source_account_name,
            name_confidence: m.confidence_score || 0,
            user_changed: m.remark === 'user',
            changed_by_name: m.changed_by_name || null,
            changed_at: m.changed_at || null
          });
        });
        setGroupedMappings(Object.values(grouped));
        
        // Skip to mapping step if we have data
        if (Object.keys(grouped).length > 0) {
          setCurrentStep(3); // Go to Map COA step
          setCompletedSteps([0, 1, 2]);
        }
      }
    }
  }, [activeProject, erpSystems]);

  // Fetch ERP systems on mount
  const fetchERPSystems = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/erp-systems`);
      setErpSystems(response.data);
    } catch (error) {
      toast.error('Failed to load ERP systems');
      console.error(error);
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchERPSystems();
  }, [fetchERPSystems]);

  // Parse uploaded file to get data
  const parseFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_erp', 'preview');
    formData.append('target_erp', 'preview');
    
    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.sample_data;
    } catch (error) {
      console.error('Error parsing file:', error);
      return [];
    }
  };

  // Handle file uploads with parsing
  const handleSourceFileUpload = async (file) => {
    setSourceFile(file);
    if (file) {
      const data = await parseFile(file);
      setSourceData(data);
    } else {
      setSourceData([]);
    }
  };

  const handleTargetFileUpload = async (file) => {
    setTargetFile(file);
    if (file) {
      const data = await parseFile(file);
      setTargetData(data);
    } else {
      setTargetData([]);
    }
  };

  const handleMappingFileUpload = async (file) => {
    setMappingFile(file);
    if (file) {
      const data = await parseFile(file);
      setMappingData(data);
    } else {
      setMappingData([]);
    }
  };

  // Handle preview - supports both file-based and direct data preview
  const handlePreview = async (file, label, directData = null) => {
    let data = directData || [];
    
    if (!directData) {
      if (label.includes('Source')) {
        data = sourceData;
      } else if (label.includes('Target')) {
        data = targetData;
      } else if (label.includes('Mapping')) {
        data = mappingData;
      }
      
      if (data.length === 0 && file) {
        data = await parseFile(file);
      }
    }
    
    setPreviewTitle(label);
    setPreviewData(data.slice(0, 20)); // Show first 20 rows
    setPreviewOpen(true);
  };

  // Handle step navigation via breadcrumbs
  const handleStepClick = (stepIndex) => {
    if (stepIndex < currentStep || completedSteps.includes(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  // Initialize type mapping rows from uploaded file or defaults
  const initializeTypeMappingRows = () => {
    if (mappingData.length > 0) {
      const rows = mappingData.map((row, idx) => {
        const sourceType = row['Source Type'] || row['source_type'] || Object.values(row)[0] || '';
        const targetTypeRaw = row['Target Type'] || row['target_type'] || Object.values(row)[1] || '';
        // Support comma or semicolon-separated multiple target types in CSV
        const targetTypes = String(targetTypeRaw).trim()
          ? String(targetTypeRaw).split(/[;,]/).map(t => t.trim()).filter(Boolean)
          : [];
        return {
          id: idx,
          sourceType: sourceType,
          targetTypes: targetTypes
        };
      });
      setTypeMappingRows(rows);
    } else {
      // Create default mappings based on source data
      const sourceTypes = [...new Set(sourceData.map(row => {
        const typeCol = Object.keys(row).find(k => 
          k.toLowerCase().includes('type') && !k.toLowerCase().includes('detail')
        );
        return typeCol ? row[typeCol] : null;
      }).filter(Boolean))];
      
      const defaultMappings = sourceTypes.map((type, idx) => ({
        id: idx,
        sourceType: type,
        targetTypes: []
      }));
      setTypeMappingRows(defaultMappings);
    }
    setHasUnsavedChanges(false);
  };

  // Initialize type mapping rows with target types from uploaded files
  const initializeTypeMappingRowsWithTargets = (availableTargetTypes) => {
    // Get source types from source data
    const sourceTypes = [...new Set(sourceData.map(row => {
      const typeCol = Object.keys(row).find(k => {
        const lower = k.toLowerCase();
        return (lower.includes('type') && !lower.includes('detail')) || lower === 'type';
      });
      return typeCol ? String(row[typeCol]).trim() : null;
    }).filter(Boolean))];

    // If we have a mapping file uploaded, use it
    if (mappingData.length > 0) {
      const rows = mappingData.map((row, idx) => {
        const sourceType = row['Source Type'] || row['source_type'] || Object.values(row)[0] || '';
        const targetTypeRaw = row['Target Type'] || row['target_type'] || Object.values(row)[1] || '';
        // Support comma or semicolon-separated multiple target types in CSV
        const targetTypes = String(targetTypeRaw).trim()
          ? String(targetTypeRaw).split(/[;,]/).map(t => t.trim()).filter(Boolean)
          : [];
        return {
          id: idx,
          sourceType: String(sourceType).trim(),
          targetTypes: targetTypes
        };
      });
      setTypeMappingRows(rows);
    } else {
      // Auto-match source types to target types using fuzzy matching
      const mappings = sourceTypes.map((sourceType, idx) => {
        // Try to find a matching target type
        let bestMatch = '';
        let bestScore = 0;
        
        const sourceTypeLower = sourceType.toLowerCase();
        
        for (const targetType of availableTargetTypes) {
          const targetTypeLower = targetType.toLowerCase();
          
          // Exact match
          if (sourceTypeLower === targetTypeLower) {
            bestMatch = targetType;
            bestScore = 100;
            break;
          }
          
          // Partial match - check if one contains the other
          if (sourceTypeLower.includes(targetTypeLower) || targetTypeLower.includes(sourceTypeLower)) {
            const score = 80;
            if (score > bestScore) {
              bestMatch = targetType;
              bestScore = score;
            }
          }
          
          // Word match
          const sourceWords = sourceTypeLower.split(/\s+/);
          const targetWords = targetTypeLower.split(/\s+/);
          const commonWords = sourceWords.filter(w => targetWords.includes(w));
          if (commonWords.length > 0) {
            const score = (commonWords.length / Math.max(sourceWords.length, targetWords.length)) * 70;
            if (score > bestScore) {
              bestMatch = targetType;
              bestScore = score;
            }
          }
        }
        
        return {
          id: idx,
          sourceType: sourceType,
          targetTypes: bestMatch ? [bestMatch] : []
        };
      });
      
      setTypeMappingRows(mappings);
    }
    
    setHasUnsavedChanges(false);
  };

  // Handle type mapping row changes
  const handleTypeMappingChange = (id, field, value) => {
    setTypeMappingRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
    setHasUnsavedChanges(true);
  };

  // Add new type mapping row
  const handleAddTypeMappingRow = () => {
    const newId = Math.max(...typeMappingRows.map(r => r.id), 0) + 1;
    setTypeMappingRows(prev => [...prev, { id: newId, sourceType: '', targetTypes: [] }]);
    setHasUnsavedChanges(true);
  };

  // Delete type mapping row
  const handleDeleteTypeMappingRow = (id) => {
    setTypeMappingRows(prev => prev.filter(row => row.id !== id));
    setHasUnsavedChanges(true);
  };

  // Save type mapping as CSV (supports multi-select with semicolon separator)
  const handleSaveTypeMappingCSV = () => {
    const csvContent = "Source Type,Target Types\n" + 
      typeMappingRows
        .filter(row => row.sourceType && row.targetTypes?.length > 0)
        .map(row => `"${row.sourceType}","${row.targetTypes.join('; ')}"`)
        .join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'account_type_mapping.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    setHasUnsavedChanges(false);
    toast.success('Type mapping saved and downloaded!');
  };

  // Global save function
  const handleGlobalSave = () => {
    if (currentStep === 2) {
      handleSaveTypeMappingCSV();
    } else {
      toast.info('Nothing to save at this step');
    }
  };

  // Handle source ERP selection
  const handleSourceSelect = (erp) => {
    setSourceERP(erp);
    // Clear target if same as new source
    if (targetERP?.id === erp.id) {
      setTargetERP(null);
      setTargetTypes([]);
    }
  };

  // Handle target ERP selection
  const handleTargetSelect = (erp) => {
    setTargetERP(erp);
  };

  // Process files and go to type mapping review
  const handleProcessFiles = async () => {
    if (!sourceFile || !targetFile) {
      toast.error('Please upload both Source and Target ERP files');
      return;
    }

    setLoading(true);
    try {
      // Extract target types from uploaded target COA file
      let extractedTargetTypes = [];
      if (targetData.length > 0) {
        // Find the type column in target data
        const typeCol = Object.keys(targetData[0]).find(k => {
          const lower = k.toLowerCase();
          return (lower.includes('type') && !lower.includes('detail')) || lower === 'type';
        });
        
        if (typeCol) {
          // Get unique types from the target file
          extractedTargetTypes = [...new Set(
            targetData
              .map(r => r[typeCol])
              .filter(Boolean)
              .map(t => String(t).trim())
          )].sort();
          console.log('Extracted target types from file:', extractedTargetTypes);
        }
      }
      
      // If no target types found in file, show warning
      if (extractedTargetTypes.length === 0) {
        toast.warning('No account types found in target file. Using default types.');
        try {
          const response = await axios.get(`${API}/account-types/${targetERP.id}`);
          extractedTargetTypes = response.data.account_types || [];
        } catch (e) {
          extractedTargetTypes = [];
        }
      }
      
      setTargetTypes(extractedTargetTypes);
      setUploadedFile({
        name: sourceFile.name,
        rowCount: sourceData.length
      });
      
      // Initialize type mapping rows with auto-populated target types from mapping file
      initializeTypeMappingRowsWithTargets(extractedTargetTypes);
      
      // Mark step 1 as completed and go to type mapping review (step 2)
      setCompletedSteps(prev => [...new Set([...prev, 0, 1])]);
      setCurrentStep(2);
      toast.success(`Files processed! Found ${extractedTargetTypes.length} target types from uploaded file.`);
    } catch (error) {
      toast.error('Failed to process files');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Proceed from type mapping to COA mapping
  const handleProceedToMapping = async () => {
    setLoading(true);
    try {
      // Build custom type mappings from editor (use first target type for hierarchical mapping)
      const customTypeMappings = {};
      typeMappingRows.forEach(row => {
        if (row.sourceType && row.targetTypes?.length > 0) {
          // Store the first target type for the hierarchical mapping view
          // The full array is preserved in typeMappingRows for reference
          customTypeMappings[row.sourceType] = row.targetTypes[0];
        }
      });

      // Get hierarchical mapping with source data AND target data for auto-population
      const mappingResponse = await axios.post(
        `${API}/hierarchical-mapping?source_erp=${sourceERP.id}&target_erp=${targetERP.id}`,
        {
          source_data: sourceData,
          target_data: targetData
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      // Apply custom mappings
      let finalMappings = mappingResponse.data.grouped_mappings.map(group => ({
        ...group,
        target_type: customTypeMappings[group.source_type] || group.target_type,
        confidence: customTypeMappings[group.source_type] ? 100 : group.confidence
      }));

      setGroupedMappings(finalMappings);
      setSessionId(Date.now().toString());
      setCompletedSteps(prev => [...new Set([...prev, 2])]);
      setCurrentStep(3);
      setHasUnsavedChanges(false);
      toast.success(`Ready to map ${sourceData.length} accounts!`);
    } catch (error) {
      toast.error('Failed to process mappings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle type mapping change
  const handleTypeChange = (sourceType, targetType) => {
    setGroupedMappings(prev => prev.map(group => 
      group.source_type === sourceType 
        ? { ...group, target_type: targetType === 'unmatched' ? '' : targetType, confidence: 100 }
        : group
    ));
  };

  // Handle account name change
  const handleAccountNameChange = (sourceType, accountIdx, newName) => {
    setGroupedMappings(prev => prev.map(group => {
      if (group.source_type === sourceType) {
        const newAccounts = [...group.accounts];
        newAccounts[accountIdx] = { 
          ...newAccounts[accountIdx], 
          target_name: newName,
          user_changed: true,  // Mark as user changed
          changed_by_name: user?.name || user?.user_id || 'Unknown User',  // Track who changed it
          changed_at: new Date().toISOString()  // Track when it was changed
        };
        return { ...group, accounts: newAccounts };
      }
      return group;
    }));
  };

  // Handle export
  const handleExport = async () => {
    if (!sessionId) {
      toast.error('No session found');
      return;
    }

    setExporting(true);
    try {
      // Convert hierarchical mappings to flat format for export
      const flatMappings = [];
      groupedMappings.forEach(group => {
        group.accounts.forEach(account => {
          flatMappings.push({
            source_field: account.source_name,
            target_field: account.target_name,
            source_type: group.source_type,
            target_type: group.target_type,
            confidence: group.confidence,
            method: 'hierarchical'
          });
        });
      });

      const response = await axios.post(`${API}/export`, {
        session_id: sessionId,
        mappings: flatMappings
      }, {
        responseType: 'blob'
      });

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mapped_coa_${targetERP.id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setCurrentStep(4);
      toast.success('Export completed successfully!');
    } catch (error) {
      toast.error('Failed to export data');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  // Reset workflow
  const handleReset = () => {
    setCurrentStep(0);
    setSourceERP(null);
    setTargetERP(null);
    setUploadedFile(null);
    setSessionId(null);
    setSampleData([]);
    setGroupedMappings([]);
    setTargetTypes([]);
    setSourceFile(null);
    setTargetFile(null);
    setMappingFile(null);
    setSourceData([]);
    setTargetData([]);
    setMappingData([]);
    setCompletedSteps([]);
    setTypeMappingRows([]);
    setHasUnsavedChanges(false);
    setConfidenceFilter(null);
    setConfirmedHigh(false);
    setConfirmedMedium(false);
    setConfirmedLow(false);
    setShowFinalPreview(false);
    setEditingFinalPreview(false);
    setDeletedAccounts([]);
    toast.info('Workflow reset');
  };

  // Delete account from mapping
  const handleDeleteAccount = (sourceType, accountIdx, account) => {
    // Add to deleted accounts list
    setDeletedAccounts(prev => [...prev, {
      ...account,
      source_type: sourceType,
      deleted_at: new Date().toISOString()
    }]);
    
    // Remove from grouped mappings
    setGroupedMappings(prev => prev.map(group => {
      if (group.source_type === sourceType) {
        const newAccounts = group.accounts.filter((_, idx) => idx !== accountIdx);
        return { ...group, accounts: newAccounts };
      }
      return group;
    }).filter(group => group.accounts.length > 0)); // Remove empty groups
  };

  // Restore deleted account
  const handleRestoreAccount = (deletedAccount, deletedIdx) => {
    // Remove from deleted list
    setDeletedAccounts(prev => prev.filter((_, idx) => idx !== deletedIdx));
    
    // Add back to grouped mappings
    setGroupedMappings(prev => {
      const existingGroup = prev.find(g => g.source_type === deletedAccount.source_type);
      if (existingGroup) {
        return prev.map(group => {
          if (group.source_type === deletedAccount.source_type) {
            return {
              ...group,
              accounts: [...group.accounts, {
                source_number: deletedAccount.source_number,
                source_name: deletedAccount.source_name,
                target_name: deletedAccount.target_name,
                user_changed: deletedAccount.user_changed,
                name_confidence: deletedAccount.name_confidence
              }]
            };
          }
          return group;
        });
      } else {
        // Create new group if it was removed
        return [...prev, {
          source_type: deletedAccount.source_type,
          target_type: '',
          confidence: 0,
          accounts: [{
            source_number: deletedAccount.source_number,
            source_name: deletedAccount.source_name,
            target_name: deletedAccount.target_name,
            user_changed: deletedAccount.user_changed,
            name_confidence: deletedAccount.name_confidence
          }]
        }];
      }
    });
  };

  // Get target account names for dropdown
  const targetAccountNames = useMemo(() => {
    if (!targetData || targetData.length === 0) return [];
    
    const nameCol = Object.keys(targetData[0]).find(k => 
      k.toLowerCase().includes('name') || k.toLowerCase().includes('title')
    );
    
    if (!nameCol) return [];
    
    return [...new Set(targetData.map(r => String(r[nameCol] || '').trim()).filter(Boolean))];
  }, [targetData]);

  // Calculate account-level score
  const calculateAccountScore = useCallback((sourceName, targetName) => {
    if (!targetName || targetName === 'unmatched' || targetName === '') return 0;
    
    const sourceNameLower = sourceName.toLowerCase().trim();
    const targetNameLower = targetName.toLowerCase().trim();
    
    // Exact match
    if (sourceNameLower === targetNameLower) return 100;
    
    // Check word overlap
    const sourceWords = sourceNameLower.split(/\s+/);
    const targetWords = targetNameLower.split(/\s+/);
    const commonWords = sourceWords.filter(w => targetWords.includes(w));
    
    if (commonWords.length === sourceWords.length) return 95;
    if (commonWords.length > 0) {
      return Math.min(90, 60 + (commonWords.length / Math.max(sourceWords.length, targetWords.length)) * 30);
    }
    
    // Contains check
    if (sourceNameLower.includes(targetNameLower) || targetNameLower.includes(sourceNameLower)) return 80;
    
    // Target exists in list
    if (targetAccountNames.map(n => n.toLowerCase()).includes(targetNameLower)) return 70;
    
    return 40;
  }, [targetAccountNames]);

  // Calculate mapping stats at ACCOUNT level
  const mappingStats = useMemo(() => {
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let totalAccounts = 0;
    
    groupedMappings.forEach(group => {
      group.accounts.forEach(account => {
        totalAccounts++;
        const score = calculateAccountScore(account.source_name, account.target_name);
        if (score >= 90) highCount++;
        else if (score >= 70) mediumCount++;
        else lowCount++;
      });
    });
    
    // Calculate confirmed account names count
    let confirmedCount = 0;
    if (confirmedHigh) confirmedCount += highCount;
    if (confirmedMedium) confirmedCount += mediumCount;
    if (confirmedLow) confirmedCount += lowCount;
    
    return {
      totalTypes: groupedMappings.length,
      mappedTypes: groupedMappings.filter(g => g.target_type && g.target_type !== 'unmatched').length,
      totalAccounts,
      highConfidence: highCount,
      mediumConfidence: mediumCount,
      lowConfidence: lowCount,
      confirmedAccountNames: confirmedCount
    };
  }, [groupedMappings, calculateAccountScore, confirmedHigh, confirmedMedium, confirmedLow]);

  // Get unique mapped target types for chips
  const mappedTargetTypes = useMemo(() => {
    return [...new Set(groupedMappings
      .filter(g => g.target_type && g.target_type !== 'unmatched')
      .map(g => g.target_type))];
  }, [groupedMappings]);

  // Auto-confirm categories with 0 accounts
  useEffect(() => {
    if (currentStep === 3 && groupedMappings.length > 0) {
      if (mappingStats.highConfidence === 0 && !confirmedHigh) {
        setConfirmedHigh(true);
      }
      if (mappingStats.mediumConfidence === 0 && !confirmedMedium) {
        setConfirmedMedium(true);
      }
      if (mappingStats.lowConfidence === 0 && !confirmedLow) {
        setConfirmedLow(true);
      }
    }
  }, [currentStep, groupedMappings.length, mappingStats.highConfidence, mappingStats.mediumConfidence, mappingStats.lowConfidence, confirmedHigh, confirmedMedium, confirmedLow]);

  // Filter groups based on confidence filter (at account level)
  const filteredMappings = useMemo(() => {
    if (!confidenceFilter) return groupedMappings;
    
    return groupedMappings.map(group => {
      const filteredAccounts = group.accounts.filter(account => {
        const score = calculateAccountScore(account.source_name, account.target_name);
        if (confidenceFilter === 'high') return score >= 90;
        if (confidenceFilter === 'medium') return score >= 70 && score < 90;
        if (confidenceFilter === 'low') return score < 70;
        return true;
      });
      
      return {
        ...group,
        accounts: filteredAccounts
      };
    }).filter(group => group.accounts.length > 0);
  }, [groupedMappings, confidenceFilter, calculateAccountScore]);

  return (
    <TooltipProvider>
      <div className="app-container" data-testid="app-container">
        <Toaster position="top-right" richColors />
        
        {/* Header - Fixed at top */}
        <header className="app-header sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Back to Dashboard button */}
              {onBackToDashboard && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToDashboard}
                  className="mr-2"
                  data-testid="back-to-dashboard-btn"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
              )}
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">COA Migration</h1>
                <p className="text-xs text-muted-foreground">
                  {activeProject ? activeProject.name : 'Chart of Accounts Migration Tool'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                  Unsaved changes
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGlobalSave}
                disabled={!hasUnsavedChanges && currentStep !== 2}
                data-testid="save-btn"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              {currentStep > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  data-testid="reset-btn"
                >
                  <Settings2 className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Project Sidebar - Below Header */}
        {currentStep > 0 && (
          <ProjectSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            projectId={projectId}
            sourceERP={sourceERP}
            targetERP={targetERP}
            activeProject={activeProject}
            currentUser={user}
          />
        )}

        {/* Main Content - with sidebar offset when open */}
        <main className={`main-content transition-all duration-300 ${currentStep > 0 && sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <StepIndicator 
            currentStep={currentStep} 
            steps={steps} 
            onStepClick={handleStepClick}
            completedSteps={completedSteps}
          />

          {/* Step 0: Select Source & Target ERP */}
          {currentStep === 0 && (
            <div className="animate-fade-in max-w-2xl mx-auto" data-testid="step-select-systems">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Select ERP Systems</h2>
                <p className="text-muted-foreground">Choose source and target systems for your COA migration</p>
              </div>
              
              <Card className="mb-6">
                <CardContent className="p-6 space-y-6">
                  {/* Source ERP Dropdown */}
                  <ERPCombobox
                    erpSystems={erpSystems}
                    value={sourceERP?.id}
                    onChange={handleSourceSelect}
                    placeholder="Search or select source ERP..."
                    label="Source ERP System"
                    excludeId={null}
                  />

                  {/* Arrow indicator */}
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-8 h-px bg-border" />
                      <ArrowRight className="w-5 h-5" />
                      <div className="w-8 h-px bg-border" />
                    </div>
                  </div>

                  {/* Target ERP Dropdown */}
                  <ERPCombobox
                    erpSystems={erpSystems}
                    value={targetERP?.id}
                    onChange={handleTargetSelect}
                    placeholder="Search or select target ERP..."
                    label="Target ERP System"
                    excludeId={sourceERP?.id}
                  />
                </CardContent>
              </Card>

              {/* Summary when both selected */}
              {sourceERP && targetERP && (
                <Card className="mb-6 bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">Migration path configured</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-medium">{sourceERP.name}</span>
                        <ArrowRight className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{targetERP.name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center">
                <Button 
                  size="lg"
                  disabled={!sourceERP || !targetERP}
                  onClick={() => setCurrentStep(1)}
                  data-testid="next-step-upload"
                >
                  Continue to Upload
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <div className="animate-fade-in max-w-4xl mx-auto" data-testid="step-upload">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Upload COA Files</h2>
                <p className="text-muted-foreground">
                  Upload your source COA, target COA, and optional account type mapping
                </p>
              </div>

              {/* Selected ERPs summary */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded ${ERP_COLORS[sourceERP?.id]} flex items-center justify-center text-white font-bold text-sm`}>
                        {ERP_ICONS[sourceERP?.id]}
                      </div>
                      <span className="font-medium">{sourceERP?.name}</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded ${ERP_COLORS[targetERP?.id]} flex items-center justify-center text-white font-bold text-sm`}>
                        {ERP_ICONS[targetERP?.id]}
                      </div>
                      <span className="font-medium">{targetERP?.name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <MultiFileUpload
                sourceFile={sourceFile}
                targetFile={targetFile}
                mappingFile={mappingFile}
                onSourceUpload={handleSourceFileUpload}
                onTargetUpload={handleTargetFileUpload}
                onMappingUpload={handleMappingFileUpload}
                onPreview={handlePreview}
                loading={loading}
                sourceERP={sourceERP}
                targetERP={targetERP}
                sourceData={sourceData}
                targetData={targetData}
                mappingData={mappingData}
              />

              {/* File status summary */}
              {(sourceFile || targetFile || mappingFile) && (
                <Card className="mt-6">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3">Upload Status</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className={`p-3 rounded-lg ${sourceFile ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          {sourceFile ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <UploadCloud className="w-4 h-4 text-gray-400" />}
                          <span className={sourceFile ? 'text-green-800' : 'text-gray-500'}>Source COA</span>
                        </div>
                        {sourceData.length > 0 && <p className="text-xs text-green-600 mt-1">{sourceData.length} rows</p>}
                      </div>
                      <div className={`p-3 rounded-lg ${targetFile ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          {targetFile ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <UploadCloud className="w-4 h-4 text-gray-400" />}
                          <span className={targetFile ? 'text-green-800' : 'text-gray-500'}>Target COA</span>
                        </div>
                        {targetData.length > 0 && <p className="text-xs text-green-600 mt-1">{targetData.length} rows</p>}
                      </div>
                      <div className={`p-3 rounded-lg ${mappingFile ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          {mappingFile ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <UploadCloud className="w-4 h-4 text-gray-400" />}
                          <span className={mappingFile ? 'text-green-800' : 'text-gray-500'}>Type Mapping</span>
                        </div>
                        {mappingData.length > 0 && <p className="text-xs text-green-600 mt-1">{mappingData.length} mappings</p>}
                        {!mappingFile && <p className="text-xs text-gray-400 mt-1">Optional</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-center gap-4 mt-8">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(0)}
                  data-testid="back-step-0"
                >
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleProcessFiles}
                  disabled={!sourceFile || !targetFile || loading}
                  data-testid="process-files-btn"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Processing...
                    </span>
                  ) : (
                    <>
                      Continue to Type Mapping
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Type Mapping Review */}
          {currentStep === 2 && (
            <div className="animate-fade-in max-w-5xl mx-auto" data-testid="step-type-mapping">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Review Account Type Mapping</h2>
                <p className="text-muted-foreground">
                  Map {sourceERP?.name} account types to {targetERP?.name} account types (multi-select supported)
                </p>
              </div>

              {/* Mapping Preview - ON TOP */}
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Mapping Preview
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm text-gray-600">{typeMappingRows.filter(r => r.sourceType && r.targetTypes?.length > 0).length} Complete</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm text-gray-600">{typeMappingRows.filter(r => r.sourceType && (!r.targetTypes || r.targetTypes.length === 0)).length} Incomplete</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="w-[5%] text-center">#</TableHead>
                          <TableHead className="w-[30%]">Source Type ({sourceERP?.name})</TableHead>
                          <TableHead className="w-[10%] text-center"></TableHead>
                          <TableHead className="w-[45%]">Target Type(s) ({targetERP?.name})</TableHead>
                          <TableHead className="w-[10%] text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typeMappingRows.map((row, idx) => {
                          const isComplete = row.sourceType && row.targetTypes?.length > 0;
                          return (
                            <TableRow key={row.id} className={isComplete ? 'bg-green-50' : 'bg-red-50'}>
                              <TableCell className="text-center text-gray-500 text-sm">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{row.sourceType || '-'}</TableCell>
                              <TableCell className="text-center">
                                <ArrowRight className={`w-4 h-4 mx-auto ${isComplete ? 'text-green-600' : 'text-red-400'}`} />
                              </TableCell>
                              <TableCell>
                                {row.targetTypes?.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {row.targetTypes.map((t, i) => (
                                      <Badge key={i} variant="outline" className="bg-white text-xs">
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-red-500 text-sm italic">Not mapped</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {isComplete ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                                ) : (
                                  <X className="w-5 h-5 text-red-500 mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Account Type Mapping Editor - AT BOTTOM */}
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Edit3 className="w-5 h-5" />
                        Account Type Mapping
                      </CardTitle>
                      <CardDescription>
                        Select one or more target types for each source type
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddTypeMappingRow}
                        data-testid="add-mapping-row"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Row
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveTypeMappingCSV}
                        data-testid="download-mapping-csv"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="w-[35%]">Source Type ({sourceERP?.name})</TableHead>
                          <TableHead className="w-[10%] text-center"></TableHead>
                          <TableHead className="w-[45%]">Target Type(s) ({targetERP?.name})</TableHead>
                          <TableHead className="w-[10%] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typeMappingRows.map((row) => {
                          const isMatched = row.sourceType && row.targetTypes?.length > 0;
                          const isUnmatched = row.sourceType && (!row.targetTypes || row.targetTypes.length === 0);
                          
                          return (
                            <TableRow 
                              key={row.id} 
                              className={`
                                ${isMatched ? 'bg-green-50 hover:bg-green-100' : ''}
                                ${isUnmatched ? 'bg-red-50 hover:bg-red-100' : ''}
                                ${!row.sourceType ? 'hover:bg-gray-50' : ''}
                              `}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {isMatched && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                                  {isUnmatched && <X className="w-4 h-4 text-red-600 flex-shrink-0" />}
                                  <input
                                    type="text"
                                    value={row.sourceType}
                                    onChange={(e) => handleTypeMappingChange(row.id, 'sourceType', e.target.value)}
                                    className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      isMatched ? 'border-green-300 bg-white' : 
                                      isUnmatched ? 'border-red-300 bg-white' : 'border-gray-300'
                                    }`}
                                    placeholder="Enter source type"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <ArrowRight className={`w-4 h-4 mx-auto ${
                                  isMatched ? 'text-green-600' : 
                                  isUnmatched ? 'text-red-400' : 'text-gray-400'
                                }`} />
                              </TableCell>
                              <TableCell>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      className={`w-full justify-between ${
                                        isMatched ? 'border-green-300 bg-white' : 
                                        isUnmatched ? 'border-red-300 bg-white' : ''
                                      }`}
                                    >
                                      {row.targetTypes?.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 max-w-[300px] overflow-hidden">
                                          {row.targetTypes.slice(0, 3).map((t, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                              {t}
                                            </Badge>
                                          ))}
                                          {row.targetTypes.length > 3 && (
                                            <Badge variant="outline" className="text-xs">
                                              +{row.targetTypes.length - 3} more
                                            </Badge>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">Select target types...</span>
                                      )}
                                      <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search types..." />
                                      <CommandList>
                                        <CommandEmpty>No types found.</CommandEmpty>
                                        <CommandGroup>
                                          {targetTypes.map((type) => {
                                            const isSelected = row.targetTypes?.includes(type);
                                            return (
                                              <CommandItem
                                                key={type}
                                                onSelect={() => {
                                                  const newTargets = isSelected
                                                    ? row.targetTypes.filter(t => t !== type)
                                                    : [...(row.targetTypes || []), type];
                                                  handleTypeMappingChange(row.id, 'targetTypes', newTargets);
                                                }}
                                                className="cursor-pointer"
                                              >
                                                <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                                                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                                }`}>
                                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                {type}
                                              </CommandItem>
                                            );
                                          })}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTypeMappingRow(row.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="flex justify-center gap-4">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  data-testid="back-step-1"
                >
                  Back
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveTypeMappingCSV}
                  disabled={typeMappingRows.filter(r => r.sourceType && r.targetTypes?.length > 0).length === 0}
                  data-testid="save-type-mapping-btn"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Mapping
                </Button>
                <Button
                  size="lg"
                  onClick={handleProceedToMapping}
                  disabled={loading || typeMappingRows.filter(r => r.sourceType && r.targetTypes?.length > 0).length === 0}
                  data-testid="proceed-to-mapping-btn"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Processing...
                    </span>
                  ) : (
                    <>
                      Continue to COA Mapping
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Hierarchical COA Mapping */}
          {currentStep === 3 && (
            <div className="animate-fade-in" data-testid="step-mapping">
              {/* Header with Account Type Chips */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">COA Mapping</h2>
                  <p className="text-muted-foreground text-sm">
                    <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                    {uploadedFile?.name} • {uploadedFile?.rowCount} rows
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{mappingStats.mappedTypes} / {mappingStats.totalTypes} types mapped</p>
                    <Progress 
                      value={(mappingStats.mappedTypes / mappingStats.totalTypes) * 100} 
                      className="w-32 h-2"
                    />
                  </div>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      if (showFinalPreview) {
                        setCompletedSteps(prev => [...new Set([...prev, 3])]);
                        setCurrentStep(4);
                      } else {
                        setShowFinalPreview(true);
                      }
                    }}
                    disabled={
                      mappingStats.totalAccounts === 0 || 
                      !confirmedHigh || 
                      !confirmedMedium || 
                      (mappingStats.lowConfidence > 0 && !confirmedLow)
                    }
                    data-testid="save-mapping-btn"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {showFinalPreview ? 'Continue to Export' : 'Review & Save'}
                  </Button>
                </div>
              </div>

              {/* Show Final Preview or Mapping Interface */}
              {showFinalPreview && !editingFinalPreview ? (
                /* Final CSV Preview */
                <div>
                  {/* Summary Header */}
                  {(() => {
                    let confirmedCount = 0;
                    let notConfirmedCount = 0;
                    groupedMappings.forEach(group => {
                      group.accounts.forEach(account => {
                        const score = calculateAccountScore(account.source_name, account.target_name);
                        const isConfirmed = (score >= 90 && confirmedHigh) || 
                                           (score >= 70 && score < 90 && confirmedMedium) || 
                                           (score < 70 && confirmedLow);
                        if (isConfirmed) confirmedCount++;
                        else notConfirmedCount++;
                      });
                    });
                    return (
                      <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-6">
                          <h3 className="text-lg font-semibold">Final Mapping Preview</h3>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-800 px-3 py-1">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                {confirmedCount} Confirmed
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-red-100 text-red-800 px-3 py-1">
                                <X className="w-4 h-4 mr-1" />
                                {notConfirmedCount} Not Confirmed
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowFinalPreview(false)}
                          >
                            Back to Mapping
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingFinalPreview(true)}
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-100">
                            <TableHead className="text-xs font-semibold">Account #</TableHead>
                            <TableHead className="text-xs font-semibold">Source Account Name</TableHead>
                            <TableHead className="text-xs font-semibold">Source Type</TableHead>
                            <TableHead className="text-xs font-semibold">Target Account Name</TableHead>
                            <TableHead className="text-xs font-semibold">Target Type</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Score</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedMappings.flatMap((group, groupIdx) => 
                            group.accounts.map((account, accIdx) => {
                              const score = calculateAccountScore(account.source_name, account.target_name);
                              const isConfirmed = (score >= 90 && confirmedHigh) || 
                                                 (score >= 70 && score < 90 && confirmedMedium) || 
                                                 (score < 70 && confirmedLow);
                              return (
                                <TableRow key={`${groupIdx}-${accIdx}`} className="hover:bg-gray-50">
                                  <TableCell className="font-mono text-xs">{account.source_number || '-'}</TableCell>
                                  <TableCell className="text-sm">{account.source_name}</TableCell>
                                  <TableCell className="text-sm">{group.source_type}</TableCell>
                                  <TableCell className="text-sm">{account.target_name}</TableCell>
                                  <TableCell className="text-sm">{group.target_type || '-'}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={`text-xs ${
                                      score >= 90 ? 'bg-green-100 text-green-800' :
                                      score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {score}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {isConfirmed ? (
                                      <Badge className="bg-green-600 text-white text-xs">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Confirmed
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-red-100 text-red-700 text-xs border border-red-300">
                                        Not Confirmed
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Mapping Stats and Confirmation Interface */
                <>
                  {/* Mapping Stats - Clickable Filters */}
                  <div className="grid grid-cols-5 gap-4 mb-6">
                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-md ${confidenceFilter === null && !showFinalPreview ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => { setConfidenceFilter(null); setShowFinalPreview(false); setEditingFinalPreview(false); }}
                      data-testid="filter-all"
                    >
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{mappingStats.totalAccounts}</p>
                        <p className="text-xs text-muted-foreground">All Account Names</p>
                        {confidenceFilter === null && !showFinalPreview && <Badge className="mt-1 text-xs bg-blue-100 text-blue-700">Active</Badge>}
                      </CardContent>
                    </Card>
                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-md ${confidenceFilter === 'high' ? 'ring-2 ring-green-500' : ''} ${confirmedHigh ? 'bg-green-50' : ''}`}
                      onClick={() => { setConfidenceFilter('high'); setShowFinalPreview(false); setEditingFinalPreview(false); }}
                      data-testid="filter-high"
                    >
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{mappingStats.highConfidence}</p>
                        <p className="text-xs text-muted-foreground">High (90%+)</p>
                        {confirmedHigh ? (
                          <Badge className="mt-1 text-xs bg-green-600 text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirmed
                          </Badge>
                        ) : confidenceFilter === 'high' && (
                          <Badge className="mt-1 text-xs bg-green-100 text-green-700">Review</Badge>
                        )}
                      </CardContent>
                    </Card>
                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-md ${confidenceFilter === 'medium' ? 'ring-2 ring-yellow-500' : ''} ${confirmedMedium ? 'bg-yellow-50' : ''}`}
                      onClick={() => { setConfidenceFilter('medium'); setShowFinalPreview(false); setEditingFinalPreview(false); }}
                      data-testid="filter-medium"
                    >
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{mappingStats.mediumConfidence}</p>
                        <p className="text-xs text-muted-foreground">Medium (70-89%)</p>
                        {confirmedMedium ? (
                          <Badge className="mt-1 text-xs bg-yellow-600 text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirmed
                          </Badge>
                        ) : confidenceFilter === 'medium' && (
                          <Badge className="mt-1 text-xs bg-yellow-100 text-yellow-700">Review</Badge>
                        )}
                      </CardContent>
                    </Card>
                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-md ${confidenceFilter === 'low' ? 'ring-2 ring-red-500' : ''} ${confirmedLow ? 'bg-red-50' : ''}`}
                      onClick={() => { setConfidenceFilter('low'); setShowFinalPreview(false); setEditingFinalPreview(false); }}
                      data-testid="filter-low"
                    >
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-red-600">{mappingStats.lowConfidence}</p>
                        <p className="text-xs text-muted-foreground">Low (&lt;70%)</p>
                        {confirmedLow ? (
                          <Badge className="mt-1 text-xs bg-red-600 text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirmed
                          </Badge>
                        ) : confidenceFilter === 'low' && (
                          <Badge className="mt-1 text-xs bg-red-100 text-red-700">Review</Badge>
                        )}
                      </CardContent>
                    </Card>
                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-md ${confirmedHigh && confirmedMedium && confirmedLow ? 'bg-purple-50 ring-2 ring-purple-500' : ''}`}
                      onClick={() => {
                        if (mappingStats.confirmedAccountNames > 0) {
                          setShowFinalPreview(true);
                          setConfidenceFilter(null);
                        }
                      }}
                      data-testid="filter-confirmed"
                    >
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">{mappingStats.confirmedAccountNames}</p>
                        <p className="text-xs text-muted-foreground">Confirmed Names</p>
                        {confirmedHigh && confirmedMedium && confirmedLow ? (
                          <Badge className="mt-1 text-xs bg-purple-600 text-white">
                            <Eye className="w-3 h-3 mr-1" />
                            View Review
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="mt-1 text-xs text-gray-500">Click to review</Badge>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Deleted Account Names Box */}
                  {deletedAccounts.length > 0 && (
                    <Card className="mb-4 border-red-200 bg-red-50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-800">
                            <Trash2 className="w-4 h-4" />
                            Deleted Account Names ({deletedAccounts.length})
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {deletedAccounts.map((account, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-gray-500">{account.source_number || '-'}</span>
                                <span className="text-gray-700">{account.source_name}</span>
                                <Badge variant="outline" className="text-xs">{account.source_type}</Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreAccount(account, idx)}
                                className="h-6 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                Restore
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Confirmation Tab for filtered accounts */}
                  {confidenceFilter && (
                    <div className={`mb-4 p-4 rounded-lg border-2 ${
                      confidenceFilter === 'high' ? 'bg-green-50 border-green-300' :
                      confidenceFilter === 'medium' ? 'bg-yellow-50 border-yellow-300' :
                      'bg-red-50 border-red-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {confidenceFilter === 'high' && !confirmedHigh && (
                            <>
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                              <div>
                                <p className="font-semibold text-green-800">Confirm Account Names in the High Score</p>
                                <p className="text-sm text-green-700">Review the {mappingStats.highConfidence} high confidence matches below and confirm they are correct</p>
                              </div>
                            </>
                          )}
                          {confidenceFilter === 'medium' && !confirmedMedium && (
                            <>
                              <CheckCircle2 className="w-6 h-6 text-yellow-600" />
                              <div>
                                <p className="font-semibold text-yellow-800">Confirm Account Names in the Medium Score</p>
                                <p className="text-sm text-yellow-700">Review the {mappingStats.mediumConfidence} medium confidence matches below and confirm or edit them</p>
                              </div>
                            </>
                          )}
                          {confidenceFilter === 'low' && !confirmedLow && (
                            <>
                              <CheckCircle2 className="w-6 h-6 text-red-600" />
                              <div>
                                <p className="font-semibold text-red-800">Confirm Account Names in the Low Score</p>
                                <p className="text-sm text-red-700">Review the {mappingStats.lowConfidence} low confidence matches below - these likely need manual correction</p>
                              </div>
                            </>
                          )}
                          {((confidenceFilter === 'high' && confirmedHigh) ||
                            (confidenceFilter === 'medium' && confirmedMedium) ||
                            (confidenceFilter === 'low' && confirmedLow)) && (
                            <>
                              <CheckCircle2 className="w-6 h-6 text-gray-600" />
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {confidenceFilter.charAt(0).toUpperCase() + confidenceFilter.slice(1)} Score Accounts Confirmed
                                </p>
                                <p className="text-sm text-gray-600">You can still make edits if needed</p>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {confidenceFilter === 'high' && !confirmedHigh && (
                            <Button 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => setConfirmedHigh(true)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Confirm High Score ({mappingStats.highConfidence})
                            </Button>
                          )}
                          {confidenceFilter === 'medium' && !confirmedMedium && (
                            <Button 
                              className="bg-yellow-600 hover:bg-yellow-700"
                              onClick={() => setConfirmedMedium(true)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Confirm Medium Score ({mappingStats.mediumConfidence})
                            </Button>
                          )}
                          {confidenceFilter === 'low' && !confirmedLow && (
                            <Button 
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => setConfirmedLow(true)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Confirm Low Score ({mappingStats.lowConfidence})
                            </Button>
                          )}
                          {((confidenceFilter === 'high' && confirmedHigh) ||
                            (confidenceFilter === 'medium' && confirmedMedium) ||
                            (confidenceFilter === 'low' && confirmedLow)) && (
                            <Button 
                              variant="outline"
                              onClick={() => {
                                if (confidenceFilter === 'high') setConfirmedHigh(false);
                                if (confidenceFilter === 'medium') setConfirmedMedium(false);
                                if (confidenceFilter === 'low') setConfirmedLow(false);
                              }}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit & Reconfirm
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setConfidenceFilter(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FolderTree className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">Account Type Mappings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="confidence-high">90%+ High</Badge>
                        </TooltipTrigger>
                        <TooltipContent>High confidence matches (&gt;90%)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="confidence-medium">70-89% Med</Badge>
                        </TooltipTrigger>
                        <TooltipContent>Medium confidence matches (70-89%)</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="confidence-low">&lt;70% Low</Badge>
                        </TooltipTrigger>
                        <TooltipContent>Low confidence matches (&lt;70%)</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Single Header Row for All Account Groups */}
                  <div className="bg-gray-100 border rounded-t-lg px-4 py-2 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600">
                    <div className="col-span-1">Account #</div>
                    <div className="col-span-3">Source Account ({sourceERP?.name})</div>
                    <div className="col-span-1 text-center"></div>
                    <div className="col-span-2">Target Account ({targetERP?.name})</div>
                    <div className="col-span-1 text-center">Score</div>
                    <div className="col-span-2 text-center">Remark</div>
                    <div className="col-span-2 text-center">Action</div>
                  </div>

                  {/* Hierarchical Mapping Groups - Full page scroll */}
                  <div className="border border-t-0 rounded-b-lg">
                    {filteredMappings.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No accounts match the current filter</p>
                        <Button 
                          variant="link" 
                          onClick={() => setConfidenceFilter(null)}
                          className="mt-2"
                        >
                          Clear filter to see all accounts
                        </Button>
                      </div>
                    ) : (
                      filteredMappings.map((group, idx) => (
                        <AccountTypeGroup
                          key={idx}
                          group={group}
                          targetTypes={targetTypes}
                          onTypeChange={handleTypeChange}
                          onAccountNameChange={handleAccountNameChange}
                          onDeleteAccount={handleDeleteAccount}
                          sourceERP={sourceERP}
                          targetERP={targetERP}
                          targetData={targetData}
                          targetAccountNames={targetAccountNames}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Export Preview */}
          {currentStep === 4 && (
            <div className="animate-fade-in" data-testid="step-export">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Export Preview</h2>
                  <p className="text-muted-foreground text-sm">
                    Review your mapped data before downloading
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(3)} data-testid="back-to-mapping">
                    Back to Mapping
                  </Button>
                  <Button 
                    onClick={handleExport} 
                    disabled={exporting}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="download-csv-btn"
                  >
                    {exporting ? (
                      <span className="flex items-center">
                        <div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Downloading...
                      </span>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{mappingStats.totalTypes}</p>
                    <p className="text-xs text-muted-foreground">Account Types</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{mappingStats.totalAccounts}</p>
                    <p className="text-xs text-muted-foreground">Accounts Mapped</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{mappingStats.highConfidence}</p>
                    <p className="text-xs text-muted-foreground">High Confidence</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{mappingStats.mediumConfidence + mappingStats.lowConfidence}</p>
                    <p className="text-xs text-muted-foreground">Review Needed</p>
                  </CardContent>
                </Card>
              </div>

              {/* CSV Preview Table */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5" />
                      CSV Preview
                    </CardTitle>
                    <Badge variant="outline">
                      {groupedMappings.reduce((sum, g) => sum + g.accounts.length, 0)} rows
                    </Badge>
                  </div>
                  <CardDescription>Preview of the exported CSV file</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="text-xs font-semibold">Source Account #</TableHead>
                          <TableHead className="text-xs font-semibold">Source Account Name</TableHead>
                          <TableHead className="text-xs font-semibold">Source Type</TableHead>
                          <TableHead className="text-xs font-semibold">Target Account Name</TableHead>
                          <TableHead className="text-xs font-semibold">Target Type</TableHead>
                          <TableHead className="text-xs font-semibold text-center">Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedMappings.flatMap((group, groupIdx) => 
                          group.accounts.map((account, accIdx) => (
                            <TableRow key={`${groupIdx}-${accIdx}`} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-xs">{account.source_number || '-'}</TableCell>
                              <TableCell className="text-sm">{account.source_name}</TableCell>
                              <TableCell className="text-sm">{group.source_type}</TableCell>
                              <TableCell className="text-sm">{account.target_name}</TableCell>
                              <TableCell className="text-sm">{group.target_type || '-'}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={`text-xs ${
                                  group.confidence >= 90 ? 'bg-green-100 text-green-800' :
                                  group.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {group.confidence}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-6">
                <Button variant="outline" onClick={handleReset} data-testid="start-new-btn">
                  Start New Migration
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {previewTitle}
              </DialogTitle>
              <DialogDescription>
                Showing first {previewData.length} rows
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[500px] mt-4">
              {previewData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {Object.keys(previewData[0]).map(col => (
                        <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        {Object.values(row).map((val, j) => (
                          <TableCell key={j} className="text-xs mono whitespace-nowrap">
                            {String(val || '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data to preview
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Main App Component with Auth and Dashboard
function App() {
  const [view, setView] = useState('dashboard'); // 'login', 'dashboard', 'mapping'
  const [activeProject, setActiveProject] = useState(null);
  const [erpSystems, setErpSystems] = useState([]);
  
  // Fetch ERP systems for the dashboard
  useEffect(() => {
    const fetchERPSystems = async () => {
      try {
        const response = await axios.get(`${API}/erp-systems`);
        setErpSystems(response.data);
      } catch (error) {
        console.error('Failed to load ERP systems:', error);
      }
    };
    fetchERPSystems();
  }, []);

  const handleOpenProject = async (project) => {
    // Load full project data if opening from dashboard
    try {
      const token = localStorage.getItem('coa_token');
      if (token) {
        const response = await axios.get(`${API}/dashboard/projects/${project.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActiveProject(response.data);
      } else {
        setActiveProject(project);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      setActiveProject(project);
    }
    setView('mapping');
  };

  const handleBackToDashboard = () => {
    setActiveProject(null);
    setView('dashboard');
  };

  const handleStartNewProject = () => {
    setActiveProject(null);
    setView('mapping');
  };

  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <AppContent
        view={view}
        setView={setView}
        activeProject={activeProject}
        erpSystems={erpSystems}
        onOpenProject={handleOpenProject}
        onBackToDashboard={handleBackToDashboard}
        onStartNewProject={handleStartNewProject}
      />
    </AuthProvider>
  );
}

// AppContent with auth check
function AppContent({ view, setView, activeProject, erpSystems, onOpenProject, onBackToDashboard, onStartNewProject }) {
  const { isAuthenticated, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show dashboard or mapping view
  if (view === 'dashboard') {
    return <Dashboard onOpenProject={onOpenProject} erpSystems={erpSystems} />;
  }

  // Show COA mapping tool
  return (
    <COAMappingApp
      activeProject={activeProject}
      onBackToDashboard={onBackToDashboard}
    />
  );
}

export default App;
