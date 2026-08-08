const axios = require('axios');
const cheerio = require('cheerio');
const { MAX_PAGES, CONCURRENCY, REQUEST_TIMEOUT, MAX_RESPONSE_SIZE, USER_AGENT } = require('../config');
const { getBaseUrl, isSameDomain } = require('../utils/domain');
const { validateURLSecurity } = require('../utils/security');
const { extractEmails } = require('./emailExtractor');
const { detectTechnologies } = require('./technologyDetector');

// High-value path keywords
const HIGH_VALUE_KEYWORDS = [
  'contact', 'about', 'team', 'staff', 'support', 'help', 
  'privacy', 'legal', 'terms', 'security', 'careers', 'jobs', 
  'press', 'media', 'company', 'customers', 'sales'
];

class Crawler {
  constructor(domain) {
    this.domain = domain;
    this.baseUrl = getBaseUrl(domain);
    
    this.visitedUrls = new Set();
    this.queue = [];
    
    // Results
    this.emails = new Map(); // key: email, value: emailObj
    this.technologies = new Map(); // key: tech name, value: techObj
    
    this.client = axios.create({
      timeout: REQUEST_TIMEOUT,
      maxContentLength: MAX_RESPONSE_SIZE,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      },
      // Do not follow redirects automatically, we will check them for SSRF
      maxRedirects: 0, 
      validateStatus: (status) => status < 400 || (status >= 300 && status < 400) // allow redirects for manual handling
    });
  }

  async run() {
    // 1. Initial queue with priority
    this.queue.push({ url: this.baseUrl, priority: 100 });
    
    // We can proactively add known paths, but they get lower priority initially
    // We will discover paths from the homepage first.

    await this.processQueue();

    // Convert Maps to Arrays
    return {
      domain: this.domain,
      emails: Array.from(this.emails.values()),
      technologies: Array.from(this.technologies.values())
    };
  }

  async processQueue() {
    let activeWorkers = 0;
    
    return new Promise((resolve) => {
      const next = () => {
        // Stop if limits reached
        if (this.visitedUrls.size >= MAX_PAGES && activeWorkers === 0) {
          return resolve();
        }
        
        // Stop if queue empty and no active workers
        if (this.queue.length === 0 && activeWorkers === 0) {
          return resolve();
        }

        // Start workers up to concurrency limit
        while (activeWorkers < CONCURRENCY && this.queue.length > 0 && this.visitedUrls.size + activeWorkers < MAX_PAGES) {
          
          // Sort queue by priority (descending)
          this.queue.sort((a, b) => b.priority - a.priority);
          
          const item = this.queue.shift();
          const targetUrl = item.url;
          
          if (!this.visitedUrls.has(targetUrl)) {
            this.visitedUrls.add(targetUrl);
            activeWorkers++;
            
            this.fetchPage(targetUrl).finally(() => {
              activeWorkers--;
              next();
            });
          }
        }
      };

      next();
    });
  }

  async fetchPage(urlStr) {
    try {
      // Security Validation
      const securityCheck = await validateURLSecurity(urlStr);
      if (!securityCheck.secure) {
        return;
      }

      const response = await this.client.get(urlStr);
      
      // Handle redirects securely
      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        let redirectUrl;
        try {
          redirectUrl = new URL(response.headers.location, urlStr).toString();
        } catch (e) {
          return;
        }
        
        // Ensure redirect is still same domain and secure
        if (isSameDomain(redirectUrl, this.domain)) {
          this.queue.push({ url: redirectUrl, priority: 80 });
        }
        return;
      }

      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/json')) {
        return; // skip binaries
      }

      const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      // 1. Extract Emails
      const pageEmails = extractEmails(html, urlStr);
      pageEmails.forEach(e => {
        if (!this.emails.has(e.email)) {
          this.emails.set(e.email, e);
        }
      });

      // 2. Detect Technology
      const pageTech = detectTechnologies(html, response.headers, urlStr);
      pageTech.forEach(t => {
        // Upgrade confidence if found again
        if (this.technologies.has(t.name)) {
          if (t.confidence === 'high') {
            this.technologies.set(t.name, t);
          }
        } else {
          this.technologies.set(t.name, t);
        }
      });

      // 3. Discover Links (only if we haven't hit page limit)
      if (this.visitedUrls.size < MAX_PAGES) {
        this.discoverLinks(html, urlStr);
      }

    } catch (error) {
      // Silently fail to next page on timeouts/errors
    }
  }

  discoverLinks(html, sourceUrl) {
    let $;
    try {
      $ = cheerio.load(html);
    } catch (e) {
      return;
    }

    $('a[href]').each((_, el) => {
      let href = $(el).attr('href');
      
      // Ignore anchor links or mailto
      if (!href || href.startsWith('#') || href.toLowerCase().startsWith('mailto:')) {
        return;
      }

      try {
        const absoluteUrl = new URL(href, sourceUrl);
        
        // Ignore other domains
        if (!isSameDomain(absoluteUrl.toString(), this.domain)) {
          return;
        }

        // Clean URL
        absoluteUrl.hash = '';
        const cleanUrl = absoluteUrl.toString();

        if (this.visitedUrls.has(cleanUrl)) {
          return;
        }

        // Determine priority based on path
        let priority = 10; // default low priority
        const pathname = absoluteUrl.pathname.toLowerCase();
        
        if (HIGH_VALUE_KEYWORDS.some(kw => pathname.includes(kw))) {
          priority = 90;
        }
        
        // Don't add if already in queue with higher or equal priority
        const existing = this.queue.find(i => i.url === cleanUrl);
        if (existing) {
          if (priority > existing.priority) existing.priority = priority;
        } else {
          this.queue.push({ url: cleanUrl, priority });
        }
      } catch (e) {
        // Invalid URL, skip
      }
    });
  }
}

module.exports = {
  Crawler
};
