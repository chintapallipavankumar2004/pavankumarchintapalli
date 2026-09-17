import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Plus, Trash2, X } from 'lucide-react';
import type {
  CategoryItem,
  Project,
  ProjectCategoryFieldDefinition,
  ProjectCategoryFieldType,
} from '../types';
import { normalizeCategory, validateCategory } from '../lib/categories';
import { slugify } from '../lib/validation';
import * as repository from '../lib/repository';

const input = 'h-10 w-full rounded-lg border border-[#c8c4d8] bg-white px-3';
const blank = (order: number): CategoryItem => ({
  id: '',
  name: '',
  slug: '',
  description: '',
  order,
  published: false,
  enabled: true,
  mediaConfig: {
    defaultRatio: '16:9',
    recommendedWidth: 1280,
    recommendedHeight: 720,
    guidance: 'Recommended 1280 × 720 px',
    defaultFit: 'contain',
  },
  fields: [],
  schemaVersion: 2,
});
const newField = (): ProjectCategoryFieldDefinition => ({
  key: '',
  label: '',
  type: 'text',
  required: false,
});
const fieldTypes: Array<{ value: ProjectCategoryFieldType; label: string }> = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'url', label: 'URL' },
  { value: 'list', label: 'List — one item per line' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
];

export function ProjectCategoriesManager({
  projects,
  categories,
}: {
  projects: Project[];
  categories: CategoryItem[];
}) {
  const [edit, setEdit] = useState<CategoryItem | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const value = edit;
  const counts = useMemo(
    () =>
      Object.fromEntries(
        categories.map((category) => [
          category.id,
          projects.filter((project) => project.category === category.id).length,
        ]),
      ),
    [categories, projects],
  );
  const act = async (key: string, operation: () => Promise<unknown>, success: string) => {
    if (busy) return false;
    setBusy(key);
    setMessage('');
    try {
      await operation();
      setMessage(success);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The category action failed.');
      return false;
    } finally {
      setBusy('');
    }
  };
  const update = (next: Partial<CategoryItem>) =>
    setEdit((current) => (current === undefined ? current : { ...current, ...next }));
  const updateField = (index: number, next: Partial<ProjectCategoryFieldDefinition>) => {
    if (!value) return;
    const fields = value.fields.map((field, position) =>
      position === index ? { ...field, ...next } : field,
    );
    update({ fields });
  };
  const moveField = (index: number, direction: -1 | 1) => {
    if (!value) return;
    const fields = [...value.fields];
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    update({ fields });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Project categories</h3>
          <p className="text-sm text-[#474555]">
            Create project types and their form fields without changing application code.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCreating(true);
            setEdit(blank(categories.length));
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#5b4cf0] px-4 font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>
      {message && (
        <p role="status" className="rounded-lg border border-[#c8c4d8] bg-white px-3 py-2 text-sm">
          {message}
        </p>
      )}
      {value !== undefined && (
        <form
          className="space-y-4 rounded-xl border border-[#c8c4d8] bg-[#f9f9ff] p-4"
          onSubmit={(event) => {
            event.preventDefault();
            let category: CategoryItem;
            try {
              category = validateCategory({
                ...value,
                id: value.id || slugify(value.name),
                slug: value.id || slugify(value.name),
                order: Number(value.order),
              });
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Check the category fields.');
              return;
            }
            void act(
              `save:${category.id}`,
              () => repository.saveProjectCategory(category, isCreating),
              isCreating ? 'Category created.' : 'Category updated.',
            ).then((saved) => {
              if (saved) {
                setEdit(undefined);
                setIsCreating(false);
              }
            });
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold">{isCreating ? 'Add category' : `Edit ${value.name}`}</h4>
              <p className="text-xs text-[#474555]">
                The category ID is permanent after creation because projects reference it.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close category editor"
              onClick={() => {
                setEdit(undefined);
                setIsCreating(false);
              }}
              className="flex h-11 w-11 items-center justify-center"
            >
              <X />
            </button>
          </div>
          <fieldset disabled={!!busy} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Category name</span>
                <input
                  required
                  maxLength={80}
                  className={input}
                  value={value.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    update({
                      name,
                      ...(isCreating ? { id: slugify(name), slug: slugify(name) } : {}),
                    });
                  }}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Category ID / slug</span>
                <input
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  maxLength={60}
                  disabled={!isCreating}
                  className={`${input} disabled:bg-gray-100`}
                  value={value.id}
                  onChange={(event) => update({ id: event.target.value, slug: event.target.value })}
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">Short description</span>
              <textarea
                maxLength={300}
                className="min-h-20 w-full rounded-lg border border-[#c8c4d8] bg-white p-3"
                value={value.description}
                onChange={(event) => update({ description: event.target.value })}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Default image ratio</span>
                <select
                  className={input}
                  value={value.mediaConfig.defaultRatio}
                  onChange={(event) =>
                    update({
                      mediaConfig: {
                        ...value.mediaConfig,
                        defaultRatio: event.target
                          .value as CategoryItem['mediaConfig']['defaultRatio'],
                      },
                    })
                  }
                >
                  <option value="original">Original</option>
                  {['1:1', '4:5', '4:3', '3:2', '16:9', '9:16'].map((ratio) => (
                    <option key={ratio}>{ratio}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Recommended width</span>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  className={input}
                  value={value.mediaConfig.recommendedWidth || ''}
                  onChange={(event) =>
                    update({
                      mediaConfig: {
                        ...value.mediaConfig,
                        recommendedWidth: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      },
                    })
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Recommended height</span>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  className={input}
                  value={value.mediaConfig.recommendedHeight || ''}
                  onChange={(event) =>
                    update({
                      mediaConfig: {
                        ...value.mediaConfig,
                        recommendedHeight: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      },
                    })
                  }
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Image guidance</span>
                <input
                  maxLength={200}
                  className={input}
                  value={value.mediaConfig.guidance}
                  onChange={(event) =>
                    update({ mediaConfig: { ...value.mediaConfig, guidance: event.target.value } })
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-semibold">Default image fitting</span>
                <select
                  className={input}
                  value={value.mediaConfig.defaultFit}
                  onChange={(event) =>
                    update({
                      mediaConfig: {
                        ...value.mediaConfig,
                        defaultFit: event.target.value as CategoryItem['mediaConfig']['defaultFit'],
                      },
                    })
                  }
                >
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                </select>
              </label>
            </div>
            <div className="space-y-3 border-t border-[#c8c4d8]/60 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold">Project detail fields</h5>
                  <p className="text-xs text-[#474555]">
                    Fields appear dynamically in Add/Edit Project in this order.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={value.fields.length >= 20}
                  onClick={() => update({ fields: [...value.fields, newField()] })}
                  className="min-h-11 rounded-lg border border-[#c8c4d8] bg-white px-3 text-sm font-semibold"
                >
                  Add field
                </button>
              </div>
              {value.fields.map((field, index) => (
                <article
                  key={index}
                  className="space-y-3 rounded-lg border border-[#c8c4d8] bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-sm">Field {index + 1}</strong>
                    <div className="flex">
                      <button
                        type="button"
                        aria-label={`Move field ${index + 1} up`}
                        disabled={!index}
                        onClick={() => moveField(index, -1)}
                        className="h-11 w-10 disabled:opacity-30"
                      >
                        <ChevronUp />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move field ${index + 1} down`}
                        disabled={index === value.fields.length - 1}
                        onClick={() => moveField(index, 1)}
                        className="h-11 w-10 disabled:opacity-30"
                      >
                        <ChevronDown />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove field ${index + 1}`}
                        onClick={() =>
                          update({
                            fields: value.fields.filter((_, position) => position !== index),
                          })
                        }
                        className="h-11 w-10 text-red-700"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">Field key</span>
                      <input
                        required
                        pattern="[a-z][A-Za-z0-9]*"
                        className={input}
                        value={field.key}
                        onChange={(event) => updateField(index, { key: event.target.value })}
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">Display label</span>
                      <input
                        required
                        className={input}
                        value={field.label}
                        onChange={(event) => updateField(index, { label: event.target.value })}
                      />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">Field type</span>
                      <select
                        className={input}
                        value={field.type}
                        onChange={(event) =>
                          updateField(index, {
                            type: event.target.value as ProjectCategoryFieldType,
                            options: ['select', 'multiselect'].includes(event.target.value)
                              ? field.options || ['Option 1']
                              : undefined,
                          })
                        }
                      >
                        {fieldTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="font-semibold">Placeholder (optional)</span>
                      <input
                        maxLength={120}
                        className={input}
                        value={field.placeholder || ''}
                        onChange={(event) =>
                          updateField(index, { placeholder: event.target.value })
                        }
                      />
                    </label>
                    <label className="flex min-h-11 items-center gap-2 self-end text-sm">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) => updateField(index, { required: event.target.checked })}
                      />
                      Required
                    </label>
                  </div>
                  {['select', 'multiselect'].includes(field.type) && (
                    <label className="block space-y-1 text-sm">
                      <span className="font-semibold">Options — one per line</span>
                      <textarea
                        required
                        className="min-h-20 w-full rounded-lg border border-[#c8c4d8] p-3"
                        value={(field.options || []).join('\n')}
                        onChange={(event) =>
                          updateField(index, {
                            options: event.target.value
                              .split('\n')
                              .map((option) => option.trim())
                              .filter(Boolean)
                              .slice(0, 20),
                          })
                        }
                      />
                    </label>
                  )}
                </article>
              ))}
            </div>
            <div className="space-y-3 border-t border-[#c8c4d8]/60 pt-4">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!value.cta}
                  onChange={(event) =>
                    update({
                      cta: event.target.checked
                        ? {
                            label: 'View',
                            urlField: value.fields.find((field) => field.type === 'url')?.key || '',
                          }
                        : undefined,
                    })
                  }
                />
                Show an external project CTA
              </label>
              {value.cta && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">CTA label</span>
                    <input
                      required
                      className={input}
                      value={value.cta.label}
                      onChange={(event) =>
                        update({ cta: { ...value.cta!, label: event.target.value } })
                      }
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-semibold">CTA URL field</span>
                    <select
                      required
                      className={input}
                      value={value.cta.urlField}
                      onChange={(event) =>
                        update({ cta: { ...value.cta!, urlField: event.target.value } })
                      }
                    >
                      <option value="">Choose URL field</option>
                      {value.fields
                        .filter((field) => field.type === 'url')
                        .map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label || field.key}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4 border-t border-[#c8c4d8]/60 pt-4">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={value.enabled}
                  onChange={(event) => update({ enabled: event.target.checked })}
                />
                Enabled for project forms
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={value.published}
                  onChange={(event) => update({ published: event.target.checked })}
                />
                Published in public filters
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEdit(undefined);
                  setIsCreating(false);
                }}
                className="min-h-11 rounded-lg border border-[#c8c4d8] px-4"
              >
                Cancel
              </button>
              <button
                disabled={!!busy}
                className="min-h-11 rounded-lg bg-[#5b4cf0] px-5 font-semibold text-white disabled:opacity-50"
              >
                {busy.startsWith('save:') ? 'Saving...' : 'Save category'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <div className="overflow-x-auto rounded-xl border border-[#c8c4d8] bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#f1f3ff] text-xs uppercase text-[#474555]">
            <tr>
              <th className="p-3">Category</th>
              <th className="p-3">Status</th>
              <th className="p-3">Projects using it</th>
              <th className="p-3">Order</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c8c4d8]/40">
            {categories.map((category, index) => (
              <tr key={category.id}>
                <td className="p-3">
                  <strong>{category.name}</strong>
                  <p className="text-xs text-[#474555]">
                    {category.id} · {category.fields.length} fields
                  </p>
                </td>
                <td className="p-3">
                  <span>{category.enabled ? 'Enabled' : 'Disabled'}</span> ·{' '}
                  <span>{category.published ? 'Published' : 'Unpublished'}</span>
                </td>
                <td className="p-3">{counts[category.id] || 0}</td>
                <td className="p-3">{category.order}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      disabled={!!busy || !index}
                      aria-label={`Move ${category.name} up`}
                      onClick={() =>
                        void act(
                          `reorder:${category.id}`,
                          () => repository.reorderProjectCategory(category.id, -1),
                          'Category order updated.',
                        )
                      }
                      className="h-11 w-10 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={!!busy || index === categories.length - 1}
                      aria-label={`Move ${category.name} down`}
                      onClick={() =>
                        void act(
                          `reorder:${category.id}`,
                          () => repository.reorderProjectCategory(category.id, 1),
                          'Category order updated.',
                        )
                      }
                      className="h-11 w-10 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => {
                        setIsCreating(false);
                        setEdit(normalizeCategory(category, category.id));
                      }}
                      className="h-11 w-10"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Edit2 />
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() =>
                        void act(
                          `enabled:${category.id}`,
                          () =>
                            repository.setProjectCategoryState(
                              category.id,
                              category.enabled ? 'disable' : 'enable',
                            ),
                          `Category ${category.enabled ? 'disabled' : 'enabled'}.`,
                        )
                      }
                      className="min-h-11 px-2 underline"
                    >
                      {category.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() =>
                        void act(
                          `published:${category.id}`,
                          () =>
                            repository.setProjectCategoryState(
                              category.id,
                              category.published ? 'unpublish' : 'publish',
                            ),
                          `Category ${category.published ? 'unpublished' : 'published'}.`,
                        )
                      }
                      className="min-h-11 px-2 underline"
                    >
                      {category.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      disabled={!!busy || (counts[category.id] || 0) > 0}
                      title={
                        (counts[category.id] || 0) > 0
                          ? `${counts[category.id]} projects use this category.`
                          : 'Delete unused category'
                      }
                      onClick={() => {
                        if (
                          confirm(
                            `Delete ${category.name}? This is allowed only when no projects use it.`,
                          )
                        )
                          void act(
                            `delete:${category.id}`,
                            () => repository.removeProjectCategory(category.id),
                            'Category deleted.',
                          );
                      }}
                      className="h-11 w-10 text-red-700 disabled:opacity-30"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!categories.length && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#474555]">
                  No category documents are loaded. Run the idempotent category seed before managing
                  categories.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
