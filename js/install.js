class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.installButton = null;
        this.isInstalled = false;
        this.isInstallable = false;
        
        this.init();
    }

    init() {
        this.bindElements();
        this.registerServiceWorker();
        this.attachEventListeners();
        this.checkInstallationStatus();
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
            this.updateInstallButtonVisibility();
        });

        window.addEventListener('appinstalled', () => {
            console.log('[PWAInstaller] App installed successfully');
            this.isInstalled = true;
            this.deferredPrompt = null;
            this.updateInstallButtonVisibility();
            this.trackInstallEvent();
        });

        if (this.installButton) {
            this.installButton.addEventListener('click', () => {
                this.showInstallPrompt();
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
            this.menuInstallBtn.addEventListener('click', () => {
                this.closeSettingsMenu();
                this.showInstallPrompt();
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
            this.pwaInstallAction.addEventListener('click', () => {
                this.hideInstallModal();
                this.showInstallPrompt();
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
        if (!this.deferredPrompt) {
            console.log('[PWAInstaller] No install prompt available');
            this.showManualInstallInstructions();
            return;
        }

        try {
            console.log('[PWAInstaller] Showing install prompt');
            const { outcome } = await this.deferredPrompt.prompt();
            
            console.log(`[PWAInstaller] Install prompt outcome: ${outcome}`);
            
            if (outcome === 'accepted') {
                this.trackInstallAttempt('accepted');
            } else {
                this.trackInstallAttempt('dismissed');
            }
            
            this.deferredPrompt = null;
            this.updateInstallButtonVisibility();
            
        } catch (error) {
            console.error('[PWAInstaller] Install prompt failed:', error);
            this.showManualInstallInstructions();
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
        
        let instructionText = '';
        
        if (!this.deferredPrompt) {
            if (isIOS) {
                instructionText = `To install on iOS:<br>1. Tap the Share button <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92S19.61 16.08 18 16.08z"/></svg><br>2. Scroll down and tap "Add to Home Screen"<br>3. Tap "Add" to confirm`;
            } else if (isAndroid) {
                instructionText = `To install on Android:<br>1. Tap the menu (⋮) in your browser<br>2. Select "Add to Home screen" or "Install app"<br>3. Tap "Add" or "Install" to confirm`;
            } else {
                instructionText = `To install this app:<br>1. Look for an install icon in your browser's address bar<br>2. Or check your browser's menu for "Install" or "Add to Home Screen"<br>3. Follow the prompts to install`;
            }
        } else {
            instructionText = 'Click "Add to Home Screen" below to install this app on your device.';
        }
        
        this.pwaInstructions.innerHTML = `<p>${instructionText}</p>`;
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
        const shouldShow = this.isInstallable && !this.isInstalled;

        // Update floating action button
        if (this.installButton) {
            if (shouldShow) {
                this.installButton.classList.remove('hidden');
                this.installButton.setAttribute('aria-hidden', 'false');
            } else {
                this.installButton.classList.add('hidden');
                this.installButton.setAttribute('aria-hidden', 'true');
            }
        }

        // Update menu item state if menu is open
        if (this.isMenuOpen()) {
            this.updateMenuInstallState();
        }

        console.log(`[PWAInstaller] Install button visibility: ${shouldShow ? 'visible' : 'hidden'}`);
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

        if (this.isInstalled || this.isStandalone()) {
            // Already installed
            this.menuInstallBtn.disabled = true;
            this.menuInstallBtn.classList.add('installed');
            this.menuInstallText.textContent = 'Already Installed';
        } else {
            // Can be installed or show instructions
            this.menuInstallBtn.disabled = false;
            this.menuInstallBtn.classList.remove('installed');
            this.menuInstallText.textContent = 'Add to Home Screen';
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