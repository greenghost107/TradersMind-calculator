# TradersMind Calculator

A comprehensive trading position size calculator designed to help traders manage risk and optimize their trading positions. This Progressive Web App (PWA) provides real-time calculations for position sizing, risk management, and ATR-adjusted positioning.

## ✨ Features

### Core Functionality
- **Position Size Calculation**: Determines optimal number of shares based on account size and risk parameters
- **Risk Analysis**: Calculates dollar risk amounts and risk percentages using a configurable risk slider (0.1% - 1.5%)
- **MIN Position Sizing**: Uses the smaller of risk-based sizing and diversification limits for safety
- **ATR-Adjusted Positioning**: Advanced position sizing using Average True Range (ATR) for volatility adjustment
- **Portfolio Diversification**: Manages position sizes across multiple trades

### Trading Intelligence
- **Dual Calculation Methods**: Shows both risk-based and max position calculations
- **Position Sizing Formula**: Displays the mathematical formula used for calculations
- **Volatility Impact Analysis**: Shows how ATR affects your position size

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
   - **Risk % of Account**: Use the slider to set your risk tolerance (0.1% - 1.5%, default: 1.0%)

3. **Review Risk Calculation**:
   - Portfolio Risk (% and $)
   - Position percentage of account
   - Trade Risk % (distance between entry and stop loss)
   - Risk per share
   - Total position value
   - Shares to buy based on risk parameters

4. **Review Total Max Position**:
   - Maximum shares based on diversification limits

5. **Fine-tune with ATR** (Optional):
   - **ATR (%)**: Enter the stock's Average True Range percentage
   - Review volatility-adjusted position recommendations

6. **Position Sizing Formula Reference**:
   - View the mathematical formula used for calculations at the bottom of the page
   - Formula is informational and shows the MIN-based risk calculation approach

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

### Risk Calculation (Primary Method)
The calculator uses a MIN function to determine position size based on the smaller of two calculations:

- **Method 1 - Risk-Based**: `(Portfolio × Risk%) / Stop%`
  - Calculates position size based on your risk tolerance
- **Method 2 - Diversification**: `Portfolio / Max Positions`
  - Limits position size based on portfolio diversification

**Formula**: `Position Size = MIN[(Portfolio × Risk%) / Stop%, Portfolio / Max Positions]`

### Risk Calculation Results
- **Portfolio Risk (%)**: Your selected risk percentage from the slider
- **Portfolio Risk ($)**: Account Size × Risk %
- **Position % of Account**: (Position Value ÷ Account Size) × 100
- **Trade Risk %**: Percentage distance between entry and stop loss: |(Entry Price - Stop Loss) ÷ Entry Price| × 100
- **Risk per Share**: |Entry Price - Stop Loss|
- **Total Position Value**: Shares × Entry Price
- **Shares to Buy**: Calculated using the MIN formula above

### Total Max Position
- **Shares to Buy**: Maximum shares based on account ÷ max positions
- **Total Position Value**: Shares × Entry Price
- **Position % of Account**: (Position Value ÷ Account Size) × 100

### ATR-Adjusted Position
The calculator adjusts position sizes based on volatility:

- **Low Volatility (< 6% ATR)**: Full position size (1.0x multiplier)
- **Medium Volatility (6-8% ATR)**: Reduced position (0.8x multiplier)
- **High Volatility (8-10% ATR)**: Further reduced (0.7x multiplier)
- **Very High Volatility (> 10% ATR)**: Minimal position (0.6x multiplier)

**Formula**: `ATR Shares = Standard Shares × ATR Multiplier`

## 🎯 Best Practices

### Risk Management
- Use the risk slider to keep individual position risk between 0.5-1.5% of account
- Set appropriate stop-loss levels before entering trades
- Limit total positions to maintain proper diversification
- Use ATR adjustments for volatile stocks

### Position Sizing Strategy
- Start with the Risk Calculation section for your primary position sizing
- Review the Total Max Position to understand diversification limits
- Apply ATR adjustments for high-volatility stocks
- The calculator uses the MIN of both methods for safety

### Using the Calculator Effectively
1. Enter your account size and desired number of positions first
2. Input entry price and stop loss for your trade
3. Adjust the risk slider based on your risk tolerance
4. Check the Risk Calculation for shares to buy
5. Use ATR data to adjust for stock volatility

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
- **Calculations not updating**: Check that Account Size, Entry Price, and Stop Loss (marked with *) are filled
- **Install button not showing**: Ensure you're using a PWA-compatible browser
- **Position showing as limited**: The calculator uses the MIN of risk-based and diversification limits

### Pro Tips
- Your inputs are automatically saved for future sessions
- Use the app offline during trading hours
- Adjust the risk slider to see how different risk levels affect position size
- Regularly update your account size as your balance changes

---

*TradersMind Calculator - Empowering informed trading decisions through precise risk management.*