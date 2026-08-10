class PositionCalculator {
    constructor() {
        // Risk-based position calculator
    }

    validateInputs(entryPrice, stopLoss, accountSize, maxPositions, atrPercent, riskPercent, positionType = 'long') {
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

        if (!riskPercent || riskPercent < 0.1 || riskPercent > 1.5) {
            errors.push('Risk percent must be between 0.1% and 1.5%');
        }

        if (entryPrice && stopLoss && entryPrice === stopLoss) {
            errors.push('Entry price and stop loss cannot be the same');
        }

        // Position type validation
        if (entryPrice && stopLoss && entryPrice !== stopLoss) {
            if (positionType === 'long' && stopLoss >= entryPrice) {
                errors.push('For long positions, stop loss must be below entry price');
            }
            if (positionType === 'short' && stopLoss <= entryPrice) {
                errors.push('For short positions, stop loss must be above entry price');
            }
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
        if (riskPerShare === 0) return { shares: 0, exceedsPositionLimit: false, cappedByMaxPosition: false };

        const portfolioRisk = accountSize * (riskPercent / 100);
        const stopLossPercent = (riskPerShare / entryPrice) * 100;

        if (stopLossPercent === 0) return { shares: 0, exceedsPositionLimit: false, cappedByMaxPosition: false };

        const riskBasedPositionValue = portfolioRisk / (stopLossPercent / 100);
        const riskBasedShares = Math.floor(riskBasedPositionValue / entryPrice);

        // Hard cap: a single position must never exceed 25% of the account
        const maxPositionCapShares = Math.floor((accountSize * 0.25) / entryPrice);

        // Diversification reference: 1/N slot — advisory only, no longer caps shares
        const positionLimitShares = Math.floor((accountSize / maxPositions) / entryPrice);

        const finalShares = Math.max(0, Math.min(riskBasedShares, maxPositionCapShares));
        const cappedByMaxPosition = riskBasedShares > maxPositionCapShares;
        const exceedsPositionLimit = finalShares > positionLimitShares;

        return {
            shares: finalShares,
            exceedsPositionLimit,
            cappedByMaxPosition,
            riskBasedShares,
            positionLimitShares,
            maxPositionCapShares
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
        const maxPositionCapValue = accountSize * 0.25;
        const positionLimitValue = accountSize / maxPositions;

        const riskBasedPositionValue = portfolioRisk / (stopLossPercent / 100);
        const effectiveValue = Math.min(riskBasedPositionValue, maxPositionCapValue);

        let resultAnnotation;
        if (riskResult.cappedByMaxPosition) {
            resultAnnotation = '(capped at 25% of account)';
        } else if (riskResult.exceedsPositionLimit) {
            resultAnnotation = `(risk-based — exceeds 1/${maxPositions} slot: ${riskResult.positionLimitShares} shares)`;
        } else {
            resultAnnotation = '(risk-based)';
        }

        return {
            formula: `Position Size = MIN[(Portfolio × Risk%) / Stop%, 0.25 × Portfolio / Entry]`,
            calculation: `MIN[$${riskBasedPositionValue.toLocaleString(undefined, {maximumFractionDigits: 0})}, $${maxPositionCapValue.toLocaleString(undefined, {maximumFractionDigits: 0})}] = $${effectiveValue.toLocaleString(undefined, {maximumFractionDigits: 0})} | 1/${maxPositions} slot: $${positionLimitValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
            result: `${riskResult.shares} shares ${resultAnnotation}`
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

    calculateExecutedDeal(entryPrice, stopLoss, positionType, shares, commission) {
        const R = Math.abs(entryPrice - stopLoss);
        if (R === 0 || entryPrice <= 0) return null;

        const commissionPerShare = shares > 0 ? commission / shares : 0;
        const multipliers = [2, 3, 5];

        const targets = multipliers.map(mult => {
            const targetPrice = positionType === 'long'
                ? entryPrice + mult * R
                : entryPrice - mult * R;

            const grossGain = mult * R;
            const grossPercent = (grossGain / entryPrice) * 100;
            const netGain = grossGain - commissionPerShare;
            const netPercent = (netGain / entryPrice) * 100;

            return {
                multiplier: mult,
                targetPrice,
                grossGain,
                grossPercent,
                netGain,
                netPercent,
                formatted: {
                    label: `${mult}R`,
                    targetPrice: this.formatCurrency(targetPrice),
                    grossPercent: `${grossPercent.toFixed(2)}%`,
                    netPercent: `${netPercent.toFixed(2)}%`
                }
            };
        });

        return {
            R,
            commissionPerShare,
            targets,
            formatted: {
                R: this.formatCurrency(R)
            }
        };
    }


    calculate(inputs) {
        const {
            entryPrice,
            stopLoss,
            accountSize,
            maxPositions,
            atrPercent,
            riskPercent,
            positionType = 'long',
            riskSharesOverride = null
        } = inputs;

        const errors = this.validateInputs(entryPrice, stopLoss, accountSize, maxPositions, atrPercent, riskPercent, positionType);
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
        const suggestedRiskShares = riskResult.shares;

        // Manual override: when set, the chosen share count drives every share-dependent value below.
        const riskSharesOverridden = riskSharesOverride != null && !isNaN(riskSharesOverride) && riskSharesOverride >= 0;
        const riskShares = riskSharesOverridden ? riskSharesOverride : suggestedRiskShares;
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
            suggestedRiskShares,
            riskSharesOverridden,
            riskTotalPositionValue,
            riskPositionPercentage,
            riskDollarRiskAmount,
            riskRiskPercentOfAccount,
            riskExceedsPositionLimit: riskResult.exceedsPositionLimit,
            riskCappedByMaxPosition: riskResult.cappedByMaxPosition,
            riskPositionLimitShares: riskResult.positionLimitShares,
            
            // Common values
            riskPerShare,
            maxPositions,
            maxPositionValue,
            maxPositionPercentage,
            stopRiskPercent,
            tradeRiskPercent: stopRiskPercent, // Alias for clarity in UI
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
                suggestedRiskShares: this.formatShares(suggestedRiskShares),
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
                tradeRiskPercent: `${stopRiskPercent.toFixed(2)}%`,
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