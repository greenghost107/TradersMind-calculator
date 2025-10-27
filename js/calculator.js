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

    validateInputs(entryPrice, stopLoss, targetPrice, accountSize, maxPositionPercent) {
        const errors = [];

        if (!entryPrice || entryPrice <= 0) {
            errors.push('Entry price must be greater than 0');
        }

        if (!stopLoss || stopLoss <= 0) {
            errors.push('Stop loss must be greater than 0');
        }

        if (!targetPrice || targetPrice <= 0) {
            errors.push('Target price must be greater than 0');
        }

        if (!accountSize || accountSize <= 0) {
            errors.push('Account size must be greater than 0');
        }

        if (!maxPositionPercent || maxPositionPercent <= 0 || maxPositionPercent > 100) {
            errors.push('Max position percent must be between 0 and 100');
        }

        if (entryPrice && stopLoss && entryPrice === stopLoss) {
            errors.push('Entry price and stop loss cannot be the same');
        }

        if (entryPrice && targetPrice && entryPrice === targetPrice) {
            errors.push('Entry price and target price cannot be the same');
        }

        return errors;
    }

    calculateRiskReward(entryPrice, stopLoss, targetPrice) {
        const risk = Math.abs(entryPrice - stopLoss);
        const reward = Math.abs(targetPrice - entryPrice);
        
        if (risk === 0) return 0;
        
        return reward / risk;
    }

    calculatePositionSize(entryPrice, stopLoss, accountSize, maxPositionPercent, setupQuality, marketCondition) {
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        if (riskPerShare === 0) return 0;

        const setupMultiplier = this.setupQualityMultipliers[setupQuality] || 0.8;
        const marketMultiplier = this.marketConditionMultipliers[marketCondition] || 0.8;
        
        const adjustedMaxPosition = maxPositionPercent * setupMultiplier * marketMultiplier;
        
        const maxRiskAmount = (accountSize * adjustedMaxPosition) / 100;
        
        const positionSize = Math.floor(maxRiskAmount / riskPerShare);
        
        const maxSharesByCapital = Math.floor((accountSize * 0.95) / entryPrice);
        
        return Math.min(positionSize, maxSharesByCapital);
    }

    calculateRiskAmount(entryPrice, stopLoss, positionSize) {
        const riskPerShare = Math.abs(entryPrice - stopLoss);
        return riskPerShare * positionSize;
    }

    calculatePotentialProfit(entryPrice, targetPrice, positionSize) {
        const profitPerShare = Math.abs(targetPrice - entryPrice);
        return profitPerShare * positionSize;
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
            targetPrice,
            accountSize,
            maxPositionPercent,
            setupQuality,
            marketCondition
        } = inputs;

        const errors = this.validateInputs(entryPrice, stopLoss, targetPrice, accountSize, maxPositionPercent);
        if (errors.length > 0) {
            return { errors };
        }

        const riskReward = this.calculateRiskReward(entryPrice, stopLoss, targetPrice);
        const positionSize = this.calculatePositionSize(
            entryPrice, 
            stopLoss, 
            accountSize, 
            maxPositionPercent, 
            setupQuality, 
            marketCondition
        );
        const riskAmount = this.calculateRiskAmount(entryPrice, stopLoss, positionSize);
        const potentialProfit = this.calculatePotentialProfit(entryPrice, targetPrice, positionSize);
        const recommendation = this.getRecommendation(riskReward, setupQuality, marketCondition);

        return {
            riskReward,
            positionSize,
            riskAmount,
            potentialProfit,
            recommendation,
            formatted: {
                riskReward: this.formatRatio(riskReward),
                positionSize: this.formatShares(positionSize),
                riskAmount: this.formatCurrency(riskAmount),
                potentialProfit: this.formatCurrency(potentialProfit)
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