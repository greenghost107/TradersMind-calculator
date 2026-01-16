class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = null;
        this.isInstalled = false;
        this.isInstallable = false;
        this.isShowingPrompt = false;

        // Engagement tracking
        this.engagementScore = 0;
        this.sessionStart = Date.now();
        this.engagementEvents = {
            calculationCompleted: 0,
            inputChanged: 0,
            menuOpened: 0,
            settingsChanged: 0
        };
        this.engagementCheckInterval = null;
        this.autoPromptInterval = null;

        this.init();
    }

    init() {
        this.bindElements();
        this.registerServiceWorker();
        this.attachEventListeners();
        this.checkInstallationStatus();
        this.initEngagementTracking();
        this.initBeforeInstallPromptRetry();
        this.initAutoPrompt();

        // Listen for service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'SW_INSTALLED') {
                    console.log('[PWAInstaller] Service worker signaled installation complete');
                    this.updateInstallButtonVisibility();

                    // Re-check installability
                    setTimeout(() => {
                        this.checkInstallationStatus();
                    }, 1000);
                }
            });
        }

        // Log diagnostics after a brief delay to let everything initialize
        setTimeout(() => {
            const diagnostics = this.getInstallDiagnostics();
            console.log('[PWAInstaller] Installation Diagnostics:', diagnostics);

            if (diagnostics.blockers.length > 0) {
                console.warn('[PWAInstaller] Installation blockers detected:', diagnostics.blockers);
            }
        }, 1000);
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

    // Engagement tracking methods
    initEngagementTracking() {
        // Track calculation completion
        document.addEventListener('calculation-complete', () => {
            this.trackEngagement('calculationCompleted');
        });

        // Track input changes
        document.addEventListener('input', () => {
            this.trackEngagement('inputChanged');
        });

        // Track menu opens
        if (this.settingsMenuBtn) {
            this.settingsMenuBtn.addEventListener('click', () => {
                this.trackEngagement('menuOpened');
            });
        }

        console.log('[PWAInstaller] Engagement tracking initialized');
    }

    trackEngagement(eventType) {
        if (this.engagementEvents.hasOwnProperty(eventType)) {
            this.engagementEvents[eventType]++;
            this.calculateEngagementScore();
            this.checkAutoInstallReadiness();
        }
    }

    calculateEngagementScore() {
        const timeOnPage = (Date.now() - this.sessionStart) / 1000; // seconds
        const actions = Object.values(this.engagementEvents).reduce((a, b) => a + b, 0);

        // Score formula: time weight + action weight
        this.engagementScore = (timeOnPage * 0.5) + (actions * 5);

        console.log('[PWAInstaller] Engagement score:', this.engagementScore.toFixed(1), {
            timeOnPage: timeOnPage.toFixed(1) + 's',
            actions: actions,
            breakdown: this.engagementEvents
        });
    }

    checkAutoInstallReadiness() {
        // Conditions for auto-showing install prompt
        const isReady = this.engagementScore >= 30 && // 1 minute + 3 actions
                        !this.isInstalled &&
                        !this.isShowingPrompt &&
                        this.shouldShowInstallPrompt(); // Check history

        if (isReady && (this.deferredPrompt || this.detectPlatform() === 'iOS')) {
            console.log('[PWAInstaller] Auto-triggering install prompt based on engagement');
            this.autoShowInstallPrompt();
        }
    }

    // Installation state persistence
    getInstallHistory() {
        const history = localStorage.getItem('pwa_install_history');
        return history ? JSON.parse(history) : [];
    }

    saveInstallState(outcome) {
        const history = this.getInstallHistory();
        history.push({
            timestamp: Date.now(),
            platform: this.detectPlatform(),
            browser: this.detectBrowser(),
            outcome: outcome, // 'shown', 'accepted', 'dismissed', 'error', 'auto_shown', 'share_menu_opened'
            engagementScore: this.engagementScore
        });

        // Keep only last 10 entries
        if (history.length > 10) {
            history.shift();
        }

        localStorage.setItem('pwa_install_history', JSON.stringify(history));
        console.log('[PWAInstaller] Install state saved:', outcome);
    }

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
            console.log('[PWAInstaller] User dismissed install within last 7 days, respecting choice');
            return false;
        }

        // Check if already accepted
        const accepted = history.find(h => h.outcome === 'accepted');
        if (accepted) {
            console.log('[PWAInstaller] User already accepted install');
            return false;
        }

        return true;
    }

    // Retry logic for beforeinstallprompt
    initBeforeInstallPromptRetry() {
        let attemptCount = 0;
        const maxAttempts = 10;
        const baseDelay = 2000; // 2 seconds

        const retryListener = () => {
            if (this.deferredPrompt || attemptCount >= maxAttempts) {
                return; // Stop if we got the prompt or exceeded attempts
            }

            attemptCount++;
            const delay = Math.min(baseDelay * Math.pow(1.5, attemptCount), 30000); // Cap at 30s

            console.log(`[PWAInstaller] Retry attempt ${attemptCount}/${maxAttempts} in ${delay}ms`);

            setTimeout(() => {
                // Re-check if prompt has fired
                if (!this.deferredPrompt && this.engagementScore > 15) {
                    // Re-register listener in case it was missed
                    window.addEventListener('beforeinstallprompt', (e) => {
                        console.log('[PWAInstaller] Before install prompt caught on retry');
                        e.preventDefault();
                        this.deferredPrompt = e;
                        this.isInstallable = true;
                        this.updateInstallButtonVisibility();

                        // Auto-show if highly engaged
                        if (this.engagementScore > 40) {
                            this.showInstallPrompt();
                        }
                    }, { once: true });
                }

                retryListener(); // Next retry
            }, delay);
        };

        // Start retry cycle after initial grace period
        setTimeout(retryListener, 5000);
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
        return (
            this.engagementScore >= 30 && // Engaged user
            !this.isInstalled && // Not already installed
            !this.isShowingPrompt && // Not currently showing
            this.shouldShowInstallPrompt() && // Haven't dismissed recently
            (this.deferredPrompt || this.detectPlatform() === 'iOS') // Prompt available or iOS
        );
    }

    autoShowInstallPrompt() {
        console.log('[PWAInstaller] Auto-showing install prompt based on engagement');

        const platform = this.detectPlatform();

        if (platform === 'iOS') {
            // iOS: Show modal with share button
            this.showInstallModal();
        } else if (this.deferredPrompt) {
            // Android/Desktop with prompt: Show native
            this.showInstallPrompt();
        } else {
            // Fallback: Show modal with instructions
            this.showInstallModal();
        }

        this.saveInstallState('auto_shown');
    }

    // Web Share API for iOS
    async triggerIOSShareMenu() {
        // Check if Web Share API is available (iOS Safari 13+)
        if (!navigator.share) {
            console.log('[PWAInstaller] Web Share API not available');
            return false;
        }

        try {
            await navigator.share({
                title: 'TradersMind Calculator',
                text: 'Add to Home Screen for instant access',
                url: window.location.href
            });

            console.log('[PWAInstaller] Share menu triggered successfully');

            // Track that we showed share dialog
            this.saveInstallState('share_menu_opened');
            this.trackInstallAttempt('share_menu_opened');
            return true;

        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('[PWAInstaller] User cancelled share menu');
            } else {
                console.error('[PWAInstaller] Share failed:', err);
            }
            return false;
        }
    }

    showIOSManualInstructions() {
        // Fallback: Show detailed manual instructions
        console.log('[PWAInstaller] Showing iOS manual instructions');
        // The modal is already showing, just let it display the instructions
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
                    this.trackEngagement('settingsChanged');
                }
            } catch (err) {
                console.log('[PWAInstaller] Notification permission request failed:', err);
            }
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('[PWAInstaller] Registering service worker...');
                const registration = await navigator.serviceWorker.register('./sw.js');
                
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
        if (confirm('A new version is available. Reload to update?')) {
            window.location.reload();
        }
    }

    attachEventListeners() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWAInstaller] Before install prompt triggered');
            e.preventDefault();
            this.deferredPrompt = e;
            this.isInstallable = true;
            this.isShowingPrompt = false;
            this.updateInstallButtonVisibility();
        });

        window.addEventListener('appinstalled', () => {
            console.log('[PWAInstaller] App installed successfully');
            this.isInstalled = true;
            this.isInstallable = false;
            this.deferredPrompt = null;
            this.isShowingPrompt = false;
            this.hideInstallModal();
            this.updateInstallButtonVisibility();
            this.trackInstallEvent();
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
            if (e.key === 'Escape' && this.isMenuOpen()) {
                this.closeSettingsMenu();
                this.settingsMenuBtn.focus();
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
                } else if (action === 'ios-share') {
                    // iOS Safari - Try Web Share API
                    const shareSuccess = await this.triggerIOSShareMenu();

                    if (!shareSuccess) {
                        // Fallback: Show detailed instructions
                        this.showIOSManualInstructions();
                    } else {
                        // Close modal after showing share menu
                        this.hideInstallModal();
                    }
                } else if (action === 'open-safari') {
                    // iOS non-Safari - Auto-open in Safari
                    const safariURL = window.location.href;
                    window.location = safariURL; // iOS will prompt to open in Safari
                } else if (action === 'close') {
                    // iOS or waiting for engagement - just close modal
                    this.hideInstallModal();
                } else if (action === 'copy-url') {
                    // iOS wrong browser - copy URL to clipboard
                    try {
                        await navigator.clipboard.writeText(window.location.href);
                        // Update button to show success
                        this.pwaInstallAction.textContent = '✓ URL Copied!';
                        setTimeout(() => {
                            this.hideInstallModal();
                        }, 1500);
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

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkInstallationStatus();
            }
        });
    }

    async showInstallPrompt() {
        console.log('[PWAInstaller] showInstallPrompt called');
        console.log('[PWAInstaller] Current state:', {
            hasDeferredPrompt: !!this.deferredPrompt,
            isInstallable: this.isInstallable,
            isShowingPrompt: this.isShowingPrompt
        });

        // Guard: Prevent duplicate prompts
        if (this.isShowingPrompt) {
            console.log('[PWAInstaller] Install prompt already in progress');
            return;
        }

        // Guard: Check if prompt is available
        if (!this.deferredPrompt) {
            console.log('[PWAInstaller] No install prompt available, showing manual instructions');
            this.showManualInstallInstructions();
            return;
        }

        try {
            this.isShowingPrompt = true;
            console.log('[PWAInstaller] Showing browser install prompt...');

            // Save that we're showing the prompt
            this.saveInstallState('shown');

            // Hide modal with small delay to preserve user gesture
            if (this.pwaModal && !this.pwaModal.classList.contains('hidden')) {
                this.hideInstallModal();
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Show the browser's native install prompt
            await this.deferredPrompt.prompt();
            console.log('[PWAInstaller] Waiting for user choice...');

            // Wait for user response
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`[PWAInstaller] User choice: ${outcome}`);

            if (outcome === 'accepted') {
                console.log('[PWAInstaller] User accepted the install prompt');
                this.saveInstallState('accepted');
                this.trackInstallAttempt('accepted');
            } else {
                console.log('[PWAInstaller] User dismissed the install prompt');
                this.saveInstallState('dismissed');
                this.trackInstallAttempt('dismissed');
            }

            // Clear prompt (can only be used once)
            this.deferredPrompt = null;
            this.isInstallable = false;
            this.updateInstallButtonVisibility();

        } catch (error) {
            console.error('[PWAInstaller] Install prompt failed:', error);
            console.error('[PWAInstaller] Error details:', {
                name: error.name,
                message: error.message
            });
            this.showManualInstallInstructions();

        } finally {
            this.isShowingPrompt = false;
            console.log('[PWAInstaller] Install prompt flow completed');
        }
    }

    async handleInstallButtonClick() {
        console.log('[PWAInstaller] handleInstallButtonClick called');
        console.log('[PWAInstaller] deferredPrompt available:', !!this.deferredPrompt);

        // If we have the native prompt available (Android Chrome), trigger it directly
        if (this.deferredPrompt) {
            console.log('[PWAInstaller] Native prompt available, triggering directly');
            await this.showInstallPrompt();
        } else {
            // No native prompt - show modal with platform-specific instructions
            console.log('[PWAInstaller] No native prompt, showing modal with instructions');
            this.showInstallModal();
        }
    }

    showInstallModal() {
        if (!this.pwaModal) return;

        this.updateModalInstructions();
        this.pwaModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideInstallModal() {
        if (!this.pwaModal) return;
        
        this.pwaModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    updateModalInstructions() {
        if (!this.pwaInstructions) return;

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const hasPrompt = !!this.deferredPrompt;
        const isHTTPS = window.location.protocol === 'https:';

        // Get diagnostics to understand WHY prompt isn't available
        const diag = this.getInstallDiagnostics();

        let instructionHTML = '';
        let buttonText = 'Add to Home Screen';
        let buttonAction = 'install'; // 'install', 'close', or 'hidden'

        // iOS: Safari Share menu flow (no native prompt API)
        if (isIOS) {
            const browser = this.detectBrowser();

            if (browser !== 'Safari') {
                // User is on iOS but not in Safari - Auto-open in Safari
                instructionHTML = `
                    <div class="install-instructions ios error">
                        <h3>Open in Safari</h3>
                        <p>To install this app, we need to open it in Safari.</p>
                        <p class="note">Tap the button below to automatically open in Safari.</p>
                    </div>
                `;
                buttonText = 'Open in Safari';
                buttonAction = 'open-safari'; // New action
            } else {
                // User is in Safari - Try Web Share API first
                instructionHTML = `
                    <div class="install-instructions ios">
                        <h3>Install on iPhone/iPad</h3>
                        <p>Tap the button below to add this app to your home screen.</p>
                        <div class="install-steps-preview">
                            <p class="note">This will open your Share menu. Look for "Add to Home Screen" option.</p>
                        </div>
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
                buttonText = 'Add to Home Screen';
                buttonAction = 'ios-share'; // New action: trigger share menu
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
                // Browser supports PWA, guide user to native install button
                instructionHTML = `
                    <div class="install-instructions android">
                        <h3>Install This App</h3>
                        <div class="install-guide">
                            <p>To install TradersMind Calculator:</p>
                            <ol class="install-steps">
                                <li>
                                    <strong>Tap the menu button</strong> <span class="browser-icon">⋮</span>
                                    <span class="location-hint">(top right corner of your browser)</span>
                                </li>
                                <li>Look for <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                                <li>Tap <strong>"Install"</strong> to add the app to your home screen</li>
                            </ol>
                            <div class="visual-hint">
                                <div class="arrow-indicator">↗</div>
                                <p class="hint-text">Look for the menu button at the top of your screen</p>
                            </div>
                        </div>
                    </div>
                `;
                buttonText = 'Got It';
                buttonAction = 'close';
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
                buttonText = 'Got It';
                buttonAction = 'close';
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

                // Store button action type for click handler
                this.pwaInstallAction.setAttribute('data-action', buttonAction);
            }
        }
    }

    showManualInstallInstructions() {
        this.showInstallModal();
    }

    checkInstallationStatus() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('[PWAInstaller] App is running in standalone mode');
            this.isInstalled = true;
        } else if (window.navigator.standalone === true) {
            console.log('[PWAInstaller] App is running in iOS standalone mode');
            this.isInstalled = true;
        } else {
            this.isInstalled = false;
        }
        
        this.updateInstallButtonVisibility();
    }

    async updateInstallButtonVisibility() {
        // Check if service worker is ready (required for Android)
        const isIOS = this.detectPlatform() === 'iOS';
        const swReady = await this.isServiceWorkerReady();
        if (!swReady && !isIOS) {
            console.log('[PWAInstaller] Service worker not ready yet, waiting...');
            return;
        }

        // Always show install UI, but adapt behavior by platform/state
        const isStandalone = this.isStandalone();
        const hasPromptSupport = this.deferredPrompt !== null;

        // Update floating action button
        if (this.installButton) {
            if (isStandalone) {
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
            isStandalone,
            hasPromptSupport,
            deferredPrompt: !!this.deferredPrompt,
            visible: !isStandalone
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

        const isStandalone = this.isStandalone();
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (isStandalone) {
            // Already installed
            this.menuInstallBtn.disabled = true;
            this.menuInstallBtn.classList.add('installed');
            this.menuInstallText.textContent = 'Already Installed';
        } else if (isIOS) {
            // iOS - show instructions
            this.menuInstallBtn.disabled = false;
            this.menuInstallBtn.classList.remove('installed');
            this.menuInstallText.textContent = 'Install App (iOS)';
        } else if (this.deferredPrompt) {
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

    trackInstallEvent() {
        console.log('[PWAInstaller] App installation completed');
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install', {
                event_category: 'engagement',
                event_label: 'successful_install'
            });
        }
    }

    trackInstallAttempt(outcome) {
        console.log(`[PWAInstaller] Install attempt: ${outcome}`);
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install_prompt', {
                event_category: 'engagement',
                event_label: outcome
            });
        }
    }

    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }

    canInstall() {
        return this.isInstallable && !this.isInstalled;
    }

    getInstallationStatus() {
        return {
            isInstalled: this.isInstalled,
            isInstallable: this.isInstallable,
            canInstall: this.canInstall(),
            isStandalone: this.isStandalone(),
            hasServiceWorker: 'serviceWorker' in navigator,
            supportsManifest: 'manifest' in document.createElement('link')
        };
    }

    getInstallDiagnostics() {
        const diag = {
            timestamp: new Date().toISOString(),
            protocol: window.location.protocol,
            isHTTPS: window.location.protocol === 'https:',
            isLocalhost: window.location.hostname === 'localhost',
            browser: this.detectBrowser(),
            platform: this.detectPlatform(),
            isStandalone: this.isStandalone(),
            hasServiceWorker: 'serviceWorker' in navigator,
            serviceWorkerRegistered: false,
            manifestLinked: !!document.querySelector('link[rel="manifest"]'),
            beforeInstallPromptSupport: 'onbeforeinstallprompt' in window,
            beforeInstallPromptFired: !!this.deferredPrompt,
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

    detectBrowser() {
        const ua = navigator.userAgent;
        if (/Edg/.test(ua)) return 'Edge';
        if (/Chrome/.test(ua) && !/Edg/.test(ua)) return 'Chrome';
        if (/Safari/.test(ua) && !/Chrome/.test(ua)) return 'Safari';
        if (/Firefox/.test(ua)) return 'Firefox';
        return 'Unknown';
    }

    isInSafari() {
        return this.detectBrowser() === 'Safari';
    }

    detectPlatform() {
        const ua = navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
        if (/Android/.test(ua)) return 'Android';
        if (/Windows/.test(ua)) return 'Windows';
        if (/Mac/.test(ua)) return 'macOS';
        if (/Linux/.test(ua)) return 'Linux';
        return 'Unknown';
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
});