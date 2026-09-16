import { auth, appCheckToken } from './firebase';
import type { Project } from '../types';

async function headers() {
  const user = auth?.currentUser;
  if (!user) throw new Error('Your session expired. Sign in again.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await user.getIdToken()}`,
    'X-Firebase-AppCheck': import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true' ? 'emulated' : await appCheckToken(),
  };
}

export async function saveProjectThroughApi(project: Project, creating: boolean) {
  const response = await fetch('/api/projects/save', {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ project, creating }),
    signal: AbortSignal.timeout(30000),
  });
  const value = await response.json().catch(() => ({})) as { error?: string; stage?: string };
  if (response.ok) return;
  const message = value.error || 'The project could not be saved. Please try again.';
  throw new Error(import.meta.env.DEV && value.stage ? `${message} [${value.stage}]` : message);
}
