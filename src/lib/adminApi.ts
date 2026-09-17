import { auth, appCheckToken } from './firebase';
import type { CategoryItem, Project } from '../types';

async function headers() {
  const user = auth?.currentUser;
  if (!user) throw new Error('Your session expired. Sign in again.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await user.getIdToken()}`,
    'X-Firebase-AppCheck': import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true' ? 'emulated' : await appCheckToken(),
  };
}

async function postAdmin<T>(url:string,body:unknown):Promise<T>{
  const response = await fetch(url, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const value = await response.json().catch(() => ({})) as { error?: string; stage?: string };
  if (response.ok) return value as T;
  const message = value.error || 'The project could not be saved. Please try again.';
  throw new Error(import.meta.env.DEV && value.stage ? `${message} [${value.stage}]` : message);
}

export async function saveProjectThroughApi(project: Project, creating: boolean) {
  await postAdmin('/api/projects/save',{project,creating});
}

export async function reorderProjectThroughApi(id:string,direction:-1|1){
  return postAdmin<{ordering:string[]}>('/api/projects/reorder',{id,direction});
}

export type CategoryAction =
  | { action:'save'; category:CategoryItem; creating:boolean }
  | { action:'publish'|'unpublish'|'enable'|'disable'|'delete'; id:string }
  | { action:'reorder'; id:string; direction:-1|1 };

export async function manageCategoryThroughApi(body:CategoryAction){
  return postAdmin<{saved?:boolean;deleted?:boolean;ordering?:string[];id?:string}>('/api/categories/manage',body);
}
