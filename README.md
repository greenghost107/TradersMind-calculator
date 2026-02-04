# TradersMind Calculator

A comprehensive trading position size calculator designed to help traders manage risk and optimize their trading positions. This Progressive Web App (PWA) provides real-time calculations for position sizing, risk management, and ATR-adjusted positioning.

## ✨ Features

### Core Functionality
- **Long & Short Positions**: Toggle between long and short trades with direction-aware validation and target price calculation
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
   - **Position Type**: Toggle between **Long** (default) and **Short** — the calculator validates stop placement and adjusts labels and target prices accordingly
   - **Stop Loss ($)**: Your stop-loss price level (must be below entry for longs, above entry for shorts)
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

The app features **smart installation** that prompts you at the right time based on your engagement.

**Automatic Prompt:**
- After using the app (making calculations, adjusting inputs)
- When your engagement score reaches 30 points (about 1 minute + 3 actions)
- The app will automatically suggest installation

**Manual Installation:**

**Mobile Devices (iOS):**
1. Open the calculator in **Safari** browser (required for iOS)
2. Tap the **Share** button (bottom center on iPhone, top right on iPad)
3. Scroll down and select **"Add to Home Screen"**
4. Tap **"Add"** to confirm
5. Access from your home screen like any other app

**Mobile Devices (Android):**
1. Open the calculator in Chrome browser
2. Click the floating **install button** (bottom right) or **3-dot menu** (top right)
3. Select **"Install app"** or **"Add to Home screen"**
4. Tap **"Install"** to confirm
5. Access from your home screen like any other app

**Desktop:**
1. Open in Chrome, Edge, or another PWA-compatible browser
2. Click the **install button** in the app or the install icon in the address bar
3. Click **"Install"** in the popup
4. Launch from your apps menu or desktop

**Note:** The install button appears after the service worker is ready (typically within 1-2 seconds of page load).

## 📊 Understanding the Calculations

### Long vs Short Positions
The position type toggle controls how the calculator interprets your entry and stop loss:

| | Long | Short |
|---|---|---|
| **Stop Loss** | Below entry price | Above entry price |
| **Target Price** | Entry + (risk × ratio) | Entry − (risk × ratio) |
| **Label** | Shares to Buy | Shares to Short |
| **Result Indicator** | Green left border | Red left border |

The core math uses `Math.abs(entryPrice - stopLoss)` for risk per share, so position sizing is direction-agnostic. The toggle enforces correct stop placement and flips the target price direction.

**Short example**: Entry $100, Stop $110, Risk 1%, Account $10,000
- Risk per share: $10 → Position size: 10 shares to short
- Target (5:1 reward): $100 − ($10 × 5) = $50

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
- Set appropriate stop-loss levels before entering trades: below entry for longs, above entry for shorts
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

### PWA Engagement System
The app tracks your engagement to determine the optimal time to suggest installation:

**Engagement Actions** (each worth points):
- Calculation completed: 10 points
- Input field changed: 2 points
- Settings menu opened: 5 points
- Time spent: 1 point per second

