// WageGate - Background Service Worker

const WAGEGATE_URL = 'https://wagegate.onrender.com';
// const WAGEGATE_URL = 'http://localhost:3000';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[WageGate] Extension installed');
  
  // Create context menu for highlighted text
  chrome.contextMenus.create({
    id: "wagegate-search",
    title: "Check Prevailing Wage for '%s'",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "wagegate-search") {
    const selectedText = info.selectionText;
    if (selectedText) {
      // Pass the highlighted text to the main website via query param
      const url = `${WAGEGATE_URL}/?title=${encodeURIComponent(selectedText.trim())}`;
      chrome.tabs.create({ url });
    }
  }
});

// Act as a quick launcher when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: WAGEGATE_URL });
});
