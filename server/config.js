module.exports = {
  // Crawler performance limits
  MAX_PAGES: 15,
  CONCURRENCY: 3,
  REQUEST_TIMEOUT: 7000,
  MAX_RESPONSE_SIZE: 3 * 1024 * 1024, // 3MB per page
  
  // Security
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WebScrapper/1.0',
  
  // Blocked IPs (SSRF Protection)
  BLOCKED_IPS: [
    '127.0.0.1',
    'localhost',
    '0.0.0.0',
    '::1'
    // Will be properly checked by CIDR matches in security.js
  ]
};
