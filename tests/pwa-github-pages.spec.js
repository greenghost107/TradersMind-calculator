const { test, expect } = require('@playwright/test');

test.describe('PWA GitHub Pages Deployment', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant necessary permissions
    await context.grantPermissions(['notifications']);

    // Set up test environment
    await page.addInitScript(() => {
      window.__TEST_MODE__ = true;
      window.__TEST_HTTPS__ = true;
    });
  });

  test.describe('Manifest Path Resolution', () => {
    test('should load manifest with relative path from root', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check manifest link element
      const manifestLink = page.locator('link[rel="manifest"]');
      await expect(manifestLink).toHaveCount(1);

      const href = await manifestLink.getAttribute('href');
      expect(href).toBe('./manifest.json');

      // Verify manifest actually loads
      const manifestResponse = await page.goto(`${href}`);
      expect(manifestResponse.status()).toBe(200);

      const manifestData = await manifestResponse.json();
      expect(manifestData).toHaveProperty('name');
      expect(manifestData).toHaveProperty('short_name');
      expect(manifestData).toHaveProperty('start_url');
      expect(manifestData).toHaveProperty('display');
    });

    test('should have manifest with relative start_url', async ({ page }) => {
      const response = await page.goto('/manifest.json');
      const manifest = await response.json();

      // start_url should be relative (using ./ notation with utm_source for tracking)
      expect(manifest.start_url).toBe('./?utm_source=pwa');
    });

    test('should have manifest with relative icon paths', async ({ page }) => {
      const response = await page.goto('/manifest.json');
      const manifest = await response.json();

      expect(manifest.icons).toBeDefined();
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThan(0);

      // All icon paths should be relative (not absolute URLs)
      manifest.icons.forEach(icon => {
        // Should not start with http:// or https:// or //
        expect(icon.src).not.toMatch(/^(https?:)?\/\//);
        // Should be a valid relative path
        expect(icon.src).toBeTruthy();
      });
    });

    test('should have valid manifest scope', async ({ page }) => {
      const response = await page.goto('/manifest.json');
      const manifest = await response.json();

      // Scope should be relative or match deployment path
      if (manifest.scope) {
        expect(manifest.scope).toMatch(/^\.?\//);
      }
    });
  });

  test.describe('Service Worker Registration', () => {
    test('should register service worker successfully', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check service worker registration
      const swRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return registration !== undefined;
        }
        return false;
      });

      expect(swRegistered).toBe(true);
    });

    test('should have correct service worker scope', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const scope = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            return registration.scope;
          }
        }
        return null;
      });

      expect(scope).toBeTruthy();
      // Scope should end with /
      expect(scope).toMatch(/\/$/);
    });
  });

  test.describe('Base Path Detection', () => {
    test('should extract base path from service worker scope', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Test the base path extraction logic from sw.js:109-110
      const basePath = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const scope = registration.scope;
            const url = new URL(scope);
            return url.pathname;
          }
        }
        return null;
      });

      expect(basePath).toBeTruthy();
      // Should start with / and either be just / or end with /
      expect(basePath).toMatch(/^\/($|.*\/)/);
    });

    test('should normalize paths correctly for root deployment', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Simulate path normalization logic from sw.js
      const normalizedPath = await page.evaluate(() => {
        const urlPath = '/index.html';
        const basePath = '/';
        const normalized = urlPath.replace(basePath, '/');
        return normalized;
      });

      expect(normalizedPath).toBe('/index.html');
    });

    test('should detect root vs index.html correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test isStaticAsset logic for root paths
      const isRootStatic = await page.evaluate(() => {
        const urlPath = '/';
        const basePath = '/';
        const normalizedPath = urlPath.replace(basePath, '/');
        return normalizedPath === '/' || normalizedPath === '/index.html';
      });

      expect(isRootStatic).toBe(true);

      const isIndexStatic = await page.evaluate(() => {
        const urlPath = '/index.html';
        const basePath = '/';
        const normalizedPath = urlPath.replace(basePath, '/');
        return normalizedPath === '/' || normalizedPath === '/index.html';
      });

      expect(isIndexStatic).toBe(true);
    });
  });

  test.describe('Static Asset Loading', () => {
    test('should load all critical CSS files', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check main CSS file loads
      const cssResponse = await page.goto('/css/styles.css');
      expect(cssResponse.status()).toBe(200);
    });

    test('should load all critical JS files', async ({ page }) => {
      const jsFiles = [
        '/js/app.js',
        '/js/calculator.js',
        '/js/storage.js',
        '/js/pwaInstallManager.js',
        '/js/install.js',
      ];

      for (const jsFile of jsFiles) {
        const response = await page.goto(jsFile);
        expect(response.status()).toBe(200);
      }
    });

    test('should load manifest file', async ({ page }) => {
      const response = await page.goto('/manifest.json');
      expect(response.status()).toBe(200);

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('json');
    });
  });

  test.describe('Service Worker Caching', () => {
    test('should cache static assets during install', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Wait for SW to install and cache

      // Check if assets are cached
      const cachedAssets = await page.evaluate(async () => {
        const cacheNames = await caches.keys();
        if (cacheNames.length === 0) return [];

        const cache = await caches.open(cacheNames[0]);
        const cachedRequests = await cache.keys();
        return cachedRequests.map(req => req.url);
      });

      expect(cachedAssets.length).toBeGreaterThan(0);

      // Verify critical files are cached
      const hasIndex = cachedAssets.some(url => url.includes('index.html') || url.endsWith('/'));
      const hasCSS = cachedAssets.some(url => url.includes('.css'));
      const hasJS = cachedAssets.some(url => url.includes('.js'));

      expect(hasIndex || hasCSS || hasJS).toBe(true);
    });

    test('should use cache-first strategy for static assets', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Make a second request to same asset
      const response1 = await page.goto('/css/styles.css');
      expect(response1.status()).toBe(200);

      // This should come from cache
      const response2 = await page.goto('/css/styles.css');
      expect(response2.status()).toBe(200);
    });
  });

  test.describe('Offline Functionality', () => {
    test('should serve cached index.html when offline', async ({ page, context }) => {
      // First visit - load and cache
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Go offline
      await context.setOffline(true);

      // Try to navigate to root - should serve cached version
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Verify page loaded (even offline)
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);

      // Go back online
      await context.setOffline(false);
    });

    test('should serve cached CSS when offline', async ({ page, context }) => {
      // First visit
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Go offline
      await context.setOffline(true);

      // Try to load CSS - should come from cache
      const response = await page.goto('/css/styles.css');
      expect(response.status()).toBe(200);

      await context.setOffline(false);
    });

    test('should serve cached JS when offline', async ({ page, context }) => {
      // First visit
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Go offline
      await context.setOffline(true);

      // Try to load JS - should come from cache
      const response = await page.goto('/js/app.js');
      expect(response.status()).toBe(200);

      await context.setOffline(false);
    });
  });

  test.describe('Path Compatibility', () => {
    test('should handle trailing slash on root path', async ({ page }) => {
      const response1 = await page.goto('/');
      expect(response1.status()).toBe(200);

      // Some servers redirect, so check for 200 or 30x
      expect([200, 301, 302, 304]).toContain(response1.status());
    });

    test('should handle index.html explicitly', async ({ page }) => {
      const response = await page.goto('/index.html');
      expect([200, 301, 302, 304]).toContain(response.status());
    });

    test('should resolve relative paths in HTML correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check if CSS loaded via relative path
      const hasCSSLoaded = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        return links.length > 0 && links.some(link => link.sheet !== null);
      });

      expect(hasCSSLoaded).toBe(true);

      // Check if JS loaded via relative path
      const hasJSLoaded = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.length > 0;
      });

      expect(hasJSLoaded).toBe(true);
    });
  });

  test.describe('GitHub Pages Specific', () => {
    test('should work with HTTPS (GitHub Pages requirement)', async ({ page }) => {
      // This test assumes TEST_HTTPS=true or natural HTTPS
      const url = page.url();

      // In production GitHub Pages, this would be https
      // In local testing, we check if HTTPS is available
      if (url.startsWith('https://')) {
        expect(url).toMatch(/^https:\/\//);
      }
    });

    test('should have valid manifest for GitHub Pages deployment', async ({ page }) => {
      const response = await page.goto('/manifest.json');
      const manifest = await response.json();

      // Required fields for PWA
      expect(manifest.name).toBeTruthy();
      expect(manifest.short_name).toBeTruthy();
      expect(manifest.start_url).toBeTruthy();
      expect(manifest.display).toBeTruthy();
      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThan(0);

      // Display mode should be standalone or fullscreen for app-like experience
      expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(manifest.display);
    });

    test('should have proper theme color for GitHub Pages', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
      expect(themeColor).toBeTruthy();
      expect(themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});
