const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());

//🔥 新增：允許解析 JSON 格式的請求，並加大容量限制以應付大型腳本
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

//🔥 新增：暫存準備注入的腳本
const pendingScripts = {};

//🔥 新增：接收前端傳來的腳本，回傳一個專屬 ID
app.post('/prepare-inject', (req, res) => {
    const id = Date.now().toString();
    pendingScripts[id] = req.body.code;
    res.json({ id });
});

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    const injectId = req.query.injectId; //🔥 接收注入 ID

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
            
            let headInjections = `<base href="${origin}/">\n`;

            //🔥 如果有要求注入腳本，就把它與 Tampermonkey 模擬環境塞在 <head> 的最前面
            if (injectId && pendingScripts[injectId]) {
                const code = pendingScripts[injectId];
                headInjections += `
<script>
    // 模擬 Tampermonkey 環境
    window.unsafeWindow = window;
    window.GM_info = { script: { name: '線上測試腳本', version: '1.0' } };
    window.GM_addStyle = function(css) {
        const style = document.createElement('style');
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    };
    window.GM_setValue = function(name, value) {
        window.localStorage.setItem('GM_' + name, JSON.stringify(value));
    };
    window.GM_getValue = function(name, defaultValue) {
        const value = window.localStorage.getItem('GM_' + name);
        if (value === null) return defaultValue;
        try { return JSON.parse(value); } catch (e) { return value; }
    };
    window.GM_deleteValue = function(name) {
        window.localStorage.removeItem('GM_' + name);
    };
    window.GM_xmlhttpRequest = function(details) {
        fetch(details.url, {
            method: details.method || 'GET',
            headers: details.headers,
            body: details.data
        })
        .then(response => response.text().then(text => ({ response, text })))
        .then(({ response, text }) => {
            if (details.onload) details.onload({ status: response.status, responseText: text, readyState: 4 });
        })
        .catch(err => {
            if (details.onerror) details.onerror(err);
        });
    };

    // 執行目標腳本
    try {
        ${code}
    } catch(error) {
        console.error('腳本注入執行失敗:', error);
    }
</script>
                `;
                // 注入後刪除暫存以節省記憶體
                delete pendingScripts[injectId];
            }
            
            html = html.replace('<head>', `<head>\n    ${headInjections}`);
            
            res.send(html);
        } else {
            res.send(response.data);
        }

    } catch (error) {
        console.error('代理伺服器錯誤:', error.message);
        res.status(500).send(`伺服器代理請求失敗：${error.message}`);
    }
});

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
