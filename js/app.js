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
        this.updateRiskPercentDisplay();
        this.loadSavedData();
        this.setupAccessibility();
    }

    bindElements() {
        this.elements = {
            entryPrice: document.getElementById('entry-price'),
            stopLoss: document.getElementById('stop-loss'),
            atrPercent: document.getElementById('atr-percent'),
            riskPercent: document.getElementById('risk-percent'),
            riskPercentValue: document.getElementById('risk-percent-value'),
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
            portfolioRiskPercent: document.getElementById('portfolio-risk-percent'),
            portfolioRiskAmount: document.getElementById('portfolio-risk-amount'),
            riskSharesToBuy: document.getElementById('risk-shares-to-buy'),
            riskTotalPositionValue: document.getElementById('risk-total-position-value'),
            riskPositionPercentage: document.getElementById('risk-position-percentage'),
            riskRiskPerShare: document.getElementById('risk-risk-per-share'),
            positionSizingFormula: document.getElementById('position-sizing-formula'),
            formulaResult: document.getElementById('formula-result'),
            atrSharesDisplay: document.getElementById('atr-shares-display'),
            atrPositionValueDisplay: document.getElementById('atr-position-value-display'),
            positionDifference: document.getElementById('position-difference'),
            volatilityImpact: document.getElementById('volatility-impact'),
            positionValidation: document.getElementById('position-validation')
        };
    }

    attachEventListeners() {
        const inputElements = [
            this.elements.entryPrice,
            this.elements.stopLoss,
            this.elements.atrPercent,
            this.elements.accountSize,
            this.elements.maxPositions,
            this.elements.riskPercent
        ];

        inputElements.forEach(element => {
            if (element) {
                element.addEventListener('input', this.debounce(() => this.handleInputChange(), 300));
                element.addEventListener('change', () => this.handleInputChange());
            }
        });

        // Special handling for risk percent slider to update display
        if (this.elements.riskPercent) {
            this.elements.riskPercent.addEventListener('input', () => {
                this.updateRiskPercentDisplay();
                this.handleInputChange();
            });
        }

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
            atrPercent: parseFloat(this.elements.atrPercent.value) || 5.0,
            accountSize: parseFloat(this.elements.accountSize.value) || 0,
            maxPositions: parseInt(this.elements.maxPositions.value) || 10,
            riskPercent: parseFloat(this.elements.riskPercent.value) || 1.0
        };
    }

    updateRiskPercentDisplay() {
        if (this.elements.riskPercent && this.elements.riskPercentValue) {
            this.elements.riskPercentValue.textContent = `${this.elements.riskPercent.value}%`;
        }
    }

    hasMinimumInputs(inputs) {
        return inputs.entryPrice > 0 && inputs.stopLoss > 0 && inputs.accountSize > 0;
    }

    displayResults(result) {
        // Standard Position Size section (original calculation)
        this.elements.sharesToBuy.textContent = result.formatted.originalShares;
        this.elements.totalPositionValue.textContent = result.formatted.originalTotalPositionValue;
        this.elements.positionPercentage.textContent = result.formatted.originalPositionPercentage;
        this.elements.riskPerShare.textContent = result.formatted.riskPerShare;
        this.elements.dollarRiskAmount.textContent = result.formatted.originalDollarRiskAmount;
        this.elements.riskPercentAccount.textContent = result.formatted.originalRiskPercentOfAccount;
        this.elements.maxPositionValue.innerHTML = `${result.formatted.maxPositionValue}<br><small>${result.formatted.maxPositions} positions (${result.formatted.maxPositionPercentage} each)</small>`;
        this.elements.stopRiskPercent.textContent = result.formatted.stopRiskPercent;
        this.elements.targetPrice1_5.textContent = result.formatted.targetPrice;
        this.elements.expectedGainPercent.textContent = result.formatted.expectedGainPercent;
        
        // Risk Calculation section (risk-based calculation)
        this.elements.portfolioRiskPercent.textContent = result.formatted.portfolioRiskPercent;
        this.elements.portfolioRiskAmount.textContent = result.formatted.portfolioRiskAmount;
        this.elements.riskSharesToBuy.textContent = result.formatted.riskShares;
        this.elements.riskTotalPositionValue.textContent = result.formatted.riskTotalPositionValue;
        this.elements.riskPositionPercentage.textContent = result.formatted.riskPositionPercentage;
        this.elements.riskRiskPerShare.textContent = result.formatted.riskPerShare;
        
        this.elements.positionSizingFormula.textContent = result.positionSizingFormula.calculation;
        this.elements.formulaResult.textContent = result.positionSizingFormula.result;
        
        this.elements.atrSharesDisplay.textContent = result.formatted.atrShares;
        this.elements.atrPositionValueDisplay.textContent = result.formatted.atrPositionValue;
        this.elements.positionDifference.textContent = result.formatted.positionDifference;
        this.elements.volatilityImpact.textContent = result.formatted.volatilityImpact;
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

        if (result.originalShares === 0) {
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
            this.elements.portfolioRiskPercent,
            this.elements.portfolioRiskAmount,
            this.elements.riskSharesToBuy,
            this.elements.riskTotalPositionValue,
            this.elements.riskPositionPercentage,
            this.elements.riskRiskPerShare,
            this.elements.positionSizingFormula,
            this.elements.formulaResult,
            this.elements.atrSharesDisplay,
            this.elements.atrPositionValueDisplay,
            this.elements.positionDifference,
            this.elements.volatilityImpact,
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
        const calculationData = this.storage.loadCalculationData();
        if (calculationData) {
            this.restoreCalculationInputs(calculationData);
        }

        this.calculate();
    }

    restoreCalculationInputs(data) {
        if (this.elements.entryPrice && data.entryPrice) {
            this.elements.entryPrice.value = data.entryPrice;
        }
        if (this.elements.stopLoss && data.stopLoss) {
            this.elements.stopLoss.value = data.stopLoss;
        }
        if (this.elements.atrPercent && data.atrPercent) {
            this.elements.atrPercent.value = data.atrPercent;
        }
        if (this.elements.riskPercent && data.riskPercent) {
            this.elements.riskPercent.value = data.riskPercent;
            this.updateRiskPercentDisplay();
        }
    }

    saveCurrentState() {
        const calculationData = {
            entryPrice: this.elements.entryPrice.value,
            stopLoss: this.elements.stopLoss.value,
            atrPercent: this.elements.atrPercent.value,
            riskPercent: this.elements.riskPercent.value
        };

        this.storage.saveCalculationData(calculationData);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof PositionCalculator !== 'undefined' && typeof StorageManager !== 'undefined') {
        window.app = new TradersMindApp();
    } else {
        console.error('Required dependencies not loaded');
    }
});