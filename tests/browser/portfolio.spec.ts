import { test, expect } from '@playwright/test';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
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
      technologies: ['React'],
      role: '',
      image: 'https://example.com/project.png',
      thumbnail: '',
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
  });
});
test.afterAll(async () => {
  await env?.cleanup();
});
test.beforeEach(async ({ context }) => {
  // These are local integration tests; do not depend on external image/font CDNs.
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
  await page.getByRole('link', { name: 'View Project Details' }).click();
  await expect(page).toHaveURL(/\/projects\/published-project$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Published Test Project' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL('/');
  await page.goto('/projects/private-draft');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.goto('/');
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('#hero-profile-avatar')).toHaveAttribute(
      'src',
      /portfolio_hybq1j\.png/,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
  }
  await page.screenshot({ path: 'test-results/public-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
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
test('authorized admin can edit, publish, reorder and delete; another browser sees only published changes', async ({
  page,
  browser,
}) => {
  await page.goto('/admin');
  await page.locator('#admin-email').fill('owner@example.com');
  await page.locator('#admin-pwd').fill('test-password-123');
  await page.locator('#btn-admin-submit').click();
  await expect(page.locator('#view-admin-dashboard')).toBeVisible();
  const draft = page.getByRole('row').filter({ hasText: 'Private Draft Project' });
  await draft.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(draft.getByRole('button', { name: 'Unpublish' })).toBeVisible();
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await visitor.route(/^https:\/\//, (route) => route.abort());
  await publicPage.goto('http://127.0.0.1:3100/projects/private-draft');
  await expect(publicPage.getByRole('heading', { name: 'Private Draft Project' })).toBeVisible();
  await draft.getByRole('button', { name: 'Unpublish' }).click();
  await expect(publicPage.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.locator('#btn-sidebar-add-project').click();
  await page.getByLabel('Project title', { exact: true }).fill('New Portfolio Project');
  await page.getByLabel('Short summary', { exact: true }).fill('A newly created portfolio entry.');
  await page.getByLabel('Project image', { exact: true }).fill('https://example.com/new.png');
  await page.getByRole('button', { name: 'Save Project Record' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const row = page.getByRole('row').filter({ hasText: 'New Portfolio Project' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Move New Portfolio Project up' }).click();
  await expect(page.locator('tbody tr').nth(1)).toContainText('New Portfolio Project');
  await row.getByRole('button', { name: 'Edit Project', exact: true }).click();
  await page
    .getByLabel('Short summary', { exact: true })
    .fill('Updated project details are saved.');
  await page.getByRole('button', { name: 'Save Project Record' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await row.getByRole('button', { name: 'Duplicate Entry' }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Copy of New Portfolio Project' }),
  ).toBeVisible();
  await page
    .getByRole('row')
    .filter({ hasText: 'Copy of New Portfolio Project' })
    .getByRole('button', { name: 'Delete Entry' })
    .click();
  await page.locator('#btn-confirm-delete-project').click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Copy of New Portfolio Project' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Portal Settings' }).click();
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
  await visitor.close();
});
