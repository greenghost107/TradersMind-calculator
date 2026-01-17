/**
 * PWAInstallManager - Hooks-based PWA Installation Manager
 *
 * A vanilla JavaScript implementation of a hooks pattern for managing PWA installation state.
 * This module provides reusable installation logic that can be used across different UI frameworks.
 *
 * Features:
 * - State management (installation status, platform detection)
 * - Installation handlers (native prompt, manual installation)
 * - State persistence (localStorage)
 * - Analytics tracking
 * - Engagement scoring
 *
 * @class PWAInstallManager
 */
class PWAInstallManager {
    constructor() {
        // Private state properties
        this._deferredPrompt = null;
        this._isInstalled = false;
        this._isInstallable = false;
        this._isShowingPrompt = false;
        this._platform = null;
        this._browser = null;

        // Engagement tracking
        this._engagementScore = 0;
        this._sessionStart = Date.now();
        this._engagementEvents = {
            calculationCompleted: 0,
            inputChanged: 0,
            menuOpened: 0,
            settingsChanged: 0
        };

        // Event listeners for state changes
        this._stateChangeListeners = [];

        // Initialize
        this._init();
    }

    /**
     * Initialize the manager
     * @private
     */
    _init() {
        this._detectPlatform();
        this._detectBrowser();
        this._checkInstallationStatus();
        this._setupEventListeners();

        // Log initial diagnostics
        setTimeout(() => {
            const diagnostics = this.getInstallDiagnostics();
            console.log('[PWAInstallManager] Installation Diagnostics:', diagnostics);

            if (diagnostics.blockers.length > 0) {
                console.warn('[PWAInstallManager] Installation blockers:', diagnostics.blockers);
            }
        }, 1000);
    }

