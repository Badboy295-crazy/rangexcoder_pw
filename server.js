const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_ROOT = "https://pwthor.live";

// Docker Persistent Volume Session Data Directory
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

// CLEAN MATRIX CONFIG: Removed all private hardcoded data tags entirely
const backupSessionCookies = [];

async function getSafeActivePage() {
    if (!globalBrowser || !globalBrowser.isConnected()) {
        console.log("[RangeXCoder Engine] Spawning persistent Docker-compatible browser context...");
        globalBrowser = await puppeteer.launch({
            headless: true,
            executablePath: puppeteer.executablePath(),
            userDataDir: SESSION_DATA_DIR, // Session keeps permanently saved here
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

        // Bridge initial routing context
        await globalPage.goto(TARGET_ROOT, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
    }
    return globalPage;
}

// 🌐 FIXED DYNAMIC NATIVE TUNNEL ROUTERS (Direct Native APIs Trigger)
app.post('/auth/send-otp', async (req, res) => {
    const { mobile } = req.body;
    if(!mobile) return res.status(400).json({ success: false, error: "Mobile node tags missing parameters." });
    
    try {
        const page = await getSafeActivePage();
        console.log(`[RangeXCoder Visual Tunnel] Forwarding dynamic request payload straight to native auth/login endpoint...`);
        
        // Execute real login payload dispatch INSIDE the cleared anti-bot browser window
        const result = await page.evaluate(async (targetMobile) => {
            const response = await fetch('https://pwthor.live/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ mobile: targetMobile })
            });
            return response.json();
        }, mobile);

        console.log("[RangeXCoder Tunnel] Send OTP Response:", result);
        res.json(result);
    } catch(e) {
        console.error("[Tunnel Send OTP Exception]", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/auth/verify-otp', async (req, res) => {
    const { mobile, otp } = req.body;
    if(!otp || !mobile) return res.status(400).json({ success: false, error: "Verification payload parameter nodes empty." });
    
    try {
        const page = await getSafeActivePage();
        console.log(`[RangeXCoder Visual Tunnel] Sending verify-otp payload directly inside chrome isolated network stream...`);
        
        const result = await page.evaluate(async (targetMobile, targetOtp) => {
            const response = await fetch('https://pwthor.live/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ mobile: targetMobile, otp: targetOtp })
            });
            return response.json();
        }, mobile, otp);

        console.log("[RangeXCoder Tunnel] Verify OTP Response:", result);
        
        if (result.success) {
            console.log("[RangeXCoder Tunnel] Authentication confirmed. Navigating to finalize token encryption context...");
            // Force browser to home catalog page context to securely stamp cookies into storage volume disk
            await page.goto(`${TARGET_ROOT}/study/batches`, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        }

        res.json(result);
    } catch(e) {
        console.error("[Tunnel Verify OTP Exception]", e.message);
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

// Video streaming crawler handler
app.get('/video-stream', async (req, res) => {
    const { batchId, subjectId, contentId } = req.query;
    if (!batchId || !contentId) return res.status(400).json({ success: false, error: "Missing identity tags." });

    try {
        const page = await getSafeActivePage();
        const targetWatchUrl = `${TARGET_ROOT}/study/batches/${batchId}/subjects/${subjectId || 'all'}/contents/${contentId}/watch`;
        
        const targetPage = await globalBrowser.newPage();
        await targetPage.setUserAgent(savedUserAgent);
        
        // Match real current dynamic sessions cookie records
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

// Secure Cloudflare Tunneling Endpoint Matrix Router Mirroring Exact Targets Natively
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

// Cold-start lazy trigger instantiation loop
(async () => { try { await getSafeActivePage(); isEngineReady = true; } catch(e){} })();

app.listen(PORT, () => console.log(`[RangeXCoder Server] Direct Resilient Tunnel Active on port: ${PORT}`));
