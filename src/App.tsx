import React, { Suspense, lazy, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Project, Enquiry, SiteContent, ServiceItem, SkillItem, ProcessItem, CategoryItem } from './types';
import { auth, db, firebaseConfigured } from './lib/firebase';
import * as repository from './lib/repository';
import { SettingsContext, defaultSettings } from './lib/settings';
import { ContentContext } from './lib/content';
import { defaultContent } from './data/defaultContent';
import { parseRoute } from './lib/routes';
import { TopNavbar } from './components/TopNavbar';
import { HeroSection } from './components/HeroSection';
import { TrustStrip } from './components/TrustStrip';
import { WorkSection } from './components/WorkSection';
import { ServicesSection } from './components/ServicesSection';
import { AboutSection } from './components/AboutSection';
import { ProcessSection } from './components/ProcessSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { ProjectDetailView } from './components/ProjectDetailView';
const AdminLoginView = lazy(() =>
  import('./components/AdminLoginView').then((m) => ({ default: m.AdminLoginView })),
);
const AdminDashboardView = lazy(() =>
  import('./components/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView })),
);
const ProjectModal = lazy(() =>
  import('./components/ProjectModal').then((m) => ({ default: m.ProjectModal })),
);
const DeleteModal = lazy(() =>
  import('./components/DeleteModal').then((m) => ({ default: m.DeleteModal })),
);

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const route = parseRoute(path);
  const adminRoute = route.kind === 'admin' || route.kind === 'preview';
  const [authReady, setAuthReady] = useState(!auth);
  const [admin, setAdmin] = useState(false);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [adminProjects, setAdminProjects] = useState<Project[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [content,setContent]=useState<SiteContent>(defaultContent);
  const [publicServices,setPublicServices]=useState<ServiceItem[]>([]);
  const [publicSkills,setPublicSkills]=useState<SkillItem[]>([]);
  const [publicProcess,setPublicProcess]=useState<ProcessItem[]>([]);
  const [publicCategories,setPublicCategories]=useState<CategoryItem[]>([]);
  const [publicLoading, setPublicLoading] = useState(firebaseConfigured);
  const [adminLoading, setAdminLoading] = useState(false);
  const [publicError, setPublicError] = useState('');
  const [adminError, setAdminError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [busy, setBusy] = useState(false);
  const [service, setService] = useState('website');
  const [editing, setEditing] = useState<Project | null | undefined>();
  const [deleting, setDeleting] = useState<Project | null>(null);
  const navigate = (target: string) => {
    window.history.pushState(null, '', target);
    setPath(window.location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  useEffect(() => {
    if (!auth || !db) return;
    let stopGrant = () => {};
    const stopAuth = onAuthStateChanged(
      auth,
      (user) => {
        stopGrant();
        setAdmin(false);
        setAuthReady(!user);
        if (user)
          stopGrant = onSnapshot(
            doc(db!, 'access', 'admin'),
            (snapshot) => {
              setAdmin(snapshot.data()?.uid === user.uid);
              setAuthReady(true);
            },
            () => {
              setAdmin(false);
              setAuthReady(true);
            },
          );
      },
      () => {
        setAdmin(false);
        setAuthReady(true);
      },
    );
    return () => {
      stopGrant();
      stopAuth();
    };
  }, []);
  useEffect(() => {
    if (!db) return;
    return repository.watchProjects(
      false,
      (items) => {
        setPublicProjects(items);
        setPublicLoading(false);
        setPublicError('');
      },
      () => {
        setPublicProjects([]);
        setPublicLoading(false);
        setPublicError('Projects are temporarily unavailable. Please try again later.');
      },
    );
  }, []);
  useEffect(()=>{if(!db)return;const fail=()=>setPublicError('Website content is temporarily unavailable.');return repository.watchSiteContent(setContent,fail)},[]);
  useEffect(()=>{if(!db)return;const fail=()=>setPublicError('Website content is temporarily unavailable.');const stops=[repository.watchCmsCollection<ServiceItem>('services',false,setPublicServices,fail),repository.watchCmsCollection<SkillItem>('skills',false,setPublicSkills,fail),repository.watchCmsCollection<ProcessItem>('process',false,setPublicProcess,fail),repository.watchCmsCollection<CategoryItem>('categories',false,setPublicCategories,fail)];return()=>stops.forEach(stop=>stop())},[]);
  useEffect(() => {
    if (!db) return;
    return repository.watchSettings(
      (value) => {
        setSettings(value || defaultSettings);
        setSettingsError('');
      },
      () => {
        setSettings(defaultSettings);
        setSettingsError('Settings could not be loaded.');
      },
    );
  }, []);
  useEffect(() => {
    setAdminProjects([]);
    setEnquiries([]);
    setEditing(undefined);
    setDeleting(null);
    setAdminError('');
    if (!admin || !adminRoute) {
      setAdminLoading(false);
      return;
    }
    setAdminLoading(true);
    const fail = () => {
      setAdminError('Unable to load admin data. Check your connection and access.');
      setAdminLoading(false);
    };
    const stopProjects = repository.watchProjects(
      true,
      (items) => {
        setAdminProjects(items);
        setAdminLoading(false);
      },
      fail,
    );
    const stopEnquiries = repository.watchEnquiries(setEnquiries, fail);
    return () => {
      stopProjects();
      stopEnquiries();
    };
  }, [admin, adminRoute]);
  const section = (id: string) => {
    if (route.kind !== 'public') navigate('/');
    window.setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }),
      50,
    );
  };
  const act = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setAdminError('');
    try {
      await action();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const switchView = (view: string) => {
    if (view === 'admin-login') {
      void act(async () => {
        await signOut(auth!);
        navigate('/admin');
      });
    } else navigate(view === 'public' ? '/' : '/admin');
  };
  const project =
    route.kind === 'project'
      ? publicProjects.find((p) => p.slug === route.slug && p.status === 'published')
      : route.kind === 'preview' && admin
        ? adminProjects.find((p) => p.slug === route.slug)
        : undefined;
  useEffect(() => {
    document.title = project
      ? `${project.title} | Pavan Kumar`
      : content.siteTitle;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        project?.summary ||
          content.metaDescription,
      );
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = adminRoute || route.kind === 'missing' || !content.indexingEnabled ? 'noindex, nofollow' : 'index, follow';
  }, [project, adminRoute, route.kind, content]);
  const notice = (message: string) => (
    <div className="max-w-7xl mx-auto px-6 py-8" role="status">
      {message}
    </div>
  );
  return (
    <SettingsContext.Provider value={settings}>
      <ContentContext.Provider value={{content,services:publicServices,skills:publicSkills,process:publicProcess,categories:publicCategories}}>
      <div className="min-h-screen bg-[#f9f9ff] text-[#141b2b] flex flex-col font-sans">
        <Suspense fallback={notice('Loading…')}>
          {adminRoute ? (
            !firebaseConfigured ? (
              notice('Admin is unavailable until Firebase is configured. See SETUP.md.')
            ) : !authReady ? (
              notice('Checking your session…')
            ) : !admin ? (
              <AdminLoginView
                onLoginSuccess={() => navigate(path)}
                onReturnToPortfolio={() => navigate('/')}
              />
            ) : (
              <>
                {(adminError || settingsError) && (
                  <div role="alert" className="p-4 bg-red-50 text-red-800">
                    {adminError || settingsError}
                  </div>
                )}
                {adminLoading ? (
                  notice('Loading admin data…')
                ) : route.kind === 'preview' ? (
                  project ? (
                    <ProjectDetailView
                      project={project}
                      onBackToPortfolio={() => navigate('/admin')}
                      onRequestSimilar={() => section('contact')}
                    />
                  ) : (
                    notice('Project not found.')
                  )
                ) : (
                  <fieldset disabled={busy} className="contents">
                    <AdminDashboardView
                      projects={adminProjects}
                      enquiries={enquiries}
                      onOpenAddProject={() => setEditing(null)}
                      onOpenEditProject={setEditing}
                      onOpenDeleteProject={setDeleting}
                      onPreviewProject={(p) => navigate(`/admin/preview/${p.slug}`)}
                      onSwitchView={switchView}
                      onDuplicateProject={(p) =>
                        void act(async () => {
                          const slug = `${p.slug.slice(0, 65)}-${crypto.randomUUID().slice(0, 8)}`;
                          await repository.saveProject(
                            {
                              ...p,
                              id: slug,
                              slug,
                              title: `Copy of ${p.title}`.slice(0, 120),
                              status: 'draft',
                              order: Math.max(-1, ...adminProjects.map((p) => p.order)) + 1,
                            },
                            true,
                          );
                        })
                      }
                      onTogglePublish={(p) => void act(() => repository.setProjectStatus(p))}
                      onReorder={(p, dir) =>
                        void act(() => repository.reorderProject(adminProjects, p.id, dir))
                      }
                      onEnquiryStatus={(id, status) =>
                        void act(() => repository.setEnquiryStatus(id, status))
                      }
                    />
                  </fieldset>
                )}
                {editing !== undefined && (
                  <ProjectModal
                    isOpen
                    onClose={() => setEditing(undefined)}
                    projectToEdit={editing}
                    nextOrder={Math.max(-1, ...adminProjects.map((p) => p.order)) + 1}
                    onSave={(p) => repository.saveProject(p, editing === null)}
                  />
                )}
                {deleting && (
                  <DeleteModal
                    isOpen
                    project={deleting}
                    onClose={() => setDeleting(null)}
                    onConfirm={repository.removeProject}
                  />
                )}
              </>
            )
          ) : route.kind === 'public' ? (
            <>
              <TopNavbar onNavigateToSection={section} onSwitchView={switchView} />
              <main>
                <HeroSection
                  onViewWork={() => section('work')}
                  onStartProject={() => section('contact')}
                />
                <TrustStrip />
                {publicLoading ? (
                  notice('Loading projects…')
                ) : publicError ? (
                  notice(publicError)
                ) : (
                  <WorkSection
                    projects={publicProjects}
                    onSelectProject={(p) => navigate(`/projects/${p.slug}`)}
                  />
                )}
                <ServicesSection
                  onSelectService={(value) => {
                    setService(value);
                    section('contact');
                  }}
                />
                <AboutSection />
                <ProcessSection />
                <ContactSection selectedServicePreset={service} />
              </main>
              <Footer onNavigateToSection={section} onSwitchView={switchView} />
            </>
          ) : route.kind === 'project' && publicLoading ? (
            notice('Loading project…')
          ) : route.kind === 'project' && publicError ? (
            notice(publicError)
          ) : project ? (
            <ProjectDetailView
              project={project}
              onBackToPortfolio={() => navigate('/')}
              onRequestSimilar={() => section('contact')}
            />
          ) : (
            <div className="max-w-7xl mx-auto px-6 py-24">
              <h1 className="text-3xl font-bold">Page not found</h1>
              <p className="my-4">This page is unavailable or has not been published.</p>
              <a href="/" className="text-[#422cd8] underline">
                Return to portfolio
              </a>
            </div>
          )}
        </Suspense>
      </div>
      </ContentContext.Provider>
    </SettingsContext.Provider>
  );
}
