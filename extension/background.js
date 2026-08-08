const API_BASE = 'http://localhost:3000'; // For production, change to the Vercel URL
let scanState = {
  status: 'idle', // idle, scanning, completed, cancelled, error
  domain: '',
  emails: [],
  tech: [],
  error: null
};

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startScan') {
    startScan(request.domain);
    sendResponse({ success: true });
  } else if (request.action === 'cancelScan') {
    if (scanState.status === 'scanning') {
      scanState.status = 'cancelled';
      // If we had a mechanism to cancel the fetch, we would invoke it here.
      // For now, we update the state and notify.
      notifyPopup();
    }
    sendResponse({ success: true });
  } else if (request.action === 'getState') {
    sendResponse({ state: scanState });
  }
  return true;
});

async function startScan(domain) {
  scanState = {
    status: 'scanning',
    domain: domain,
    emails: [],
    tech: [],
    error: null
  };
  
  // Set badge to scanning state
  chrome.action.setBadgeText({ text: '...' });
  chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
  
  notifyPopup();

  try {
    const controller = new AbortController();
    
    // We check for cancellation manually, but realistically the server handles the bulk of the work.
    // If the server supported cancellation, we'd send a cancel signal.
    const response = await fetch(`${API_BASE}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain }),
      signal: controller.signal
    });

    if (scanState.status === 'cancelled') {
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const data = await response.json();
    
    if (scanState.status === 'cancelled') {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    scanState.status = 'completed';
    scanState.emails = data.emails || [];
    scanState.tech = data.technologies || [];
    
    // Set badge text to number of emails found
    const count = scanState.emails.length;
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '0' });
    chrome.action.setBadgeBackgroundColor({ color: count > 0 ? '#10b981' : '#64748b' });
    
    notifyPopup();
  } catch (error) {
    if (scanState.status === 'cancelled') {
      chrome.action.setBadgeText({ text: '' });
      return;
    }
    
    scanState.status = 'error';
    scanState.error = error.message === 'Failed to fetch' 
      ? 'Could not connect to WebScrapper server.' 
      : error.message;
    
    // Set error badge
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    
    notifyPopup();
  }
}

function notifyPopup() {
  chrome.runtime.sendMessage({
    action: 'scanUpdate',
    data: scanState
  }).catch(() => {
    // Popup is probably closed, which is fine. State is maintained here.
  });
}
