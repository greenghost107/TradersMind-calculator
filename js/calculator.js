class PositionCalculator {
    constructor() {
        this.setupQualityMultipliers = {
            excellent: 1.0,
            good: 0.8,
            average: 0.6,
            poor: 0.4
        };
        
        this.marketConditionMultipliers = {
            bullish: 1.0,
            neutral: 0.8,
            bearish: 0.6,
            volatile: 0.5
        };
    }

    validateInputs(entryPrice, stopLoss, accountSize, accountRisk, maxPositions, atrPercent) {
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

        if (!accountRisk || accountRisk <= 0 || accountRisk > 100) {
            errors.push('Account risk must be between 0 and 100');
        }

        if (!maxPositions || maxPositions <= 0 || maxPositions > 50) {
            errors.push('Amount of positions must be between 1 and 50');
        }

        if (atrPercent < 0) {
            errors.push('ATR percent cannot be negative');
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

    calculatePositionSize(entryPrice, stopLoss, accountSize, accountRisk, maxPositions, setupQuality, marketCondition) {
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        if (riskPerShare === 0) return 0;

        const setupMultiplier = this.setupQualityMultipliers[setupQuality] || 0.8;
        const marketMultiplier = this.marketConditionMultipliers[marketCondition] || 0.8;
        
        const adjustedRisk = accountRisk * setupMultiplier * marketMultiplier;
        const riskAmount = (accountSize * adjustedRisk) / 100;
        
        const sharesByRisk = Math.floor(riskAmount / riskPerShare);
        
        const maxSharesByCapital = Math.floor((accountSize * 0.95) / entryPrice);
        const maxPositionValue = accountSize / maxPositions;
        const maxSharesByPositions = Math.floor(maxPositionValue / entryPrice);
        
        return Math.min(sharesByRisk, maxSharesByCapital, maxSharesByPositions);
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

    getPositionSizingFormula(accountSize, accountRisk, entryPrice, stopLoss) {
        const riskAmount = (accountSize * accountRisk) / 100;
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        
        return {
            formula: `(Account Size × Risk%) ÷ (Entry Price - Stop Loss)`,
            calculation: `($${accountSize.toLocaleString()} × ${accountRisk}%) ÷ ($${entryPrice} - $${stopLoss})`,
            result: `$${riskAmount.toLocaleString()} ÷ $${riskPerShare.toFixed(2)} = ${Math.floor(riskAmount / riskPerShare)} shares`
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

    getRecommendation(riskReward, setupQuality, marketCondition) {
        const minRiskReward = {
            excellent: 1.5,
            good: 2.0,
            average: 2.5,
            poor: 3.0
        };

        const marketAdjustment = {
            bullish: 0.8,
            neutral: 1.0,
            bearish: 1.2,
            volatile: 1.5
        };

        const requiredRatio = (minRiskReward[setupQuality] || 2.0) * (marketAdjustment[marketCondition] || 1.0);

        if (riskReward >= requiredRatio) {
            return {
                type: 'good',
                message: 'Good trade setup'
            };
        } else if (riskReward >= requiredRatio * 0.75) {
            return {
                type: 'warning',
                message: 'Marginal setup - consider reducing position'
            };
        } else {
            return {
                type: 'poor',
                message: 'Poor risk/reward - avoid this trade'
            };
        }
    }

    calculate(inputs) {
        const {
            entryPrice,
            stopLoss,
            accountSize,
            accountRisk,
            maxPositions,
            atrPercent,
            setupQuality,
            marketCondition
        } = inputs;

        const errors = this.validateInputs(entryPrice, stopLoss, accountSize, accountRisk, maxPositions, atrPercent);
        if (errors.length > 0) {
            return { errors };
        }

        const shares = this.calculatePositionSize(entryPrice, stopLoss, accountSize, accountRisk, maxPositions, setupQuality, marketCondition);
        const totalPositionValue = shares * entryPrice;
        const positionPercentage = this.calculatePositionPercentage(totalPositionValue, accountSize);
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        const dollarRiskAmount = this.calculateRiskAmount(entryPrice, stopLoss, shares);
        const riskPercentOfAccount = (dollarRiskAmount / accountSize) * 100;
        const maxPositionValue = accountSize / maxPositions;
        const maxPositionPercentage = this.calculatePositionPercentage(maxPositionValue, accountSize);
        
        const targetPrice = this.calculateTargetPrice(entryPrice, stopLoss, 5);
        const stopRiskPercent = this.calculateStopRiskPercent(entryPrice, stopLoss);
        const expectedGainPercent = this.calculateExpectedGainPercent(entryPrice, targetPrice);
        
        const positionSizingFormula = this.getPositionSizingFormula(accountSize, accountRisk, entryPrice, stopLoss);
        const atrAdjustedPosition = this.calculateATRAdjustedPosition(shares, entryPrice, atrPercent);
        const positionValidation = this.validatePositionRange(entryPrice, stopLoss);

        return {
            shares,
            totalPositionValue,
            positionPercentage,
            riskPerShare,
            dollarRiskAmount,
            riskPercentOfAccount,
            maxPositions,
            maxPositionValue,
            maxPositionPercentage,
            stopRiskPercent,
            targetPrice,
            expectedGainPercent,
            positionSizingFormula,
            atrAdjustedPosition,
            positionValidation,
            formatted: {
                shares: this.formatShares(shares),
                totalPositionValue: this.formatCurrency(totalPositionValue),
                positionPercentage: `${positionPercentage.toFixed(2)}%`,
                riskPerShare: this.formatCurrency(riskPerShare),
                dollarRiskAmount: this.formatCurrency(dollarRiskAmount),
                riskPercentOfAccount: `${riskPercentOfAccount.toFixed(2)}%`,
                maxPositions: maxPositions.toString(),
                maxPositionValue: this.formatCurrency(maxPositionValue),
                maxPositionPercentage: `${maxPositionPercentage.toFixed(2)}%`,
                stopRiskPercent: `${stopRiskPercent.toFixed(2)}%`,
                targetPrice: this.formatCurrency(targetPrice),
                expectedGainPercent: `${expectedGainPercent.toFixed(2)}%`,
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