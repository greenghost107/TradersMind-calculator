# TradersMind Calculator

A comprehensive trading position size calculator designed to help traders manage risk and optimize their trading positions. This Progressive Web App (PWA) provides real-time calculations for position sizing, risk management, and profit targets.

## ✨ Features

### Core Functionality
- **Position Size Calculation**: Determines optimal number of shares based on account size and risk parameters
- **Risk Analysis**: Calculates dollar risk amounts and risk percentages
- **Profit Targets**: Automatically calculates target prices using 1:5 risk-to-reward ratio
- **ATR-Adjusted Positioning**: Advanced position sizing using Average True Range (ATR) for volatility adjustment
- **Portfolio Diversification**: Manages position sizes across multiple trades

### Trading Intelligence
- **Setup Quality Assessment**: Adjusts recommendations based on trade setup quality (Excellent, Good, Average, Poor)
- **Market Condition Analysis**: Factors in market conditions (Bullish, Neutral, Bearish, Volatile)
- **Risk Validation**: Validates stop-loss ranges (optimal: 4-5%)
- **Position Sizing Formula**: Displays the mathematical formula used for calculations

### User Experience
- **Progressive Web App**: Install on mobile devices for offline access
- **Real-time Calculations**: Instant updates as you modify inputs
- **Data Persistence**: Automatically saves your inputs for future sessions
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Basic Usage

1. **Enter Account Information**:
   - **Account Size ($)**: Your total trading account balance
   - **Amount of Positions**: Number of concurrent positions (1-50, default: 10)

2. **Input Trade Parameters**:
   - **Entry Price ($)**: Your planned entry price for the stock
   - **Stop Loss ($)**: Your stop-loss price level
   - **Setup Quality**: Rate your trade setup quality
   - **Market Condition**: Current market environment

3. **Review Calculations**:
   - Standard position size and risk metrics
   - Target prices and expected gains
   - Position sizing formula breakdown

4. **Fine-tune with ATR** (Optional):
   - **ATR (%)**: Enter the stock's Average True Range percentage
   - Review volatility-adjusted position recommendations

### Installation (PWA)

**Mobile Devices:**
1. Open the calculator in your mobile browser
2. Look for the "Add to Home Screen" prompt or install button
3. Tap "Add" to install as a native app
4. Access from your home screen like any other app

**Desktop:**
1. Open in Chrome, Edge, or another PWA-compatible browser
2. Click the install icon in the address bar
3. Click "Install" in the popup
4. Launch from your apps menu or desktop

## 📊 Understanding the Calculations

### Standard Position Size
- **Shares to Buy**: `Min(Capital Limit, Position Limit)`
  - Capital Limit: 95% of account ÷ entry price
  - Position Limit: (Account size ÷ max positions) ÷ entry price
- **Total Position Value**: Shares × Entry Price
- **Position % of Account**: (Position Value ÷ Account Size) × 100
- **Risk per Share**: |Entry Price - Stop Loss|

### Risk Analysis
- **Dollar Risk Amount**: Risk per Share × Position Size
- **Risk % of Account**: (Dollar Risk ÷ Account Size) × 100
- **Max Position per Trade**: Account Size ÷ Amount of Positions

### Stop Loss & Targets
- **Risk %**: (|Entry Price - Stop Loss| ÷ Entry Price) × 100
- **Target Price (1:5 R:R)**: Entry ± (Risk per Share × 5)
- **Expected Gain %**: (|Target - Entry| ÷ Entry) × 100

### ATR-Adjusted Position
The calculator adjusts position sizes based on volatility:

- **Low Volatility (< 6% ATR)**: Full position size (1.0x multiplier)
- **Medium Volatility (6-8% ATR)**: Reduced position (0.8x multiplier)
- **High Volatility (8-10% ATR)**: Further reduced (0.7x multiplier)
- **Very High Volatility (> 10% ATR)**: Minimal position (0.6x multiplier)

**Formula**: `ATR Shares = Standard Shares × ATR Multiplier`

### Setup Quality & Market Conditions

The calculator considers trade quality and market environment:

**Setup Quality Multipliers**:
- Excellent: 1.0x
- Good: 0.8x
- Average: 0.6x
- Poor: 0.4x

**Market Condition Multipliers**:
- Bullish: 1.0x
- Neutral: 0.8x
- Bearish: 0.6x
- Volatile: 0.5x

## 🎯 Best Practices

### Risk Management
- Keep individual position risk between 1-2% of account
- Maintain stop-loss ranges between 4-5% for optimal risk/reward
- Limit total positions to maintain proper diversification
- Use ATR adjustments for volatile stocks

### Position Sizing Strategy
- Start with standard position calculations
- Apply ATR adjustments for high-volatility stocks
- Consider reducing position sizes in poor market conditions
- Scale position sizes based on setup quality

### Using the Calculator Effectively
1. Always validate that your stop-loss is in the optimal 4-5% range
2. Check that your risk per trade doesn't exceed 2% of account
3. Use ATR data to adjust for stock volatility
4. Consider market conditions when sizing positions
5. Save different scenarios by bookmarking or taking screenshots

## 📱 Technical Requirements

- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **JavaScript enabled**
- **Internet connection** (for initial load, works offline after installation)

## 🔧 File Structure

```
TradersMind Calculator/
├── index.html              # Main application page
├── manifest.json           # PWA configuration
├── sw.js                   # Service worker for offline functionality
├── css/
│   └── styles.css          # Application styling
├── js/
│   ├── app.js              # Main application logic
│   ├── calculator.js       # Position calculation engine
│   ├── storage.js          # Data persistence
│   └── install.js          # PWA installation handling
└── icons/                  # App icons for different device sizes
    ├── icon-192.png
    ├── icon-512.png
    └── favicon.ico
```

## 🔒 Privacy & Data

- **Local Storage Only**: All data is stored locally on your device
- **No Cloud Sync**: Your trading information never leaves your device
- **No Analytics**: No tracking or data collection
- **Offline Capable**: Works completely offline after installation

## 📄 Version Information

- **Current Version**: 1.0.0
- **Last Updated**: November 2024
- **Compatibility**: Modern browsers with PWA support

## 🆘 Support & Usage Tips

### Common Issues
- **Calculations not updating**: Check that all required fields (marked with *) are filled
- **Install button not showing**: Ensure you're using a PWA-compatible browser
- **Negative position sizes**: Verify entry price and stop loss are different values

### Pro Tips
- Bookmark different scenarios with varying ATR values
- Use the app offline during trading hours
- Take screenshots of calculations for trade documentation
- Regularly update your account size as your balance changes

---

*TradersMind Calculator - Empowering informed trading decisions through precise risk management.*