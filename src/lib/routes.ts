import { slugPattern } from './validation';
export function parseRoute(path: string) {
  if (path === '/') return { kind: 'public' as const };
  if (path === '/admin' || path === '/admin/') return { kind: 'admin' as const };
  const preview = /^\/admin\/preview\/([^/]+)\/?$/.exec(path);
  if (preview && slugPattern.test(preview[1]))
    return { kind: 'preview' as const, slug: preview[1] };
  const project = /^\/projects\/([^/]+)\/?$/.exec(path);
  if (project && slugPattern.test(project[1]))
    return { kind: 'project' as const, slug: project[1] };
  return { kind: 'missing' as const };
}
