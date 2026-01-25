/**
 * PWAInstaller - Presentation Layer for PWA Installation
 *
 * This class handles the UI/UX for PWA installation, delegating all state
 * management and business logic to PWAInstallManager.
 */

// Configuration constants for beforeinstallprompt timing
const PROMPT_WAIT_TIMEOUT = 5000; // Wait up to 5 seconds for beforeinstallprompt
const PROMPT_CHECK_INTERVAL = 100; // Check every 100ms

class PWAInstaller {
    constructor() {
        // Use the PWAInstallManager for all state management
        this.manager = new PWAInstallManager();

        // UI elements
        this.installButton = null;
        this.pwaModal = null;
        this.pwaCloseBtn = null;
        this.pwaInstallAction = null;
        this.pwaLaterBtn = null;
        this.pwaInstructions = null;
        this.settingsMenuBtn = null;
        this.settingsDropdown = null;
        this.menuInstallBtn = null;
        this.menuInstallText = null;

        // Auto-prompt interval
        this.engagementCheckInterval = null;
        this.autoPromptInterval = null;

        this.init();
    }

    async init() {
        this.bindElements();
        await this.registerServiceWorker();
        await this.waitForServiceWorkerReady();
        this.attachEventListeners();
        this.initEngagementTracking();
        this.initAutoPrompt();

        // Subscribe to manager state changes
        this.manager.onStateChange((state) => {
            this.updateUI(state);

            // If prompt becomes available while modal is open, update instructions
            if (this.pwaModal && !this.pwaModal.classList.contains('hidden')) {
                this.updateModalInstructions();
            }
        });

        // Initial UI update
        this.updateUI(this.manager.getState());

        // Listen for service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SW_INSTALLED') {
                    console.log('[PWAInstaller] Service worker signaled installation complete');
                    this.updateInstallButtonVisibility();
                }
            });
        }
    }

    bindElements() {
        this.installButton = document.getElementById('install-btn');
        this.pwaModal = document.getElementById('pwa-install-modal');
        this.pwaCloseBtn = document.getElementById('pwa-close-btn');
        this.pwaInstallAction = document.getElementById('pwa-install-action');
        this.pwaLaterBtn = document.getElementById('pwa-later-btn');
        this.pwaInstructions = document.getElementById('pwa-instructions');

        // Settings menu elements
        this.settingsMenuBtn = document.getElementById('settings-menu-btn');
        this.settingsDropdown = document.getElementById('settings-dropdown');
        this.menuInstallBtn = document.getElementById('menu-install-btn');
        this.menuInstallText = document.getElementById('menu-install-text');
    }

    // Engagement tracking methods (delegated to manager)
    initEngagementTracking() {
        // Track calculation completion
        document.addEventListener('calculation-complete', () => {
            this.manager.trackEngagement('calculationCompleted');
            this.checkAutoInstallReadiness();
        });

        // Track input changes
        document.addEventListener('input', () => {
            this.manager.trackEngagement('inputChanged');
            this.checkAutoInstallReadiness();
        });

        // Track menu opens
        if (this.settingsMenuBtn) {
            this.settingsMenuBtn.addEventListener('click', () => {
                this.manager.trackEngagement('menuOpened');
                this.checkAutoInstallReadiness();
            });
        }

        console.log('[PWAInstaller] Engagement tracking initialized');
    }

    checkAutoInstallReadiness() {
        const state = this.manager.getState();

        // Conditions for auto-showing install prompt
        const isReady = state.engagementScore >= 30 && // 1 minute + 3 actions
                        !state.isInstalled &&
                        !state.isShowingPrompt &&
                        this.manager.shouldShowInstallPrompt(); // Check history

        if (isReady && (state.hasDeferredPrompt || state.platform === 'iOS')) {
            console.log('[PWAInstaller] Auto-triggering install prompt based on engagement');
            this.autoShowInstallPrompt();
        }
    }


    // Smart auto-prompt system
    initAutoPrompt() {
        // Check conditions every 10 seconds
        this.autoPromptInterval = setInterval(() => {
            if (this.shouldAutoShowPrompt()) {
                this.autoShowInstallPrompt();
                clearInterval(this.autoPromptInterval); // Only show once
            }
        }, 10000);
    }

    shouldAutoShowPrompt() {
        const state = this.manager.getState();
        return (
            state.engagementScore >= 30 && // Engaged user
            !state.isInstalled && // Not already installed
            !state.isShowingPrompt && // Not currently showing
            this.manager.shouldShowInstallPrompt() && // Haven't dismissed recently
            (state.hasDeferredPrompt || state.platform === 'iOS') // Prompt available or iOS
        );
    }

    autoShowInstallPrompt() {
        console.log('[PWAInstaller] Auto-showing install prompt based on engagement');

        const state = this.manager.getState();

        if (state.platform === 'iOS') {
            // iOS: Show modal with share button
            this.showInstallModal();
        } else if (state.hasDeferredPrompt) {
            // Android/Desktop with prompt: Show native
            this.showInstallPrompt();
        } else {
            // Fallback: Show modal with instructions
            this.showInstallModal();
        }

        this.manager.saveInstallState('auto_shown');
    }

    // Notification permission request
    async requestNotificationPermission() {
        // Only request if available and not already granted/denied
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                const permission = await Notification.requestPermission();

                if (permission === 'granted') {
                    console.log('[PWAInstaller] Notification permission granted');
                    // This counts as engagement with PWA features
                    this.manager.trackEngagement('settingsChanged');
                }
            } catch (err) {
                console.log('[PWAInstaller] Notification permission request failed:', err);
            }
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Wait for the page to be fully loaded and add a small delay
                // This ensures Chrome has time to evaluate PWA installability
                if (document.readyState !== 'complete') {
                    await new Promise(resolve => window.addEventListener('load', resolve));
                }
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for Chrome

                console.log('[PWAInstaller] Registering service worker...');

                // Dynamically resolve the service worker path based on the current location
                const swPath = new URL('sw.js', window.location.href).href;
                const registration = await navigator.serviceWorker.register(swPath, {
                    scope: new URL('./', window.location.href).href
                });

                console.log('[PWAInstaller] Service worker registered successfully:', registration.scope);

                registration.addEventListener('updatefound', () => {
                    console.log('[PWAInstaller] New service worker found');
                    this.handleServiceWorkerUpdate(registration);
                });

                if (navigator.serviceWorker.controller) {
                    console.log('[PWAInstaller] Service worker is controlling the page');
                }

            } catch (error) {
                console.error('[PWAInstaller] Service worker registration failed:', error);
            }
        } else {
            console.warn('[PWAInstaller] Service workers not supported');
        }
    }

    async waitForServiceWorkerReady() {
        if (!('serviceWorker' in navigator)) return false;

        return new Promise((resolve) => {
            if (navigator.serviceWorker.controller) {
                console.log('[PWAInstaller] Service worker already controlling the page');
                resolve(true);
                return;
            }

            navigator.serviceWorker.ready.then((registration) => {
                if (registration.active) {
                    console.log('[PWAInstaller] Service worker is now ready');
                    resolve(true);
                } else {
                    console.log('[PWAInstaller] Service worker registered but not active');
                    resolve(false);
                }
            }).catch(() => {
                console.error('[PWAInstaller] Service worker ready check failed');
                resolve(false);
            });
        });
    }

    async isServiceWorkerReady() {
        if (!('serviceWorker' in navigator)) {
            console.log('[PWAInstaller] Service workers not supported');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            const isReady = registration.active !== null;
            console.log('[PWAInstaller] Service worker ready:', isReady);
            return isReady;
        } catch (error) {
            console.error('[PWAInstaller] Error checking service worker:', error);
            return false;
        }
    }

    handleServiceWorkerUpdate(registration) {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWAInstaller] New service worker available');
                this.showUpdateNotification();
            }
        });
    }

    showUpdateNotification() {
        if (confirm('A new version is available. Update now?')) {
            // Tell service worker to skip waiting and activate immediately
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SKIP_WAITING'
                });
            }
            // Reload after a short delay to let the message be processed
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } else {
            // User declined - update will happen on next page load
            console.log('[PWAInstaller] User deferred update');
        }
    }

    attachEventListeners() {
        // Note: beforeinstallprompt and appinstalled are handled by PWAInstallManager
        // We just need to respond to those state changes via our state change listener

        // Additional UI handling for appinstalled event
        window.addEventListener('appinstalled', () => {
            this.hideInstallModal();
        });

        if (this.installButton) {
            this.installButton.addEventListener('click', () => {
                console.log('[PWAInstaller] FAB install button clicked');
                this.handleInstallButtonClick();
            });
        }

        // Settings menu toggle
        if (this.settingsMenuBtn) {
            this.settingsMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSettingsMenu();
            });
        }

        // Menu install button click
        if (this.menuInstallBtn) {
            this.menuInstallBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[PWAInstaller] Menu install button clicked');

                this.closeSettingsMenu();
                setTimeout(() => {
                    this.handleInstallButtonClick();
                }, 100);
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.settingsDropdown &&
                !this.settingsDropdown.contains(e.target) &&
                !this.settingsMenuBtn.contains(e.target)) {
                this.closeSettingsMenu();
            }
        });

        // Close menu on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isMenuOpen()) {
                    this.closeSettingsMenu();
                    this.settingsMenuBtn.focus();
                } else if (this.pwaModal && !this.pwaModal.classList.contains('hidden')) {
                    // Close modal if open
                    this.hideInstallModal();
                }
            }
        });

        if (this.pwaCloseBtn) {
            this.pwaCloseBtn.addEventListener('click', () => {
                this.hideInstallModal();
            });
        }

        if (this.pwaInstallAction) {
            this.pwaInstallAction.addEventListener('click', async () => {
                console.log('[PWAInstaller] Install action button clicked');

                const action = this.pwaInstallAction.getAttribute('data-action');

                if (action === 'install') {
                    // Has native prompt - trigger it
                    await this.showInstallPrompt();
                } else if (action === 'retry-install') {
                    // Retry install flow
                    console.log('[PWAInstaller] Retrying install...');
                    this.hideInstallModal();
                    setTimeout(() => {
                        this.handleInstallButtonClick();
                    }, 100);
                } else if (action === 'close') {
                    // iOS or waiting for engagement - just close modal
                    this.hideInstallModal();
                } else if (action === 'mark-installed') {
                    // User confirms they've manually installed
                    this.markAsInstalled();
                    this.hideInstallModal();
                } else if (action === 'copy-url') {
                    // iOS wrong browser - copy URL to clipboard
                    try {
                        await navigator.clipboard.writeText(window.location.href);
                        // Update button to show success (keep modal open so user can read all steps)
                        const originalText = this.pwaInstallAction.textContent;
                        this.pwaInstallAction.textContent = '✓ URL Copied!';
                        this.pwaInstallAction.classList.add('success');

                        // Reset button after 2 seconds but keep modal open
                        setTimeout(() => {
                            this.pwaInstallAction.textContent = originalText;
                            this.pwaInstallAction.classList.remove('success');
                        }, 2000);
                    } catch (err) {
                        console.error('[PWAInstaller] Failed to copy URL:', err);
                        // Fallback: show URL to copy manually
                        alert('Copy this URL:\n\n' + window.location.href);
                    }
                }
                // If action is 'hidden', this handler won't fire (button is hidden)
            });
        }

        if (this.pwaLaterBtn) {
            this.pwaLaterBtn.addEventListener('click', () => {
                this.hideInstallModal();
            });
        }

        if (this.pwaModal) {
            this.pwaModal.addEventListener('click', (e) => {
                if (e.target === this.pwaModal) {
                    this.hideInstallModal();
                }
            });
        }

    }

    async showInstallPrompt() {
        console.log('[PWAInstaller] showInstallPrompt called');

        // Hide modal if visible (with small delay to preserve user gesture)
        if (this.pwaModal && !this.pwaModal.classList.contains('hidden')) {
            this.hideInstallModal();
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Delegate to manager
        const result = await this.manager.installApp();

        if (!result.success) {
            console.log('[PWAInstaller] Install prompt not available, showing manual instructions');
            this.showManualInstallInstructions();
        }
    }

    async handleInstallButtonClick() {
        console.log('[PWAInstaller] handleInstallButtonClick called');

        const state = this.manager.getState();
        console.log('[PWAInstaller] deferredPrompt available:', state.hasDeferredPrompt);

        // HAPPY PATH: Native prompt already available - trigger immediately
        if (state.hasDeferredPrompt) {
            console.log('[PWAInstaller] Triggering native install prompt directly');
            const result = await this.manager.installApp();

            if (result.success) {
                console.log('[PWAInstaller] User accepted installation');
            } else {
                console.log('[PWAInstaller] User dismissed or error');
            }
            return;
        }

        // WAITING PATH: Show modal with loading state
        console.log('[PWAInstaller] No prompt yet, showing waiting state...');
        this.showInstallModal(true); // Skip updateModalInstructions
        this.showWaitingForPromptState();

        // Wait LONGER for Chrome to fire beforeinstallprompt
        const gotPrompt = await this.waitForPrompt(PROMPT_WAIT_TIMEOUT);

        if (gotPrompt) {
            console.log('[PWAInstaller] Prompt became available during wait');
            this.hideInstallModal();
            await new Promise(resolve => setTimeout(resolve, 50));

            const result = await this.manager.installApp();
            if (!result.success) {
                this.showInstallModal();
                this.updateModalInstructions();
            }
            return;
        }

        // FALLBACK: No prompt after extended wait
        console.log('[PWAInstaller] Timeout reached, showing manual instructions');
        this.updateModalInstructions();
    }

    /**
     * Waits for the beforeinstallprompt event to fire
     * @param {number} timeoutMs - Maximum time to wait in milliseconds
     * @returns {Promise<boolean>} - True if prompt became available
     */
    waitForPrompt(timeoutMs) {
        return new Promise((resolve) => {
            console.log(`[PWAInstaller] Waiting up to ${timeoutMs}ms for beforeinstallprompt...`);

            // Check immediately
            if (this.manager.getState().hasDeferredPrompt) {
                console.log('[PWAInstaller] Prompt already available');
                resolve(true);
                return;
            }

            let elapsed = 0;

            const intervalId = setInterval(() => {
                elapsed += PROMPT_CHECK_INTERVAL;

                if (this.manager.getState().hasDeferredPrompt) {
                    console.log(`[PWAInstaller] Prompt available after ${elapsed}ms`);
                    clearInterval(intervalId);
                    resolve(true);
                    return;
                }

                if (elapsed >= timeoutMs) {
                    console.log(`[PWAInstaller] Timeout after ${elapsed}ms`);
                    clearInterval(intervalId);
                    resolve(false);
                    return;
                }

                // Log progress at 1-second intervals for debugging
                if (elapsed % 1000 === 0) {
                    console.log(`[PWAInstaller] Waiting... ${elapsed}ms`);
                }
            }, PROMPT_CHECK_INTERVAL);
        });
    }

    /**
     * Show loading/waiting state while waiting for beforeinstallprompt
     */
    showWaitingForPromptState() {
        if (!this.pwaInstructions) return;

        this.pwaInstructions.innerHTML = `
            <div class="install-instructions android waiting">
                <h3>Checking Installation...</h3>
                <div class="loading-spinner"></div>
                <p class="waiting-message">Please wait while we check if your device supports direct installation.</p>
                <p class="waiting-hint">This usually takes a few seconds...</p>
            </div>
        `;

        if (this.pwaInstallAction) {
            this.pwaInstallAction.textContent = 'Checking...';
            this.pwaInstallAction.disabled = true;
            this.pwaInstallAction.setAttribute('data-action', 'waiting');
        }
    }

    showInstallModal(skipInstructions = false) {
        if (!this.pwaModal) return;

        if (!skipInstructions) {
            this.updateModalInstructions();
        }
        this.pwaModal.classList.remove('hidden');

        // iOS-compatible scroll prevention
        document.body.classList.add('modal-open');
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
    }

    hideInstallModal() {
        if (!this.pwaModal) return;

        this.pwaModal.classList.add('hidden');

        // Reset iOS scroll prevention
        document.body.classList.remove('modal-open');
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
    }

    updateModalInstructions() {
        if (!this.pwaInstructions) return;

        const state = this.manager.getState();
        const isIOS = state.platform === 'iOS';
        const isAndroid = state.platform === 'Android';
        const hasPrompt = state.hasDeferredPrompt;
        const isHTTPS = window.__TEST_HTTPS__ || window.location.protocol === 'https:';

        // Get diagnostics to understand WHY prompt isn't available
        const diag = this.manager.getInstallDiagnostics();

        console.log('[PWAInstaller] Modal instructions:', { isIOS, isAndroid, hasPrompt, isHTTPS });

        let instructionHTML = '';
        let buttonText = 'Add to Home Screen';
        let buttonAction = 'install'; // 'install', 'close', or 'hidden'

        // iOS: Safari Share menu flow (no native prompt API)
        if (isIOS) {
            if (!this.manager.isInIOSSafari()) {
                // User is on iOS but not in Safari - Need to copy URL and switch browsers
                instructionHTML = `
                    <div class="install-instructions ios error">
                        <h3>Switch to Safari</h3>
                        <p>To install this app, you need to open it in Safari.</p>
                        <div class="install-guide">
                            <div class="step-container">
                                <div class="step-number">1</div>
                                <div class="step-content">
                                    <p><strong>Copy the URL</strong> by tapping the button below</p>
                                </div>
                            </div>
                            <div class="step-container">
                                <div class="step-number">2</div>
                                <div class="step-content">
                                    <p><strong>Open Safari</strong> on your device</p>
                                </div>
                            </div>
                            <div class="step-container">
                                <div class="step-number">3</div>
                                <div class="step-content">
                                    <p><strong>Paste the URL</strong> in Safari's address bar</p>
                                </div>
                            </div>
                            <div class="step-container">
                                <div class="step-number">4</div>
                                <div class="step-content">
                                    <p><strong>Follow the installation instructions</strong> in Safari</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                buttonText = 'Copy URL';
                buttonAction = 'copy-url';
            } else {
                // User is in Safari - Show manual instructions (Web Share API doesn't work for PWA installation)
                instructionHTML = `
                    <div class="install-instructions ios">
                        <h3>Install on iPhone/iPad</h3>
                        <p>To add this app to your home screen:</p>
                        <div class="ios-visual-guide">
                            <div class="step-container">
                                <div class="step-number">1</div>
                                <div class="step-content">
                                    <p><strong>Tap the Share button</strong> <span class="safari-share-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                                        </svg>
                                    </span></p>
                                    <p class="location-hint">
                                        <span class="device-specific">
                                            • <strong>iPhone:</strong> Bottom center of screen<br>
                                            • <strong>iPad:</strong> Top right corner
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div class="step-container">
                                <div class="step-number">2</div>
                                <div class="step-content">
                                    <p><strong>Scroll down</strong> in the Share menu</p>
                                    <p class="location-hint">Find <strong>"Add to Home Screen"</strong></p>
                                </div>
                            </div>

                            <div class="step-container">
                                <div class="step-number">3</div>
                                <div class="step-content">
                                    <p><strong>Tap "Add"</strong> to confirm</p>
                                    <p class="location-hint">The app icon will appear on your home screen</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                buttonText = '✓ I\'ve installed it';
                buttonAction = 'mark-installed';
            }
        }
        // Has native prompt support (Chrome/Edge with beforeinstallprompt)
        else if (hasPrompt) {
            instructionHTML = `
                <div class="install-instructions chrome">
                    <h3>Install This App</h3>
                    <p>Click the button below to install TradersMind Calculator as an app on your device.</p>
                    <p class="benefit">✓ Works offline &nbsp;|&nbsp; ✓ Fast access &nbsp;|&nbsp; ✓ App-like experience</p>
                </div>
            `;
            buttonText = 'Install Now';
            buttonAction = 'install'; // Button will trigger native prompt
        }
        // Android without prompt - check WHY
        else if (isAndroid) {
            // Diagnose why prompt isn't available
            if (!isHTTPS) {
                instructionHTML = `
                    <div class="install-instructions android error">
                        <h3>Installation Not Available</h3>
                        <p class="warning">⚠️ <strong>HTTPS Required:</strong> This app must be accessed via HTTPS to enable installation.</p>
                        <p>Please access this app through a secure HTTPS URL to install it.</p>
                    </div>
                `;
                buttonAction = 'hidden';
            } else if (!diag.serviceWorkerRegistered) {
                instructionHTML = `
                    <div class="install-instructions android error">
                        <h3>Installation Loading...</h3>
                        <p class="note">⏳ The app is still setting up. Please wait a moment and try again.</p>
                        <p>If this message persists, try refreshing the page.</p>
                    </div>
                `;
                buttonText = 'Try Again';
                buttonAction = 'close'; // Close and let user retry
            } else if (!diag.beforeInstallPromptSupport) {
                instructionHTML = `
                    <div class="install-instructions android error">
                        <h3>Browser Not Supported</h3>
                        <p class="warning">⚠️ Your current browser doesn't support app installation.</p>
                        <p>To install this app, please open it in <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or <strong>Samsung Internet</strong>.</p>
                    </div>
                `;
                buttonAction = 'hidden';
            } else {
                // Browser supports PWA, show manual install instructions immediately
                instructionHTML = `
                    <div class="install-instructions android">
                        <h3>Install This App</h3>
                        <p>To add TradersMind Calculator to your home screen:</p>
                        <div class="install-guide">
                            <ol class="install-steps">
                                <li>
                                    <strong>Tap the menu button</strong> <span class="browser-icon">⋮</span>
                                    <span class="location-hint">(top right corner)</span>
                                </li>
                                <li>Look for <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                                <li>Tap <strong>"Install"</strong> to confirm</li>
                            </ol>
                        </div>
                    </div>
                `;
                buttonText = '✓ I\'ve installed it';
                buttonAction = 'mark-installed';
            }
        }
        // Desktop without prompt
        else {
            if (!isHTTPS) {
                instructionHTML = `
                    <div class="install-instructions desktop error">
                        <h3>Installation Not Available</h3>
                        <p class="warning">⚠️ <strong>HTTPS Required:</strong> This app must be accessed via HTTPS to enable installation.</p>
                        <p>Please access this app through a secure HTTPS URL.</p>
                    </div>
                `;
                buttonAction = 'hidden';
            } else if (!diag.beforeInstallPromptSupport) {
                instructionHTML = `
                    <div class="install-instructions desktop">
                        <h3>Manual Installation</h3>
                        <p>Your browser doesn't support automatic installation prompts.</p>
                        <p>To install this app:</p>
                        <ol>
                            <li>Look for an <strong>install icon</strong> (⊕) in your browser's address bar</li>
                            <li>Or open your browser's <strong>menu</strong> and select "Install app"</li>
                            <li>Follow the prompts to install</li>
                        </ol>
                        <p class="supported-browsers">Supported browsers: Chrome, Edge, Opera</p>
                    </div>
                `;
                buttonText = 'Got It';
                buttonAction = 'close';
            } else {
                // Engagement requirement not met
                instructionHTML = `
                    <div class="install-instructions desktop">
                        <h3>Installation Available Soon</h3>
                        <p class="note">💡 Your browser supports app installation, but requires some interaction first.</p>
                        <p>Try using the app for a moment, then check your browser's address bar for an install icon (⊕).</p>
                    </div>
                `;
                buttonText = '✓ I\'ve installed it';
                buttonAction = 'mark-installed';
            }
        }

        this.pwaInstructions.innerHTML = instructionHTML;

        // Handle install button visibility and action
        if (this.pwaInstallAction) {
            if (buttonAction === 'hidden') {
                this.pwaInstallAction.classList.add('hidden');
            } else {
                this.pwaInstallAction.classList.remove('hidden');
                this.pwaInstallAction.textContent = buttonText;

                // Re-enable button (in case it was disabled during waiting state)
                this.pwaInstallAction.disabled = false;

                // Store button action type for click handler
                this.pwaInstallAction.setAttribute('data-action', buttonAction);
            }
        }

        // Update footer classes based on button action
        const footer = this.pwaModal?.querySelector('.pwa-modal-footer');
        if (footer) {
            if (buttonAction === 'mark-installed') {
                footer.classList.add('manual-flow');
                this.pwaInstallAction.classList.add('mark-installed');
            } else {
                footer.classList.remove('manual-flow');
                this.pwaInstallAction.classList.remove('mark-installed');
            }
        }
    }

    showManualInstallInstructions() {
        this.showInstallModal();
    }

    markAsInstalled() {
        console.log('[PWAInstaller] User manually marked app as installed');

        // Delegate to manager
        this.manager.markAsInstalled();

        // Update UI
        this.updateInstallButtonVisibility();
    }

    async updateInstallButtonVisibility() {
        const state = this.manager.getState();

        // Check if service worker is ready (required for Android)
        const isIOS = state.platform === 'iOS';
        const swReady = await this.isServiceWorkerReady();
        if (!swReady && !isIOS) {
            console.log('[PWAInstaller] Service worker not ready yet, waiting...');
            return;
        }

        // Update floating action button
        if (this.installButton) {
            if (state.isStandalone) {
                // Already installed
                this.installButton.classList.add('hidden');
                this.installButton.setAttribute('aria-hidden', 'true');
            } else {
                // Show install button for all non-installed scenarios
                this.installButton.classList.remove('hidden');
                this.installButton.setAttribute('aria-hidden', 'false');
            }
        }

        // Update menu item state if menu is open
        if (this.isMenuOpen()) {
            this.updateMenuInstallState();
        }

        console.log(`[PWAInstaller] Install button state:`, {
            isStandalone: state.isStandalone,
            hasPromptSupport: state.hasDeferredPrompt,
            visible: !state.isStandalone
        });
    }

    // Settings Menu Methods
    toggleSettingsMenu() {
        if (this.isMenuOpen()) {
            this.closeSettingsMenu();
        } else {
            this.openSettingsMenu();
        }
    }

    openSettingsMenu() {
        if (!this.settingsDropdown || !this.settingsMenuBtn) return;

        this.settingsDropdown.classList.remove('hidden');
        this.settingsMenuBtn.setAttribute('aria-expanded', 'true');
        this.updateMenuInstallState();
    }

    closeSettingsMenu() {
        if (!this.settingsDropdown || !this.settingsMenuBtn) return;

        this.settingsDropdown.classList.add('hidden');
        this.settingsMenuBtn.setAttribute('aria-expanded', 'false');
    }

    isMenuOpen() {
        return this.settingsDropdown && !this.settingsDropdown.classList.contains('hidden');
    }

    updateMenuInstallState() {
        if (!this.menuInstallBtn || !this.menuInstallText) return;

        const state = this.manager.getState();

        if (state.isStandalone) {
            // Already installed
            this.menuInstallBtn.disabled = true;
            this.menuInstallBtn.classList.add('installed');
            this.menuInstallText.textContent = 'Already Installed';
        } else if (state.platform === 'iOS') {
            // iOS - show instructions
            this.menuInstallBtn.disabled = false;
            this.menuInstallBtn.classList.remove('installed');
            this.menuInstallText.textContent = 'Install App (iOS)';
        } else if (state.hasDeferredPrompt) {
            // Has native prompt support
            this.menuInstallBtn.disabled = false;
            this.menuInstallBtn.classList.remove('installed');
            this.menuInstallText.textContent = 'Add to Home Screen';
        } else {
            // No prompt support, show instructions
            this.menuInstallBtn.disabled = false;
            this.menuInstallBtn.classList.remove('installed');
            this.menuInstallText.textContent = 'Install Instructions';
        }
    }

    /**
     * Update UI based on manager state changes
     * @param {Object} state - Current state from manager
     */
    updateUI(state) {
        console.log('[PWAInstaller] Updating UI with state:', state);
        this.updateInstallButtonVisibility();
    }

    // Delegate public methods to manager
    getInstallationStatus() {
        return this.manager.getInstallationStatus();
    }

    forceReload() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
        window.location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.pwaInstaller = new PWAInstaller();

    console.log('[PWAInstaller] PWA Installer initialized');
    console.log('[PWAInstaller] Installation status:', window.pwaInstaller.getInstallationStatus());

    // Deployment diagnostics
    console.log('[PWA] Deployment Info:', {
        version: '3.0.0',
        lastUpdated: '2026-01-17',
        commit: 'Android install fix deployed',
        serviceWorkerCache: 'v3'
    });

    // Platform detection diagnostics
    console.log('[PWA] Platform Detection:', {
        userAgent: navigator.userAgent,
        platform: window.pwaInstaller.manager.getState().platform,
        isAndroid: /Android/i.test(navigator.userAgent),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches
    });
});