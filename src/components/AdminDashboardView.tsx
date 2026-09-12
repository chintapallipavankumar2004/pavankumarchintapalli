import React, { useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  FileEdit,
  Mail,
  ArrowLeft,
  Settings,
  LogOut,
  Plus,
  Search,
  Eye,
  Edit2,
  Copy,
  Trash2,
  CheckCircle2,
  Globe,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Project, Enquiry, ViewMode } from '../types';
import { SettingsPanel } from './SettingsPanel';
import { CmsManager } from './CmsManager';
import { PROFILE_INFO } from '../data/initialData';

interface AdminDashboardViewProps {
  projects: Project[];
  enquiries: Enquiry[];
  onOpenAddProject: () => void;
  onOpenEditProject: (project: Project) => void;
  onDuplicateProject: (project: Project) => void;
  onOpenDeleteProject: (project: Project) => void;
  onPreviewProject: (project: Project) => void;
  onSwitchView: (view: ViewMode) => void;
  onTogglePublish: (project: Project) => void;
  onReorder: (project: Project, direction: -1 | 1) => void;
  onEnquiryStatus: (id: string, status: Enquiry['status']) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  projects,
  enquiries,
  onOpenAddProject,
  onOpenEditProject,
  onDuplicateProject,
  onOpenDeleteProject,
  onPreviewProject,
  onSwitchView,
  onTogglePublish,
  onReorder,
  onEnquiryStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'enquiries' | 'settings' | 'content' | 'categories' | 'services' | 'skills' | 'process' | 'media' | 'seo'>(
    'dashboard',
  );
  const [searchQuery, setSearchQuery] = useState('');

