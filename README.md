# AI-Navigator

A browser extension for quick navigation in AI chat conversations. Designed to improve browsing and positioning efficiency in long, multi-model conversations. Supports ChatGPT, Claude, Gemini, Kimi, Qianwen, Doubao, Khoj and more.

## Features

### Core
- **Floating Navigation Panel** — A sidebar navigation panel, semi-hidden by default, expands on hover without disrupting your reading
- **Smart Question Detection** — Automatically identifies and indexes every user question, generating a clear conversation outline
- **Quick Jump** — Click any item to smoothly scroll to the corresponding conversation position
- **Auto Highlight** — Detects the current viewport in real time and highlights the active conversation item for context awareness
- **Search & Filter** — Keyword search to quickly locate past conversations
- **Live Updates** — Automatically detects new messages and updates the navigation as conversations grow, no page refresh needed

### Panel Controls
- **Drag to Move** — Freely adjust the panel's vertical position via the drag handle
- **Edge Snapping** — Double-click the drag handle to toggle between left and right sides; the panel auto-snaps to the nearest edge on release
- **Pin Panel** — Enable pin mode in settings to keep the panel permanently expanded
- **Opacity Control** — Stepless opacity adjustment from 10% to 100%, with frosted glass backdrop blur
- **Panel Resize** — Drag the top or bottom edge to adjust panel height
- **Auto-Collapse on Input Focus** — The panel automatically collapses when the chat input box is focused, preventing obstruction

### Smart Features
- **Context Usage Estimation** — Real-time token usage estimation displayed as a progress bar (green / yellow / orange / red)
- **Image Message Detection** — Image messages are automatically labeled as `[Image]`
- **Full Text Tooltip** — Hover over any navigation item to see the complete conversation text in a floating tooltip
- **Dark Mode** — Automatically adapts to the system dark mode and supports each platform's own theme switching
- **Platform Theme Colors** — Each platform uses its own accent color, visually consistent with the original platform
- **Persistent Settings** — Panel position, edge, opacity, height, and pin state are automatically saved and restored across page refreshes
- **SPA Navigation Support** — Automatically detects URL changes and refreshes navigation content when switching conversations

## Supported Platforms

| Platform | URL |
|----------|-----|
| **ChatGPT** | chatgpt.com / chat.openai.com |
| **Claude** | claude.ai |
| **Gemini** | gemini.google.com |
| **Kimi** | kimi.com / www.kimi.com / kimi.moonshot.cn |
| **Qianwen** | tongyi.aliyun.com / qianwen.aliyun.com / qianwen.com |
| **Doubao** | doubao.com / www.doubao.com |
| **Khoj** | app.khoj.dev |

## Installation

### Chrome / Edge
1. Open your browser and navigate to `chrome://extensions/` (Edge: `edge://extensions/`)
2. Enable **Developer mode** in the top-right corner
3. Click **Load unpacked**
4. Select the extension folder

### Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file

## Usage

- The extension displays a floating navigation panel on the side of AI chat pages
- Hover to fully expand the panel; move away to auto-collapse
- Click any item to smoothly scroll to that conversation
- The currently visible conversation is automatically highlighted
- Use the search box to quickly filter past conversations
- Click the settings button (gear icon) to adjust pin, opacity, and other options
- Drag the handle at the top of the panel to reposition; double-click to toggle left/right edge

---

## \ud83d\udd27 How to Find DOM Selectors (Tutorial)

If the extension cannot detect user messages, you need to manually find the correct selectors.

### Step 1: Open Developer Tools
- **Shortcut**: Press `F12` or `Ctrl+Shift+I` (Mac: `Cmd+Option+I`)
- Or right-click the page and select "Inspect"

### Step 2: Select an Element
1. Click the **element selector button** (arrow icon) in the top-left of DevTools, or press `Ctrl+Shift+C`
2. Click on one of **your messages** on the page (not the AI reply)
3. DevTools will automatically navigate to that element's HTML code

### Step 3: Analyze Element Attributes
In the Elements panel, find the parent container of the user message and observe its attributes:

```html
<!-- Example: suppose you see this structure -->
<div class="chat-message user-message" data-role="user">
  <div class="message-content">Hello</div>
</div>
```

Selector formats you can use:
- **class attribute**: `.user-message` or `[class*="user"]`
- **data attribute**: `[data-role="user"]`
- **combined selector**: `.chat-message.user-message`

### Step 4: Test the Selector
In the DevTools Console panel, enter:
```javascript
document.querySelectorAll('your-selector')
```
If the number of returned elements equals the number of messages you sent, the selector is correct.

### Step 5: Update the Code
Open `content.js`, find the `selectors` array for the corresponding platform, and add the new selector:
```javascript
kimi: {
  selectors: [
    'your-new-selector',  // add here
    // ... other selectors
  ],
}
```

> \ud83d\udca1 **Debug Tip**: Type `aiNavDebug()` in the browser console to check selector matches for the current platform.

---

## \ud83d\udce6 Store Submission Guide

### Chrome Web Store

1. **Register a Developer Account**
   - Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - One-time **$5 registration fee** required (credit card needed)

2. **Prepare Materials**
   - Extension ZIP package (zip the entire folder)
   - 128\u00d7128 icon
   - At least 1 screenshot at 1280\u00d7800 or 640\u00d7400
   - Detailed description (multi-language supported)

3. **Submit for Review**
   - Click "New Item" and upload the ZIP
   - Fill in listing details, screenshots, pricing (free)
   - Review typically takes 1-3 business days

### Microsoft Edge Add-ons

1. **Register a Developer Account**
   - Visit [Edge Add-ons Developer Dashboard](https://partner.microsoft.com/dashboard/microsoftedge)
   - **Free registration** with a Microsoft account

2. **Prepare Materials**
   - Same as Chrome; Manifest V3 extensions work directly
   - Privacy policy URL required (can use a GitHub Gist)

3. **Submit for Review**
   - Upload ZIP and fill in details
   - Review typically takes 1-7 business days

### Firefox Add-ons (AMO)

1. **Register a Developer Account**
   - Visit [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
   - **Free registration** with a Firefox account

2. **Modify manifest.json**
   Firefox requires `browser_specific_settings`:
   ```json
   {
     "browser_specific_settings": {
       "gecko": {
         "id": "ai-navigator@rey_leen.com",
         "strict_min_version": "109.0"
       }
     }
   }
   ```

3. **Submit for Review**
   - Upload ZIP; choose "Listed" (public) or "Unlisted" (link-only access)
   - Automated review usually takes minutes; manual review 1-2 weeks

---

## License

MIT License
