import React, { useState } from 'react';
import { useSettings } from '../lib/settings';
import { saveSettings } from '../lib/repository';
import { MediaField } from './MediaField';
export function SettingsPanel() {
  const settings = useSettings();
  const [draft, setDraft] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const onBusy = (value: boolean) => setUploads(n => n + (value ? 1 : -1));
  return <form className="bg-white border border-[#c8c4d8] rounded-2xl p-6 space-y-5" onSubmit={async e => {
    e.preventDefault(); if (busy || uploads) return; setBusy(true); setMessage(''); setError('');
    try { await saveSettings(draft); setMessage('Settings saved.'); } catch (error) { setError(error instanceof Error ? error.message : 'Settings could not be saved.'); } finally { setBusy(false); }
  }}><h2 className="text-xl font-bold">Portfolio Settings</h2><fieldset disabled={busy} className="space-y-5">
    <MediaField label="Hero photo" value={draft.headshot} onChange={headshot => setDraft(s => ({ ...s, headshot }))} onBusy={onBusy} />
    <MediaField label="Resume PDF" kind="resume" value={draft.resumeUrl} onChange={resumeUrl => setDraft(s => ({ ...s, resumeUrl }))} onBusy={onBusy} />
    <p className="text-xs text-[#474555]">Upload your actual PDF, link an existing PDF, or use /resume.pdf after adding it to the public folder. Leave blank until it is available.</p>
    {(['availability', 'bookingsWindow', 'responseWindow'] as const).map((key, index) => <label className="block space-y-1" key={key}><span className="text-sm font-semibold">{['Availability text (optional)', 'Booking window (optional)', 'Response information (optional)'][index]}</span><input maxLength={250} value={draft[key]} onChange={e => setDraft(s => ({ ...s, [key]: e.target.value }))} className="w-full h-10 px-3 rounded-lg border border-[#c8c4d8]" /></label>)}
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-emerald-700">{message}</p>}
    <button disabled={uploads > 0} className="h-10 px-6 rounded-lg bg-[#5b4cf0] text-white font-semibold disabled:opacity-50">{busy ? 'Saving…' : 'Save Settings'}</button>
  </fieldset></form>;
}
