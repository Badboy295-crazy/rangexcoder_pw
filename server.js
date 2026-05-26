const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// PREMIUM STEALTH ENGINE MASK INTEGRATION
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_ROOT = "https://pwthor.live";
const TOKEN_FILE_PATH = path.join(__dirname, 'range_vault_token.txt');

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

const savedUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
let globalBrowser = null;
let globalPage = null;

async function getSafeActivePage() {
    if (!globalBrowser || !globalBrowser.isConnected()) {
        console.log("[RangeXCoder Engine] Spawning premium anti-bot stealth browser space...");
        globalBrowser = await puppeteer.launch({
            headless: true,
            executablePath: puppeteer.executablePath(),
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

        await globalPage.goto(TARGET_ROOT, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
    }

    // Dynamic Token Vault Validator Injection
    if (fs.existsSync(TOKEN_FILE_PATH)) {
        const activeTokenString = fs.readFileSync(TOKEN_FILE_PATH, 'utf8').trim();
        if (activeTokenString.length > 10) {
            await globalPage.setCookie({
                name: 'auth_token',
                value: activeTokenString,
                domain: '.pwthor.live',
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'None'
            });
        }
    }
    return globalPage;
}

// 🌐 LIVE CAPTCHA WIREFRAME INTERACTION ENDPOINTS
app.get('/api/admin/screenshot', async (req, res) => {
    try {
        const page = await getSafeActivePage();
        // Take a lightweight optimized snapshot image of the current server page content
        const buf = await page.screenshot({ type: 'jpeg', quality: 65 });
        res.type('image/jpeg');
        res.send(buf);
    } catch(e) { res.status(500).send(e.message); }
});

app.post('/api/admin/click', async (req, res) => {
    const { x, y } = req.body;
    try {
        const page = await getSafeActivePage();
        console.log(`[RangeXCoder Click Tunnel] Clicking on absolute cloud matrix nodes: X=${x}, Y=${y}`);
        await page.mouse.click(parseInt(x), parseInt(y));
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/admin/goto-home', async (req, res) => {
    try {
        const page = await getSafeActivePage();
        await page.goto(`${TARGET_ROOT}/study/batches`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/set-token', (req, res) => {
    const { token } = req.body;
    if(!token) return res.status(400).json({ success: false, error: "Token value empty." });
    try {
        fs.writeFileSync(TOKEN_FILE_PATH, token.trim(), 'utf8');
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// Highly responsive automation click handler to wipe out Apple Selection Modal (Untouched)
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
    if (!batchId || !contentId) return res.status(400).json({ success: false, error: "Missing tags." });
    try {
        const page = await getSafeActivePage();
        const targetWatchUrl = `${TARGET_ROOT}/study/batches/${batchId}/subjects/${subjectId || 'all'}/contents/${contentId}/watch`;
        const targetPage = await globalBrowser.newPage();
        await targetPage.setUserAgent(savedUserAgent);
        
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
        else res.status(404).json({ success: false, error: "Stream dropped." });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// CLOUDFLARE SECURITY TUNNEL WITH AUTOMATIC CAPTCHA CHANNELS INTERCEPTION
app.all('/api/*', async (req, res) => {
    const targetUrl = `${TARGET_ROOT}${req.url}`;
    try {
        const page = await getSafeActivePage();
        const result = await page.evaluate(async (url, method, bodyString) => {
            try {
                const fetchOptions = { 
                    method: method, 
                    credentials: "include",
                    headers: { "Accept": "application/json", "Content-Type": "application/json" }
                };
                if (method !== "GET" && bodyString) fetchOptions.body = bodyString;
                
                const response = await fetch(url, fetchOptions);
                const contentType = response.headers.get("content-type") || "";
                
                // Intercept if cloudflare protection code captures the layer
                if (response.status === 403 || contentType.includes("text/html")) {
                    const textContent = await response.text();
                    if(textContent.includes("blocked") || textContent.includes("cf-wrapper") || textContent.includes("Attention Required")) {
                        return { status: 403, isCloudflare: true, isJson: true, data: { isCloudflare: true, error: "Bypass required" } };
                    }
                }
                
                if (contentType.includes("application/json")) {
                    return { status: response.status, isJson: true, data: await response.json() };
                } else {
                    return { status: response.status, isJson: false, data: await response.text() };
                }
            } catch (err) { return { status: 500, isJson: true, data: { success: false, error: err.message } }; }
        }, targetUrl, req.method, req.method !== "GET" ? JSON.stringify(req.body) : null);

        if (result.isJson) res.status(result.status).json(result.data);
        else res.status(result.status).send(result.data);
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.listen(PORT, () => console.log(`[RangeXCoder Server] Direct Resilient Tunnel Active on port: ${PORT}`));
