<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="WageGate Logo">
</p>

# 🛡️ WageGate: H1B Prevailing Wage Search

**WageGate** is a Chrome Extension that lets you check H1B Prevailing Wage levels for any job title on **any** website — LinkedIn, Indeed, Glassdoor, ZipRecruiter, company career pages, or anywhere else.

Simply highlight a job title, right-click, and instantly see where the salary falls on the H1B wage scale using official BLS OES data.

---

## ✨ Features

- **Universal — Works on Any Website**: No more platform-specific scrapers. Highlight text on any page and search.
- **Right-Click Context Menu**: Highlight a job title → Right-click → "Check Prevailing Wage for '...'" → WageGate opens with results.
- **Quick Launcher**: Click the extension icon in the toolbar to open the WageGate web app instantly.
- **Smart Title Matching**: Fuzzy keyword matching intelligently maps dirty highlighted strings (e.g. *"Sr. Data Scientist (Remote) - NYC"*) to the correct SOC occupation code.
- **Full H1B Level Breakdown**: See Level 1–4 thresholds, color-coded verdicts, and state/MSA-level accuracy via the WageGate web app.

---

## 🚀 Installation (Developer Mode)

1.  **Clone this repository**:
    ```bash
    git clone https://github.com/dreamerskymaster/wagegate-extension.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Turn on **Developer mode** (toggle in the top right).
4.  Click **Load unpacked** (top left).
5.  Select the folder where you cloned this repository.
6.  Visit **any** job board or website and start highlighting job titles!

---

## 🛠️ How It Works

The extension is built with **Manifest V3** and is intentionally lightweight:

| File | Purpose |
|------|---------|
| `background.js` | Registers a context menu for highlighted text and handles the toolbar icon click. Opens the [WageGate web app](https://wagegate.onrender.com) with the selected text as a query parameter. |
| `manifest.json` | Declares minimal permissions (`contextMenus` only). No content scripts, no page injection. |

All wage calculation logic lives in the **WageGate web app** — the extension simply acts as a launcher.

---

## 🔒 Privacy

WageGate does **not** inject any code into webpages. It only reads the text you explicitly highlight and select via the context menu. No browsing history, cookies, or personal data are accessed or stored.

---

## ⚖️ License

MIT License. Created by **Ajith Srikanth**.
