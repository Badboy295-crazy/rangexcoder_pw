const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_ROOT = "https://pwthor.live";

// Storage directory to keep your logged-in session safe across server restarts
const SESSION_DATA_DIR = path.join(__dirname, 'range_session_vault');
if (!fs.existsSync(SESSION_DATA_DIR)) {
    fs.mkdirSync(SESSION_DATA_DIR, { recursive: true });
}

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const savedUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
let globalBrowser = null;
let globalPage = null;
let isEngineReady = false;

// Fallback Hardcoded Initial Matrix Token if cookie fallback needed
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
        "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiI4ODUzODE3NjUyIiwibmFtZSI6IkFtYmVyIEthc2F1ZGhhbiIsImlhdCI6MTc3OTUxODI4NSwiZXhwIjoxNzg3Mjk0Mjg1fQ.wV224l42kC5AGhfoaRc1kIWpkb0S_v3Gois6dYv-7tE"
    }
];

async function getSafeActivePage() {
    if (!globalBrowser || !globalBrowser.isConnected()) {
        console.log("[RangeXCoder Engine] Spawning persistent Docker-compatible browser context...");
        globalBrowser = await puppeteer.launch({
            headless: true,
            executablePath: puppeteer.executablePath(),
            userDataDir: SESSION_DATA_DIR, // PERSISTENT SYSTEM: Login state keeps saved inside container drive volumes
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
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
        
        await globalPage.setUserAgent(savedUserAgent);
        await globalPage.setViewport({ width: 1920, height: 1080 });

        await globalPage.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            window.chrome = { runtime: {} };
        });

        // Initialize connection baseline mapping
        await globalPage.goto(TARGET_ROOT, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
        
        // Secondary safety guard: check if already authenticated by tracking storage elements
        const currentCookies = await globalPage.cookies();
        const hasAuthCookie = currentCookies.some(c => c.name === 'auth_token');
        
        if (!hasAuthCookie && backupSessionCookies.length > 0) {
            console.log("[RangeXCoder Engine] Hydrating default vault tokens fallback parameters...");
            const sanitized = backupSessionCookies.map(c => ({
                name: c.name,
                value: c.value,
                domain: '.pwthor.live',
                path: c.path || '/',
                httpOnly: c.httpOnly ?? true,
                secure: c.secure ?? true,
                sameSite: 'None'
            }));
            await globalPage.setCookie(...sanitized);
        }
    }
    return globalPage;
}

// 🌐 LIVE OPT CONNECTION ROUTERS
app.post('/auth/send-otp', async (req, res) => {
    const { mobile } = req.body;
    if(!mobile) return res.status(400).json({ success: false, error: "Mobile number missing" });
    
    try {
        const page = await getSafeActivePage();
        console.log(`[RangeXCoder Visual Tunnel] Navigating to target authentication portal for: ${mobile}`);
        
        await page.goto(`${TARGET_ROOT}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForSelector('input[type="text"], input[placeholder*="mobile"]', { timeout: 10000 });
        
        // Inject phone number directly into target browser frame input field
        await page.evaluate((phone) => {
            const input = document.querySelector('input[type="text"]') || document.querySelector('input[placeholder*="mobile"]');
            if(input) {
                input.value = phone;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, mobile);
        
        // Instantly submit phone parameters to trigger OTP pathway lines
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const sendBtn = buttons.find(b => b.innerText.toLowerCase().includes('otp') || b.innerText.toLowerCase().includes('login') || b.innerText.toLowerCase().includes('continue'));
            if(sendBtn) sendBtn.click();
        });

        res.json({ success: true, message: "OTP route executed inside container engine frame context." });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/auth/verify-otp', async (req, res) => {
    const { otp } = req.body;
    if(!otp) return res.status(400).json({ success: false, error: "OTP value parameters blank." });
    
    try {
        if(!globalPage || globalPage.isClosed()) throw new Error("Authentication flow context has timed out. Get OTP again.");
        
        // Enter received OTP parameters into responsive cloud Chromium view layout state
        await globalPage.evaluate((otpKey) => {
            const input = document.querySelector('input[type="number"]') || document.querySelector('input[placeholder*="otp"]') || document.querySelector('input');
            if(input) {
                input.value = otpKey;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, otp);

        // Click verify execution handler key nodes
        await globalPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const verifyBtn = buttons.find(b => b.innerText.toLowerCase().includes('verify') || b.innerText.toLowerCase().includes('submit') || b.innerText.toLowerCase().includes('login'));
            if(verifyBtn) verifyBtn.click();
        });

        // Wait a few seconds to let cookie populate correctly
        await new Promise(r => setTimeout(r, 4000));
        await globalPage.goto(`${TARGET_ROOT}/study/batches`, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        
        res.json({ success: true, message: "Ecosystem identity validation linked completely." });
    } catch(e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

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
        const page = await getSafeActivePage();
        const targetWatchUrl = `${TARGET_ROOT}/study/batches/${batchId}/subjects/${subjectId || 'all'}/contents/${contentId}/watch`;
        
        const targetPage = await globalBrowser.newPage();
        await targetPage.setUserAgent(savedUserAgent);
        
        // Synchronize authenticated cookies straight into target media streaming frames page context
        const rootCookies = await page.cookies();
        await targetPage.setCookie(...rootCookies);

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

// Secure Cloudflare Tunneling Proxy Pipeline Route Handler
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
        res.status(500).json({ success: false, error: "Cloudflare tunnel bridge failure: " + e.message });
    }
});

// Fast engine trigger instantiation loop right after start commands
(async () => { try { await getSafeActivePage(); isEngineReady = true; } catch(e){} })();

app.listen(PORT, () => console.log(`[RangeXCoder Server] Operational Tunnel Gateway active on port: ${PORT}`));
