const API_BASE = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const btnScan = document.getElementById('btn-scan');
  const btnCurrentSite = document.getElementById('btn-current-site');
  const btnCancel = document.getElementById('btn-cancel');
  const btnCopyAll = document.getElementById('btn-copy-all');
  const domainInput = document.getElementById('domain-input');
  
  const scanStatus = document.getElementById('scan-status');
  const statusText = document.getElementById('status-text');
  const statEmails = document.getElementById('stat-emails');
  const statTech = document.getElementById('stat-tech');
  
  const emailsList = document.getElementById('emails-list');
  const techList = document.getElementById('tech-list');
  const emailsActions = document.getElementById('emails-actions');
  const emailsCountLabel = document.getElementById('emails-count-label');

  let currentDomain = '';
  let foundEmails = [];

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Current Site
  btnCurrentSite.addEventListener('click', async () => {
    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('file://')) {
          showError('Cannot scan browser internal pages.');
          return;
        }
        const url = new URL(tab.url);
        domainInput.value = url.hostname;
        startScan(url.hostname);
      }
    } catch (e) {
      showError('Failed to get current website.');
    }
  });

  // Scan
  btnScan.addEventListener('click', () => {
    const domain = domainInput.value.trim();
    if (domain) {
      startScan(domain);
    }
  });

  domainInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const domain = domainInput.value.trim();
      if (domain) {
        startScan(domain);
      }
    }
  });

  btnCancel.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'cancelScan' });
  });

  btnCopyAll.addEventListener('click', () => {
    if (foundEmails.length > 0) {
      const textToCopy = foundEmails.map(e => e.email).join('\n');
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalTitle = btnCopyAll.title;
        btnCopyAll.title = 'Copied!';
        btnCopyAll.innerText = '✅';
        setTimeout(() => {
          btnCopyAll.title = originalTitle;
          btnCopyAll.innerText = '📋';
        }, 2000);
      });
    }
  });

  function startScan(domain) {
    currentDomain = domain;
    emailsList.innerHTML = '';
    techList.innerHTML = '';
    foundEmails = [];
    emailsActions.style.display = 'none';
    
    updateUIState('scanning', domain);

    chrome.runtime.sendMessage({
      action: 'startScan',
      domain: domain
    });
  }

  function updateUIState(state, data) {
    if (state === 'scanning') {
      scanStatus.style.display = 'flex';
      statusText.innerText = `Scanning ${data}...`;
      statEmails.innerText = 'Emails: 0';
      statTech.innerText = 'Technologies: 0';
      btnCancel.style.display = 'block';
    } else if (state === 'completed' || state === 'cancelled' || state === 'error') {
      scanStatus.style.display = 'flex';
      btnCancel.style.display = 'none';
      
      if (state === 'completed') {
        statusText.innerText = `Scan complete`;
      } else if (state === 'cancelled') {
        statusText.innerText = `Scan cancelled`;
      } else if (state === 'error') {
        statusText.innerText = `Error: ${data}`;
      }
    }
  }

  function renderEmails(emails) {
    foundEmails = emails || [];
    emailsList.innerHTML = '';
    
    if (foundEmails.length === 0) {
      emailsList.innerHTML = '<div class="message-box">ℹ️ No public email addresses found.</div>';
      emailsActions.style.display = 'none';
      return;
    }

    emailsActions.style.display = 'flex';
    emailsCountLabel.innerText = `Found: ${foundEmails.length}`;

    foundEmails.forEach(e => {
      const item = document.createElement('div');
      item.className = 'result-item';
      
      const row = document.createElement('div');
      row.className = 'email-row';
      
      const info = document.createElement('div');
      info.className = 'email-info';
      
      if (e.name) {
        const nameEl = document.createElement('div');
        nameEl.className = 'email-name';
        nameEl.innerText = e.name;
        info.appendChild(nameEl);
      }
      
      const emailEl = document.createElement('div');
      emailEl.className = 'email-address';
      emailEl.innerText = e.email;
      
      emailEl.addEventListener('click', () => {
        details.style.display = details.style.display === 'block' ? 'none' : 'block';
      });
      
      info.appendChild(emailEl);
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.innerText = '📋';
      copyBtn.title = 'Copy';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(e.email).then(() => {
          copyBtn.innerText = '✅';
          setTimeout(() => { copyBtn.innerText = '📋'; }, 2000);
        });
      });
      
      row.appendChild(info);
      row.appendChild(copyBtn);
      item.appendChild(row);
      
      const details = document.createElement('div');
      details.className = 'email-details';
      details.innerHTML = `Source: <a href="${e.source}" target="_blank" style="color:var(--accent)">${e.source}</a><br>Discovery: ${e.discoveryMethod}`;
      item.appendChild(details);
      
      emailsList.appendChild(item);
    });
  }

  function renderTech(techs) {
    techList.innerHTML = '';
    
    if (!techs || techs.length === 0) {
      techList.innerHTML = '<div class="message-box">ℹ️ No technologies detected.</div>';
      return;
    }

    // Group by category
    const grouped = techs.reduce((acc, t) => {
      acc[t.category] = acc[t.category] || [];
      acc[t.category].push(t.name);
      return acc;
    }, {});

    Object.keys(grouped).forEach(cat => {
      const item = document.createElement('div');
      item.className = 'result-item';
      
      const catEl = document.createElement('div');
      catEl.className = 'tech-category';
      catEl.innerText = cat;
      
      const namesEl = document.createElement('div');
      namesEl.className = 'tech-name';
      namesEl.innerText = grouped[cat].join(', ');
      
      item.appendChild(catEl);
      item.appendChild(namesEl);
      techList.appendChild(item);
    });
  }

  function showError(msg) {
    emailsList.innerHTML = `<div class="message-box">❌ ${msg}</div>`;
    techList.innerHTML = '';
    updateUIState('error', msg);
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'scanUpdate') {
      const data = msg.data;
      if (data.status === 'scanning') {
        updateUIState('scanning', data.domain);
        statEmails.innerText = `Emails: ${data.emails ? data.emails.length : 0}`;
        statTech.innerText = `Technologies: ${data.tech ? data.tech.length : 0}`;
        renderEmails(data.emails);
        renderTech(data.tech);
      } else if (data.status === 'completed') {
        updateUIState('completed');
        statEmails.innerText = `Emails: ${data.emails ? data.emails.length : 0}`;
        statTech.innerText = `Technologies: ${data.tech ? data.tech.length : 0}`;
        renderEmails(data.emails);
        renderTech(data.tech);
      } else if (data.status === 'error') {
        showError(data.error || 'Unknown error');
      } else if (data.status === 'cancelled') {
        updateUIState('cancelled');
        statEmails.innerText = `Emails: ${data.emails ? data.emails.length : 0}`;
        statTech.innerText = `Technologies: ${data.tech ? data.tech.length : 0}`;
        renderEmails(data.emails);
        renderTech(data.tech);
      }
    }
  });

  // Check initial state on open
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    if (response && response.state) {
      if (response.state.domain) {
        domainInput.value = response.state.domain;
      }
      
      if (response.state.status !== 'idle') {
        const data = response.state;
        
        if (data.status === 'scanning') {
          updateUIState('scanning', data.domain);
        } else if (data.status === 'completed') {
          updateUIState('completed');
        } else if (data.status === 'cancelled') {
          updateUIState('cancelled');
        } else if (data.status === 'error') {
          showError(data.error);
          return;
        }
        
        statEmails.innerText = `Emails: ${data.emails ? data.emails.length : 0}`;
        statTech.innerText = `Technologies: ${data.tech ? data.tech.length : 0}`;
        renderEmails(data.emails);
        renderTech(data.tech);
      }
    }
  });
});
