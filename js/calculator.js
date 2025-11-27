class PositionCalculator {
    constructor() {
        // Risk-based position calculator
    }

    validateInputs(entryPrice, stopLoss, accountSize, maxPositions, atrPercent, riskPercent) {
        const errors = [];

        if (!entryPrice || entryPrice <= 0) {
            errors.push('Entry price must be greater than 0');
        }

        if (!stopLoss || stopLoss <= 0) {
            errors.push('Stop loss must be greater than 0');
        }

        if (!accountSize || accountSize <= 0) {
            errors.push('Account size must be greater than 0');
        }

        if (!maxPositions || maxPositions <= 0 || maxPositions > 50) {
            errors.push('Amount of positions must be between 1 and 50');
        }

        if (atrPercent < 0) {
            errors.push('ATR percent cannot be negative');
        }

        if (!riskPercent || riskPercent < 0.5 || riskPercent > 1.5) {
            errors.push('Risk percent must be between 0.5% and 1.5%');
        }

        if (entryPrice && stopLoss && entryPrice === stopLoss) {
            errors.push('Entry price and stop loss cannot be the same');
        }

        return errors;
    }

    calculateRiskReward(entryPrice, stopLoss, targetPrice) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(targetPrice - entryPrice);
        
        if (risk === 0) return 0;
        
        return reward / risk;
    }

    calculatePositionSize(entryPrice, stopLoss, accountSize, maxPositions) {
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        if (riskPerShare === 0) return 0;

        // Original calculation: Position size is limited by capital and portfolio diversification only
        const maxSharesByCapital = Math.floor((accountSize * 0.95) / entryPrice);
        const maxPositionValue = accountSize / maxPositions;
        const maxSharesByPositions = Math.floor(maxPositionValue / entryPrice);
        
        return Math.min(maxSharesByCapital, maxSharesByPositions);
    }

    calculateRiskBasedPositionSize(entryPrice, stopLoss, accountSize, riskPercent, maxPositions) {
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        if (riskPerShare === 0) return { shares: 0, constrainedByPositions: false };

        // Method 1: (Portfolio × Risk%) / Stop%
        const portfolioRisk = accountSize * (riskPercent / 100);
        const stopLossPercent = (riskPerShare / entryPrice) * 100;
        
        if (stopLossPercent === 0) return { shares: 0, constrainedByPositions: false };
        
        const riskBasedPositionValue = portfolioRisk / (stopLossPercent / 100);
        const riskBasedShares = Math.floor(riskBasedPositionValue / entryPrice);
        
        // Method 2: Portfolio / Max Positions
        const maxPositionValue = accountSize / maxPositions;
        const positionLimitShares = Math.floor(maxPositionValue / entryPrice);
        
        // Use MIN of both methods
        const finalShares = Math.min(riskBasedShares, positionLimitShares);
        const constrainedByPositions = finalShares === positionLimitShares && riskBasedShares > positionLimitShares;
        
        return { 
            shares: Math.max(0, finalShares),
            constrainedByPositions: constrainedByPositions,
            riskBasedShares: riskBasedShares,
            positionLimitShares: positionLimitShares
        };
    }

    calculatePortfolioRisk(accountSize, riskPercent) {
        return {
            riskPercent: riskPercent,
            riskAmount: accountSize * (riskPercent / 100)
        };
    }

    calculateRiskAmount(entryPrice, stopLoss, positionSize) {
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        return riskPerShare * positionSize;
    }

    calculatePositionPercentage(positionValue, accountSize) {
        return (positionValue / accountSize) * 100;
    }

    calculateTargetPrice(entryPrice, stopLoss, ratio = 5) {
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        const rewardPerShare = riskPerShare * ratio;
        
        if (entryPrice > stopLoss) {
            return entryPrice + rewardPerShare;
        } else {
            return entryPrice - rewardPerShare;
        }
    }

    calculateExpectedGainPercent(entryPrice, targetPrice) {
        return ((Math.abs(targetPrice - entryPrice) / entryPrice) * 100);
    }

    calculateStopRiskPercent(entryPrice, stopLoss) {
        return ((Math.abs(entryPrice - stopLoss) / entryPrice) * 100);
    }

    validatePositionRange(entryPrice, stopLoss) {
        const riskPercent = this.calculateStopRiskPercent(entryPrice, stopLoss);
        if (riskPercent >= 4 && riskPercent <= 5) {
            return { status: 'optimal', message: '✅ Optimal stop range (4-5%)' };
        } else if (riskPercent < 4) {
            return { status: 'tight', message: '⚠️ Stop too tight (<4%)' };
        } else {
            return { status: 'wide', message: '❌ Stop too wide (>5%)' };
        }
    }

    getOriginalPositionSizingFormula(accountSize, maxPositions, entryPrice) {
        const maxPositionValue = accountSize / maxPositions;
        const maxSharesByCapital = Math.floor((accountSize * 0.95) / entryPrice);
        const maxSharesByPositions = Math.floor(maxPositionValue / entryPrice);
        
        return {
            formula: `Min(Capital Limit, Position Limit)`,
            calculation: `Min($${(accountSize * 0.95).toLocaleString()} ÷ $${entryPrice}, $${maxPositionValue.toLocaleString()} ÷ $${entryPrice})`,
            result: `Min(${maxSharesByCapital}, ${maxSharesByPositions}) = ${Math.min(maxSharesByCapital, maxSharesByPositions)} shares`
        };
    }

    getRiskBasedPositionSizingFormula(accountSize, riskPercent, entryPrice, stopLoss, maxPositions, riskResult) {
        const portfolioRisk = accountSize * (riskPercent / 100);
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        const stopLossPercent = (riskPerShare / entryPrice) * 100;
        const maxPositionValue = accountSize / maxPositions;
        
        const riskBasedPositionValue = portfolioRisk / (stopLossPercent / 100);
        
        return {
            formula: `Position Size = MIN[(Portfolio × Risk%) / Stop%, Portfolio / Max Positions]`,
            calculation: `MIN[$${riskBasedPositionValue.toLocaleString()}, $${maxPositionValue.toLocaleString()}] = $${Math.min(riskBasedPositionValue, maxPositionValue).toLocaleString()}`,
            result: `${riskResult.shares} shares ${riskResult.constrainedByPositions ? '(limited by max positions)' : '(risk-based)'}`
        };
    }

    getATRMultiplier(atrPercent) {
        if (atrPercent < 6) {
            return 1.0;
        } else if (atrPercent >= 6 && atrPercent <= 8) {
            return 0.8;
        } else {
            return atrPercent > 10 ? 0.6 : 0.7;
        }
    }

    calculateATRAdjustedPosition(riskCalculatedShares, entryPrice, atrPercent) {
        const atrMultiplier = this.getATRMultiplier(atrPercent);
        const atrShares = Math.floor(riskCalculatedShares * atrMultiplier);
        const atrPositionValue = atrShares * entryPrice;
        const positionDifference = atrShares - riskCalculatedShares;
        const volatilityImpact = this.getVolatilityImpact(atrMultiplier);
        
        return {
            atrPercent: atrPercent,
            atrMultiplier: atrMultiplier,
            atrShares: atrShares,
            atrPositionValue: atrPositionValue,
            positionDifference: positionDifference,
            volatilityImpact: volatilityImpact,
            recommendation: this.getATRRecommendation(atrPercent)
        };
    }

    getVolatilityImpact(atrMultiplier) {
        if (atrMultiplier === 1.0) {
            return 'No Change';
        } else if (atrMultiplier < 1.0) {
            return 'Reduced';
        } else {
            return 'Increased';
        }
    }

    getATRRecommendation(atrPercent) {
        if (atrPercent < 6) {
            return 'Low volatility - Full position size';
        } else if (atrPercent >= 6 && atrPercent <= 8) {
            return 'Medium volatility - Reduced position (80%)';
        } else if (atrPercent > 8 && atrPercent <= 10) {
            return 'High volatility - Reduced position (70%)';
        } else {
            return 'Very high volatility - Minimal position (60%)';
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatRatio(ratio) {
        if (ratio === 0 || !isFinite(ratio)) return '0:1';
        return `${ratio.toFixed(2)}:1`;
    }

    formatShares(shares) {
        return new Intl.NumberFormat('en-US').format(shares);
    }


    calculate(inputs) {
        const {
            entryPrice,
            stopLoss,
            accountSize,
            maxPositions,
            atrPercent,
            riskPercent
        } = inputs;

        const errors = this.validateInputs(entryPrice, stopLoss, accountSize, maxPositions, atrPercent, riskPercent);
        if (errors.length > 0) {
            return { errors };
        }

        // Original position sizing (for Standard Position Size section)
        const originalShares = this.calculatePositionSize(entryPrice, stopLoss, accountSize, maxPositions);
        const originalTotalPositionValue = originalShares * entryPrice;
        const originalPositionPercentage = this.calculatePositionPercentage(originalTotalPositionValue, accountSize);
        const originalDollarRiskAmount = this.calculateRiskAmount(entryPrice, stopLoss, originalShares);
        const originalRiskPercentOfAccount = (originalDollarRiskAmount / accountSize) * 100;
        
        // Risk-based position sizing (for Risk Calculation section)
        const portfolioRisk = this.calculatePortfolioRisk(accountSize, riskPercent);
        const riskResult = this.calculateRiskBasedPositionSize(entryPrice, stopLoss, accountSize, riskPercent, maxPositions);
        const riskShares = riskResult.shares;
        const riskTotalPositionValue = riskShares * entryPrice;
        const riskPositionPercentage = this.calculatePositionPercentage(riskTotalPositionValue, accountSize);
        const riskDollarRiskAmount = this.calculateRiskAmount(entryPrice, stopLoss, riskShares);
        const riskRiskPercentOfAccount = (riskDollarRiskAmount / accountSize) * 100;
        
        // Common calculations
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        const maxPositionValue = accountSize / maxPositions;
        const maxPositionPercentage = this.calculatePositionPercentage(maxPositionValue, accountSize);
        const targetPrice = this.calculateTargetPrice(entryPrice, stopLoss, 5);
        const stopRiskPercent = this.calculateStopRiskPercent(entryPrice, stopLoss);
        const expectedGainPercent = this.calculateExpectedGainPercent(entryPrice, targetPrice);
        
        const positionSizingFormula = this.getRiskBasedPositionSizingFormula(accountSize, riskPercent, entryPrice, stopLoss, maxPositions, riskResult);
        const atrAdjustedPosition = this.calculateATRAdjustedPosition(riskShares, entryPrice, atrPercent);
        const positionValidation = this.validatePositionRange(entryPrice, stopLoss);

        return {
            // Original position sizing (Standard Position Size section)
            originalShares,
            originalTotalPositionValue,
            originalPositionPercentage,
            originalDollarRiskAmount,
            originalRiskPercentOfAccount,
            
            // Risk-based position sizing (Risk Calculation section)
            riskShares,
            riskTotalPositionValue,
            riskPositionPercentage,
            riskDollarRiskAmount,
            riskRiskPercentOfAccount,
            riskConstrainedByPositions: riskResult.constrainedByPositions,
            
            // Common values
            riskPerShare,
            maxPositions,
            maxPositionValue,
            maxPositionPercentage,
            stopRiskPercent,
            targetPrice,
            expectedGainPercent,
            portfolioRisk,
            positionSizingFormula,
            atrAdjustedPosition,
            positionValidation,
            formatted: {
                // Original position sizing
                originalShares: this.formatShares(originalShares),
                originalTotalPositionValue: this.formatCurrency(originalTotalPositionValue),
                originalPositionPercentage: `${originalPositionPercentage.toFixed(2)}%`,
                originalDollarRiskAmount: this.formatCurrency(originalDollarRiskAmount),
                originalRiskPercentOfAccount: `${originalRiskPercentOfAccount.toFixed(2)}%`,
                
                // Risk-based position sizing
                riskShares: this.formatShares(riskShares),
                riskTotalPositionValue: this.formatCurrency(riskTotalPositionValue),
                riskPositionPercentage: `${riskPositionPercentage.toFixed(2)}%`,
                riskDollarRiskAmount: this.formatCurrency(riskDollarRiskAmount),
                riskRiskPercentOfAccount: `${riskRiskPercentOfAccount.toFixed(2)}%`,
                
                // Common values
                riskPerShare: this.formatCurrency(riskPerShare),
                maxPositions: maxPositions.toString(),
                maxPositionValue: this.formatCurrency(maxPositionValue),
                maxPositionPercentage: `${maxPositionPercentage.toFixed(2)}%`,
                stopRiskPercent: `${stopRiskPercent.toFixed(2)}%`,
                targetPrice: this.formatCurrency(targetPrice),
                expectedGainPercent: `${expectedGainPercent.toFixed(2)}%`,
                portfolioRiskPercent: `${portfolioRisk.riskPercent}%`,
                portfolioRiskAmount: this.formatCurrency(portfolioRisk.riskAmount),
                atrShares: this.formatShares(atrAdjustedPosition.atrShares),
                atrPositionValue: this.formatCurrency(atrAdjustedPosition.atrPositionValue),
                positionDifference: atrAdjustedPosition.positionDifference.toString(),
                volatilityImpact: atrAdjustedPosition.volatilityImpact
            }
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PositionCalculator;
}

if (typeof window !== 'undefined') {
    window.PositionCalculator = PositionCalculator;
}