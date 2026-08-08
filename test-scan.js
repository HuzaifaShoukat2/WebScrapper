const axios = require('axios');

async function testScan() {
  try {
    const res = await axios.post('http://localhost:3000/api/scan', {
      domain: 'scrapeme.live' // Safe public scraping target
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}

testScan();
