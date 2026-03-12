// WageGate H1B Level Badge - Background Service Worker
// Lightweight for v1: just logs install/update events.

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[WageGate] Extension installed:', details.reason);
});

// Proxy API calls to avoid CORS issues in content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_WAGE') {
    const { title, state, salary } = request.data;
    
    fetch('http://localhost:3000/api/prevailing-wage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, state, salary })
    })
    .then(r => r.json())
    .then(data => sendResponse({ success: true, data }))
    .catch(err => {
      console.error('[WageGate] Background fetch error:', err);
      sendResponse({ success: false, error: err.message });
    });

    return true; // Keep channel open for async response
  }
});
