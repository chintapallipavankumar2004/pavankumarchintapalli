import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import type { Project, ProjectCategory, ProjectGalleryItem } from '../types';
import { categories, slugify } from '../lib/validation';
import { MediaField } from './MediaField';
import { PROJECT_CATEGORIES, normalizeProject, sanitizeCategoryFields } from '../lib/projects';
import { deleteMedia } from '../lib/uploads';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => Promise<void>;
  projectToEdit?: Project | null;
  nextOrder: number;
}

const blankProject = (nextOrder: number): Project => normalizeProject({
  id: '', slug: '', title: '', category: 'website', categoryLabel: 'Websites', tag: 'Websites',
  summary: '', role: '', status: 'draft', order: nextOrder, lastUpdated: '', categoryFields: {},
  gallery: [], coverImageId: '', mediaIds: [], schemaVersion: 2,
});

const newGalleryItem = (order: number): ProjectGalleryItem => ({
  id: crypto.randomUUID(), url: '', alt: '', order, ownership: 'external',
});

export function ProjectModal({ isOpen, onClose, onSave, projectToEdit, nextOrder }: Props) {
  const initial = useMemo(() => projectToEdit ? normalizeProject(projectToEdit as Project & Record<string, unknown>) : blankProject(nextOrder), [projectToEdit, nextOrder]);
  const [data, setData] = useState<Project>(() => ({ ...initial, gallery: initial.gallery.length ? initial.gallery : [newGalleryItem(0)] }));
  const [solution, setSolution] = useState(data.solution?.join('\n') || '');
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const uploadedMediaIds = useRef(new Set<string>());
  const committed = useRef(false);
  const cleanupUploads = (retained = new Set<string>()) => Promise.allSettled([...uploadedMediaIds.current].filter((id) => !retained.has(id)).map((id) => deleteMedia(id)));
  const requestClose = () => {
    if (!committed.current) void cleanupUploads();
    onClose();
  };

  useEffect(() => {
    const node = dialog.current;
    node?.querySelector<HTMLElement>('button, input, select, textarea')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy && !uploads) requestClose();
      if (event.key !== 'Tab' || !node) return;
      const focusable = [...node.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [busy, uploads, onClose]);

  const change = <K extends keyof Project>(key: K, value: Project[K]) => setData((previous) => ({ ...previous, [key]: value }));
  const uploadBusy = (value: boolean) => setUploads((count) => Math.max(0, count + (value ? 1 : -1)));
  const updateGallery = (id: string, values: Partial<ProjectGalleryItem>) => setData((previous) => ({ ...previous, gallery: previous.gallery.map((item) => item.id === id ? { ...item, ...values } : item) }));
  const orderedGallery = data.gallery.map((item, order) => ({ ...item, order }));

  const textField = (key: 'title'|'slug'|'summary'|'role'|'client'|'timeline'|'deliverables'|'fullDescription'|'challenge', label: string, max = 500, multiline = false) => (
    <label className="block space-y-1" key={key}>
      <span className="font-semibold">{label}</span>
      {multiline ? <textarea rows={3} maxLength={max} value={data[key] || ''} onChange={(event) => change(key, event.target.value)} className="w-full p-3 rounded-lg border border-[#c8c4d8]" /> :
        <input required={['title','slug','summary'].includes(key)} disabled={key === 'slug' && !!projectToEdit} maxLength={max} pattern={key === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined} value={data[key] || ''} onChange={(event) => {
          change(key, event.target.value);
          if (key === 'title' && !projectToEdit && (!data.slug || data.slug === slugify(data.title))) change('slug', slugify(event.target.value));
        }} className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8] disabled:bg-gray-100" />}
    </label>
  );

  const categoryField = (definition: (typeof PROJECT_CATEGORIES)[ProjectCategory]['fields'][number]) => {
    const value = data.categoryFields[definition.key] || (definition.kind === 'list' ? [] : '');
    const setValue = (next: string | string[]) => change('categoryFields', { ...data.categoryFields, [definition.key]: next });
    return <label className="block space-y-1" key={definition.key}>
      <span className="font-semibold">{definition.label}</span>
      {definition.kind === 'textarea' ? <textarea rows={3} maxLength={2000} value={String(value)} onChange={(event) => setValue(event.target.value)} className="w-full p-3 rounded-lg border border-[#c8c4d8]" /> :
       definition.kind === 'select' ? <select value={String(value)} onChange={(event) => setValue(event.target.value)} className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8]"><option value="">Choose...</option>{definition.options?.map((option) => <option key={option}>{option}</option>)}</select> :
       definition.kind === 'list' ? <textarea rows={2} value={Array.isArray(value) ? value.join('\n') : String(value)} onChange={(event) => setValue(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, definition.max || 30))} placeholder="One item per line" className="w-full p-3 rounded-lg border border-[#c8c4d8]" /> :
       <input type={definition.kind === 'url' ? 'url' : 'text'} maxLength={definition.kind === 'url' ? 2048 : 500} value={String(value)} onChange={(event) => setValue(event.target.value)} className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8]" />}
    </label>;
  };

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
    <div ref={dialog} id="modal-project-form" role="dialog" aria-modal="true" aria-labelledby="project-editor-title" className="w-full max-w-3xl bg-white rounded-2xl border border-[#c8c4d8] shadow-2xl p-4 sm:p-6 my-6 relative max-h-[94vh] overflow-y-auto custom-scrollbar">
      <button type="button" aria-label="Close project editor" disabled={busy || uploads > 0} onClick={requestClose} className="absolute right-4 top-4 h-11 w-11 flex items-center justify-center rounded-lg hover:bg-[#f1f3ff]"><X /></button>
      <h3 id="project-editor-title" className="text-xl font-bold mb-1">{projectToEdit ? 'Edit Project' : 'Add Project'}</h3>
      <p className="text-sm text-[#474555] mb-5">Fields update to match the selected category. Gallery images are displayed without cropping.</p>
      <form onSubmit={async (event) => {
        event.preventDefault(); if (busy || uploads) return; setBusy(true); setError('');
        try {
          const gallery = orderedGallery.filter((item) => item.url.trim());
          const project = normalizeProject({ ...data, id: data.slug, title: data.title.trim(), summary: data.summary.trim(), categoryLabel: PROJECT_CATEGORIES[data.category].label, tag: PROJECT_CATEGORIES[data.category].label, categoryFields: sanitizeCategoryFields(data.category, data.categoryFields), gallery, coverImageId: gallery.some((item) => item.id === data.coverImageId) ? data.coverImageId : gallery[0]?.id || '', solution: solution.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 30) } as Project & Record<string, unknown>);
          await onSave(project);
          await cleanupUploads(new Set(project.mediaIds));
          committed.current = true;
          onClose();
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the project.'); }
        finally { setBusy(false); }
      }} className="space-y-4 text-sm">
        <fieldset disabled={busy} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">{textField('title','Project title',120)}{textField('slug','URL slug (fixed after creation)',80)}</div>
          <label className="block space-y-1"><span className="font-semibold">Category</span><select value={data.category} onChange={(event) => {
            const category = event.target.value as ProjectCategory;
            if (category === data.category) return;
            if (Object.keys(data.categoryFields).length && !window.confirm('Changing category clears fields that do not apply. Common project details and gallery images will be kept. Continue?')) return;
            setData((previous) => ({ ...previous, category, categoryLabel: PROJECT_CATEGORIES[category].label, tag: PROJECT_CATEGORIES[category].label, categoryFields: sanitizeCategoryFields(category, previous.categoryFields) }));
          }} className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8]">{categories.map((category) => <option key={category} value={category}>{PROJECT_CATEGORIES[category].label}</option>)}</select></label>
          {textField('summary','Short summary',600)}
          {textField('fullDescription','Full description',10000,true)}
          <div className="grid sm:grid-cols-2 gap-4">{textField('client','Client',200)}{textField('role','Role',200)}{textField('timeline','Timeline',200)}{textField('deliverables','Deliverables',1000)}</div>
          {textField('challenge','Challenge',10000,true)}
          <label className="block space-y-1"><span className="font-semibold">Solution (one item per line)</span><textarea rows={3} maxLength={10000} value={solution} onChange={(event) => setSolution(event.target.value)} className="w-full p-3 rounded-lg border border-[#c8c4d8]" /></label>

          <section aria-labelledby="gallery-title" className="space-y-3 border-t border-[#c8c4d8]/60 pt-4">
            <div className="flex items-center justify-between gap-3"><div><h4 id="gallery-title" className="font-bold text-base">Gallery</h4><p className="text-xs text-[#474555]">1-5 images. {PROJECT_CATEGORIES[data.category].guidance}; this is guidance, not a reason to stretch an image.</p></div><button type="button" disabled={data.gallery.length >= 5} onClick={() => setData((previous) => ({ ...previous, gallery: [...previous.gallery, newGalleryItem(previous.gallery.length)] }))} className="min-h-11 px-3 rounded-lg border border-[#c8c4d8] flex items-center gap-2 disabled:opacity-40"><Plus className="w-4 h-4" /> Add image</button></div>
            {orderedGallery.map((item, index) => <article key={item.id} className="rounded-xl border border-[#c8c4d8] bg-[#f9f9ff] p-3 space-y-3">
              <div className="flex items-center justify-between"><strong>Image {index + 1}</strong><div className="flex gap-1"><button type="button" aria-label={`Move image ${index + 1} up`} disabled={!index} onClick={() => setData((previous) => { const gallery=[...previous.gallery]; [gallery[index-1],gallery[index]]=[gallery[index],gallery[index-1]]; return {...previous,gallery}; })} className="h-11 w-11 flex items-center justify-center"><ChevronUp /></button><button type="button" aria-label={`Move image ${index + 1} down`} disabled={index === data.gallery.length - 1} onClick={() => setData((previous) => { const gallery=[...previous.gallery]; [gallery[index],gallery[index+1]]=[gallery[index+1],gallery[index]]; return {...previous,gallery}; })} className="h-11 w-11 flex items-center justify-center"><ChevronDown /></button><button type="button" aria-label={`Remove image ${index + 1}`} disabled={data.gallery.length <= 1} onClick={() => { if (!window.confirm(`Remove image ${index + 1} from this project? The project must still be saved before managed media cleanup can run.`)) return; setData((previous) => ({ ...previous, gallery: previous.gallery.filter((entry) => entry.id !== item.id), coverImageId: previous.coverImageId === item.id ? previous.gallery.find((entry) => entry.id !== item.id)?.id || '' : previous.coverImageId })); }} className="h-11 w-11 text-red-700 flex items-center justify-center"><Trash2 /></button></div></div>
              <MediaField label={`Image ${index + 1} URL or upload`} value={item.url} category={data.category} onChange={(url) => updateGallery(item.id, url === item.url ? { url } : { url, ownership: 'external', mediaId: undefined, publicId: undefined })} onUploaded={(asset) => { uploadedMediaIds.current.add(asset.id); updateGallery(item.id, { url: asset.secureUrl, mediaId: asset.id, publicId: asset.publicId, ownership: 'cloudinary-managed' }); }} onBusy={uploadBusy} />
              <div className="grid sm:grid-cols-2 gap-3"><label className="space-y-1"><span className="font-semibold">Alt text</span><input required maxLength={300} value={item.alt} onChange={(event) => updateGallery(item.id, { alt: event.target.value })} className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8] bg-white" /></label><label className="space-y-1"><span className="font-semibold">Caption (optional)</span><input maxLength={500} value={item.caption || ''} onChange={(event) => updateGallery(item.id, { caption: event.target.value })} className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8] bg-white" /></label></div>
              <label className="inline-flex items-center gap-2"><input type="radio" name="cover" checked={data.coverImageId === item.id || (!data.coverImageId && index === 0)} onChange={() => change('coverImageId', item.id)} /> Use as cover image</label>
            </article>)}
          </section>

          <section className="space-y-3 border-t border-[#c8c4d8]/60 pt-4"><h4 className="font-bold text-base">{PROJECT_CATEGORIES[data.category].label} details</h4><div className="grid sm:grid-cols-2 gap-4">{PROJECT_CATEGORIES[data.category].fields.map(categoryField)}</div></section>
          <label className="block space-y-1"><span className="font-semibold">Visibility</span><select value={data.status} onChange={(event) => change('status', event.target.value as Project['status'])} className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8]"><option value="draft">Private draft</option><option value="published">Published publicly</option></select></label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <div className="border-t border-[#c8c4d8]/40 pt-4 flex justify-end gap-3"><button type="button" disabled={uploads > 0} onClick={requestClose} className="min-h-11 px-5 rounded-lg border border-[#c8c4d8]">Cancel</button><button disabled={uploads > 0} className="min-h-11 px-6 rounded-lg bg-[#5b4cf0] text-white font-semibold disabled:opacity-50">{busy ? 'Saving...' : 'Save Project'}</button></div>
        </fieldset>
      </form>
    </div>
  </div>;
}
