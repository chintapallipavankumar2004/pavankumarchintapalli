const fs = require('node:fs');
const edit = (path, change) => fs.writeFileSync(path, change(fs.readFileSync(path, 'utf8')), 'utf8');
edit('src/data/initialData.ts', s => s.replace(/export const INITIAL_PROJECTS:[\s\S]*?export const PROFILE_INFO/, 'export const INITIAL_PROJECTS: Project[] = [];\nexport const INITIAL_ENQUIRIES: Enquiry[] = [];\n\nexport const PROFILE_INFO').replace("'Q2 2025 BOOKINGS OPEN'", "''").replace("'Within 12 to 24 hours (Monday to Saturday).'", "''").replace("'Available for freelance projects'", "''"));
edit('src/components/AdminLoginView.tsx', s => s.replace("import { PROFILE_INFO }", "import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut } from 'firebase/auth';\nimport { auth } from '../lib/firebase';\nimport { isAuthorizedAdmin } from '../lib/repository';\nimport { PROFILE_INFO }")
 .replace("useState(PROFILE_INFO.email)", "useState('')").replace("useState('demo123')", "useState('')")
 .replace("const handleSubmit = (e: React.FormEvent) => {", "const [error, setError] = useState('');\n  const handleSubmit = async (e: React.FormEvent) => {")
 .replace(/    setIsLoading\(true\);[\s\S]*?    }, 400\);/, `    if (isLoading) return;
    setIsLoading(true); setError('');
    try {
      if (!auth) throw new Error('Login is not configured.');
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!(await isAuthorizedAdmin())) { await signOut(auth); throw new Error('This account is not authorized for admin access.'); }
      onLoginSuccess();
    } catch { setError('Unable to sign in. Check your credentials and admin access.'); }
    finally { setIsLoading(false); }`)
 .replace(/              <button[\s\S]*?Default: demo123[\s\S]*?<\/button>/, '')
 .replace('Keep session active for 30 days', 'Remember me on this device').replace('256-Bit Encrypted', 'Firebase Authentication')
 .replace('<form onSubmit={handleSubmit} className="space-y-4">', '<form onSubmit={handleSubmit} className="space-y-4">\n          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}')
 .replace('type="email"', 'type="email" autoComplete="username"').replace('type="password"', 'type="password" autoComplete="current-password"'));