**Auto-Prompt Trigger**: 30 points
- Approximately 1 minute of usage + 3 meaningful actions
- Only prompts if you haven't dismissed recently
- Respects your installation state (won't prompt if already installed)

**Manual Installation**: Available anytime via:
- Floating install button (bottom right)
- Settings menu > Install option
- Browser menu > "Install app"

## 📱 Technical Requirements

- **Modern web browser** (Chrome, Firefox, Safari, Edge)
- **JavaScript enabled**
- **Internet connection** (for initial load, works offline after installation)

## 🚀 Deployment

### Requirements for PWA Installation
- ✅ HTTPS connection (required for Chrome/Edge install prompt)
- ✅ Valid manifest.json with `start_url` tracking parameter
- ✅ Registered service worker with dynamic path resolution
- ✅ User engagement (automatic prompt after interaction)
- ✅ Service worker activation before showing install UI

### PWA Architecture Improvements
The app now features enhanced PWA support:
- **Dynamic Path Resolution**: Service worker automatically detects and uses correct paths for root or subdirectory deployments
- **Smart Registration**: Waits for page load + 100ms delay for Chrome's PWA installability evaluation
- **Engagement Tracking**: Auto-prompts installation after 30 engagement points (calculations, input changes, menu interactions)
- **Platform Detection**: Customized installation flows for iOS Safari, Android Chrome, and Desktop browsers
- **Service Worker Ready Check**: Ensures service worker is active before showing install UI

### Deploy to GitHub Pages

**Already deployed!** The app is configured with **automatic path detection** for GitHub Pages.

**Your app URL**: `https://[username].github.io/[repository-name]/`

The app now uses **dynamic URL resolution** for all assets, ensuring it works correctly in:
- Root deployment: `https://yourdomain.com/`
- Subdirectory deployment: `https://username.github.io/repository-name/`

Simply push your changes:

```bash
git add .
git commit -m "Update app"
git push origin main
```

Your existing GitHub Pages setup will automatically deploy the changes.

**Technical Details:**
- Service worker cache version: `v5`
- Manifest includes `utm_source=pwa` for installation tracking
- Dynamic base path detection in service worker
- Crossorigin credentials for manifest

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

The included `vercel.json` configuration ensures proper headers for PWA functionality.

### Deploy to Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=.
```

The included `netlify.toml` configuration sets up proper headers and HTTPS redirects.

### Local HTTPS Testing
For testing PWA installation locally, you need HTTPS:

```bash
# Generate certificate (one-time setup)
# Install mkcert first:
# - macOS: brew install mkcert
# - Windows: choco install mkcert

mkcert -install
mkcert localhost 127.0.0.1 ::1

# Run with HTTPS
npm run dev:https

# Open in browser
# Visit https://localhost:8443
```

### Testing PWA Installation

**Running Tests:**
```bash
# Run all tests (~77 tests on chromium)
npm test

# Run specific test file
npx playwright test pwa-installability.spec.js

# Run tests in UI mode (interactive)
npm run test:ui

# Run tests with browser visible
npx playwright test --headed
```

**Test Coverage:**
- ✅ Android install flow (real user behavior)
- ✅ GitHub Pages deployment compatibility
- ✅ PWA installability criteria (Chrome checklist)
- ✅ Service worker caching and offline functionality
- ✅ PWA installation flows
- ✅ Settings menu behavior

**Manual Testing:**

**Desktop (Chrome/Edge):**
1. Open app via HTTPS URL
2. Wait for service worker to activate (~1-2 seconds)
3. Interact with page (make calculations, adjust inputs)
4. Look for floating install button (bottom right) OR install icon in address bar
5. Click to trigger native install dialog
6. Expected: Browser shows "Install TradersMind Calculator?" dialog

**iOS (Safari only):**
1. Open app in Safari browser (required)
2. Wait for service worker activation
3. Tap floating install button OR settings menu > Install
4. Expected: Modal with Share button instructions
5. Follow: Share button > "Add to Home Screen" > "Add"
6. Verify: App icon appears on home screen

**Android (Chrome):**
1. Open app in Chrome browser
2. Wait for service worker activation
3. Interact with the app
4. Expected: Native `beforeinstallprompt` fires automatically or
5. Tap floating install button OR menu > "Install app"
6. Follow prompts to install
7. Verify: App appears in app drawer and home screen

### Troubleshooting

**Check Installation Readiness:**
Open browser console and run:
```javascript
// View installation diagnostics
window.pwaInstaller.getInstallationStatus()

// Or detailed diagnostics
window.pwaInstaller.manager.getInstallDiagnostics()
```

**Common Issues & Solutions:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Install button not appearing | Service worker still initializing | Wait 1-2 seconds, button appears after SW is ready |
| "Checking Installation..." message | Waiting for `beforeinstallprompt` event | Normal - will timeout after 5 seconds and show manual instructions |
| HTTP instead of HTTPS | PWA requires secure connection | Deploy to Vercel/Netlify/GitHub Pages or use local HTTPS |
| No install prompt on iOS | iOS doesn't support `beforeinstallprompt` | Use Safari Share menu > "Add to Home Screen" |
| Install button hidden after reload | Service worker cache issue | Clear site data in DevTools > Application > Storage |
| Wrong browser on iOS | Using Chrome/Firefox on iOS | Copy URL and open in Safari |

**Platform-Specific Notes:**

**iOS (Safari):**
- ✅ Manual installation only (no automatic prompt)
- ✅ Must use Safari browser
- ✅ Share button location: iPhone (bottom center), iPad (top right)
- ✅ App shows custom modal with step-by-step instructions

**Android (Chrome/Edge):**
- ✅ Native `beforeinstallprompt` support
- ✅ Shows browser's native install dialog
- ✅ Fallback to manual instructions if prompt doesn't fire
- ✅ Install via menu > "Install app"

**Desktop (Chrome/Edge/Opera):**
- ✅ Native install prompt after engagement
- ✅ Install icon appears in address bar
- ✅ Works on Windows, macOS, and Linux

**Service Worker Debugging:**
```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg ? 'Registered' : 'Not registered');
  if (reg) console.log('Scope:', reg.scope);
});