  const publishedCount = projects.filter((p) => p.status === 'published').length;
  const draftCount = projects.filter((p) => p.status === 'draft').length;

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.technologies.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div id="view-admin-dashboard" className="min-h-screen bg-[#f1f3ff] flex flex-col md:flex-row">
      {/* SideNavBar */}
      <aside className="w-full md:w-[260px] bg-white border-r border-[#c8c4d8]/50 flex flex-col justify-between shrink-0 p-4 z-30">
        {/* Top Brand & Admin Info */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-[#5b4cf0]/10 border border-[#422cd8]/20 flex items-center justify-center text-[#422cd8] font-bold text-sm">
              {PROFILE_INFO.initials}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#141b2b] leading-tight">
                {PROFILE_INFO.shortName}
              </h4>
              <p className="text-xs text-[#474555]">Suite Administrator</p>
            </div>
          </div>

          {/* CTA: New Project Entry */}
          <button
            id="btn-sidebar-add-project"
            type="button"
            onClick={onOpenAddProject}
            className="w-full h-10 rounded-lg bg-[#5b4cf0] text-white text-xs font-semibold hover:bg-[#422cd8] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Project Entry</span>
          </button>

          {/* Nav Tabs */}
          <nav aria-label="Admin Drawer" className="space-y-1">
            <button
              id="admin-tab-dash"
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-medium text-xs transition-colors cursor-pointer text-left ${
                activeTab === 'dashboard'
                  ? 'bg-[#5b4cf0]/10 text-[#422cd8] font-semibold'
                  : 'text-[#474555] hover:bg-[#f1f3ff] hover:text-[#141b2b]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <label className="block px-3 pt-3 text-[10px] uppercase tracking-wider text-[#777587]">Manage website
              <select aria-label="Admin section" value={['dashboard','projects','enquiries','settings'].includes(activeTab)?'':activeTab} onChange={e=>e.target.value&&setActiveTab(e.target.value as any)} className="mt-1 w-full h-9 border border-[#c8c4d8] rounded-lg bg-white px-2 text-xs normal-case">
                <option value="">Choose section…</option><option value="content">Website Content</option><option value="categories">Categories</option><option value="services">Services</option><option value="skills">Skills</option><option value="process">Process</option><option value="media">Media</option><option value="seo">SEO & Social</option>
              </select>
            </label>

            <button
              id="admin-tab-proj"
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-medium text-xs transition-colors cursor-pointer text-left ${
                activeTab === 'projects'
                  ? 'bg-[#5b4cf0]/10 text-[#422cd8] font-semibold'
                  : 'text-[#474555] hover:bg-[#f1f3ff] hover:text-[#141b2b]'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Projects Table</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddProject}
              className="w-full flex items-center gap-2.5 text-[#474555] hover:bg-[#f1f3ff] hover:text-[#141b2b] rounded-lg px-3 py-2.5 transition-colors text-xs cursor-pointer text-left font-medium"
            >
              <FileEdit className="w-4 h-4" />
              <span>Add / Edit Project</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('enquiries')}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 font-medium text-xs transition-colors cursor-pointer text-left ${
                activeTab === 'enquiries'
                  ? 'bg-[#5b4cf0]/10 text-[#422cd8] font-semibold'
                  : 'text-[#474555] hover:bg-[#f1f3ff] hover:text-[#141b2b]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" />
                <span>Enquiries</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#5b4cf0] text-white text-[10px] font-bold">
                {enquiries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSwitchView('public')}
              className="w-full flex items-center gap-2.5 text-[#474555] hover:bg-[#f1f3ff] hover:text-[#141b2b] rounded-lg px-3 py-2.5 transition-colors text-xs cursor-pointer text-left font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Public Portfolio</span>
            </button>
          </nav>
        </div>

        {/* Footer Tabs */}
        <div className="border-t border-[#c8c4d8]/40 pt-4 space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="w-full flex items-center gap-2.5 text-[#474555] hover:text-[#141b2b] rounded-lg px-3 py-2 text-xs cursor-pointer font-medium"
          >
            <Settings className="w-4 h-4" />
            <span>Portal Settings</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchView('admin-login')}
            className="w-full flex items-center gap-2.5 text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Dashboard Workspace */}
      <div className="flex-1 min-w-0 p-6 md:p-10 space-y-8 overflow-y-auto">
        {/* Top Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#141b2b]">
              Portfolio Control Console
            </h2>
            <p className="text-xs sm:text-sm text-[#474555] mt-0.5">
              Manage portfolio projects and client enquiries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenAddProject}
              className="h-10 px-4 rounded-lg bg-[#5b4cf0] text-white text-xs sm:text-sm font-semibold hover:bg-[#422cd8] transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Project</span>
            </button>
          </div>
        </div>

        {/* 4 Metric KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Metric 1 */}
          <div className="p-5 rounded-2xl bg-white border border-[#c8c4d8] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-[#474555] font-medium">Total Projects</span>
              <span className="p-2 rounded-lg bg-[#e9edff] text-[#422cd8]">
                <FolderKanban className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-[#141b2b]">
                {projects.length}
              </span>
              <span className="text-xs text-emerald-700 font-semibold"></span>
            </div>
            <p className="text-[11px] text-[#474555] mt-1">Catalogued projects on database</p>
          </div>

          {/* Metric 2 */}
          <div className="p-5 rounded-2xl bg-white border border-[#c8c4d8] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-[#474555] font-medium">
                Published Projects
              </span>
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Globe className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-[#141b2b]">
                {publishedCount}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                PUBLISHED
              </span>
            </div>
            <p className="text-[11px] text-[#474555] mt-1">Visible in the public portfolio</p>
          </div>

          {/* Metric 3 */}
          <div className="p-5 rounded-2xl bg-white border border-[#c8c4d8] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-[#474555] font-medium">Draft Entries</span>
              <span className="p-2 rounded-lg bg-[#e9edff] text-[#474555]">
                <FileEdit className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-[#141b2b]">{draftCount}</span>
              <span className="text-xs text-[#474555]">
                {draftCount === 0 ? 'Clean state' : 'In review'}
              </span>
            </div>
            <p className="text-[11px] text-[#474555] mt-1">
              {draftCount === 0
                ? 'No pending unreleased drafts'
                : `${draftCount} pending unpublished`}
            </p>
          </div>

          {/* Metric 4 */}
          <div className="p-5 rounded-2xl bg-white border border-[#c8c4d8] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-[#474555] font-medium">Total Enquiries</span>
              <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Mail className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-[#141b2b]">
                {enquiries.length}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-bold"></span>
            </div>
            <p className="text-[11px] text-[#474555] mt-1">Received through the contact form</p>
          </div>
        </div>

        {/* Tab View: Inbound Enquiries */}
        {['content','categories','services','skills','process','media','seo'].includes(activeTab) ? (
          <CmsManager area={activeTab as any} />
        ) : activeTab === 'settings' ? (
          <SettingsPanel />
        ) : activeTab === 'enquiries' ? (
          <div className="bg-white border border-[#c8c4d8] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#c8c4d8]/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#141b2b]">Inbound Client Enquiries</h3>
                <p className="text-xs text-[#474555]">
                  Messages received via the Portfolio Contact Enquiry desk.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#5b4cf0]/10 text-[#422cd8] text-xs font-semibold">
                {enquiries.length} Messages
              </span>
            </div>

            {enquiries.length === 0 ? (
              <div className="p-12 text-center text-[#474555]">
                <Mail className="w-8 h-8 mx-auto text-[#777587] mb-2" />
                <p className="font-medium">No enquiries yet.</p>
                <p className="text-xs mt-1">
                  When visitors submit the contact form, entries will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#c8c4d8]/40">
                {enquiries.map((enq) => (
                  <div key={enq.id} className="p-5 space-y-3 hover:bg-[#f9f9ff] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#5b4cf0]/10 text-[#422cd8] flex items-center justify-center font-bold text-xs">
                          {enq.fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#141b2b]">{enq.fullName}</h4>
                          <span className="text-xs text-[#474555]">{enq.email}</span>
                          {enq.phone && (
                            <span className="text-xs text-[#474555] ml-2">• {enq.phone}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                          {enq.budget}
                        </span>
                        <span className="text-xs text-[#777587] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {enq.createdAt}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-[#141b2b] bg-[#f1f3ff] p-3 rounded-lg border border-[#c8c4d8]/40">
                      "{enq.description}"
                    </p>

                    <div className="flex items-center gap-3 text-xs">
                      <label>
                        Status{' '}
                        <select
                          value={enq.status}
                          onChange={(e) =>
                            onEnquiryStatus(enq.id, e.target.value as Enquiry['status'])
                          }
                          className="p-2 border rounded"
                        >
                          <option value="new">New</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="contacted">Contacted</option>
                        </select>
                      </label>
                      <a
                        href={`mailto:${encodeURIComponent(enq.email)}?subject=Project%20Enquiry%20Response`}
                        className="text-[#422cd8] font-semibold hover:underline flex items-center gap-1"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Reply by Email</span>
                      </a>
                      {enq.phone && (
                        <a
                          href={`https://wa.me/${enq.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>WhatsApp Client</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Master Projects Table */
          <div className="bg-white border border-[#c8c4d8] rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-[#c8c4d8]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-[#141b2b]">Master Projects Catalog</h3>
                <p className="text-xs text-[#474555]">
                  Edit details, manage publication, and arrange display order.
                </p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 pr-3 rounded-lg border border-[#c8c4d8] text-xs text-[#141b2b] focus:border-[#5b4cf0] focus:outline-none w-48 sm:w-64"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-[#777587]" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f1f3ff] border-b border-[#c8c4d8]/60 text-[11px] uppercase tracking-wider text-[#474555] font-semibold">
                    <th className="py-3.5 px-5">Project Name</th>
                    <th className="py-3.5 px-5">Category</th>
                    <th className="py-3.5 px-5">Tech Stack</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5">Last Updated</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c8c4d8]/30 text-xs">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#474555]">
                        No matching projects found.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-[#f1f3ff]/50 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#e9edff] overflow-hidden shrink-0 border border-[#c8c4d8]/40">
                              <img
                                alt={proj.title}
                                src={proj.thumbnail || proj.image}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-[#141b2b] text-sm block">
                                {proj.title}
                              </span>
                              <span className="text-[#474555] text-[11px]">
                                {proj.liveUrl ? proj.liveUrl.replace('https://', '') : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5 font-medium text-[#141b2b]">{proj.tag}</td>

                        <td className="py-4 px-5">
                          <div className="flex gap-1.5 flex-wrap">
                            {proj.technologies.slice(0, 3).map((tech, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-[#f9f9ff] border border-[#c8c4d8] text-[10px] text-[#141b2b]"
                              >
                                {tech}
                              </span>
                            ))}
                            {proj.technologies.length > 3 && (
                              <span className="text-[10px] text-[#474555] self-center">
                                +{proj.technologies.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              proj.status === 'published'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                proj.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            ></span>
                            <span>{proj.status === 'published' ? 'Published' : 'Draft'}</span>
                          </span>
                        </td>

                        <td className="py-4 px-5 text-[#474555]">{proj.lastUpdated}</td>

                        <td className="py-4 px-5 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => onTogglePublish(proj)}
                            className="p-1.5 text-[#422cd8] underline"
                          >
                            {proj.status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            type="button"
                            aria-label={'Move ' + proj.title + ' up'}
                            disabled={projects[0]?.id === proj.id}
                            onClick={() => onReorder(proj, -1)}
                            className="p-1.5 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label={'Move ' + proj.title + ' down'}
                            disabled={projects[projects.length - 1]?.id === proj.id}
                            onClick={() => onReorder(proj, 1)}
                            className="p-1.5 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => onPreviewProject(proj)}
                            title="Preview Page"
                            className="p-1.5 rounded hover:bg-[#e9edff] text-[#474555] hover:text-[#422cd8] transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenEditProject(proj)}
                            title="Edit Project"
                            className="p-1.5 rounded hover:bg-[#e9edff] text-[#474555] hover:text-[#422cd8] transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateProject(proj)}
                            title="Duplicate Entry"
                            className="p-1.5 rounded hover:bg-[#e9edff] text-[#474555] hover:text-[#141b2b] transition-colors cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDeleteProject(proj)}
                            title="Delete Entry"
                            className="p-1.5 rounded hover:bg-red-50 text-[#474555] hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#c8c4d8]/40 bg-white flex items-center justify-between text-xs text-[#474555]">
              <span>
                Showing {filteredProjects.length} of {projects.length} records
              </span>
              <span className="font-mono text-emerald-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Cloud Firestore</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
