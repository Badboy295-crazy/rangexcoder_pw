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

// Serve Static Frontend Layout directly
app.use(express.static(path.join(__dirname)));

const savedUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
let globalBrowser = null;
let globalPage = null;
let isEngineReady = false;

/**
 * COOKIE INJECTION CONFIGURATION VAULT
 * Yahan aapki cookies bilkul safe hain. SameSite aur Expiration ko automatic fix kar diya gaya hai.
 */
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

async function initializeRealBrowserEngine() {
    console.log("[RangeXCoder Engine] Initializing headless sandbox cloaking layer...");
    isEngineReady = false;
    
    try {
        globalBrowser = await puppeteer.launch({
            headless: true, // Deploying to render requires true mode setup
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--start-maximized',
                '--disable-dev-shm-usage',
                '--no-zygote'
            ]
        });

        const pages = await globalBrowser.pages();
        globalPage = pages.length > 0 ? pages[0] : await globalBrowser.newPage();
        await globalPage.setUserAgent(savedUserAgent);
        
        // Injecting fallback persistent session tokens with automatic cleanup schema mapping
        if(backupSessionCookies.length > 0) {
            console.log("[RangeXCoder Engine] Sanitizing and injecting cookie vault channels...");
            
            const sanitizedCookies = backupSessionCookies.map(c => {
                // 'no_restriction' ko standard 'None' me convert kar rahe hain aur expiration fix kar rahe hain
                return {
                    name: c.name,
                    value: c.value,
                    domain: '.pwthor.live', // Dot lagane se saare subdomains par kaam karega
                    path: c.path || '/',
                    httpOnly: c.httpOnly ?? true,
                    secure: c.secure ?? true,
                    sameSite: c.sameSite === 'no_restriction' ? 'None' : (c.sameSite || 'Lax'),
                    expires: c.expires || c.expirationDate || Math.floor(Date.now() / 1000) + 31536000
                };
            });

            await globalPage.setCookie(...sanitizedCookies);
        }

        console.log("[RangeXCoder Engine] Verifying portal communication tunnel...");
        await globalPage.goto(`${TARGET_ROOT}/study/batches`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        isEngineReady = true;
        console.log("[RangeXCoder Engine] Pipeline synchronization complete. Operational streams online.");
    } catch (err) {
        console.error("[Fatal RangeXCoder Engine Error]", err);
    }
}

// Highly responsive automation click handler to wipe out Apple Selection Overlay Modal
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
                console.log("[RangeXCoder Sniffer] Programmatic Apple bypass trigger action executed.");
            }
        });
    } catch (e) {}
}

app.get('/video-stream', async (req, res) => {
    if (!isEngineReady) return res.status(503).json({ success: false, error: "Engine syncing channels..." });
    
    const { batchId, subjectId, contentId } = req.query;
    if (!batchId || !contentId) return res.status(400).json({ success: false, error: "Missing required query blocks." });

    try {
        const targetWatchUrl = `${TARGET_ROOT}/study/batches/${batchId}/subjects/${subjectId || 'all'}/contents/${contentId}/watch`;
        console.log(`[RangeXCoder Tunnel] Routing crawler context to target frame: ${targetWatchUrl}`);
        
        const targetPage = await globalBrowser.newPage();
        await targetPage.setUserAgent(savedUserAgent);
        
        let interceptedData = null;

        await targetPage.setRequestInterception(true);
        targetPage.on('request', request => request.continue());

        targetPage.on('response', async response => {
            const url = response.url();
            if (url.includes('/api/v1/video/token') || url.includes('signedUrl') || url.includes('.mpd') || url.includes('.m3u8')) {
                try {
                    const mime = response.headers()['content-type'] || '';
                    if (mime.includes('application/json')) {
                        interceptedData = await response.json();
                        console.log("[RangeXCoder Sniffer] Intercepted stream configuration tokens.");
                    }
                } catch (e) {}
            }
        });

        await targetPage.goto(targetWatchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Loop monitoring interface elements to ensure popup is dropped instantly
        for(let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 300));
            await autoBypassApplePopup(targetPage);
            if (interceptedData) break;
        }

        await targetPage.close();

        if (interceptedData) {
            res.json({ success: true, data: interceptedData });
        } else {
            res.status(404).json({ success: false, error: "Token signature or streaming manifest extraction window expired." });
        }

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Dynamic layout proxy pipe mirroring API structural response logs
app.all('/api/*', async (req, res) => {
    if (!isEngineReady) return res.status(503).json({ success: false, error: "Core engine updating maps..." });
    const targetUrl = `${TARGET_ROOT}${req.url}`;
    
    try {
        const result = await globalPage.evaluate(async (url, method, bodyString) => {
            try {
                const fetchOptions = { method: method, credentials: "include" };
                if (method !== "GET" && bodyString) {
                    fetchOptions.body = bodyString;
                    fetchOptions.headers = { "Content-Type": "application/json" };
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
        res.status(500).json({ success: false, error: e.message });
    }
});

initializeRealBrowserEngine();
app.listen(PORT, () => console.log(`[RangeXCoder Server] Operational portal active on ports tunnel: ${PORT}`));