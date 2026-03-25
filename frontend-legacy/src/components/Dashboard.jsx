/**
 * Dashboard Page Component
 * Shows companies and projects accessible to the logged-in user
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Building2, 
  FolderOpen, 
  Plus, 
  LogOut, 
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  ArrowRight,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Status badge component
function StatusBadge({ status }) {
  const config = {
    draft: { label: 'Draft', variant: 'secondary', icon: FileText },
    in_progress: { label: 'In Progress', variant: 'default', icon: Clock },
    pending_review: { label: 'Pending Review', variant: 'warning', icon: AlertCircle },
    completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 }
  };
  
  const { label, variant, icon: Icon } = config[status] || config.draft;
  
  const variantClasses = {
    secondary: 'bg-slate-600 text-slate-200',
    default: 'bg-blue-600 text-white',
    warning: 'bg-amber-600 text-white',
    success: 'bg-emerald-600 text-white'
  };
  
  return (
    <Badge className={`${variantClasses[variant]} text-xs flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

// Permission badge
function PermissionBadge({ permission }) {
  const config = {
    viewer: { label: 'Viewer', className: 'bg-slate-600' },
    editor: { label: 'Editor', className: 'bg-blue-600' },
    approver: { label: 'Approver', className: 'bg-purple-600' },
    admin: { label: 'Admin', className: 'bg-emerald-600' }
  };
  
  const { label, className } = config[permission] || config.viewer;
  
  return (
    <Badge className={`${className} text-white text-xs`}>
      {label}
    </Badge>
  );
}

// New Project Dialog
function NewProjectDialog({ erpSystems, onProjectCreated }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_id: '',
    source_erp: '',
    target_erp: '',
    description: ''
  });
  const { getAuthHeaders } = useAuth();

  const handleCreate = async () => {
    if (!formData.name || !formData.company_id || !formData.source_erp || !formData.target_erp) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/api/dashboard/projects`,
        formData,
        { headers: getAuthHeaders() }
      );
      
      toast.success('Project created successfully');
      setOpen(false);
      setFormData({ name: '', company_id: '', source_erp: '', target_erp: '', description: '' });
      onProjectCreated(response.data.project);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700" data-testid="new-project-btn">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription className="text-slate-400">
            Set up a new COA migration project
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Project Name *</Label>
            <Input
              placeholder="e.g., Q1 2024 Migration"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white"
              data-testid="new-project-name-input"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-300">Company ID *</Label>
            <Input
              placeholder="e.g., acme-corp"
              value={formData.company_id}
              onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white"
              data-testid="new-project-company-input"
            />
            <p className="text-xs text-slate-500">New companies are auto-created</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Source ERP *</Label>
              <Select
                value={formData.source_erp}
                onValueChange={(v) => setFormData({ ...formData, source_erp: v })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {erpSystems.map((erp) => (
                    <SelectItem key={erp.id} value={erp.id} className="text-white">
                      {erp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Target ERP *</Label>
              <Select
                value={formData.target_erp}
                onValueChange={(v) => setFormData({ ...formData, target_erp: v })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {erpSystems.map((erp) => (
                    <SelectItem key={erp.id} value={erp.id} className="text-white">
                      {erp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-300">Description</Label>
            <Input
              placeholder="Optional description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-300">
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="create-project-submit-btn"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard({ onOpenProject, erpSystems }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const { user, logout, getAuthHeaders } = useAuth();

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/dashboard/companies`, {
        headers: getAuthHeaders()
      });
      setCompanies(response.data.companies || []);
      setTotalProjects(response.data.total_projects || 0);
    } catch (err) {
      toast.error('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleProjectCreated = (project) => {
    // Refresh dashboard
    fetchDashboard();
    // Optionally open the new project immediately
    // onOpenProject(project);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">COA Migration</h1>
              <p className="text-xs text-slate-400">Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <NewProjectDialog erpSystems={erpSystems} onProjectCreated={handleProjectCreated} />
            
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-white">{user?.name || user?.user_id}</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-slate-400 hover:text-white"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalProjects}</p>
                <p className="text-sm text-slate-400">Total Projects</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{companies.length}</p>
                <p className="text-sm text-slate-400">Companies</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {companies.reduce((acc, c) => acc + c.projects.filter(p => p.status === 'completed').length, 0)}
                </p>
                <p className="text-sm text-slate-400">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies & Projects */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
              <p className="text-slate-400 mb-6">Create your first COA migration project to get started</p>
              <NewProjectDialog erpSystems={erpSystems} onProjectCreated={handleProjectCreated} />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {companies.map((company) => (
              <Card key={company.id} className="bg-slate-800/50 border-slate-700" data-testid={`company-card-${company.company_id}`}>
                <CardHeader className="border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-300" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{company.name}</CardTitle>
                        <CardDescription className="text-slate-400">
                          {company.company_id} · {company.projects.length} project{company.projects.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-700">
                    {company.projects.map((project) => (
                      <div
                        key={project.id}
                        className="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer group"
                        onClick={() => onOpenProject(project)}
                        data-testid={`project-row-${project.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-white truncate">{project.name}</h4>
                              <StatusBadge status={project.status} />
                              <PermissionBadge permission={project.user_permission} />
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                              <span>{project.source_erp} → {project.target_erp}</span>
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {project.mapping_count || 0} mappings
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(project.updated_at)}
                              </span>
                            </div>
                            {/* User Names List */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Users className="w-3 h-3" />
                                Users:
                              </span>
                              {project.access_list?.map((access, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className="text-xs bg-slate-700/50 text-slate-300 border-slate-600"
                                >
                                  {access.user_name}
                                  <span className="text-slate-500 ml-1">({access.permission})</span>
                                </Badge>
                              ))}
                            </div>
                            {/* Last Edited By */}
                            {project.last_edited_by && (
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <User className="w-3 h-3" />
                                <span>Last edited by: <span className="text-slate-400">{project.last_edited_by}</span></span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
