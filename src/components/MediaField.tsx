import React, { useState } from 'react';
import { uploadMedia } from '../lib/uploads';
import type { MediaAsset } from '../types';
export function MediaField({
  label,
  value,
  onChange,
  kind = 'image',
  onBusy,
  onUploaded,
  showPreview = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  kind?: 'image' | 'resume';
  onBusy: (value: boolean) => void;
  onUploaded?: (asset: MediaAsset) => void;
  showPreview?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const id = React.useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-semibold">
        {label}
      </label>
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
            try {
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
      {showPreview && kind === 'image' && value.startsWith('https://') && (
        <img
          src={value}
          alt="Selected image preview"
          className="max-h-32 rounded-lg object-contain"
        />
      )}
    </div>
  );
}
