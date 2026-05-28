const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('錯誤：請提供網址');
    }

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const contentType = response.headers['content-type'];
        res.set('Content-Type', contentType);

        if (contentType && contentType.includes('text/html')) {
            let html = response.data.toString('utf-8');
            const origin = new URL(targetUrl).origin;
            
            html = html.replace('<head>', `<head>\n    <base href="${origin}/">`);
            
            res.send(html);
        } else {
            res.send(response.data);
        }

    } catch (error) {
        console.error('代理伺服器錯誤:', error.message);
        res.status(500).send(`伺服器代理請求失敗：${error.message}`);
    }
});

//🔥 新增：用來抓取純文字腳本程式碼的 API
app.get('/fetch-script', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('錯誤：請提供網址');
    }

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.send(response.data);

    } catch (error) {
        console.error('抓取腳本錯誤:', error.message);
        res.status(500).send(`無法載入腳本：${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`伺服器已啟動：http://localhost:${PORT}`);
});
