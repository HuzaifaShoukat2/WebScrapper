function parseDomain(input) {
  if (!input || typeof input !== 'string') return null;

  let urlString = input.trim().toLowerCase();
  
  if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
    urlString = 'https://' + urlString;
  }

  try {
    const url = new URL(urlString);
    let hostname = url.hostname;
    
    // Remove trailing dot if present
    if (hostname.endsWith('.')) {
      hostname = hostname.slice(0, -1);
    }
    
    // Basic validation to ensure it's a valid domain format
    if (hostname.includes('..') || hostname.length < 3 || !hostname.includes('.')) {
      return null;
    }

    return hostname;
  } catch (e) {
    return null;
  }
}

function isSameDomain(targetUrl, baseDomain) {
  try {
    const url = new URL(targetUrl);
    // Allow example.com and www.example.com or sub.example.com
    return url.hostname === baseDomain || url.hostname.endsWith('.' + baseDomain);
  } catch (e) {
    return false;
  }
}

function getBaseUrl(domain) {
  return `https://${domain}`;
}

module.exports = {
  parseDomain,
  isSameDomain,
  getBaseUrl
};
