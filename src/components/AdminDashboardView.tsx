import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Edit2, Eye, FolderKanban, LayoutDashboard, LogOut, Mail, Menu, Plus, Search, Settings, Trash2, X } from 'lucide-react';
import type { Enquiry, Project, ViewMode } from '../types';
import { PROFILE_INFO } from '../data/initialData';
import { projectCover, projectTechnologies } from '../lib/projects';
import { CmsManager } from './CmsManager';

type Tab = 'dashboard' | 'projects' | 'enquiries' | 'manage' | 'media';
interface Props {
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
  onDeleteEnquiry: (enquiry: Enquiry) => Promise<void>;
}

const nav: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'enquiries', label: 'Enquiries', icon: Mail },
  { id: 'manage', label: 'Manage Website', icon: Settings },
  { id: 'media', label: 'Media / Cleanup Jobs', icon: Trash2 },
];

export const AdminDashboardView: React.FC<Props> = ({ projects, enquiries, onOpenAddProject, onOpenEditProject, onDuplicateProject, onOpenDeleteProject, onPreviewProject, onSwitchView, onTogglePublish, onReorder, onEnquiryStatus, onDeleteEnquiry }) => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Enquiry | null>(null);
  const [notice, setNotice] = useState('');
  const published = projects.filter((project) => project.status === 'published').length;
  const unread = enquiries.filter((enquiry) => enquiry.status === 'new').length;
  const filtered = projects.filter((project) => {
    const query = search.toLowerCase();
    return project.title.toLowerCase().includes(query) || project.categoryLabel.toLowerCase().includes(query) || projectTechnologies(project).some((item) => item.toLowerCase().includes(query));
  });
  const choose = (tab: Tab) => { setActiveTab(tab); setDrawerOpen(false); };

  const sidebar = <>
    <div>
      <div className="flex items-center justify-between gap-3 px-2 py-2 mb-4">
        <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-[#5b4cf0]/10 flex items-center justify-center text-[#422cd8] font-bold text-sm">{PROFILE_INFO.initials}</div><div><h2 className="text-sm font-bold">{PROFILE_INFO.shortName}</h2><p className="text-xs text-[#474555]">Administrator</p></div></div>
        <button type="button" aria-label="Close admin navigation" onClick={() => setDrawerOpen(false)} className="md:hidden h-11 w-11 flex items-center justify-center"><X /></button>
      </div>
      <nav aria-label="Admin navigation" className="space-y-1">
        {nav.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => choose(id)} className={`${activeTab === id ? 'bg-[#5b4cf0]/10 text-[#422cd8] font-semibold' : 'text-[#474555] hover:bg-[#f1f3ff]'} min-h-11 w-full rounded-lg px-3 flex items-center gap-2.5 text-sm text-left`}><Icon className="w-4 h-4" /><span>{label}</span>{id === 'enquiries' && unread > 0 && <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-[#5b4cf0] text-white text-[11px] flex items-center justify-center" aria-label={`${unread} new enquiries`}>{unread}</span>}</button>)}
      </nav>
    </div>
    <div className="border-t border-[#c8c4d8]/50 pt-3 space-y-1"><button type="button" onClick={() => onSwitchView('public')} className="min-h-11 w-full flex items-center gap-2.5 px-3 text-sm text-[#474555]"><ArrowLeft className="w-4 h-4" />View public site</button><button type="button" onClick={() => onSwitchView('admin-login')} className="min-h-11 w-full flex items-center gap-2.5 px-3 text-sm text-red-700"><LogOut className="w-4 h-4" />Sign out</button></div>
  </>;

  return <div id="view-admin-dashboard" className="min-h-screen bg-[#f1f3ff] flex">
    <aside className="hidden md:flex md:sticky md:top-0 md:h-screen w-[232px] bg-white border-r border-[#c8c4d8]/50 flex-col justify-between shrink-0 p-4">{sidebar}</aside>
    {drawerOpen && <div className="fixed inset-0 z-50 md:hidden"><button type="button" aria-label="Close admin navigation overlay" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/45" /><aside role="dialog" aria-modal="true" aria-label="Admin navigation" className="absolute inset-y-0 left-0 w-[min(86vw,300px)] bg-white p-4 flex flex-col justify-between shadow-2xl">{sidebar}</aside></div>}
    <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1240px] mx-auto space-y-6">
        <header className="flex items-center gap-3"><button type="button" aria-label="Open admin navigation" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)} className="md:hidden h-11 w-11 flex items-center justify-center rounded-lg border border-[#c8c4d8] bg-white"><Menu /></button><div><h1 className="text-xl sm:text-2xl font-bold">{nav.find((item) => item.id === activeTab)?.label}</h1><p className="text-sm text-[#474555]">Manage the published portfolio and protected CMS.</p></div></header>
        {notice && <p role="status" className="rounded-lg bg-white border border-[#c8c4d8] px-4 py-3 text-sm">{notice}</p>}
        {activeTab === 'dashboard' && <Dashboard projects={projects} enquiries={enquiries} onChoose={choose} />}
        {activeTab === 'projects' && <Projects projects={projects} filtered={filtered} search={search} setSearch={setSearch} onAdd={onOpenAddProject} onEdit={onOpenEditProject} onDuplicate={onDuplicateProject} onDelete={onOpenDeleteProject} onPreview={onPreviewProject} onToggle={onTogglePublish} onReorder={onReorder} />}
        {activeTab === 'enquiries' && <Enquiries enquiries={enquiries} onStatus={onEnquiryStatus} onDelete={setDeleteTarget} />}
        {activeTab === 'manage' && <CmsManager area="manage" />}
        {activeTab === 'media' && <CmsManager area="media" />}
      </div>
    </main>
    {deleteTarget && <EnquiryDeleteDialog enquiry={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => { await onDeleteEnquiry(deleteTarget); setNotice('Enquiry permanently deleted.'); setDeleteTarget(null); }} />}
  </div>;
};

