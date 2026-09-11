import { auth } from './firebase';
export async function uploadMedia(file: File, kind: 'image' | 'resume') {
  const allowed = kind === 'resume' ? ['application/pdf'] : ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) throw new Error('Choose a supported file up to 10 MB.');
  if (kind === 'resume' && new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-') throw new Error('Choose an actual PDF file.');
  if (!auth?.currentUser) throw new Error('Sign in before uploading.');
  const token = await auth.currentUser.getIdToken();
  const signed = await fetch('/api/cloudinary/sign', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ kind }), signal: AbortSignal.timeout(30000) });
  const signature = await signed.json();
  if (!signed.ok) throw new Error(signature.error || 'Unable to authorize upload.');
  const body = new FormData();
  body.append('file', file);
  Object.entries(signature.params).forEach(([key, value]) => body.append(key, String(value)));
  body.append('api_key', signature.apiKey);
  body.append('signature', signature.signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`, { method: 'POST', body, signal: AbortSignal.timeout(120000) });
  const media = await response.json();
  if (!response.ok || !media.secure_url || (kind === 'resume' && media.format !== 'pdf')) throw new Error('Upload failed. Check the file and Cloudinary preset.');
  return media.secure_url as string;
}
