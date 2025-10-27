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
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('[PWAInstaller] Registering service worker...');
                const registration = await navigator.serviceWorker.register('/sw.js');
                
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

    showManualInstallInstructions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        
        let instructions = '';
        
        if (isIOS) {
            instructions = `To install this app on iOS:
1. Tap the Share button in Safari
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to confirm`;
        } else if (isAndroid) {
            instructions = `To install this app on Android:
1. Tap the menu (three dots) in your browser
2. Select "Add to Home screen" or "Install app"
3. Tap "Add" or "Install" to confirm`;
        } else {
            instructions = `To install this app:
1. Look for an install icon in your browser's address bar
2. Or check your browser's menu for "Install" or "Add to Home Screen"
3. Follow the prompts to install`;
        }
        
        alert(instructions);
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
        if (!this.installButton) return;

        const shouldShow = this.isInstallable && !this.isInstalled;
        
        if (shouldShow) {
            this.installButton.classList.remove('hidden');
            this.installButton.setAttribute('aria-hidden', 'false');
        } else {
            this.installButton.classList.add('hidden');
            this.installButton.setAttribute('aria-hidden', 'true');
        }
        
        console.log(`[PWAInstaller] Install button visibility: ${shouldShow ? 'visible' : 'hidden'}`);
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