import { auth, appCheckToken } from './firebase';
import type { MediaAsset } from '../types';
async function adminHeaders() {
  const user=auth?.currentUser; if(!user) throw new Error('Your session expired. Sign in again.');
  return {'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`,'X-Firebase-AppCheck':await appCheckToken()};
}
export async function uploadMedia(file: File, kind: 'image' | 'resume'): Promise<MediaAsset> {
  const allowed =
    kind === 'resume' ? ['application/pdf'] : ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024)
    throw new Error('Choose a supported file up to 10 MB.');
  if (
    kind === 'resume' &&
    new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-'
  )
    throw new Error('Choose an actual PDF file.');
  const headers = await adminHeaders();
  const signed = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers,
    body: JSON.stringify({ kind }),
    signal: AbortSignal.timeout(30000),
  });
  const signature = await signed.json();
  if (!signed.ok) throw new Error(signature.error || 'Unable to authorize upload.');
  const body = new FormData();
  body.append('file', file);
  Object.entries(signature.params).forEach(([key, value]) => body.append(key, String(value)));
  body.append('api_key', signature.apiKey);
  body.append('signature', signature.signature);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
    { method: 'POST', body, signal: AbortSignal.timeout(120000) },
  );
  const media = await response.json();
  if (!response.ok || !media.secure_url || (kind === 'resume' && media.format !== 'pdf'))
    throw new Error('Upload failed. Check the file and Cloudinary preset.');
  const safe=Object.fromEntries(Object.entries(media).filter(([key])=>['asset_id','public_id','resource_type','type','format','version','secure_url','bytes','width','height','original_filename'].includes(key)));
  const completed=await fetch('/api/cloudinary/complete',{method:'POST',headers,body:JSON.stringify(safe)});
  const result=await completed.json();
  if(!completed.ok) throw new Error(result.error||'Upload succeeded but registration failed.');
  return {...result.media,id:result.media.assetId} as MediaAsset;
}
export async function deleteMedia(mediaId:string){const response=await fetch('/api/cloudinary/delete',{method:'POST',headers:await adminHeaders(),body:JSON.stringify({mediaId})});const value=await response.json();if(!response.ok)throw new Error(value.error||'Media deletion failed.');return value;}
