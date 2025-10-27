class StorageManager {
    constructor() {
        this.storageKey = 'tradersmind_calculator';
        this.settingsKey = 'tradersmind_settings';
        this.defaultSettings = {
            accountSize: 10000,
            maxPositionPercent: 6,
            theme: 'dark'
        };
    }

    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    saveCalculationData(data) {
        if (!this.isLocalStorageAvailable()) return false;

        try {
            const calculationData = {
                entryPrice: data.entryPrice || '',
                stopLoss: data.stopLoss || '',
                targetPrice: data.targetPrice || '',
                setupQuality: data.setupQuality || 'good',
                marketCondition: data.marketCondition || 'neutral',
                timestamp: Date.now()
            };

            localStorage.setItem(this.storageKey, JSON.stringify(calculationData));
            return true;
        } catch (e) {
            console.warn('Failed to save calculation data:', e);
            return false;
        }
    }

    loadCalculationData() {
        if (!this.isLocalStorageAvailable()) return null;

        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return null;

            const data = JSON.parse(stored);
            
            const now = Date.now();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            
            if (data.timestamp && (now - data.timestamp) > oneWeek) {
                this.clearCalculationData();
                return null;
            }

            return {
                entryPrice: data.entryPrice || '',
                stopLoss: data.stopLoss || '',
                targetPrice: data.targetPrice || '',
                setupQuality: data.setupQuality || 'good',
                marketCondition: data.marketCondition || 'neutral'
            };
        } catch (e) {
            console.warn('Failed to load calculation data:', e);
            this.clearCalculationData();
            return null;
        }
    }

    clearCalculationData() {
        if (!this.isLocalStorageAvailable()) return false;

        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (e) {
            console.warn('Failed to clear calculation data:', e);
            return false;
        }
    }

    saveSettings(settings) {
        if (!this.isLocalStorageAvailable()) return false;

        try {
            const currentSettings = this.loadSettings();
            const updatedSettings = {
                ...currentSettings,
                ...settings,
                timestamp: Date.now()
            };

            if (updatedSettings.accountSize && updatedSettings.accountSize < 1) {
                updatedSettings.accountSize = this.defaultSettings.accountSize;
            }

            if (updatedSettings.maxPositionPercent && 
                (updatedSettings.maxPositionPercent < 0.1 || updatedSettings.maxPositionPercent > 100)) {
                updatedSettings.maxPositionPercent = this.defaultSettings.maxPositionPercent;
            }

            localStorage.setItem(this.settingsKey, JSON.stringify(updatedSettings));
            return true;
        } catch (e) {
            console.warn('Failed to save settings:', e);
            return false;
        }
    }

    loadSettings() {
        if (!this.isLocalStorageAvailable()) return { ...this.defaultSettings };

        try {
            const stored = localStorage.getItem(this.settingsKey);
            if (!stored) return { ...this.defaultSettings };

            const settings = JSON.parse(stored);
            
            const validatedSettings = {
                accountSize: this.validateAccountSize(settings.accountSize),
                maxPositionPercent: this.validateMaxPositionPercent(settings.maxPositionPercent),
                theme: settings.theme || this.defaultSettings.theme
            };

            return validatedSettings;
        } catch (e) {
            console.warn('Failed to load settings:', e);
            return { ...this.defaultSettings };
        }
    }

    validateAccountSize(accountSize) {
        const parsed = parseFloat(accountSize);
        if (isNaN(parsed) || parsed < 1) {
            return this.defaultSettings.accountSize;
        }
        return parsed;
    }

    validateMaxPositionPercent(maxPositionPercent) {
        const parsed = parseFloat(maxPositionPercent);
        if (isNaN(parsed) || parsed < 0.1 || parsed > 100) {
            return this.defaultSettings.maxPositionPercent;
        }
        return parsed;
    }

    clearSettings() {
        if (!this.isLocalStorageAvailable()) return false;

        try {
            localStorage.removeItem(this.settingsKey);
            return true;
        } catch (e) {
            console.warn('Failed to clear settings:', e);
            return false;
        }
    }

    clearAllData() {
        const cleared = {
            calculation: this.clearCalculationData(),
            settings: this.clearSettings()
        };
        return cleared;
    }

    exportData() {
        const calculationData = this.loadCalculationData();
        const settings = this.loadSettings();
        
        return {
            calculation: calculationData,
            settings: settings,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
    }

    importData(data) {
        if (!data || typeof data !== 'object') return false;

        let success = true;

        if (data.calculation) {
            success = this.saveCalculationData(data.calculation) && success;
        }

        if (data.settings) {
            success = this.saveSettings(data.settings) && success;
        }

        return success;
    }

    getStorageInfo() {
        if (!this.isLocalStorageAvailable()) {
            return {
                available: false,
                used: 0,
                remaining: 0
            };
        }

        try {
            let used = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    used += localStorage[key].length + key.length;
                }
            }

            const approximateQuota = 5 * 1024 * 1024;
            
            return {
                available: true,
                used: used,
                remaining: approximateQuota - used,
                usedFormatted: this.formatBytes(used),
                remainingFormatted: this.formatBytes(approximateQuota - used)
            };
        } catch (e) {
            return {
                available: true,
                used: 0,
                remaining: 0,
                error: e.message
            };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}

if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}