edit('src/components/ContactSection.tsx', s => s.replace("import { Enquiry } from '../types';", "import { appCheckToken } from '../lib/firebase';\nimport { validateEnquiry } from '../lib/validation';\nimport { useSettings } from '../lib/settings';")
 .replace('  onEnquirySubmitted: (enquiry: Enquiry) => void;\n', '').replace('  onEnquirySubmitted,\n', '')
 .replace("  const [fullName", "  const settings = useSettings();\n  const [error, setError] = useState('');\n  const [website, setWebsite] = useState('');\n  const pending = React.useRef<{ id: string; content: string } | null>(null);\n  const [fullName")
 .replace(/  const handleSubmit = [\s\S]*?\n  return \(/, `  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true); setIsSuccess(false); setError('');
    try {
      const enquiry = validateEnquiry({ fullName, email, phone, service, budget, description });
      const content = JSON.stringify(enquiry);
      if (pending.current?.content !== content) pending.current = { id: crypto.randomUUID(), content };
      const token = await appCheckToken();
      const response = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Firebase-AppCheck': token }, body: JSON.stringify({ ...enquiry, id: pending.current.id, website }), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok || result.saved !== true) throw new Error(result.error || 'Could not save your enquiry. Please try again.');
      setIsSuccess(true); pending.current = null;
      setFullName(''); setEmail(''); setPhone(''); setDescription('');
    } catch (error) { setError(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'We could not confirm your submission. Please retry; duplicate submissions are prevented.'); }
    finally { setIsSubmitting(false); }
  };

  return (`)
 .replace('useState(\'tier-2\')', "useState('Not specified')")
 .replace(/<select([\s\S]*?)id="enq-budget"([\s\S]*?)<\/select>/, match => match)
 .replace('PROFILE_INFO.responseWindow', "settings.responseWindow || 'Contact me to discuss availability.'")
 .replace(/Thank you! Your enquiry has been routed directly to Pavan's\s+inbox and logged in the Admin Suite. Expect a response shortly\./, 'Thank you! Your enquiry has been saved for Pavan to review.')
 .replace('<form onSubmit={handleSubmit} className="space-y-4">', `<form onSubmit={handleSubmit} className="space-y-4">
              <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
              {error && <p role="alert" className="text-red-200 text-sm">{error}</p>}`)
 .replace('value={fullName}', 'minLength={2} maxLength={120} value={fullName}').replace('value={email}', 'maxLength={254} value={email}').replace('value={phone}', 'maxLength={32} value={phone}').replace('value={description}', 'minLength={20} maxLength={5000} value={description}')
 .replace(/<option value="tier-1">[\s\S]*?<\/option>\s*<option value="tier-2">[\s\S]*?<\/option>\s*<option value="tier-3">[\s\S]*?<\/option>\s*<option value="tier-4">[\s\S]*?<\/option>/, '<option value="Not specified">Let’s discuss the budget</option><option value="Under INR 15000">Under ₹15,000</option><option value="INR 15000-35000">₹15,000–₹35,000</option><option value="INR 35000-75000">₹35,000–₹75,000</option><option value="Over INR 75000">Over ₹75,000</option>'));
edit('src/components/HeroSection.tsx', s => s.replace("import { PROFILE_INFO }", "import { useSettings } from '../lib/settings';\nimport { PROFILE_INFO }").replace('  return (', '  const settings = useSettings();\n  return (').replace('PROFILE_INFO.headshot', 'settings.headshot').replace('PROFILE_INFO.availability', "settings.availability || 'Let’s build your next project'").replace('PROFILE_INFO.bookingsWindow', 'settings.bookingsWindow').replace('Client Transparency', 'Clear Communication').replace('100%', 'Direct').replace('Turnaround SLA', 'Project Planning').replace('Fast\n', 'Focused\n'));
edit('src/components/AboutSection.tsx', s => s.replace("import { TECHNICAL_TOOLKIT }", "import { useSettings } from '../lib/settings';\nimport { TECHNICAL_TOOLKIT }").replace(/  const \[downloadSuccess[\s\S]*?\n  return \(/, '  const settings = useSettings();\n  return (')
 .replace('<button\n              id="btn-download-resume"', '<a\n              id="btn-download-resume"').replace('type="button"\n              onClick={handleResumeDownload}', 'href={settings.resumeUrl || undefined}\n              aria-disabled={!settings.resumeUrl}\n              target="_blank" rel="noopener noreferrer" download')
 .replace('<span>Download Resume</span>\n            </button>', '<span>{settings.resumeUrl ? \'Download Resume\' : \'Resume unavailable\'}</span>\n            </a>').replace('PDF format • Updated 2025', "{settings.resumeUrl ? 'PDF format' : 'Please contact me for my resume.'}")
 .replace(/          \{downloadSuccess && \([\s\S]*?          \)\}/, ''));
edit('src/components/WorkSection.tsx', s => s.replace("  const categories = [", "  projects = projects.filter(project => project.status === 'published');\n  const categories = [").replace("    { id: 'inprogress', label: 'In Progress' },", "    { id: 'webapps', label: 'Web Applications' },")
 .replace("if (activeCategory === 'inprogress') return project.status === 'draft';", "if (activeCategory === 'webapps') return project.category === 'webapp';")
 .replace('Work & Progress', 'Selected Work').replace('Explore what I’ve completed and what I’m currently building.', 'Explore my projects and the work behind them.').replace('Featured Production', 'Published').replace("'Live Production'", "'Published'").replace("project.liveUrl || 'https://pavan-portfolio.dev'", "project.liveUrl || project.title")
 .replace(/                      \{\/\* Micro tag badge overlay \*\/\}[\s\S]*?                      <\/div>/, '')
 .replace('<button\n                      id={`btn-view-details-', '<a\n                      id={`btn-view-details-').replace('type="button"\n                      onClick={() => onSelectProject(project)}', 'href={`/projects/${project.slug}`}\n                      onClick={e => { if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); onSelectProject(project); } }}')
 .replace('<ArrowRight className="w-4 h-4" />\n                    </button>', '<ArrowRight className="w-4 h-4" />\n                    </a>'));
edit('src/components/Footer.tsx', s => s.replace('Senior Portfolio', 'Portfolio').replace('© 2025', '© {new Date().getFullYear()}'));
edit('src/components/TrustStrip.tsx', s => s.replace('Pixel-perfect performance tailored across phones, tablets, and desktops.', 'Layouts designed for phones, tablets, and desktops.').replace('Transparent milestone check-ins, straightforward pricing, and zero jargon.', 'Discuss project scope, progress, and feedback directly.').replace('Post-launch revisions, security updates, and active performance monitoring.', 'Discuss maintenance and updates for your project.'));
edit('src/components/AdminDashboardView.tsx', s => s.replace("import { PROFILE_INFO }", "import { SettingsPanel } from './SettingsPanel';\nimport { PROFILE_INFO }")
 .replace('  onSwitchView: (view: ViewMode) => void;', "  onSwitchView: (view: ViewMode) => void;\n  onTogglePublish: (project: Project) => void;\n  onReorder: (project: Project, direction: -1 | 1) => void;\n  onEnquiryStatus: (id: string, status: Enquiry['status']) => void;")
 .replace('  onSwitchView,\n', '  onSwitchView, onTogglePublish, onReorder, onEnquiryStatus,\n').replace("'dashboard' | 'projects' | 'enquiries'", "'dashboard' | 'projects' | 'enquiries' | 'settings'")
 .replace('  const [settingsNotice, setSettingsNotice] = useState(false);\n', '')
 .replace(/onClick=\{\(\) => \{\s+setSettingsNotice\(true\);[\s\S]*?\}\}/, "onClick={() => setActiveTab('settings')}")
 .replace(/          \{settingsNotice && \([\s\S]*?          \)\}/, '')
 .replace('Live deployment status, catalog entries, and inbound client enquiries.', 'Manage portfolio projects and client enquiries.').replace('+100% (Q1)', '').replace('100% LIVE', 'PUBLISHED').replace('Coffee Hub Inkollu production', 'Visible in the public portfolio').replace('NEW LEAD', '').replace('Awaiting review in queue', 'Received through the contact form').replace('Manage visibility, edit descriptions, or trigger manual preview builds.', 'Edit details, manage publication, and arrange display order.').replace('Database: Synced & Operational', 'Cloud Firestore').replace("'pavan-portfolio.dev'", "''")
 .replace("{activeTab === 'enquiries' ? (", "{activeTab === 'settings' ? <SettingsPanel /> : activeTab === 'enquiries' ? (")
 .replace('<td className="py-4 px-5 text-right space-x-1">', `<td className="py-4 px-5 text-right space-x-1">
                          <button type="button" onClick={() => onTogglePublish(proj)} className="p-1.5 text-[#422cd8] underline">{proj.status === 'published' ? 'Unpublish' : 'Publish'}</button>
                          <button type="button" aria-label={'Move ' + proj.title + ' up'} disabled={projects[0]?.id === proj.id} onClick={() => onReorder(proj, -1)} className="p-1.5 disabled:opacity-30">↑</button>
                          <button type="button" aria-label={'Move ' + proj.title + ' down'} disabled={projects[projects.length - 1]?.id === proj.id} onClick={() => onReorder(proj, 1)} className="p-1.5 disabled:opacity-30">↓</button>`)
 .replace('<div className="flex items-center gap-3 text-xs">', `<div className="flex items-center gap-3 text-xs">
                      <label>Status <select value={enq.status} onChange={e => onEnquiryStatus(enq.id, e.target.value as Enquiry['status'])} className="p-2 border rounded"><option value="new">New</option><option value="reviewed">Reviewed</option><option value="contacted">Contacted</option></select></label>`));
edit('src/components/DeleteModal.tsx', s => s.replace("import React from 'react';", "import React, { useState } from 'react';").replace('onConfirm: (projectId: string) => void;', 'onConfirm: (projectId: string) => Promise<void>;').replace('  if (!isOpen', "  const [busy, setBusy] = useState(false);\n  const [error, setError] = useState('');\n  if (!isOpen")
 .replace('This action removes public links and cannot be undone.', 'This removes the project from the portfolio. Uploaded media remains in Cloudinary.')
 .replace('<div className="pt-2 flex items-center justify-end gap-3">', '<div className="pt-2 flex items-center justify-end gap-3">\n          {error && <p role="alert" className="text-red-700">{error}</p>}')
 .replace('onClick={onClose}', 'disabled={busy} onClick={onClose}')
 .replace(/onClick=\{\(\) => \{\s+onConfirm\(project.id\);\s+onClose\(\);\s+\}\}/, "disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await onConfirm(project.id); onClose(); } catch { setError('Could not delete the project. Please try again.'); } finally { setBusy(false); } }}"));
edit('index.html', s => s.replaceAll('Portfolio & Admin Suite', 'Portfolio').replaceAll('Senior software developer and freelancer portfolio showcasing projects, client solutions, case studies, and administrative management console.', 'Software developer and freelancer. Explore my projects, services, and contact details.'));
edit('metadata.json', s => JSON.stringify({ name: 'Chintapalli Pavan Kumar - Portfolio', description: 'Software developer and freelancer portfolio.', requestFramePermissions: [] }, null, 2) + '\n');