// Check if controlling the page
console.log('SW controlling:', !!navigator.serviceWorker.controller);

// View cache version
caches.keys().then(keys => console.log('Cache keys:', keys));
```

## 🔧 File Structure

```
TradersMind Calculator/
├── index.html                  # Main application page with early prompt capture
├── manifest.json               # PWA configuration (v5, with utm tracking)
├── sw.js                       # Service worker with dynamic path resolution (v5)
├── pwa_fix.md                  # Technical documentation of PWA fixes
├── css/
│   └── styles.css              # Application styling with modal support
├── js/
│   ├── app.js                  # Main application logic
│   ├── calculator.js           # Position calculation engine
│   ├── storage.js              # Data persistence (localStorage)
│   ├── pwaInstallManager.js    # PWA state management & business logic (709 lines)
│   └── install.js              # PWA UI/UX presentation layer (925 lines)
├── icons/                      # App icons for different device sizes
│   ├── icon-192.png            # Standard & maskable icon (192x192)
│   ├── icon-512.png            # Standard & maskable icon (512x512)
│   └── favicon.ico             # Browser favicon
└── tests/                      # Comprehensive test suite (732 tests)
    ├── android-install-flow.spec.js
    ├── pwa-github-pages.spec.js
    ├── pwa-installability.spec.js
    ├── pwa-installation-e2e.spec.js
    └── ...
```

### PWA Architecture

**Two-Layer PWA System:**
1. **PWAInstallManager** (`pwaInstallManager.js`):
   - State management with vanilla JS hooks pattern
   - Event listener registration (`beforeinstallprompt`, `appinstalled`)
   - Engagement tracking system (30-point threshold)
   - Platform detection (iOS Safari, Android Chrome, Desktop)
   - Installation state persistence

2. **PWAInstaller** (`install.js`):
   - UI/UX presentation layer
   - Modal management with platform-specific instructions
   - Service worker registration with timing optimization
   - Install button visibility logic
   - Settings menu integration

**Early Prompt Capture:**
- Inline script in `<head>` captures `beforeinstallprompt` before external scripts load
- Prevents race conditions where event fires before listeners are registered
- Stores event in `window.deferredInstallPrompt` global variable

## 🔒 Privacy & Data

- **Local Storage Only**: All data is stored locally on your device
- **No Cloud Sync**: Your trading information never leaves your device
- **No Analytics**: No tracking or data collection
- **Offline Capable**: Works completely offline after installation

## 📄 Version Information

- **Current Version**: 1.0.0
- **PWA Version**: 5.0 (January 2025)
- **Service Worker Cache**: `v5` (tradersmind-static-v5)
- **Last Updated**: January 2025
- **Compatibility**: Modern browsers with PWA support (Chrome 80+, Safari 14+, Edge 80+)

### Recent PWA Improvements (v5)
- ✅ Dynamic path resolution for any deployment context
- ✅ Service worker ready check before showing install UI
- ✅ Initialization delay for Chrome PWA evaluation
- ✅ Engagement-based auto-prompt system (30-point threshold)
- ✅ Platform-specific installation flows (iOS, Android, Desktop)
- ✅ Enhanced error handling and diagnostics
- ✅ Manifest tracking with `utm_source=pwa` parameter

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