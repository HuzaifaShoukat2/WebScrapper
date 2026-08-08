const express = require('express');
const cors = require('cors');
const { parseDomain } = require('./utils/domain');
const { Crawler } = require('./services/crawler');

const app = express();

app.use(cors());
app.use(express.json());

// Phase 2 - Backend Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'webscrapper'
  });
});

// Phase 8 - Extension/API Connection
app.post('/api/scan', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const normalizedDomain = parseDomain(domain);
    if (!normalizedDomain) {
      return res.status(400).json({ error: 'Invalid domain provided' });
    }

    // Launch Crawler
    const crawler = new Crawler(normalizedDomain);
    const result = await crawler.run();

    res.json(result);
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message || 'An internal error occurred during the scan' });
  }
});

module.exports = app;
