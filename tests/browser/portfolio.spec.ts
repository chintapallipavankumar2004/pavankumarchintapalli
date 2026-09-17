import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { projectWriteFields } from '../../src/lib/projects';
import { DEFAULT_PROJECT_CATEGORIES, normalizeCategory } from '../../src/lib/categories';
let env: RulesTestEnvironment;
test.beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-portfolio',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.clearFirestore();
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-portfolio/accounts', {
    method: 'DELETE',
  });
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'test-password-123',
        returnSecureToken: true,
      }),
    },
  );
  const account = await response.json();
  if (!account.localId) throw new Error('Could not create emulator test account.');
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'access/admin'), { uid: account.localId });
    const base = {
      category: 'website',
      categoryLabel: 'Websites',
      tag: 'Websites',
      summary: 'A test project summary.',
      categoryFields: { technologies: ['React'], liveUrl: 'https://example.com' },
      role: '',
      schemaVersion: 2,
      gallery: [
        { id:'cover', url:'https://example.com/project.png', alt:'Published project home screen', order:0, ownership:'external', display:{ratioMode:'custom',customRatioWidth:1090,customRatioHeight:1080,fit:'contain',naturalWidth:1090,naturalHeight:1080} },
        { id:'detail', url:'https://example.com/project-detail.png', alt:'Published project detail screen', order:1, ownership:'external', display:{ratioMode:'preset',presetRatio:'16:9',fit:'cover',naturalWidth:1600,naturalHeight:900} },
      ],
      coverImageId: 'cover',
      mediaIds: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    await setDoc(doc(db, 'projects/published-project'), {
      ...base,
      title: 'Published Test Project',
      slug: 'published-project',
      status: 'published',
      order: 0,
    });
    await setDoc(doc(db, 'projects/private-draft'), {
      ...base,
      title: 'Private Draft Project',
      slug: 'private-draft',
      status: 'draft',
      order: 1,
    });
    await setDoc(doc(db, 'projects/logo-project'), {
      ...base, title:'Logo Test Project', slug:'logo-project', category:'logo', categoryLabel:'Logos', tag:'Logos',
      categoryFields:{designStyle:'Minimal'}, gallery:[{id:'logo',url:'https://example.com/logo.png',alt:'Test logo mark',order:0,ownership:'external'}], coverImageId:'logo', status:'published', order:2,
    });
    await setDoc(doc(db, 'enquiries/test-enquiry'), { fullName:'Test Sender', email:'sender@example.com', phone:'', service:'website', budget:'Not specified', description:'This is an enquiry that can be safely deleted during the browser test.', status:'new', createdAt:Timestamp.now() });
    await setDoc(doc(db, 'services/webapp'), { id:'webapp', title:'Web Applications', description:'Test service', iconName:'terminal', features:['Dashboards'], order:0, published:true, schemaVersion:1, updatedAt:Timestamp.now(), updatedBy:account.localId });
    for(const category of Object.values(DEFAULT_PROJECT_CATEGORIES))await setDoc(doc(db,'categories',category.id),{...category,updatedAt:Timestamp.now(),updatedBy:account.localId});
  });
});
test.afterAll(async () => {
  await env?.cleanup();
});
test.afterEach(async ({ page }) => {
  await page.close({ runBeforeUnload: false });
});
test.beforeEach(async ({ context }) => {
  // These are local integration tests; do not depend on external image/font CDNs.
  await context.route('**/api/projects/save', async (route) => {
    const body = route.request().postDataJSON() as { project: any; creating: boolean };
    try {
      let definition;
      await env.withSecurityRulesDisabled(async(admin)=>{
        const snapshot=await getDoc(doc(admin.firestore(),'categories',body.project.category));
        if(snapshot.exists())definition=normalizeCategory({...snapshot.data(),id:snapshot.id},snapshot.id);
      });
      const fields = projectWriteFields(body.project,definition);
      await env.withSecurityRulesDisabled(async (admin) => {
        const database = admin.firestore();
        const ref = doc(database,'projects',body.project.id);
        const before = await getDoc(ref);
        await setDoc(ref,{...fields,createdAt:before.data()?.createdAt || serverTimestamp(),updatedAt:serverTimestamp()});
      });
      await route.fulfill({status:body.creating?201:200,contentType:'application/json',body:JSON.stringify({saved:true,id:body.project.id})});
    } catch (error) {
      await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:error instanceof Error?error.message:'Invalid project',stage:'validation'})});
    }
  });
  await context.route('**/api/projects/reorder',async(route)=>{
    const body=route.request().postDataJSON() as {id:string;direction:-1|1};
    await env.withSecurityRulesDisabled(async(admin)=>{
      const database=admin.firestore();
      const snapshot=await getDocs(collection(database,'projects'));
      const items=snapshot.docs.map((entry)=>({id:entry.id,order:Number.isInteger(entry.data().order)?entry.data().order:Number.MAX_SAFE_INTEGER})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
      const index=items.findIndex((item)=>item.id===body.id);const target=index+body.direction;
      if(index>=0&&target>=0&&target<items.length)[items[index],items[target]]=[items[target],items[index]];
      await Promise.all(items.map((item,order)=>updateDoc(doc(database,'projects',item.id),{order,updatedAt:serverTimestamp()})));
    });
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ordering:true})});
  });
  await context.route('**/api/categories/manage',async(route)=>{
    const body=route.request().postDataJSON() as any;
    try{
      await env.withSecurityRulesDisabled(async(admin)=>{
        const database=admin.firestore();
        if(body.action==='save'){
          const category=normalizeCategory(body.category,body.category.id);
          await setDoc(doc(database,'categories',category.id),{...category,updatedAt:serverTimestamp(),updatedBy:'browser-test'},{merge:false});
        }else if(body.action==='delete'){
          const projects=await getDocs(collection(database,'projects'));
          if(projects.docs.some((entry)=>entry.data().category===body.id))throw new Error('Projects still use this category.');
          await deleteDoc(doc(database,'categories',body.id));
        }else if(body.action==='reorder'){
          const snapshot=await getDocs(collection(database,'categories'));
          const items=snapshot.docs.map((entry)=>({id:entry.id,order:Number.isInteger(entry.data().order)?entry.data().order:Number.MAX_SAFE_INTEGER})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
          const index=items.findIndex((item)=>item.id===body.id);const target=index+body.direction;
          if(index>=0&&target>=0&&target<items.length)[items[index],items[target]]=[items[target],items[index]];
          await Promise.all(items.map((item,order)=>updateDoc(doc(database,'categories',item.id),{order,updatedAt:serverTimestamp()})));
        }else{
          const updates=body.action==='publish'?{published:true}:body.action==='unpublish'?{published:false}:body.action==='enable'?{enabled:true}:{enabled:false};
          await updateDoc(doc(database,'categories',body.id),{...updates,updatedAt:serverTimestamp()});
        }
      });
      await route.fulfill({status:body.action==='save'&&body.creating?201:200,contentType:'application/json',body:JSON.stringify({saved:true,id:body.id||body.category?.id})});
    }catch(error){await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:error instanceof Error?error.message:'Category action failed'})});}
  });
  await context.route(/^https:\/\//, (route) => route.abort());
});
test('public routes exclude drafts, survive refresh and browser history, and preserve responsive layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Published Test Project' })).toBeVisible();
  await expect(page.getByText('Private Draft Project')).toHaveCount(0);
  await page.locator('#project-card-published-project').getByRole('link', { name: 'View Project Details' }).click();
  await expect(page).toHaveURL(/\/projects\/published-project$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Published Test Project' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/');
  await page.goto('/projects/private-draft');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.goto('/');
  for (const width of [320, 375, 768, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('#hero-profile-avatar')).toHaveAttribute(
      'src',
      /portfolio_hybq1j\.png/,
    );
    const overflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((element) => { const rect=element.getBoundingClientRect(); return rect.right > window.innerWidth + 1 || rect.left < -1; })
        .slice(0,8)
        .map((element) => ({ tag:element.tagName, id:element.id, className:element.className, left:element.getBoundingClientRect().left, right:element.getBoundingClientRect().right })),
    }));
    expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
  }
  await page.screenshot({ path: 'test-results/public-desktop.png', fullPage: true });
  const logoCard=page.locator('#project-card-logo-project');
  await expect(logoCard.getByRole('link',{name:/Visit Website|Open Application|View App|View Demo/})).toHaveCount(0);
  await page.locator('#project-card-published-project').getByRole('link', { name: 'View Project Details' }).click();
  const gallery=page.getByRole('region',{name:'Published Test Project image gallery'});
  await gallery.focus();
  await gallery.press('ArrowRight');
  await expect(gallery.getByAltText('Published project detail screen')).toBeVisible();
  await expect(page.getByText('example.com',{exact:false})).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Work carousel is responsive and project details preserve per-image display ratios', async ({ page }) => {
  await page.goto('/');
  const carousel=page.getByRole('region',{name:'Published projects'});
  await expect(carousel).toBeVisible();
  await expect(page.locator('#work').getByRole('region',{name:/image gallery/})).toHaveCount(0);

  for (const [width,min,max] of [[375,0.94,1.01],[768,0.45,0.52],[1366,0.30,0.35]] as const) {
    await page.setViewportSize({width,height:900});
    const proportions=await page.locator('#project-card-published-project').evaluate((card) => {
      const track=card.parentElement;
      return {card:card.getBoundingClientRect().width,track:track?.getBoundingClientRect().width || 1,page:document.documentElement.scrollWidth,viewport:window.innerWidth};
    });
    expect(proportions.card/proportions.track).toBeGreaterThanOrEqual(min);
    expect(proportions.card/proportions.track).toBeLessThanOrEqual(max);
    expect(proportions.page).toBeLessThanOrEqual(proportions.viewport+1);
  }

  await page.setViewportSize({width:375,height:900});
  await expect(page.getByRole('button',{name:'Previous projects'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Next projects'})).toBeEnabled();
  await carousel.focus();
  await carousel.press('ArrowRight');
  await expect.poll(() => carousel.evaluate((node) => node.scrollLeft)).toBeGreaterThan(20);
  await expect(page.getByRole('button',{name:'Previous projects'})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Next projects'})).toBeDisabled();

  await page.locator('#project-card-published-project').getByRole('link',{name:'View Project Details'}).click();
  const frame=page.locator('[data-gallery-frame]');
  await expect(frame).toHaveAttribute('data-fit','contain');
  expect(Number(await frame.getAttribute('data-display-ratio'))).toBeCloseTo(1090/1080,5);
  const gallery=page.getByRole('region',{name:'Published Test Project image gallery'});
  await gallery.getByRole('button',{name:'Next image'}).click();
  await expect(frame).toHaveAttribute('data-fit','cover');
  expect(Number(await frame.getAttribute('data-display-ratio'))).toBeCloseTo(16/9,5);
  await expect(gallery.getByAltText('Published project detail screen')).toHaveClass(/object-cover/);
});
test('service selection works; missing App Check never produces a false success; resume is unavailable without a PDF', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#btn-enquire-webapp').click();
  await expect(page.locator('#enq-service')).toHaveValue('webapp');
  await page.locator('#enq-name').fill('Test Visitor');
  await page.locator('#enq-email').fill('visitor@example.com');
  await page.locator('#enq-desc').fill('Please help me build a portfolio website for my work.');
  await page.locator('#btn-submit-enquiry').click();
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
  await expect(page.locator('#enquiry-success')).toHaveCount(0);
  await expect(page.locator('#btn-download-resume')).toHaveAttribute('aria-disabled', 'true');
});
test('gallery autoplay stays disabled when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#project-card-published-project').getByRole('link',{name:'View Project Details'}).click();
  const gallery=page.getByRole('region',{name:'Published Test Project image gallery'});
  const current=gallery.locator('[aria-current="true"]');
  await expect(current).toHaveAttribute('aria-label','Show image 1 of 2');
  await page.waitForTimeout(5200);
  await expect(current).toHaveAttribute('aria-label','Show image 1 of 2');
});
test('authorized admin can edit, publish, reorder and delete; another browser sees only published changes', async ({
  page,
  browser,
}) => {
  await page.goto('/admin');
  await page.locator('#admin-email').fill('owner@example.com');
  await page.locator('#admin-pwd').fill('test-password-123');
  await page.locator('#btn-admin-submit').click();
  await expect(page.locator('#view-admin-dashboard')).toBeVisible();
  await page.setViewportSize({width:320,height:800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('button',{name:'Open admin navigation'}).click();
  await page.getByRole('button',{name:/^Enquiries/}).click();
  await page.getByRole('button',{name:'Delete enquiry from Test Sender'}).click();
  await expect(page.getByRole('alertdialog')).toContainText('cannot be undone');
  await page.getByRole('button',{name:'Delete permanently'}).click();
  await expect(page.getByText('Enquiry permanently deleted.')).toBeVisible();
  await expect(page.getByLabel(/new enquiries/)).toHaveCount(0);
  await page.setViewportSize({width:1366,height:900});
  await page.getByRole('button',{name:'Projects',exact:true}).click();
  const logo = page.getByRole('row').filter({ hasText: 'Logo Test Project' });
  await logo.getByRole('button',{name:'Edit Project',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Logos details'})).toBeVisible();
  await expect(page.getByLabel('Design tools')).toBeVisible();
  await expect(page.getByLabel('Live website URL')).toHaveCount(0);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  const draft = page.getByRole('row').filter({ hasText: 'Private Draft Project' });
  await draft.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(draft.getByRole('button', { name: 'Unpublish' })).toBeVisible();
  const visitor = await browser.newContext();
  try {
  const publicPage = await visitor.newPage();
  await visitor.route(/^https:\/\//, (route) => route.abort());
  await publicPage.goto('http://127.0.0.1:3100/projects/private-draft');
  await expect(publicPage.getByRole('heading', { name: 'Private Draft Project' })).toBeVisible();
  await draft.getByRole('button', { name: 'Unpublish' }).click();
  await expect(publicPage.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('button',{name:'Add Project',exact:true}).click();
  await page.getByLabel('Technologies').fill('React');
  const categoryWarning=page.waitForEvent('dialog');
  const categoryChange=page.getByLabel('Category').selectOption('logo');
  const warning=await categoryWarning;
  expect(warning.message()).toContain('clears fields that do not apply');
  await warning.accept();
  await categoryChange;
  await expect(page.getByRole('heading',{name:'Logos details'})).toBeVisible();
  await expect(page.getByLabel('Design tools')).toBeVisible();
  await expect(page.getByLabel('Live website URL')).toHaveCount(0);
  await page.getByLabel('Category').selectOption('poster');
  await expect(page.getByRole('heading',{name:'Posters details'})).toBeVisible();
  await expect(page.getByLabel('Poster type')).toBeVisible();
  await page.getByLabel('Category').selectOption('automation');
  await expect(page.getByRole('heading',{name:'Automations details'})).toBeVisible();
  await expect(page.getByLabel('Tools / platforms')).toBeVisible();
  await page.getByLabel('Category').selectOption('app');
  await expect(page.getByRole('heading',{name:'Apps details'})).toBeVisible();
  await expect(page.getByLabel('Platform')).toBeVisible();
  await page.getByLabel('Category').selectOption('webapp');
  await expect(page.getByRole('heading',{name:'Web Applications details'})).toBeVisible();
  await expect(page.getByLabel('User roles')).toBeVisible();
  await page.getByLabel('Category').selectOption('website');
  await expect(page.getByRole('heading',{name:'Websites details'})).toBeVisible();
  await page.getByLabel('Project title', { exact: true }).fill('New Portfolio Project');
  await page.getByLabel('Short summary', { exact: true }).fill('A newly created portfolio entry.');
  await page.getByLabel('Image 1 URL or upload', { exact: true }).fill('https://example.com/new.png');
  await page.getByLabel('Alt text', { exact: true }).fill('New portfolio project screen');
  await page.getByRole('button', { name: 'Save Project' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const row = page.getByRole('row').filter({ hasText: 'New Portfolio Project' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Move New Portfolio Project up' }).click();
  await expect(page.locator('tbody tr').nth(2)).toContainText('New Portfolio Project');
  await row.getByRole('button', { name: 'Edit Project', exact: true }).click();
  await page
    .getByLabel('Short summary', { exact: true })
    .fill('Updated project details are saved.');
  await page.getByRole('button', { name: 'Save Project' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await row.getByRole('button', { name: 'Duplicate Project' }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Copy of New Portfolio Project' }),
  ).toBeVisible();
  await page
    .getByRole('row')
    .filter({ hasText: 'Copy of New Portfolio Project' })
    .getByRole('button', { name: 'Delete Project' })
    .click();
  await page.locator('#btn-confirm-delete-project').click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Copy of New Portfolio Project' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Manage Website', exact: true }).click();
  await page.getByRole('tab',{name:'Project categories'}).click();
  await page.getByRole('button',{name:'Add Category'}).click();
  await page.getByLabel('Category name').fill('Thumbnails');
  await expect(page.getByLabel('Category ID / slug')).toHaveValue('thumbnails');
  await page.getByLabel('Category ID / slug').fill('thumbnail');
  await page.getByRole('button',{name:'Add field'}).click();
  await page.getByLabel('Field key').fill('designTools');
  await page.getByLabel('Display label').fill('Design tools');
  await page.getByLabel('Field type').selectOption('list');
  await page.getByLabel('Published in public filters').check();
  await page.getByRole('button',{name:'Save category'}).click();
  await expect(page.getByRole('row').filter({hasText:'Thumbnails'})).toBeVisible();
  await page.getByRole('button',{name:'Projects',exact:true}).click();
  await page.getByRole('button',{name:'Add Project',exact:true}).click();
  await page.getByLabel('Category').selectOption('thumbnail');
  await expect(page.getByRole('heading',{name:'Thumbnails details'})).toBeVisible();
  await expect(page.getByLabel('Design tools')).toBeVisible();
  await page.getByLabel('Project title',{exact:true}).fill('Thumbnail Launch Set');
  await page.getByLabel('Short summary',{exact:true}).fill('A dynamic thumbnail category project.');
  await page.getByLabel('Image 1 URL or upload',{exact:true}).fill('https://example.com/thumbnail.png');
  await page.getByLabel('Alt text',{exact:true}).fill('Thumbnail launch artwork');
  await page.getByLabel('Design tools').fill('Canva');
  await page.getByLabel('Visibility').selectOption('published');
  await page.getByRole('button',{name:'Save Project'}).click();
  const thumbnailRow=page.getByRole('row').filter({hasText:'Thumbnail Launch Set'});
  await expect(thumbnailRow).toBeVisible();
  await thumbnailRow.getByRole('button',{name:'Edit Project',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Thumbnails details'})).toBeVisible();
  await expect(page.getByLabel('Design tools')).toHaveValue('Canva');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await publicPage.goto('http://127.0.0.1:3100/');
  await expect(publicPage.getByRole('button',{name:/Thumbnails/})).toBeVisible();
  await publicPage.getByRole('button',{name:/Thumbnails/}).click();
  await expect(publicPage.getByRole('heading',{name:'Thumbnail Launch Set'})).toBeVisible();
  await page.getByRole('button', { name: 'Manage Website', exact: true }).click();
  await page.getByRole('tab', { name: 'Display settings' }).click();
  await page.getByLabel('Availability text (optional)').fill('Discuss your next project');
  await page.getByLabel('Resume PDF', { exact: true }).fill('https://example.com/resume.pdf');
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await expect(page.getByText('Settings saved.', { exact: true })).toBeVisible();
  await publicPage.goto('http://127.0.0.1:3100/');
  await expect(publicPage.locator('#hero-availability-pill')).toContainText(
    'Discuss your next project',
  );
  await expect(publicPage.locator('#btn-download-resume')).toHaveAttribute(
    'href',
    'https://example.com/resume.pdf',
  );
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.locator('#admin-email')).toBeVisible();
  } finally {
    await visitor.close();
  }
});
