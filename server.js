const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_ROOT = "https://pwthor.live";

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Static files setup
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const savedUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
let globalBrowser = null;
let globalPage = null;

// Cookie Matrix Session Vault (Aapki active cookie yahan safe hai)
const backupSessionCookies = [
    {
        "domain": "pwthor.live",
        "expirationDate": 1787294281.354491,
        "hostOnly": true,
        "httpOnly": true,
        "name": "auth_token",
        "path": "/",
        "sameSite": "no_restriction",
        "secure": true,
        "session": false,
        "storeId": "0",
        "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiI4ODUzODE3NjUyIiwibmFtZSI6IkFtYmVyIEthc2F1ZGhhbiIsImlhdCI6MTc3OTUxODI4NSwiZXhwIjoxNzg3Mjk0Mjg1fQ.wV224l42kC5AGhfoaRc1kIWpkb0S_v3Gois6dYv-7tE",
        "id": 1
    }
];

/**
 * BULLETPROOF HELPER: Auto-Rebirth & Lazy Initialization
 * FIXED: Added advanced stealth arguments and fingerprint cloaking modifications.
 */
async function getSafeActivePage() {
    if (!globalBrowser || !globalBrowser.isConnected()) {
        console.log("[RangeXCoder Engine] Launching global native system Chromium branch...");
        globalBrowser = await puppeteer.launch({
            headless: true,
            executablePath: puppeteer.executablePath(),
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled', // Turns off automation flags
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process',
                '--disable-web-security',
                '--window-size=1920,1080'
            ]
        });
        globalPage = null; 
    }

    if (!globalPage || globalPage.isClosed()) {
        const pages = await globalBrowser.pages();
        globalPage = pages.length > 0 ? pages[0] : await globalBrowser.newPage();
        
        // Anti-Fingerprinting Cloaking: Overriding native variables to pass Cloudflare
        await globalPage.setUserAgent(savedUserAgent);
        
        await globalPage.evaluateOnNewDocument(() => {
            // Overwrite the webdriver property to completely hide puppeteer footprint
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            
            // Mock native language preferences
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            
            // Mock standard chrome global object runtime structures
            window.chrome = { runtime: {} };
            
            // Mask plugins list lengths
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        });
        
        await globalPage.goto(TARGET_ROOT, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        
        if(backupSessionCookies.length > 0) {
            const sanitizedCookies = backupSessionCookies.map(c => ({
                name: c.name,
                value: c.value,
                domain: '.pwthor.live',
                path: c.path || '/',
                httpOnly: c.httpOnly ?? true,
                secure: c.secure ?? true,
                sameSite: c.sameSite === 'no_restriction' ? 'None' : (c.sameSite || 'Lax'),
                expires: c.expires || c.expirationDate || Math.floor(Date.now() / 1000) + 31536000
            }));
            await globalPage.setCookie(...sanitizedCookies);
        }
    }
    
    return globalPage;
}

// Target overlay interaction tracker logic (Untouched)
async function autoBypassApplePopup(page) {
    try {
        await page.evaluate(() => {
            const layoutButtons = Array.from(document.querySelectorAll('button, div, a, span'));
            const targetAppleElement = layoutButtons.find(el => {
                const innerLabel = el.innerText ? el.innerText.toLowerCase() : '';
                return innerLabel.includes('apple') || innerLabel.includes('ios') || innerLabel.includes('iphone');
            });
            if (targetAppleElement) {
                targetAppleElement.click();
                console.log("[RangeXCoder Automation] Instantly skipped Apple OS platform select modal.");
            }
        });
    } catch (e) {}
}

// Video streaming crawler handler (Untouched)
app.get('/video-stream', async (req, res) => {
    const { batchId, subjectId, contentId } = req.query;
    if (!batchId || !contentId) return res.status(400).json({ success: false, error: "Missing identity tags." });

    try {
        if (!globalBrowser || !globalBrowser.isConnected()) {
            globalBrowser = await puppeteer.launch({
                headless: true,
                executablePath: puppeteer.executablePath(),
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox', 
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage', 
                    '--disable-gpu'
                ]
            });
        }

        const targetWatchUrl = `${TARGET_ROOT}/study/batches/${batchId}/subjects/${subjectId || 'all'}/contents/${contentId}/watch`;
        const targetPage = await globalBrowser.newPage();
        await targetPage.setUserAgent(savedUserAgent);
        
        if(backupSessionCookies.length > 0) {
            const sanitizedCookies = backupSessionCookies.map(c => ({
                name: c.name,
                value: c.value,
                domain: '.pwthor.live',
                path: c.path || '/',
                httpOnly: c.httpOnly ?? true,
                secure: c.secure ?? true,
                sameSite: c.sameSite === 'no_restriction' ? 'None' : (c.sameSite || 'Lax')
            }));
            await targetPage.setCookie(...sanitizedCookies);
        }

        let interceptedData = null;
        await targetPage.setRequestInterception(true);
        targetPage.on('request', request => request.continue());
        targetPage.on('response', async response => {
            const url = response.url();
            if (url.includes('/api/v1/video/token') || url.includes('signedUrl') || url.includes('.mpd') || url.includes('.m3u8')) {
                try {
                    if ((response.headers()['content-type'] || '').includes('application/json')) {
                        interceptedData = await response.json();
                    }
                } catch (e) {}
            }
        });

        await targetPage.goto(targetWatchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

        for(let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 300));
            await autoBypassApplePopup(targetPage);
            if (interceptedData) break;
        }

        await targetPage.close();
        if (interceptedData) res.json({ success: true, data: interceptedData });
        else res.status(404).json({ success: false, error: "Token signature or manifest channel dropped." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Secure Cloudflare Tunneling Endpoint using Masked Active Page context
app.all('/api/*', async (req, res) => {
    const targetUrl = `${TARGET_ROOT}${req.url}`;
    try {
        const page = await getSafeActivePage();
        const result = await page.evaluate(async (url, method, bodyString) => {
            try {
                const fetchOptions = { 
                    method: method, 
                    credentials: "include",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    }
                };
                if (method !== "GET" && bodyString) {
                    fetchOptions.body = bodyString;
                }
                const response = await fetch(url, fetchOptions);
                const contentType = response.headers.get("content-type") || "";
                if (contentType.includes("application/json")) {
                    return { status: response.status, isJson: true, data: await response.json() };
                } else {
                    return { status: response.status, isJson: false, data: await response.text() };
                }
            } catch (err) {
                return { status: 500, isJson: true, data: { success: false, error: err.message } };
            }
        }, targetUrl, req.method, req.method !== "GET" ? JSON.stringify(req.body) : null);

        if (result.isJson) res.status(result.status).json(result.data);
        else res.status(result.status).send(result.data);
    } catch (e) {
        res.status(500).json({ success: false, error: "Cloudflare tunnel bridge stealth failure: " + e.message });
    }
});

app.listen(PORT, () => console.log(`[RangeXCoder Server] Direct Resilient Tunnel Active on port: ${PORT}`));