function Dashboard({ projects, enquiries, onChoose }: { projects: Project[]; enquiries: Enquiry[]; onChoose: (tab: Tab) => void }) {
  const items = [{ label: 'Total projects', value: projects.length, tab: 'projects' as Tab }, { label: 'Published', value: projects.filter((item) => item.status === 'published').length, tab: 'projects' as Tab }, { label: 'Drafts', value: projects.filter((item) => item.status === 'draft').length, tab: 'projects' as Tab }, { label: 'New enquiries', value: enquiries.filter((item) => item.status === 'new').length, tab: 'enquiries' as Tab }];
  return <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{items.map((item) => <button key={item.label} type="button" onClick={() => onChoose(item.tab)} className="bg-white rounded-xl border border-[#c8c4d8] p-4 text-left min-h-28 hover:border-[#5b4cf0]"><span className="text-sm text-[#474555]">{item.label}</span><strong className="block mt-2 text-3xl">{item.value}</strong></button>)}</div>;
}

function Projects({ projects, filtered, search, setSearch, onAdd, onEdit, onDuplicate, onDelete, onPreview, onToggle, onReorder }: { projects: Project[]; filtered: Project[]; search: string; setSearch: (value: string) => void; onAdd: () => void; onEdit: (project: Project) => void; onDuplicate: (project: Project) => void; onDelete: (project: Project) => void; onPreview: (project: Project) => void; onToggle: (project: Project) => void; onReorder: (project: Project, direction: -1|1) => void }) {
  return <section className="bg-white rounded-xl border border-[#c8c4d8] overflow-hidden"><div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-[#777587]" /><input aria-label="Search projects" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects" className="h-10 w-full sm:w-64 pl-9 pr-3 rounded-lg border border-[#c8c4d8]" /></div><button type="button" onClick={onAdd} className="min-h-11 px-4 rounded-lg bg-[#5b4cf0] text-white font-semibold flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Add Project</button></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#f1f3ff] text-xs uppercase text-[#474555]"><tr><th className="p-3">Project</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#c8c4d8]/40">{filtered.map((project) => { const cover=projectCover(project); return <tr key={project.id}><td className="p-3"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-lg bg-[#f1f3f5] overflow-hidden shrink-0">{cover && <img src={cover.url} alt="" className="w-full h-full object-contain" />}</div><div><strong>{project.title}</strong><p className="text-xs text-[#474555]">{project.gallery.length} {project.gallery.length === 1 ? 'image' : 'images'}</p></div></div></td><td className="p-3">{project.categoryLabel}</td><td className="p-3">{project.status === 'published' ? 'Published' : 'Draft'}</td><td className="p-3 text-[#474555]">{project.lastUpdated}</td><td className="p-3"><div className="flex justify-end items-center gap-1"><button type="button" onClick={() => onToggle(project)} className="min-h-11 px-2 text-[#422cd8] underline">{project.status === 'published' ? 'Unpublish' : 'Publish'}</button><button type="button" aria-label={`Move ${project.title} up`} disabled={projects[0]?.id === project.id} onClick={() => onReorder(project,-1)} className="h-11 w-9 disabled:opacity-30">↑</button><button type="button" aria-label={`Move ${project.title} down`} disabled={projects.at(-1)?.id === project.id} onClick={() => onReorder(project,1)} className="h-11 w-9 disabled:opacity-30">↓</button><IconButton label="Preview Project" onClick={() => onPreview(project)}><Eye /></IconButton><IconButton label="Edit Project" onClick={() => onEdit(project)}><Edit2 /></IconButton><IconButton label="Duplicate Project" onClick={() => onDuplicate(project)}><Copy /></IconButton><IconButton label="Delete Project" danger onClick={() => onDelete(project)}><Trash2 /></IconButton></div></td></tr>; })}{!filtered.length && <tr><td colSpan={5} className="p-8 text-center text-[#474555]">No matching projects.</td></tr>}</tbody></table></div></section>;
}

function Enquiries({ enquiries, onStatus, onDelete }: { enquiries: Enquiry[]; onStatus: (id: string, status: Enquiry['status']) => void; onDelete: (enquiry: Enquiry) => void }) {
  if (!enquiries.length) return <div className="rounded-xl border border-[#c8c4d8] bg-white p-10 text-center text-[#474555]">No enquiries yet.</div>;
  return <div className="space-y-3">{enquiries.map((enquiry) => <article key={enquiry.id} className="rounded-xl border border-[#c8c4d8] bg-white p-4 space-y-3"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{enquiry.fullName}</h2><a className="text-sm text-[#422cd8]" href={`mailto:${encodeURIComponent(enquiry.email)}`}>{enquiry.email}</a><p className="text-xs text-[#474555]">{enquiry.createdAt}</p></div><div className="flex items-center gap-2"><label className="text-sm">Status <select value={enquiry.status} onChange={(event) => onStatus(enquiry.id,event.target.value as Enquiry['status'])} className="h-10 ml-1 border rounded-lg px-2"><option value="new">New</option><option value="read">Read</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label><IconButton label={`Delete enquiry from ${enquiry.fullName}`} danger onClick={() => onDelete(enquiry)}><Trash2 /></IconButton></div></div><p className="rounded-lg bg-[#f1f3ff] p-3 text-sm whitespace-pre-wrap">{enquiry.description}</p></article>)}</div>;
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactElement<{ className?: string }> }) { return <button type="button" aria-label={label} title={label} onClick={onClick} className={`${danger ? 'text-red-700 hover:bg-red-50' : 'text-[#474555] hover:bg-[#f1f3ff]'} h-11 w-11 rounded-lg flex items-center justify-center`}>{React.cloneElement(children,{className:'w-4 h-4'})}</button>; }

