import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Project } from '../types';
import { categories, slugify } from '../lib/validation';
import { MediaField } from './MediaField';
const labels: Record<Project['category'], string> = {
  website: 'Websites',
  webapp: 'Web Applications',
  poster: 'Posters',
  logo: 'Logos',
  automation: 'Automations',
  app: 'Apps',
};
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => Promise<void>;
  projectToEdit?: Project | null;
  nextOrder: number;
}
export function ProjectModal({ isOpen, onClose, onSave, projectToEdit, nextOrder }: Props) {
  const [data, setData] = useState<Project>(
    () =>
      projectToEdit || {
        id: '',
        slug: '',
        title: '',
        category: 'website',
        categoryLabel: 'Websites',
        tag: '',
        summary: '',
        technologies: [],
        role: '',
        status: 'draft',
        image: '',
        thumbnail: '',
        lastUpdated: '',
        order: nextOrder,
      },
  );
  const [tech, setTech] = useState(data.technologies.join(', '));
  const [solution, setSolution] = useState(data.solution?.join('\n') || '');
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [error, setError] = useState('');
  const change = (key: keyof Project, value: unknown) =>
    setData((prev) => ({ ...prev, [key]: value }));
  const uploadBusy = (value: boolean) => setUploads((n) => n + (value ? 1 : -1));
  const field = (
    key:
      | 'title'
      | 'slug'
      | 'summary'
      | 'role'
      | 'client'
      | 'timeline'
      | 'deliverables'
      | 'fullDescription'
      | 'challenge'
      | 'liveUrl',
    label: string,
    max = 500,
    multiline = false,
  ) => (
    <label className="block space-y-1" key={key}>
      <span className="font-semibold">{label}</span>
      {multiline ? (
        <textarea
          rows={4}
          maxLength={max}
          value={data[key] || ''}
          onChange={(e) => change(key, e.target.value)}
          className="w-full p-3 rounded-lg border border-[#c8c4d8]"
        />
      ) : (
        <input
          required={['title', 'slug', 'summary'].includes(key)}
          disabled={key === 'slug' && !!projectToEdit}
          type={key === 'liveUrl' ? 'url' : 'text'}
          maxLength={max}
          pattern={key === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined}
          value={data[key] || ''}
          onChange={(e) => {
            change(key, e.target.value);
            if (
              key === 'title' &&
              !projectToEdit &&
              (!data.slug || data.slug === slugify(data.title))
            )
              change('slug', slugify(e.target.value));
          }}
          className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8] disabled:bg-gray-100"
        />
      )}
    </label>
  );
  if (!isOpen) return null;
  return (
    <div
      id="modal-project-form"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-editor-title"
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#c8c4d8] shadow-2xl p-6 sm:p-8 my-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          type="button"
          aria-label="Close project editor"
          disabled={busy || uploads > 0}
          onClick={onClose}
          className="absolute right-6 top-6"
        >
          <X />
        </button>
        <h3 id="project-editor-title" className="text-xl sm:text-2xl font-bold mb-2">
          {projectToEdit ? 'Edit Project Entry' : 'Add Project Entry'}
        </h3>
        <p className="text-sm text-[#474555] mb-6">
          Add the project details you want visitors to see.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || uploads) return;
            setBusy(true);
            setError('');
            try {
              await onSave({
                ...data,
                id: data.slug,
                title: data.title.trim(),
                summary: data.summary.trim(),
                categoryLabel: labels[data.category],
                tag: labels[data.category],
                technologies: tech
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 30),
                solution: solution
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 30),
                thumbnail: data.thumbnail || data.image,
              });
              onClose();
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Could not save the project.');
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4 text-sm"
        >
          <fieldset disabled={busy} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('title', 'Project title', 120)}
              {field('slug', 'URL slug (fixed after creation)', 80)}
            </div>
            <label className="block space-y-1">
              <span className="font-semibold">Category</span>
              <select
                value={data.category}
                onChange={(e) => change('category', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {labels[c]}
                  </option>
                ))}
              </select>
            </label>
            {field('summary', 'Short summary', 600)}
            {field('fullDescription', 'Full description (optional)', 10000, true)}
            <label className="block space-y-1">
              <span className="font-semibold">Technologies (comma-separated)</span>
              <input
                maxLength={1500}
                value={tech}
                onChange={(e) => setTech(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8]"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field('liveUrl', 'Live URL (optional)', 2048)}
              {field('role', 'Your role (optional)', 200)}
              {field('client', 'Client (optional)', 200)}
              {field('timeline', 'Timeline (optional)', 200)}
            </div>
            {field('deliverables', 'Deliverables (optional)', 1000)}
            {field('challenge', 'Challenge (optional)', 10000, true)}
            <label className="block space-y-1">
              <span className="font-semibold">Solution (one item per line, optional)</span>
              <textarea
                rows={4}
                maxLength={10000}
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                className="w-full p-3 rounded-lg border border-[#c8c4d8]"
              />
            </label>
            <MediaField
              label="Project image"
              value={data.image}
              onChange={(value) => change('image', value)}
              onBusy={uploadBusy}
            />
            <MediaField
              label="Thumbnail (optional)"
              value={data.thumbnail}
              onChange={(value) => change('thumbnail', value)}
              onBusy={uploadBusy}
            />
            <MediaField
              label="Case study banner (optional)"
              value={data.bannerImage || ''}
              onChange={(value) => change('bannerImage', value)}
              onBusy={uploadBusy}
            />
            <label className="block space-y-1">
              <span className="font-semibold">Visibility</span>
              <select
                value={data.status}
                onChange={(e) => change('status', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8]"
              >
                <option value="draft">Private draft</option>
                <option value="published">Published publicly</option>
              </select>
            </label>
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            <div className="border-t border-[#c8c4d8]/40 pt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={uploads > 0}
                onClick={onClose}
                className="h-10 px-5 rounded-lg border border-[#c8c4d8]"
              >
                Cancel
              </button>
              <button
                disabled={uploads > 0}
                className="h-10 px-6 rounded-lg bg-[#5b4cf0] text-white font-semibold disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save Project Record'}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
