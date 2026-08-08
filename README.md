# WebScrapper

A lightweight Chrome Extension and Serverless API focused exclusively on two reconnaissance functions:
1. **Public Email Finder:** Discover email addresses exposed on public pages.
2. **Website Technology Detector:** Detect public CMS, frontend, backend, and security technologies.

## Architecture
- **Extension:** Chrome Manifest V3, HTML, CSS, Vanilla JS.
- **API Server:** Node.js, Express, Axios, Cheerio. Designed to run on Vercel Serverless (Free Tier).

## Features
- Intelligently crawls high-value paths (Contact, About, Privacy) using a bounded max-page concurrent crawler.
- SSRF (Server-Side Request Forgery) protection natively built-in (prevents localhost/private IP scanning).
- Fast, secure, and uses minimal permissions.
- **Zero-Storage:** No databases, no login, no history, no analytics, no persistent tracking.

## Folder Structure
```
WebScrapper/
├── extension/       # Chrome MV3 Extension
├── server/          # Node.js Express API and Core Scraper
├── api/             # Vercel Serverless entrypoint
├── vercel.json      # Vercel configuration
```

## Requirements
- Node.js v18+
- Google Chrome

## Local Installation

1. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```
2. Start the local API:
   ```bash
   node server.js
   ```
   The API will run on `http://localhost:3000`

## Chrome Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked**.
4. Select the `extension/` folder from this project.

## Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the root of the `WebScrapper` directory.
3. After deployment, update `extension/background.js` and set `API_BASE` to your new `https://YOUR-VERCEL-DOMAIN.vercel.app` URL.
4. Reload the Chrome extension.

## Permissions

The extension uses the following permissions:
- `activeTab`: Used to populate the input box with the current website's domain securely when the user clicks the globe icon.
- `scripting`: (Reserved for future advanced content extraction if needed, minimal footprint).
- `host_permissions`: Required for the popup to communicate with the Vercel backend (`https://*/*`) securely and to allow fetch operations.

## Security Model
- **SSRF Prevention:** The backend actively intercepts and drops requests pointing to loopback, link-local, and private subnets (e.g., `127.0.0.0/8`, `10.0.0.0/8`).
- **Same-Domain Restriction:** The crawler will absolutely not follow links to external domains.
- **Resource Limits:** Hardcoded response body timeouts and max page bounds.

## Limitations
- Will not bypass CAPTCHAs, bot protection, or authentication.
- Single-page applications (SPAs) heavily reliant on client-side JS routing may have limited visibility since the scraper does not execute JS. (It uses static analysis to grab tech fingerprints).
- Does not verify email legitimacy via SMTP pinging.

## Troubleshooting
- **"Could not connect to WebScrapper server"**: Ensure your `server.js` is running locally or your Vercel deployment is active.
- **Scans finish instantly with 0 results**: The site may be blocking automated requests or `axios` User-Agent strings.
