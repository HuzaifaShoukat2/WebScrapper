const dns = require('dns');
const { promisify } = require('util');
const net = require('net');

const lookup = promisify(dns.lookup);

function isPrivateIP(ip) {
  if (!net.isIP(ip)) return false;
  
  // Convert to array of octets for IPv4
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
    
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // 169.254.0.0/16 (Link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
  } else if (net.isIPv6(ip)) {
    const lowerIP = ip.toLowerCase();
    // ::1 loopback
    if (lowerIP === '::1') return true;
    // Unique local address fc00::/7
    if (lowerIP.startsWith('fc') || lowerIP.startsWith('fd')) return true;
    // Link-local address fe80::/10
    if (lowerIP.startsWith('fe8') || lowerIP.startsWith('fe9') || lowerIP.startsWith('fea') || lowerIP.startsWith('feb')) return true;
    // Unspecified
    if (lowerIP === '::') return true;
  }
  
  return false;
}

async function validateURLSecurity(urlString) {
  try {
    const url = new URL(urlString);
    
    // Disallow non-HTTP(S)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { secure: false, reason: 'Invalid protocol' };
    }
    
    // Check if hostname itself is a private IP
    if (isPrivateIP(url.hostname)) {
      return { secure: false, reason: 'Private IP address' };
    }
    
    // Perform DNS lookup
    const { address } = await lookup(url.hostname).catch(() => ({ address: null }));
    
    if (!address) {
      return { secure: false, reason: 'DNS resolution failed' };
    }
    
    if (isPrivateIP(address)) {
      return { secure: false, reason: 'Resolves to private IP' };
    }
    
    return { secure: true };
  } catch (e) {
    return { secure: false, reason: 'Invalid URL format' };
  }
}

module.exports = {
  isPrivateIP,
  validateURLSecurity
};
