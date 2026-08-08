const { isPrivateIP, validateURLSecurity } = require('./server/utils/security');
const { parseDomain } = require('./server/utils/domain');

async function testSecurity() {
  console.log("Domain parse 'https://www.example.com':", parseDomain('https://www.example.com'));
  console.log("Domain parse 'example.com/contact':", parseDomain('example.com/contact'));
  
  console.log("isPrivateIP 127.0.0.1:", isPrivateIP('127.0.0.1'));
  console.log("isPrivateIP 192.168.1.5:", isPrivateIP('192.168.1.5'));
  console.log("isPrivateIP 8.8.8.8:", isPrivateIP('8.8.8.8'));
  
  const test1 = await validateURLSecurity('http://localhost:3000');
  console.log("Validate localhost:", test1);
  
  const test2 = await validateURLSecurity('http://169.254.169.254/latest/meta-data');
  console.log("Validate AWS metadata:", test2);
  
  const test3 = await validateURLSecurity('https://example.com');
  console.log("Validate example.com:", test3);
}

testSecurity();
