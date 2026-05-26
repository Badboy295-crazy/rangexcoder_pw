const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_ROOT = "https://pwthor.live";

// File where injected vault token string gets written
const TOKEN_FILE_PATH = path.join(__dirname, 'range_vault_token.txt');

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

async function getSafeActivePage() {
    if (!globalBrowser || !globalBrowser.isConnected()) {
        console.log("[RangeXCoder Engine] Spawning optimized anti-bot browser space...");
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

    // Dynamic Cookie Refresh Guard: Check if token.txt has text and reload cookies
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

// 🌐 NEW ADMIN INJECTION VAULT ENDPOINT
app.post('/api/admin/set-token', (req, res) => {
    const { token } = req.body;
    if(!token) return res.status(400).json({ success: false, error: "Token payload is empty." });
    
    try {
        fs.writeFileSync(TOKEN_FILE_PATH, token.trim(), 'utf8');
        console.log("[RangeXCoder Vault] New raw auth_token saved to system files successfully!");
        res.json({ success: true, message: "Token saved into persistent storage file." });
    } catch(e) {
        res.status(500).json({ success: false, error: "Disk Write Error: " + e.message });
    }
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
    if (!batchId || !contentId) return res.status(400).json({ success: false, error: "Missing identity tags." });

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
        else res.status(404).json({ success: false, error: "Token signature or manifest channel dropped." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ULTIMATE CLOUDFLARE BYPASS: Direct physical page visit navigation loop to scrape JSON perfectly
app.all('/api/*', async (req, res) => {
    const targetUrl = `${TARGET_ROOT}${req.url}`;
    try {
        const page = await getSafeActivePage();
        
        console.log(`[RangeXCoder Resilient Navigation] Visiting API directly: ${targetUrl}`);
        
        // Physically go to the URL so Cloudflare treats it as an absolute genuine page view
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
        
        // Grab the raw JSON displayed inside the body container tags
        const outputJsonText = await page.evaluate(() => document.body.innerText);
        
        try {
            const parsedData = JSON.parse(outputJsonText);
            res.json(parsedData);
        } catch(jsonErr) {
            // If response is not JSON, it means Cloudflare threw an unexpected HTML block
            if (outputJsonText.includes("blocked") || outputJsonText.includes("Attention Required")) {
                res.status(403).send(outputJsonText);
            } else {
                res.status(500).json({ success: false, error: "Output compilation format mismatch.", raw: outputJsonText });
            }
        }
    } catch (e) {
        res.status(500).json({ success: false, error: "Cloudflare navigation tunnel failed: " + e.message });
    }
});

app.listen(PORT, () => console.log(`[RangeXCoder Server] Direct Resilient Token Tunnel Active on port: ${PORT}`));