    /**
     * Setup event listeners for PWA installation events
     * @private
     */
    _setupEventListeners() {
        // Listen for beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWAInstallManager] Before install prompt triggered');
            e.preventDefault();
            this._deferredPrompt = e;
            this._isInstallable = true;
            this._isShowingPrompt = false;
            this._notifyStateChange();
        });

        // Listen for appinstalled
        window.addEventListener('appinstalled', () => {
            console.log('[PWAInstallManager] App installed successfully');
            this._isInstalled = true;
            this._isInstallable = false;
            this._deferredPrompt = null;
            this._isShowingPrompt = false;
            this.saveInstallState('accepted');
            this.trackInstallEvent();
            this._notifyStateChange();
        });

        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this._checkInstallationStatus();
            }
        });
    }

    /**
     * Notify all listeners of state changes
     * @private
     */
    _notifyStateChange() {
        this._stateChangeListeners.forEach(listener => {
            try {
                listener(this.getState());
            } catch (error) {
                console.error('[PWAInstallManager] Error in state change listener:', error);
            }
        });
    }

    /**
     * Add a state change listener
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    onStateChange(listener) {
        this._stateChangeListeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = this._stateChangeListeners.indexOf(listener);
            if (index > -1) {
                this._stateChangeListeners.splice(index, 1);
            }
        };
    }

    /**
     * Get current state
     * @returns {Object} Current state object
     */
    getState() {
        return {
            isInstalled: this._isInstalled,
            isInstallable: this._isInstallable,
            canInstall: this.canInstall(),
            platform: this._platform,
            browser: this._browser,
            isShowingPrompt: this._isShowingPrompt,
            hasDeferredPrompt: !!this._deferredPrompt,
            engagementScore: this._engagementScore,
            isStandalone: this.isStandalone()
        };
    }

    // ==================== Public Getters ====================

    get isInstalled() {
        return this._isInstalled;
    }

    get isInstallable() {
        return this._isInstallable;
    }

    get platform() {
        return this._platform;
    }

    get browser() {
        return this._browser;
    }

    get deferredPrompt() {
        return this._deferredPrompt;
    }

    get engagementScore() {
        return this._engagementScore;
    }

    // ==================== Core Installation Methods ====================

    /**
     * Install the app using native prompt
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async installApp() {
        console.log('[PWAInstallManager] installApp called');

        // Guard: Prevent duplicate prompts
        if (this._isShowingPrompt) {
            console.log('[PWAInstallManager] Install prompt already in progress');
            return { success: false, error: 'Prompt already showing' };
        }

        // Guard: Check if prompt is available
        if (!this._deferredPrompt) {
            console.log('[PWAInstallManager] No install prompt available');
            return { success: false, error: 'No prompt available' };
        }

        try {
            this._isShowingPrompt = true;
            this._notifyStateChange();

            console.log('[PWAInstallManager] Showing browser install prompt...');

            // Save that we're showing the prompt
            this.saveInstallState('shown');

            // Show the browser's native install prompt
            await this._deferredPrompt.prompt();
            console.log('[PWAInstallManager] Waiting for user choice...');

            // Wait for user response
            const { outcome } = await this._deferredPrompt.userChoice;
            console.log(`[PWAInstallManager] User choice: ${outcome}`);

            if (outcome === 'accepted') {
                console.log('[PWAInstallManager] User accepted the install prompt');
                this.saveInstallState('accepted');
                this.trackInstallAttempt('accepted');

                // Clear prompt (can only be used once)
                this._deferredPrompt = null;
                this._isInstallable = false;
                this._notifyStateChange();

                return { success: true };
            } else {
                console.log('[PWAInstallManager] User dismissed the install prompt');
                this.saveInstallState('dismissed');
                this.trackInstallAttempt('dismissed');

                // Clear prompt
                this._deferredPrompt = null;
                this._isInstallable = false;
                this._notifyStateChange();

                return { success: false, error: 'User dismissed' };
            }

        } catch (error) {
            console.error('[PWAInstallManager] Install prompt failed:', error);
            return { success: false, error: error.message };

        } finally {
            this._isShowingPrompt = false;
            this._notifyStateChange();
        }
    }

    /**
     * Mark the app as manually installed
     */
    markAsInstalled() {
        console.log('[PWAInstallManager] App manually marked as installed');

        this._isInstalled = true;
        this._isInstallable = false;
        this._deferredPrompt = null;

        this.saveInstallState('manual_install');
        this.trackInstallEvent();
        this._notifyStateChange();
    }

    /**
     * Dismiss the install prompt
     */
    dismissPrompt() {
        console.log('[PWAInstallManager] Install prompt dismissed');
        this.saveInstallState('dismissed');
        this.trackInstallAttempt('dismissed');
    }

    /**
     * Check if app can be installed
     * @returns {boolean}
     */
    canInstall() {
        return (this._isInstallable || this._platform === 'iOS') && !this._isInstalled;
    }

    /**
     * Check if app is running in standalone mode
     * @returns {boolean}
     */
    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }

    // ==================== Platform Detection ====================

    /**
     * Detect the platform
     * @private
     */
    _detectPlatform() {
        const ua = navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(ua)) {
            this._platform = 'iOS';
        } else if (this.isAndroidDevice()) {
            this._platform = 'Android';
        } else if (/Windows/.test(ua)) {
            this._platform = 'Windows';
        } else if (/Mac/.test(ua)) {
            this._platform = 'macOS';
        } else if (/Linux/.test(ua)) {
            this._platform = 'Linux';
        } else {
            this._platform = 'Unknown';
        }
    }

    /**
     * Detect the browser
     * @private
     */
    _detectBrowser() {
        const ua = navigator.userAgent;
        if (/Edg/.test(ua)) {
            this._browser = 'Edge';
        } else if (/Chrome/.test(ua) && !/Edg/.test(ua)) {
            this._browser = 'Chrome';
        } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
            this._browser = 'Safari';
        } else if (/Firefox/.test(ua)) {
            this._browser = 'Firefox';
        } else {
            this._browser = 'Unknown';
        }
    }

    /**
     * Detect browser type
     * @returns {string}
     */
    detectBrowser() {
        return this._browser;
    }

    /**
     * Detect platform type
     * @returns {string}
     */
    detectPlatform() {
        return this._platform;
    }

    /**
     * Check if running in iOS Safari
     * @returns {boolean}
     */
    isInIOSSafari() {
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);

        if (!isIOS) return false;

        // iOS Chrome has 'CriOS' in UA
        if (/CriOS/.test(ua)) return false;

        // iOS Firefox has 'FxiOS' in UA
        if (/FxiOS/.test(ua)) return false;

        // iOS Edge has 'EdgiOS' in UA
        if (/EdgiOS/.test(ua)) return false;

        // All other iOS browsers are Safari or WebView
        return true;
    }

    /**
     * Check if device is Android
     * @returns {boolean}
     */
    isAndroidDevice() {
        const ua = navigator.userAgent;

        // Primary: User Agent string check
        if (/Android/.test(ua)) {
            return true;
        }

        // Fallback 1: navigator.userAgentData (new API)
        if (navigator.userAgentData && navigator.userAgentData.platform) {
            const platform = navigator.userAgentData.platform.toLowerCase();
            if (platform.includes('android')) {
                return true;
            }
        }

        // Fallback 2: navigator.platform check
        if (navigator.platform) {
            const platform = navigator.platform.toLowerCase();
            if (platform.includes('android') || platform.includes('linux arm')) {
                return true;
            }
        }

        // Fallback 3: Check for Android-specific properties
        if ('ontouchstart' in window && /Linux/.test(ua) && !/X11/.test(ua)) {
            return true;
        }

        return false;
    }

    // ==================== Installation Instructions ====================

    /**
     * Get platform-specific installation instructions
     * @returns {Object} Instructions object with platform and steps
     */
    getInstallInstructions() {
        const isIOS = this._platform === 'iOS';
        const isAndroid = this._platform === 'Android';
        const hasPrompt = !!this._deferredPrompt;

        if (isIOS) {
            if (!this.isInIOSSafari()) {
                return {
                    platform: 'iOS (Wrong Browser)',
                    steps: [
                        'Copy this page\'s URL',
                        'Open Safari browser',
                        'Paste the URL in Safari',
                        'Follow the installation instructions in Safari'
                    ]
                };
            } else {
                return {
                    platform: 'iOS Safari',
                    steps: [
                        'Tap the Share button (square with arrow)',
                        'Scroll down and find "Add to Home Screen"',
                        'Tap "Add" to confirm',
                        'The app icon will appear on your home screen'
                    ]
                };
            }
        } else if (hasPrompt) {
            return {
                platform: this._platform,
                steps: [
                    'Click the "Install" button',
                    'Confirm installation in the browser prompt',
                    'The app will be added to your device'
                ]
            };
        } else if (isAndroid) {
            return {
                platform: 'Android',
                steps: [
                    'Tap the menu button (⋮) in the top right',
                    'Look for "Install app" or "Add to Home screen"',
                    'Tap "Install" to add to your home screen'
                ]
            };
        } else {
            return {
                platform: 'Desktop',
                steps: [
                    'Look for an install icon (⊕) in the address bar',
                    'Or open the browser menu and select "Install app"',
                    'Follow the prompts to install'
                ]
            };
        }
    }

    // ==================== State Persistence ====================

    /**
     * Get install history from localStorage
     * @returns {Array}
     */
    getInstallHistory() {
        const history = localStorage.getItem('pwa_install_history');
        return history ? JSON.parse(history) : [];
    }

    /**
     * Save install state to localStorage
     * @param {string} outcome - Outcome type (shown, accepted, dismissed, etc.)
     */
    saveInstallState(outcome) {
        const history = this.getInstallHistory();
        history.push({
            timestamp: Date.now(),
            platform: this._platform,
            browser: this._browser,
            outcome: outcome,
            engagementScore: this._engagementScore
        });

        // Keep only last 10 entries
        if (history.length > 10) {
            history.shift();
        }

        localStorage.setItem('pwa_install_history', JSON.stringify(history));
        console.log('[PWAInstallManager] Install state saved:', outcome);
    }

    /**
     * Check if we should show install prompt
     * @returns {boolean}
     */
    shouldShowInstallPrompt() {
        const history = this.getInstallHistory();
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

        // Check if user dismissed recently
        const recentDismiss = history.find(h =>
            h.outcome === 'dismissed' &&
            h.timestamp > sevenDaysAgo
        );

        if (recentDismiss) {
            console.log('[PWAInstallManager] User dismissed install within last 7 days');
            return false;
        }

        // Check if already accepted
        const accepted = history.find(h => h.outcome === 'accepted');
        if (accepted) {
            console.log('[PWAInstallManager] User already accepted install');
            return false;
        }

        return true;
    }

    /**
     * Check installation status
     * @private
     */
    _checkInstallationStatus() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('[PWAInstallManager] App running in standalone mode');
            this._isInstalled = true;
        } else if (window.navigator.standalone === true) {
            console.log('[PWAInstallManager] App running in iOS standalone mode');
            this._isInstalled = true;
        } else {
            this._isInstalled = false;
        }

        this._notifyStateChange();
    }

    // ==================== Engagement Tracking ====================

    /**
     * Track engagement event
     * @param {string} eventType - Type of engagement event
     */
    trackEngagement(eventType) {
        if (this._engagementEvents.hasOwnProperty(eventType)) {
            this._engagementEvents[eventType]++;
            this._calculateEngagementScore();
        }
    }

    /**
     * Calculate engagement score
     * @private
     */
    _calculateEngagementScore() {
        const timeOnPage = (Date.now() - this._sessionStart) / 1000; // seconds
        const actions = Object.values(this._engagementEvents).reduce((a, b) => a + b, 0);

        // Score formula: time weight + action weight
        this._engagementScore = (timeOnPage * 0.5) + (actions * 5);

        console.log('[PWAInstallManager] Engagement score:', this._engagementScore.toFixed(1), {
            timeOnPage: timeOnPage.toFixed(1) + 's',
            actions: actions,
            breakdown: this._engagementEvents
        });
    }

    // ==================== Analytics ====================

    /**
     * Track install event
     */
    trackInstallEvent() {
        console.log('[PWAInstallManager] App installation completed');

        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install', {
                event_category: 'engagement',
                event_label: 'successful_install'
            });
        }
    }

    /**
     * Track install attempt
     * @param {string} outcome - Outcome of the attempt
     */
    trackInstallAttempt(outcome) {
        console.log(`[PWAInstallManager] Install attempt: ${outcome}`);

        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install_prompt', {
                event_category: 'engagement',
                event_label: outcome
            });
        }
    }

    // ==================== Diagnostics ====================

    /**
     * Get installation diagnostics
     * @returns {Object} Diagnostic information
     */
    getInstallDiagnostics() {
        const diag = {
            timestamp: new Date().toISOString(),
            protocol: window.location.protocol,
            isHTTPS: window.location.protocol === 'https:',
            isLocalhost: window.location.hostname === 'localhost',
            browser: this._browser,
            platform: this._platform,
            isStandalone: this.isStandalone(),
            hasServiceWorker: 'serviceWorker' in navigator,
            serviceWorkerRegistered: false,
            manifestLinked: !!document.querySelector('link[rel="manifest"]'),
            beforeInstallPromptSupport: 'onbeforeinstallprompt' in window,
            beforeInstallPromptFired: !!this._deferredPrompt,
            installationPossible: false,
            blockers: []
        };

        // Check service worker registration
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            diag.serviceWorkerRegistered = true;
        }

        // Determine if installation is possible
        if (diag.isStandalone) {
            diag.installationPossible = true;
            diag.status = 'Already installed';
        } else if (diag.platform === 'iOS') {
            diag.installationPossible = true;
            diag.status = 'Use Safari Share menu to install';
        } else if (diag.beforeInstallPromptFired) {
            diag.installationPossible = true;
            diag.status = 'Ready to install via browser prompt';
        } else {
            diag.status = 'Installation not available';

            // Identify blockers
            if (!diag.isHTTPS && !diag.isLocalhost) {
                diag.blockers.push('HTTPS required (currently using HTTP)');
            }
            if (!diag.serviceWorkerRegistered) {
                diag.blockers.push('Service worker not registered');
            }
            if (!diag.manifestLinked) {
                diag.blockers.push('Manifest not linked in HTML');
            }
            if (!diag.beforeInstallPromptSupport) {
                diag.blockers.push('Browser does not support install prompts');
            }
        }

        return diag;
    }

    /**
     * Get installation status summary
     * @returns {Object} Status summary
     */
    getInstallationStatus() {
        return {
            isInstalled: this._isInstalled,
            isInstallable: this._isInstallable,
            canInstall: this.canInstall(),
            isStandalone: this.isStandalone(),
            hasServiceWorker: 'serviceWorker' in navigator,
            supportsManifest: 'manifest' in document.createElement('link')
        };
    }
}

// Export as global (for vanilla JS) or as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PWAInstallManager;
} else {
    window.PWAInstallManager = PWAInstallManager;
}
