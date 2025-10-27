class TradersMindApp {
    constructor() {
        this.calculator = new PositionCalculator();
        this.storage = new StorageManager();
        this.elements = {};
        this.isCalculating = false;
        
        this.init();
    }

    init() {
        this.bindElements();
        this.attachEventListeners();
        this.loadSavedData();
        this.setupAccessibility();
    }

    bindElements() {
        this.elements = {
            entryPrice: document.getElementById('entry-price'),
            stopLoss: document.getElementById('stop-loss'),
            targetPrice: document.getElementById('target-price'),
            setupQuality: document.getElementById('setup-quality'),
            marketCondition: document.getElementById('market-condition'),
            accountSize: document.getElementById('account-size'),
            maxPosition: document.getElementById('max-position'),
            
            riskReward: document.getElementById('risk-reward'),
            positionSize: document.getElementById('position-size'),
            riskAmount: document.getElementById('risk-amount'),
            potentialProfit: document.getElementById('potential-profit'),
            
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            closeModal: document.getElementById('close-modal'),
            defaultAccountSize: document.getElementById('default-account-size'),
            defaultMaxPosition: document.getElementById('default-max-position'),
            saveSettings: document.getElementById('save-settings')
        };
    }

    attachEventListeners() {
        const inputElements = [
            this.elements.entryPrice,
            this.elements.stopLoss,
            this.elements.targetPrice,
            this.elements.accountSize,
            this.elements.maxPosition,
            this.elements.setupQuality,
            this.elements.marketCondition
        ];

        inputElements.forEach(element => {
            if (element) {
                element.addEventListener('input', this.debounce(() => this.handleInputChange(), 300));
                element.addEventListener('change', () => this.handleInputChange());
            }
        });

        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        }

        if (this.elements.closeModal) {
            this.elements.closeModal.addEventListener('click', () => this.closeSettings());
        }

        if (this.elements.settingsModal) {
            this.elements.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.elements.settingsModal) {
                    this.closeSettings();
                }
            });
        }

        if (this.elements.saveSettings) {
            this.elements.saveSettings.addEventListener('click', () => this.saveSettingsData());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSettings();
            }
        });

        window.addEventListener('beforeunload', () => {
            this.saveCurrentState();
        });
    }

    setupAccessibility() {
        const resultCards = document.querySelectorAll('.result-card');
        resultCards.forEach(card => {
            card.setAttribute('role', 'status');
            card.setAttribute('aria-live', 'polite');
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    handleInputChange() {
        if (this.isCalculating) return;
        
        this.isCalculating = true;
        
        try {
            this.calculate();
            this.saveCurrentState();
        } catch (error) {
            console.error('Calculation error:', error);
            this.showError('Calculation failed. Please check your inputs.');
        } finally {
            this.isCalculating = false;
        }
    }

    calculate() {
        const inputs = this.getInputValues();
        
        if (!this.hasMinimumInputs(inputs)) {
            this.clearResults();
            return;
        }

        const result = this.calculator.calculate(inputs);

        if (result.errors) {
            this.showValidationErrors(result.errors);
            this.clearResults();
            return;
        }

        this.displayResults(result);
        this.clearValidationErrors();
    }

    getInputValues() {
        return {
            entryPrice: parseFloat(this.elements.entryPrice.value) || 0,
            stopLoss: parseFloat(this.elements.stopLoss.value) || 0,
            targetPrice: parseFloat(this.elements.targetPrice.value) || 0,
            accountSize: parseFloat(this.elements.accountSize.value) || 0,
            maxPositionPercent: parseFloat(this.elements.maxPosition.value) || 6,
            setupQuality: this.elements.setupQuality.value || 'good',
            marketCondition: this.elements.marketCondition.value || 'neutral'
        };
    }

    hasMinimumInputs(inputs) {
        return inputs.entryPrice > 0 && inputs.stopLoss > 0 && inputs.targetPrice > 0 && inputs.accountSize > 0;
    }

    displayResults(result) {
        this.elements.riskReward.textContent = result.formatted.riskReward;
        this.elements.positionSize.textContent = result.formatted.positionSize;
        this.elements.riskAmount.textContent = result.formatted.riskAmount;
        this.elements.potentialProfit.textContent = result.formatted.potentialProfit;

        this.updateResultColors(result);
    }

    updateResultColors(result) {
        const riskRewardElement = this.elements.riskReward;
        const positionSizeElement = this.elements.positionSize;

        riskRewardElement.className = 'result-value';
        positionSizeElement.className = 'result-value';

        if (result.recommendation) {
            switch (result.recommendation.type) {
                case 'good':
                    riskRewardElement.classList.add('positive');
                    break;
                case 'warning':
                    riskRewardElement.classList.add('warning');
                    break;
                case 'poor':
                    riskRewardElement.classList.add('negative');
                    break;
            }
        }

        if (result.positionSize === 0) {
            positionSizeElement.classList.add('warning');
        }
    }

    clearResults() {
        this.elements.riskReward.textContent = '-';
        this.elements.positionSize.textContent = '-';
        this.elements.riskAmount.textContent = '-';
        this.elements.potentialProfit.textContent = '-';

        this.elements.riskReward.className = 'result-value';
        this.elements.positionSize.className = 'result-value';
    }

    showValidationErrors(errors) {
        console.warn('Validation errors:', errors);
    }

    clearValidationErrors() {
    }

    showError(message) {
        console.error(message);
    }

    loadSavedData() {
        const settings = this.storage.loadSettings();
        this.applySettings(settings);

        const calculationData = this.storage.loadCalculationData();
        if (calculationData) {
            this.restoreCalculationInputs(calculationData);
        }

        this.calculate();
    }

    applySettings(settings) {
        if (this.elements.accountSize) {
            this.elements.accountSize.value = settings.accountSize || '';
        }
        if (this.elements.maxPosition) {
            this.elements.maxPosition.value = settings.maxPositionPercent || 6;
        }
    }

    restoreCalculationInputs(data) {
        if (this.elements.entryPrice && data.entryPrice) {
            this.elements.entryPrice.value = data.entryPrice;
        }
        if (this.elements.stopLoss && data.stopLoss) {
            this.elements.stopLoss.value = data.stopLoss;
        }
        if (this.elements.targetPrice && data.targetPrice) {
            this.elements.targetPrice.value = data.targetPrice;
        }
        if (this.elements.setupQuality && data.setupQuality) {
            this.elements.setupQuality.value = data.setupQuality;
        }
        if (this.elements.marketCondition && data.marketCondition) {
            this.elements.marketCondition.value = data.marketCondition;
        }
    }

    saveCurrentState() {
        const calculationData = {
            entryPrice: this.elements.entryPrice.value,
            stopLoss: this.elements.stopLoss.value,
            targetPrice: this.elements.targetPrice.value,
            setupQuality: this.elements.setupQuality.value,
            marketCondition: this.elements.marketCondition.value
        };

        this.storage.saveCalculationData(calculationData);
    }

    openSettings() {
        const settings = this.storage.loadSettings();
        
        if (this.elements.defaultAccountSize) {
            this.elements.defaultAccountSize.value = settings.accountSize || '';
        }
        if (this.elements.defaultMaxPosition) {
            this.elements.defaultMaxPosition.value = settings.maxPositionPercent || 6;
        }

        this.elements.settingsModal.classList.add('show');
        this.elements.settingsModal.style.display = 'flex';
        
        setTimeout(() => {
            if (this.elements.defaultAccountSize) {
                this.elements.defaultAccountSize.focus();
            }
        }, 100);
    }

    closeSettings() {
        this.elements.settingsModal.classList.remove('show');
        
        setTimeout(() => {
            this.elements.settingsModal.style.display = 'none';
        }, 200);
    }

    saveSettingsData() {
        const newSettings = {
            accountSize: parseFloat(this.elements.defaultAccountSize.value) || 10000,
            maxPositionPercent: parseFloat(this.elements.defaultMaxPosition.value) || 6
        };

        const success = this.storage.saveSettings(newSettings);
        
        if (success) {
            this.applySettings(newSettings);
            this.calculate();
            this.closeSettings();
        } else {
            this.showError('Failed to save settings');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof PositionCalculator !== 'undefined' && typeof StorageManager !== 'undefined') {
        window.app = new TradersMindApp();
    } else {
        console.error('Required dependencies not loaded');
    }
});