function EnquiryDeleteDialog({ enquiry, onClose, onConfirm }: { enquiry: Enquiry; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const cancel=useRef<HTMLButtonElement>(null);
  useEffect(()=>{cancel.current?.focus()},[]);
  return <div className="fixed inset-0 z-[80] bg-black/50 p-4 flex items-center justify-center"><div role="alertdialog" aria-modal="true" aria-labelledby="delete-enquiry-title" aria-describedby="delete-enquiry-copy" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 id="delete-enquiry-title" className="text-lg font-bold">Permanently delete enquiry?</h2><p id="delete-enquiry-copy" className="mt-2 text-sm text-[#474555]">Delete the enquiry from {enquiry.fullName} received {enquiry.createdAt || 'on an unknown date'}? This cannot be undone. The audit log will not retain the message content.</p>{error && <p role="alert" className="mt-3 text-sm text-red-700">The enquiry could not be deleted. Check your connection and try again.</p>}<div className="mt-5 flex justify-end gap-3"><button ref={cancel} type="button" disabled={busy} onClick={onClose} className="min-h-11 px-4 rounded-lg border border-[#c8c4d8]">Cancel</button><button type="button" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);setError('');try{await onConfirm()}catch{setError('failed');setBusy(false)}}} className="min-h-11 px-4 rounded-lg bg-red-700 text-white disabled:opacity-50">{busy?'Deleting...':'Delete permanently'}</button></div></div></div>;
}
