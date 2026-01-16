class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = null;
        this.isInstalled = false;
        this.isInstallable = false;
        this.isShowingPrompt = false;

        this.init();
    }

    init() {
        this.bindElements();
        this.registerServiceWorker();
        this.attachEventListeners();
        this.checkInstallationStatus();

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
                this.showInstallModal();
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
                    this.showInstallModal();
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
                await this.showInstallPrompt();
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
                this.trackInstallAttempt('accepted');
            } else {
                console.log('[PWAInstaller] User dismissed the install prompt');
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

        let instructionHTML = '';

        // Different instructions based on platform and conditions
        if (isIOS) {
            instructionHTML = `
                <div class="install-instructions ios">
                    <h3>Install on iOS/iPadOS</h3>
                    <ol>
                        <li>Tap the <strong>Share</strong> button <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg> in Safari</li>
                        <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                        <li>Tap <strong>"Add"</strong> to confirm</li>
                    </ol>
                    <p class="note">💡 Note: This feature only works in Safari browser</p>
                </div>
            `;
        } else if (hasPrompt) {
            instructionHTML = `
                <div class="install-instructions chrome">
                    <h3>Install This App</h3>
                    <p>Click the button below to install TradersMind Calculator as an app on your device.</p>
                    <p class="benefit">✓ Works offline &nbsp;|&nbsp; ✓ Fast access &nbsp;|&nbsp; ✓ App-like experience</p>
                </div>
            `;
        } else if (isAndroid) {
            instructionHTML = `
                <div class="install-instructions android">
                    <h3>Install on Android</h3>
                    <ol>
                        <li>Tap the <strong>menu</strong> (⋮) in your browser</li>
                        <li>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                        <li>Tap <strong>"Install"</strong> to confirm</li>
                    </ol>
                    ${!isHTTPS ? '<p class="warning">⚠️ Note: Installation requires HTTPS connection</p>' : ''}
                </div>
            `;
        } else {
            // Desktop or other browsers
            instructionHTML = `
                <div class="install-instructions desktop">
                    <h3>Install This App</h3>
                    ${!isHTTPS ?
                        '<p class="warning">⚠️ <strong>HTTPS Required:</strong> This app must be accessed via HTTPS to enable installation.</p>'
                        : ''}
                    <p>To install this app:</p>
                    <ol>
                        <li>Look for an <strong>install icon</strong> (⊕) in your browser's address bar</li>
                        <li>Or open your browser's <strong>menu</strong> and select "Install app"</li>
                        <li>Follow the prompts to install</li>
                    </ol>
                    <p class="supported-browsers">Supported browsers: Chrome, Edge, Opera</p>
                </div>
            `;
        }

        this.pwaInstructions.innerHTML = instructionHTML;

        // Hide/show the install action button based on prompt availability
        if (this.pwaInstallAction) {
            if (hasPrompt) {
                this.pwaInstallAction.classList.remove('hidden');
                this.pwaInstallAction.textContent = 'Install Now';
            } else {
                this.pwaInstallAction.classList.add('hidden');
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

    updateInstallButtonVisibility() {
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