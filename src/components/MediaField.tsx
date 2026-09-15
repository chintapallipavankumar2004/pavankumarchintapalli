import React, { useState } from 'react';
import { uploadMedia } from '../lib/uploads';
import type { MediaAsset, ProjectCategory } from '../types';
import { PROJECT_CATEGORIES, significantRatioDifference } from '../lib/projects';
export function MediaField({
  label,
  value,
  onChange,
  kind = 'image',
  onBusy,
  onUploaded,
  category,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind?: 'image' | 'resume';
  onBusy: (value: boolean) => void;
  onUploaded?: (asset: MediaAsset) => void;
  category?: ProjectCategory;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const id = React.useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
      {kind === 'image' && category && (
        <p className="text-xs text-[#474555]">{PROJECT_CATEGORIES[category].guidance}. Keep the original proportions; never stretch the image.</p>
      )}
      <input
        id={id}
        type="text"
        maxLength={2048}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={kind === 'resume' ? 'https://…/resume.pdf or /resume.pdf' : 'https://…'}
        className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8] bg-white"
      />
      <label className="block text-xs">
        {busy
          ? 'Uploading…'
          : `Upload ${kind === 'resume' ? 'PDF' : 'JPEG, PNG or WebP'} (up to 10 MB)`}
        <input
          type="file"
          disabled={busy}
          accept={kind === 'resume' ? 'application/pdf' : 'image/jpeg,image/png,image/webp'}
          className="block mt-2 max-w-full"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            setBusy(true);
            onBusy(true);
            setError('');
            setWarning('');
            try {
              if (kind === 'image' && category) {
                try {
                  const bitmap = await createImageBitmap(file);
                  if (significantRatioDifference(bitmap.width, bitmap.height, category)) setWarning(`This image differs from the recommended ${PROJECT_CATEGORIES[category].guidance} ratio. It is valid and will be shown without cropping.`);
                  bitmap.close();
                } catch { /* The upload endpoint remains the source of file validation. */ }
              }
              const asset = await uploadMedia(file, kind);
              onChange(asset.secureUrl);
              onUploaded?.(asset);
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Upload failed.');
            } finally {
              setBusy(false);
              onBusy(false);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700 text-sm">
          {error}
        </p>
      )}
      {warning && <p role="status" className="text-amber-800 text-sm">{warning}</p>}
      {kind === 'image' && value.startsWith('https://') && (
        <img
          src={value}
          alt="Selected image preview"
          className="max-h-32 rounded-lg object-contain"
        />
      )}
    </div>
  );
}
