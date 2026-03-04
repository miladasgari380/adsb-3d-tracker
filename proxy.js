import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
app.use(cors());

app.use('/api/adsb', (req, res, next) => {
    let targetUrl = req.headers['x-adsb-target'];

    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing x-adsb-target header' });
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = 'http://' + targetUrl;
    }

    try {
        const url = new URL(targetUrl);
        const proxy = createProxyMiddleware({
            target: `${url.protocol}//${url.host}`,
            changeOrigin: true,
            pathRewrite: () => url.pathname + url.search,
            on: {
                proxyReq: (proxyReq) => {
                    // Ensure host header matches the exact target so dumb servers don't reject it
                    proxyReq.setHeader('Host', url.host);
                }
            }
        });

        // Execute the dynamically created proxy middleware
        proxy(req, res, next);

    } catch (err) {
        console.error('Invalid URL:', targetUrl, err.message);
        res.status(400).json({ error: 'Invalid proxy target URL' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Standalone ADS-B Proxy running on http://localhost:${PORT}`);
});
