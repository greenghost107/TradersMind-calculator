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
            accountRisk: document.getElementById('account-risk'),
            atrPercent: document.getElementById('atr-percent'),
            setupQuality: document.getElementById('setup-quality'),
            marketCondition: document.getElementById('market-condition'),
            accountSize: document.getElementById('account-size'),
            maxPositions: document.getElementById('max-positions'),
            
            sharesToBuy: document.getElementById('shares-to-buy'),
            totalPositionValue: document.getElementById('total-position-value'),
            positionPercentage: document.getElementById('position-percentage'),
            riskPerShare: document.getElementById('risk-per-share'),
            dollarRiskAmount: document.getElementById('dollar-risk-amount'),
            riskPercentAccount: document.getElementById('risk-percent-account'),
            maxPositionValue: document.getElementById('max-position-value'),
            stopRiskPercent: document.getElementById('stop-risk-percent'),
            targetPrice1_5: document.getElementById('target-price-1-5'),
            expectedGainPercent: document.getElementById('expected-gain-percent'),
            positionSizingFormula: document.getElementById('position-sizing-formula'),
            formulaResult: document.getElementById('formula-result'),
            volatilityAnalysis: document.getElementById('volatility-analysis'),
            adjustedPosition: document.getElementById('adjusted-position'),
            positionValidation: document.getElementById('position-validation'),
            
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            closeModal: document.getElementById('close-modal'),
            defaultAccountSize: document.getElementById('default-account-size'),
            defaultMaxPositions: document.getElementById('default-max-positions'),
            saveSettings: document.getElementById('save-settings')
        };
    }

    attachEventListeners() {
        const inputElements = [
            this.elements.entryPrice,
            this.elements.stopLoss,
            this.elements.accountRisk,
            this.elements.atrPercent,
            this.elements.accountSize,
            this.elements.maxPositions,
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
            accountRisk: parseFloat(this.elements.accountRisk.value) || 1.5,
            atrPercent: parseFloat(this.elements.atrPercent.value) || 5.0,
            accountSize: parseFloat(this.elements.accountSize.value) || 0,
            maxPositions: parseInt(this.elements.maxPositions.value) || 10,
            setupQuality: this.elements.setupQuality.value || 'good',
            marketCondition: this.elements.marketCondition.value || 'neutral'
        };
    }

    hasMinimumInputs(inputs) {
        return inputs.entryPrice > 0 && inputs.stopLoss > 0 && inputs.accountSize > 0;
    }

    displayResults(result) {
        this.elements.sharesToBuy.textContent = result.formatted.shares;
        this.elements.totalPositionValue.textContent = result.formatted.totalPositionValue;
        this.elements.positionPercentage.textContent = result.formatted.positionPercentage;
        this.elements.riskPerShare.textContent = result.formatted.riskPerShare;
        this.elements.dollarRiskAmount.textContent = result.formatted.dollarRiskAmount;
        this.elements.riskPercentAccount.textContent = result.formatted.riskPercentOfAccount;
        this.elements.maxPositionValue.innerHTML = `${result.formatted.maxPositionValue}<br><small>${result.formatted.maxPositions} positions (${result.formatted.maxPositionPercentage} each)</small>`;
        this.elements.stopRiskPercent.textContent = result.formatted.stopRiskPercent;
        this.elements.targetPrice1_5.textContent = result.formatted.targetPrice;
        this.elements.expectedGainPercent.textContent = result.formatted.expectedGainPercent;
        
        this.elements.positionSizingFormula.textContent = result.positionSizingFormula.calculation;
        this.elements.formulaResult.textContent = result.positionSizingFormula.result;
        
        this.elements.volatilityAnalysis.innerHTML = `
            ATR: ${result.atrAdjustedPosition.atrPercent}%<br>
            ATR Multiplier: ${result.atrAdjustedPosition.atrMultiplier}x<br>
            ATR Shares: ${result.formatted.atrShares}<br>
            ATR Position Value: ${result.formatted.atrPositionValue}
        `;
        this.elements.adjustedPosition.textContent = result.atrAdjustedPosition.recommendation;
        this.elements.positionValidation.textContent = result.positionValidation.message;

        this.updateResultColors(result);
    }

    updateResultColors(result) {
        const validationElement = this.elements.positionValidation;
        const sharesElement = this.elements.sharesToBuy;

        validationElement.className = 'result-value';
        sharesElement.className = 'result-value';

        if (result.positionValidation) {
            switch (result.positionValidation.status) {
                case 'optimal':
                    validationElement.classList.add('positive');
                    break;
                case 'tight':
                case 'wide':
                    validationElement.classList.add('warning');
                    break;
            }
        }

        if (result.shares === 0) {
            sharesElement.classList.add('warning');
        }
    }

    clearResults() {
        const resultElements = [
            this.elements.sharesToBuy,
            this.elements.totalPositionValue,
            this.elements.positionPercentage,
            this.elements.riskPerShare,
            this.elements.dollarRiskAmount,
            this.elements.riskPercentAccount,
            this.elements.maxPositionValue,
            this.elements.stopRiskPercent,
            this.elements.targetPrice1_5,
            this.elements.expectedGainPercent,
            this.elements.positionSizingFormula,
            this.elements.formulaResult,
            this.elements.volatilityAnalysis,
            this.elements.adjustedPosition,
            this.elements.positionValidation
        ];

        resultElements.forEach(element => {
            if (element) {
                element.textContent = '-';
                element.className = 'result-value';
            }
        });
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
        if (this.elements.maxPositions) {
            this.elements.maxPositions.value = settings.maxPositions || 10;
        }
    }

    restoreCalculationInputs(data) {
        if (this.elements.entryPrice && data.entryPrice) {
            this.elements.entryPrice.value = data.entryPrice;
        }
        if (this.elements.stopLoss && data.stopLoss) {
            this.elements.stopLoss.value = data.stopLoss;
        }
        if (this.elements.accountRisk && data.accountRisk) {
            this.elements.accountRisk.value = data.accountRisk;
        }
        if (this.elements.atrPercent && data.atrPercent) {
            this.elements.atrPercent.value = data.atrPercent;
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
            accountRisk: this.elements.accountRisk.value,
            atrPercent: this.elements.atrPercent.value,
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
        if (this.elements.defaultMaxPositions) {
            this.elements.defaultMaxPositions.value = settings.maxPositions || 10;
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
            maxPositions: parseInt(this.elements.defaultMaxPositions.value) || 10
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