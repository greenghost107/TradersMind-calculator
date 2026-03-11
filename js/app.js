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
            portfolioRiskPercent: document.getElementById('portfolio-risk-percent'),
            portfolioRiskAmount: document.getElementById('portfolio-risk-amount'),
            tradeRiskPercent: document.getElementById('trade-risk-percent'),
            riskSharesToBuy: document.getElementById('risk-shares-to-buy'),
            riskConstraintLabel: document.getElementById('risk-constraint-label'),
            riskTotalPositionValue: document.getElementById('risk-total-position-value'),
            riskPositionPercentage: document.getElementById('risk-position-percentage'),
            riskRiskPerShare: document.getElementById('risk-risk-per-share'),
            positionSizingFormula: document.getElementById('position-sizing-formula'),
            formulaResult: document.getElementById('formula-result'),
            atrSharesDisplay: document.getElementById('atr-shares-display'),
            atrPositionValueDisplay: document.getElementById('atr-position-value-display'),
            positionDifference: document.getElementById('position-difference'),
            volatilityImpact: document.getElementById('volatility-impact'),
            positionValidation: document.getElementById('position-validation'),

            longBtn: document.getElementById('long-btn'),
            shortBtn: document.getElementById('short-btn'),
            riskSharesLabel: document.getElementById('risk-shares-label'),
            maxSharesLabel: document.getElementById('max-shares-label'),

            executedDealBtn: document.getElementById('executed-deal-btn'),
            dealSection: document.getElementById('executed-deal-section'),
            dealCommission: document.getElementById('deal-commission'),
            dealRValue: document.getElementById('deal-r-value'),
            dealTarget2r: document.getElementById('deal-target-2r'),
            dealTarget3r: document.getElementById('deal-target-3r'),
            dealTarget5r: document.getElementById('deal-target-5r'),
            dealPercent2r: document.getElementById('deal-percent-2r'),
            dealPercent3r: document.getElementById('deal-percent-3r'),
            dealPercent5r: document.getElementById('deal-percent-5r'),
            dealCopyBtn: document.getElementById('deal-copy-btn')
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

        // Position type toggle handlers
        if (this.elements.longBtn) {
            this.elements.longBtn.addEventListener('click', () => this.setPositionType('long'));
        }
        if (this.elements.shortBtn) {
            this.elements.shortBtn.addEventListener('click', () => this.setPositionType('short'));
        }

        window.addEventListener('beforeunload', () => {
            this.saveCurrentState();
        });

        if (this.elements.executedDealBtn) {
            this.elements.executedDealBtn.addEventListener('click', () => this.toggleExecutedDeal());
        }

        if (this.elements.dealCopyBtn) {
            this.elements.dealCopyBtn.addEventListener('click', () => this.copyDealToClipboard());
        }

        if (this.elements.dealCommission) {
            this.elements.dealCommission.addEventListener('input', this.debounce(() => {
                this.saveCommission();
                this.handleInputChange();
            }, 300));
            this.elements.dealCommission.addEventListener('change', () => {
                this.saveCommission();
                this.handleInputChange();
            });
        }
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

    setPositionType(type) {
        this.elements.longBtn.classList.toggle('active', type === 'long');
        this.elements.shortBtn.classList.toggle('active', type === 'short');
        this.elements.longBtn.setAttribute('aria-pressed', type === 'long');
        this.elements.shortBtn.setAttribute('aria-pressed', type === 'short');

        const label = type === 'long' ? 'Shares to Buy' : 'Shares to Short';
        this.elements.riskSharesLabel.textContent = label;
        this.elements.maxSharesLabel.textContent = label;

        this.handleInputChange();
    }

    getPositionType() {
        return this.elements.shortBtn.classList.contains('active') ? 'short' : 'long';
    }

    getInputValues() {
        return {
            entryPrice: parseFloat(this.elements.entryPrice.value) || 0,
            stopLoss: parseFloat(this.elements.stopLoss.value) || 0,
            atrPercent: parseFloat(this.elements.atrPercent.value) || 5.0,
            accountSize: parseFloat(this.elements.accountSize.value) || 0,
            maxPositions: parseInt(this.elements.maxPositions.value) || 10,
            riskPercent: parseFloat(this.elements.riskPercent.value) || 1.0,
            positionType: this.getPositionType()
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
        // Risk Calculation section (risk-based calculation with MIN logic) - Now at top
        this.elements.portfolioRiskPercent.textContent = result.formatted.portfolioRiskPercent;
        this.elements.portfolioRiskAmount.textContent = result.formatted.portfolioRiskAmount;
        this.elements.tradeRiskPercent.textContent = result.formatted.tradeRiskPercent;
        this.elements.riskSharesToBuy.textContent = result.formatted.riskShares;
        this.elements.riskTotalPositionValue.textContent = result.formatted.riskTotalPositionValue;
        this.elements.riskPositionPercentage.textContent = result.formatted.riskPositionPercentage;
        this.elements.riskRiskPerShare.textContent = result.formatted.riskPerShare;

        // Show/hide constraint label
        if (this.elements.riskConstraintLabel) {
            if (result.riskConstrainedByPositions) {
                this.elements.riskConstraintLabel.style.display = 'block';
            } else {
                this.elements.riskConstraintLabel.style.display = 'none';
            }
        }

        // Total Max Position section (original calculation) - Now second
        this.elements.sharesToBuy.textContent = result.formatted.originalShares;
        this.elements.totalPositionValue.textContent = result.formatted.originalTotalPositionValue;
        this.elements.positionPercentage.textContent = result.formatted.originalPositionPercentage;
        this.elements.riskPerShare.textContent = result.formatted.riskPerShare;

        this.elements.positionSizingFormula.textContent = result.positionSizingFormula.calculation;
        this.elements.formulaResult.textContent = result.positionSizingFormula.result;

        this.elements.atrSharesDisplay.textContent = result.formatted.atrShares;
        this.elements.atrPositionValueDisplay.textContent = result.formatted.atrPositionValue;
        this.elements.positionDifference.textContent = result.formatted.positionDifference;
        this.elements.volatilityImpact.textContent = result.formatted.volatilityImpact;
        this.elements.positionValidation.textContent = result.positionValidation.message;

        this.updateResultColors(result);
        this.updatePositionIndicators();

        this.renderExecutedDeal(result);

        // Dispatch calculation complete event for PWA engagement tracking
        document.dispatchEvent(new CustomEvent('calculation-complete', {
            detail: { result: result }
        }));
    }

    updatePositionIndicators() {
        const isShort = this.getPositionType() === 'short';
        document.querySelectorAll('.result-section').forEach(section => {
            section.classList.toggle('short-position', isShort);
            section.classList.toggle('long-position', !isShort);
        });
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
            this.elements.portfolioRiskPercent,
            this.elements.portfolioRiskAmount,
            this.elements.tradeRiskPercent,
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
        
        // Hide constraint label
        if (this.elements.riskConstraintLabel) {
            this.elements.riskConstraintLabel.style.display = 'none';
        }
    }

    showValidationErrors(errors) {
        console.warn('Validation errors:', errors);
    }

    clearValidationErrors() {
    }

    showError(message) {
        console.error(message);
    }

    toggleExecutedDeal() {
        const isHidden = this.elements.dealSection.classList.contains('hidden');
        this.elements.dealSection.classList.toggle('hidden', !isHidden);
        this.elements.executedDealBtn.classList.toggle('active', isHidden);
        this.elements.executedDealBtn.setAttribute('aria-pressed', isHidden);

        if (isHidden) {
            this.handleInputChange();
        }
    }

    saveCommission() {
        const commission = parseFloat(this.elements.dealCommission.value);
        if (!isNaN(commission) && commission >= 0) {
            this.storage.saveSettings({ defaultCommission: commission });
        }
    }

    loadCommission() {
        const settings = this.storage.loadSettings();
        if (this.elements.dealCommission && settings.defaultCommission !== undefined) {
            this.elements.dealCommission.value = settings.defaultCommission;
        }
    }

    renderExecutedDeal(result) {
        if (!this.elements.dealSection || this.elements.dealSection.classList.contains('hidden')) return;

        if (!result || result.errors) {
            this.clearExecutedDeal();
            return;
        }

        const inputs = this.getInputValues();
        const commission = parseFloat(this.elements.dealCommission.value) || 0.35;
        const dealResult = this.calculator.calculateExecutedDeal(
            inputs.entryPrice,
            inputs.stopLoss,
            inputs.positionType,
            result.riskShares,
            commission
        );

        if (!dealResult) {
            this.clearExecutedDeal();
            return;
        }

        this.elements.dealRValue.textContent = dealResult.formatted.R;

        const [r2, r3, r5] = dealResult.targets;
        this.elements.dealTarget2r.textContent = r2.formatted.targetPrice;
        this.elements.dealTarget3r.textContent = r3.formatted.targetPrice;
        this.elements.dealTarget5r.textContent = r5.formatted.targetPrice;

        this.elements.dealPercent2r.textContent = r2.formatted.grossPercent;
        this.elements.dealPercent3r.textContent = r3.formatted.grossPercent;
        this.elements.dealPercent5r.textContent = r5.formatted.grossPercent;
    }

    clearExecutedDeal() {
        const dealElements = [
            this.elements.dealTarget2r, this.elements.dealTarget3r, this.elements.dealTarget5r,
            this.elements.dealPercent2r, this.elements.dealPercent3r, this.elements.dealPercent5r
        ];
        dealElements.forEach(el => { if (el) el.textContent = '-'; });
        if (this.elements.dealRValue) this.elements.dealRValue.textContent = '-';
    }

    copyDealToClipboard() {
        const r = this.elements.dealRValue.textContent;
        const t2 = this.elements.dealTarget2r.textContent;
        const t3 = this.elements.dealTarget3r.textContent;
        const t5 = this.elements.dealTarget5r.textContent;
        const p2 = this.elements.dealPercent2r.textContent;
        const p3 = this.elements.dealPercent3r.textContent;
        const p5 = this.elements.dealPercent5r.textContent;

        const text = [
            `R: ${r}`,
            `       2R       3R       5R`,
            `Target ${t2}  ${t3}  ${t5}`,
            `% Gain ${p2}  ${p3}  ${p5}`
        ].join('\n');

        navigator.clipboard.writeText(text).then(() => {
            this.elements.dealCopyBtn.classList.add('copied');
            setTimeout(() => this.elements.dealCopyBtn.classList.remove('copied'), 1500);
        }).catch(() => {});
    }

    loadSavedData() {
        const calculationData = this.storage.loadCalculationData();
        if (calculationData) {
            this.restoreCalculationInputs(calculationData);
        }

        this.loadCommission();
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
        if (this.elements.maxPositions && data.maxPositions) {
            this.elements.maxPositions.value = data.maxPositions;
        }
        if (this.elements.accountSize && data.accountSize) {
            this.elements.accountSize.value = data.accountSize;
        }
        if (data.positionType) {
            this.setPositionType(data.positionType);
        }
    }

    saveCurrentState() {
        const calculationData = {
            entryPrice: this.elements.entryPrice.value,
            stopLoss: this.elements.stopLoss.value,
            atrPercent: this.elements.atrPercent.value,
            riskPercent: this.elements.riskPercent.value,
            maxPositions: this.elements.maxPositions.value,
            accountSize: this.elements.accountSize.value,
            positionType: this.getPositionType()
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