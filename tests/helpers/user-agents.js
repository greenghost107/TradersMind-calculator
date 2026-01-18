/**
 * User agent strings for testing PWA installation across different platforms
 */

export const USER_AGENTS = {
  // iOS Safari (native browser - supports manual installation)
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  iosSafari17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  iosSafariIPad: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',

  // iOS Other Browsers (should redirect to Safari)
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/108.0.5359.112 Mobile/15E148 Safari/604.1',
  iosFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/108.0 Mobile/15E148 Safari/605.1.15',
  iosEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/108.0.1462.62 Mobile/15E148 Safari/605.1.15',

  // Android Chrome (supports beforeinstallprompt)
  androidChrome: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
  androidChrome12: 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36',
  androidChromeTablet: 'Mozilla/5.0 (Linux; Android 13; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',

  // Android Other Browsers
  androidFirefox: 'Mozilla/5.0 (Android 13; Mobile; rv:108.0) Gecko/108.0 Firefox/108.0',
  androidEdge: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36 EdgA/108.0.1462.62',
  androidSamsung: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.0.0 Mobile Safari/537.36',

  // Desktop Windows
  windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',
  windowsFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:108.0) Gecko/20100101 Firefox/108.0',

  // Desktop macOS
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
  macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:108.0) Gecko/20100101 Firefox/108.0',
  macEdge: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.54',

  // Desktop Linux
  linuxChrome: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  linuxFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:108.0) Gecko/20100101 Firefox/108.0',
};

/**
 * Mock user agent for Playwright page
 * @param {import('@playwright/test').Page} page
 * @param {string} userAgent
 */
export async function mockUserAgent(page, userAgent) {
  await page.addInitScript((ua) => {
    Object.defineProperty(navigator, 'userAgent', {
      get: () => ua,
      configurable: true
    });
  }, userAgent);
}

/**
 * Helper functions for user agent testing
 */
export const userAgentHelpers = {
  /**
   * Check if a user agent string represents iOS Safari
   */
  isIOSSafari(userAgent) {
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);
    return isIOS && isSafari;
  },

  /**
   * Check if a user agent string represents iOS but not Safari
   */
  isIOSWrongBrowser(userAgent) {
    const isIOS = /iPhone|iPad|iPod/.test(userAgent);
    const isNotSafari = /CriOS|FxiOS|EdgiOS/.test(userAgent);
    return isIOS && isNotSafari;
  },

  /**
   * Check if a user agent string represents Android Chrome
   */
  isAndroidChrome(userAgent) {
    const isAndroid = /Android/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/EdgA/.test(userAgent);
    return isAndroid && isChrome;
  },

  /**
   * Check if a user agent string represents a desktop browser
   */
  isDesktop(userAgent) {
    return /Windows|Macintosh|Linux/.test(userAgent) && !/Mobile/.test(userAgent);
  },

  /**
   * Get platform name from user agent
   */
  getPlatformName(userAgent) {
    if (this.isIOSSafari(userAgent)) return 'iOS Safari';
    if (this.isIOSWrongBrowser(userAgent)) return 'iOS Wrong Browser';
    if (this.isAndroidChrome(userAgent)) return 'Android Chrome';
    if (this.isDesktop(userAgent)) return 'Desktop';
    return 'Unknown';
  },
};
