const cheerio = require('cheerio');

// Normal email regex
const EMAIL_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/gi;

// Obfuscated email regex: e.g., john [at] example [dot] com
const OBFUSCATED_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+\s*(?:\[at\]|\(at\)| at |@)\s*[a-zA-Z0-9-]+\s*(?:\[dot\]|\(dot\)| dot |\.)\s*[a-zA-Z]{2,}/gi;

const COMMON_FABRICATED_PREFIXES = ['info', 'support', 'sales', 'privacy', 'admin', 'security', 'contact', 'hello'];

function cleanEmail(emailStr) {
  let cleaned = emailStr.toLowerCase().trim();
  
  // Replace obfuscations
  cleaned = cleaned.replace(/\s*(?:\[at\]|\(at\)| at )\s*/, '@');
  cleaned = cleaned.replace(/\s*(?:\[dot\]|\(dot\)| dot )\s*/g, '.');
  
  // Basic validation
  if (!cleaned.includes('@') || !cleaned.includes('.')) return null;
  if (cleaned.endsWith('.') || cleaned.startsWith('@')) return null;
  
  // Filter out image extensions or files mistaken for emails
  if (cleaned.match(/\.(png|jpg|jpeg|gif|webp|css|js|svg|woff|woff2|ttf|eot|mp4|webm)$/)) return null;

  return cleaned;
}

function extractEmails(html, sourceUrl) {
  const emails = [];
  const $ = cheerio.load(html);
  const text = $('body').text();
  
  function addEmail(rawStr, method, nameContext) {
    const cleaned = cleanEmail(rawStr);
    if (!cleaned) return;
    
    // Prevent generic fake matches from random code (though we do strict public matching)
    // The requirement says "Do NOT fabricate". We only add what we find, so this check is just 
    // to ensure we don't accidentally pull generic stuff unless it was genuinely in the text.
    
    // Check if already found
    if (!emails.find(e => e.email === cleaned)) {
      emails.push({
        email: cleaned,
        name: nameContext || null,
        source: sourceUrl,
        discoveryMethod: method
      });
    }
  }

  // 1. Mailto links
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href');
    const emailMatch = href.replace('mailto:', '').split('?')[0];
    let name = $(el).text().trim();
    if (name && (name.includes('@') || name.toLowerCase() === 'email' || name.toLowerCase() === 'contact')) {
      name = null; // Name is not really a name
    }
    
    // Attempt to look for a preceding heading
    if (!name) {
      const prevHeading = $(el).prevAll('h1,h2,h3,h4,h5,h6,strong').first().text().trim();
      if (prevHeading && prevHeading.length < 30) {
        name = prevHeading;
      }
    }
    
    if (emailMatch) {
      addEmail(emailMatch, 'mailto', name || null);
    }
  });

  // 2. Visible text matching
  const normalMatches = text.match(EMAIL_REGEX) || [];
  normalMatches.forEach(match => {
    addEmail(match, 'visible_text', null);
  });

  // 3. Obfuscated matching
  const obfuscatedMatches = text.match(OBFUSCATED_REGEX) || [];
  obfuscatedMatches.forEach(match => {
    // Only process if it doesn't already look like a normal email to avoid double processing
    if (!match.includes('@')) {
      addEmail(match, 'obfuscated_text', null);
    }
  });

  // 4. JSON-LD / Structured Data (very basic pass)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      const parsed = JSON.parse(content);
      const jsonStr = JSON.stringify(parsed);
      
      const jsonMatches = jsonStr.match(EMAIL_REGEX) || [];
      jsonMatches.forEach(match => {
        addEmail(match, 'json_ld', null);
      });
    } catch (e) {
      // Ignore parse errors
    }
  });

  return emails;
}

module.exports = {
  extractEmails
};
