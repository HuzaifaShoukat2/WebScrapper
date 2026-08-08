const cheerio = require('cheerio');

// A lightweight, non-proprietary fingerprinting engine based on public evidence
const TECH_FINGERPRINTS = {
  // CMS
  'WordPress': { category: 'CMS', meta: { 'generator': /wordpress/i }, html: /wp-content\/themes/i, headers: { 'link': /wp-json/i } },
  'Shopify': { category: 'CMS', html: /cdn\.shopify\.com/i, js: /Shopify\.theme/i },
  'Drupal': { category: 'CMS', meta: { 'generator': /drupal/i }, headers: { 'x-generator': /drupal/i } },
  'Joomla': { category: 'CMS', meta: { 'generator': /joomla/i } },
  'Wix': { category: 'CMS', meta: { 'generator': /wix\.com/i }, headers: { 'x-wix-request-id': /.*/i } },
  'Squarespace': { category: 'CMS', html: /squarespace\.com/i },
  'Webflow': { category: 'CMS', html: /data-wf-site/i },
  'Ghost': { category: 'CMS', meta: { 'generator': /ghost/i } },
  
  // Frontend
  'React': { category: 'Frontend', html: /data-reactroot/i, js: /react\.production/i },
  'Next.js': { category: 'Frontend', html: /__NEXT_DATA__/i, headers: { 'x-powered-by': /next\.js/i } },
  'Vue': { category: 'Frontend', html: /data-v-/i, js: /vue\.runtime/i },
  'Nuxt': { category: 'Frontend', html: /__NUXT__/i },
  'Angular': { category: 'Frontend', html: /ng-version/i },
  'Svelte': { category: 'Frontend', html: /svelte-[a-z0-9]+/i },
  'Astro': { category: 'Frontend', html: /astro-[a-z0-9]+/i },

  // Backend
  'PHP': { category: 'Backend', headers: { 'x-powered-by': /php/i }, url: /\.php$/i },
  'Laravel': { category: 'Backend', headers: { 'set-cookie': /laravel_session/i } },
  'Django': { category: 'Backend', headers: { 'set-cookie': /csrftoken/i } },
  'Ruby on Rails': { category: 'Backend', headers: { 'x-powered-by': /phusion passenger/i }, html: /csrf-param/i },
  'ASP.NET': { category: 'Backend', headers: { 'x-powered-by': /asp\.net/i, 'x-aspnet-version': /.*/i } },
  'Express.js': { category: 'Backend', headers: { 'x-powered-by': /^express$/i } },

  // Web server
  'Nginx': { category: 'Web server', headers: { 'server': /nginx/i } },
  'Apache': { category: 'Web server', headers: { 'server': /apache/i } },
  'IIS': { category: 'Web server', headers: { 'server': /iis/i } },

  // CDN
  'Cloudflare': { category: 'CDN', headers: { 'server': /cloudflare/i, 'cf-ray': /.*/i } },
  'CloudFront': { category: 'CDN', headers: { 'via': /cloudfront/i, 'x-amz-cf-id': /.*/i } },
  'Fastly': { category: 'CDN', headers: { 'fastly-debug': /.*/i, 'x-fastly-request-id': /.*/i } },

  // Analytics
  'Google Analytics': { category: 'Analytics', js: /google-analytics\.com\/analytics\.js/i, html: /gtag\(/i },
  'Google Tag Manager': { category: 'Analytics', html: /googletagmanager\.com\/gtm\.js/i },
  'Meta Pixel': { category: 'Analytics', html: /connect\.facebook\.net\/en_US\/fbevents\.js/i },

  // Libraries
  'jQuery': { category: 'Libraries', js: /jquery[0-9a-z.-]*\.js/i },
  'Bootstrap': { category: 'Libraries', html: /bootstrap(?:-[a-zA-Z0-9.-]+)?\.css/i, js: /bootstrap(?:-[a-zA-Z0-9.-]+)?\.js/i },
  'Tailwind CSS': { category: 'Libraries', html: /tailwindcss/i, class: /flex\s+flex-col/i }, // very rough heuristics
  'Font Awesome': { category: 'Libraries', html: /font-awesome|fa-solid|fa-brands/i },
};

function detectTechnologies(html, headers, url) {
  const detected = new Map(); // Use Map to prevent duplicates
  
  let $;
  try {
    $ = cheerio.load(html);
  } catch (e) {
    return [];
  }

  const scriptsText = $('script').map((_, el) => $(el).html() || $(el).attr('src') || '').get().join('\n');
  
  // Helper to add to detected map
  const addTech = (name, category, confidence, evidence) => {
    if (!detected.has(name) || detected.get(name).confidence === 'low') {
      detected.set(name, { name, category, confidence, evidence });
    }
  };

  Object.keys(TECH_FINGERPRINTS).forEach(techName => {
    const rules = TECH_FINGERPRINTS[techName];
    
    // Check headers (High confidence)
    if (rules.headers) {
      Object.keys(rules.headers).forEach(headerKey => {
        if (headers && headers[headerKey] && rules.headers[headerKey].test(headers[headerKey])) {
          addTech(techName, rules.category, 'high', `Header: ${headerKey}`);
        }
      });
    }

    // Check meta tags (High confidence)
    if (rules.meta) {
      Object.keys(rules.meta).forEach(metaName => {
        const metaContent = $(`meta[name="${metaName}" i]`).attr('content') || $(`meta[property="${metaName}" i]`).attr('content');
        if (metaContent && rules.meta[metaName].test(metaContent)) {
          addTech(techName, rules.category, 'high', `Meta: ${metaName}`);
        }
      });
    }

    // Check JS/Scripts (Medium confidence)
    if (rules.js && rules.js.test(scriptsText)) {
      addTech(techName, rules.category, 'medium', 'JavaScript fingerprint');
    }

    // Check HTML patterns (Medium to Low confidence)
    if (rules.html && rules.html.test(html)) {
      addTech(techName, rules.category, 'medium', 'HTML fingerprint');
    }

    // Check URL patterns
    if (rules.url && rules.url.test(url)) {
      addTech(techName, rules.category, 'high', 'URL pattern');
    }
  });

  return Array.from(detected.values());
}

module.exports = {
  detectTechnologies
};
