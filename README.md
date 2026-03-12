<p align="center">
  <img src="icons/icon128.png" width="128" height="128" alt="WageGate Logo">
</p>

# 🛡️ WageGate: H1B Level Badge

**WageGate** is a Chrome Extension that automatically injects H1B Prevailing Wage levels directly into job postings on **LinkedIn** and **Indeed**. 

Knowing the H1B wage level (L1-L4) for a posted salary is crucial for international workers. This extension does the math for you based on the official BLS OES data.

---

## ✨ Features

- **Automated Level Check**: Instantly see if a salary meets H1B Level 1, 2, 3, or 4 requirements.
- **Smart Parsing**: 
  - Handles **Hourly** ($65/hr), **Monthly**, and **Annual** ($120k) formats.
  - Automatically takes the **minimum** of a salary range for conservative estimation.
- **Deep Scan**: Scans the entire job description if the salary isn't in the header.
- **Unified Location Matching**: Maps city/state to precise MSA/County wage data for high accuracy.
- **Visual Indicators**: Premium color-coded badges (Cyan, Teal, Emerald, Forest Green, or Alert Red).

---

## 🚀 Installation (Developer Mode)

Since this is a specialized tool, you can install it as a "Unpacked" extension:

1.  **Clone this repository**:
    ```bash
    git clone https://github.com/dreamerskymaster/wagegate-extension.git
    ```
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Turn on **Developer mode** (toggle in the top right).
4.  Click **Load unpacked** (top left).
5.  Select the folder where you cloned this repository.
6.  Navigate to [LinkedIn](https://www.linkedin.com/jobs/) or [Indeed](https://www.indeed.com/) and start searching!

---

## 🛠️ How it works

The extension is built with **Manifest V3** and consists of:
- `content.js`: Scrapes job titles, locations, and salaries using modern DOM selectors.
- `background.js`: Acts as a proxy to communicate with the [WageGate API](https://wagegate.onrender.com) to bypass CORS restrictions.
- `manifest.json`: Defines permissions and secure host matching.

---

## 🔒 Privacy

WageGate does **not** store your data. It only sends the anonymous Job Title and Location to our backend to retrieve the latest wage data. We do not track your browsing history or personal information.

---

## ⚖️ License

MIT License. Created by **Ajith Srikanth**.
