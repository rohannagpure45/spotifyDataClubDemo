import { test, expect } from '@playwright/test';

test.describe('Spotify Dashboard Premium Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should load dashboard with premium dark mode styling', async ({ page }) => {
    // Check main background and text colors
    await expect(page.locator('body')).toHaveCSS('background', 'rgb(10, 10, 10)'); // --background
    await expect(page.locator('body')).toHaveCSS('color', 'rgb(250, 250, 250)'); // --foreground

    // Check header styling
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header.locator('h1')).toContainText('Music DNA Analysis');

    // Verify gradient text in header
    const headerTitle = header.locator('h1');
    await expect(headerTitle).toHaveClass(/bg-gradient-to-r/);
  });

  test('should navigate through all tabs with correct styling', async ({ page }) => {
    const tabs = [
      { value: 'live-feed', name: 'Live Feed' },
      { value: 'music-twin', name: 'Music Twin' },
      { value: 'analysis', name: 'Analysis' },
      { value: 'major-guesser', name: 'Major Guesser' },
      { value: 'leaderboard', name: 'Leaderboard' }
    ];

    for (const tab of tabs) {
      // Click tab
      await page.click(`[data-value="${tab.value}"]`);

      // Verify tab content is visible
      await expect(page.locator(`[data-value="${tab.value}"][data-state="active"]`)).toBeVisible();

      // Check for premium card styling in each tab
      const cards = page.locator('[class*="bg-[var(--surface-secondary)]"]');
      await expect(cards.first()).toBeVisible();

      // Verify gradient elements are present
      const gradients = page.locator('[class*="bg-gradient-to"]');
      await expect(gradients.first()).toBeVisible();
    }
  });

  test('should display Live Feed tab with correct metrics', async ({ page }) => {
    // Live Feed should be default active tab
    await expect(page.locator('[data-value="live-feed"][data-state="active"]')).toBeVisible();

    // Check metric cards
    await expect(page.locator('text=Live Responses')).toBeVisible();
    await expect(page.locator('text=42')).toBeVisible();
    await expect(page.locator('text=Unique Artists')).toBeVisible();
    await expect(page.locator('text=28')).toBeVisible();
    await expect(page.locator('text=Top Genre')).toBeVisible();
    await expect(page.locator('text=Pop')).toBeVisible();

    // Check latest submissions section
    await expect(page.locator('text=Latest Submissions')).toBeVisible();
    await expect(page.locator('text=Alex')).toBeVisible();
    await expect(page.locator('text=Anti-Hero')).toBeVisible();
  });

  test('should display Music Twin tab with AI-powered features', async ({ page }) => {
    await page.click('[data-value="music-twin"]');

    await expect(page.locator('text=Find Your Music Twin')).toBeVisible();
    await expect(page.locator('text=AI-Powered Matching')).toBeVisible();
    await expect(page.locator('text=Audio Feature Matching')).toBeVisible();
    await expect(page.locator('text=Genre Similarity')).toBeVisible();
    await expect(page.locator('text=Status: Building recommendation engine')).toBeVisible();
  });

  test('should display Analysis tab with data science features', async ({ page }) => {
    await page.click('[data-value="analysis"]');

    await expect(page.locator('text=Community Music Analysis')).toBeVisible();
    await expect(page.locator('text=Interactive Data Visualizations')).toBeVisible();
    await expect(page.locator('text=K-Means Clustering')).toBeVisible();
    await expect(page.locator('text=Correlation Heatmaps')).toBeVisible();
    await expect(page.locator('text=PCA & Music DNA')).toBeVisible();

    // Check insights section
    await expect(page.locator('text=Key Insights')).toBeVisible();
    await expect(page.locator('text=Most predictive feature')).toBeVisible();
    await expect(page.locator('text=Valence (0.73 correlation)')).toBeVisible();
  });

  test('should display Major Guesser tab with ML features', async ({ page }) => {
    await page.click('[data-value="major-guesser"]');

    await expect(page.locator('text=AI Major Predictor')).toBeVisible();
    await expect(page.locator('text=Interactive ML Game')).toBeVisible();
    await expect(page.locator('text=Model Performance')).toBeVisible();
    await expect(page.locator('text=73.2%')).toBeVisible();
    await expect(page.locator('text=Feature Importance')).toBeVisible();

    // Check major predictions
    await expect(page.locator('text=CS')).toBeVisible();
    await expect(page.locator('text=ART')).toBeVisible();
    await expect(page.locator('text=BIZ')).toBeVisible();
  });

  test('should display Leaderboard tab with awards', async ({ page }) => {
    await page.click('[data-value="leaderboard"]');

    await expect(page.locator('text=Music Awards & Leaderboard')).toBeVisible();
    await expect(page.locator('text=Community Music Champions')).toBeVisible();

    // Check award categories
    await expect(page.locator('text=🔥 Most Energetic')).toBeVisible();
    await expect(page.locator('text=HUMBLE.')).toBeVisible();
    await expect(page.locator('text=😊 Happiest Song')).toBeVisible();
    await expect(page.locator('text=Good as Hell')).toBeVisible();
    await expect(page.locator('text=💃 Most Danceable')).toBeVisible();
    await expect(page.locator('text=Levitating')).toBeVisible();

    // Check community statistics
    await expect(page.locator('text=Community Statistics')).toBeVisible();
    await expect(page.locator('text=Average Energy')).toBeVisible();
    await expect(page.locator('text=0.67')).toBeVisible();
  });

  test('should have proper color scheme throughout', async ({ page }) => {
    // Test CSS custom properties are applied
    const rootStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const computed = getComputedStyle(root);
      return {
        background: computed.getPropertyValue('--background').trim(),
        foreground: computed.getPropertyValue('--foreground').trim(),
        surfaceSecondary: computed.getPropertyValue('--surface-secondary').trim(),
        accentPrimary: computed.getPropertyValue('--accent-primary').trim(),
        spotifyGreen: computed.getPropertyValue('--spotify-green').trim()
      };
    });

    expect(rootStyles.background).toBe('#0a0a0a');
    expect(rootStyles.foreground).toBe('#fafafa');
    expect(rootStyles.surfaceSecondary).toBe('#171717');
    expect(rootStyles.accentPrimary).toBe('#6366f1');
    expect(rootStyles.spotifyGreen).toBe('#1db954');
  });

  test('should have responsive design on mobile', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that tabs are still accessible on mobile
    const tabsList = page.locator('[role="tablist"]');
    await expect(tabsList).toBeVisible();

    // Check that cards are responsive
    const cards = page.locator('[class*="bg-[var(--surface-secondary)]"]');
    await expect(cards.first()).toBeVisible();

    // Test navigation still works on mobile
    await page.click('[data-value="music-twin"]');
    await expect(page.locator('text=Find Your Music Twin')).toBeVisible();
  });

  test('should have hover effects and animations', async ({ page }) => {
    // Test card hover effects
    const firstCard = page.locator('[class*="bg-[var(--surface-secondary)]"]').first();
    await firstCard.hover();

    // Test tab hover effects
    const musicTwinTab = page.locator('[data-value="music-twin"]');
    await musicTwinTab.hover();

    // Check for transition classes
    await expect(musicTwinTab).toHaveClass(/transition-all/);
  });
});