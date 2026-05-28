function runScript() {
    const code = document.getElementById('code-input').value;
    const iframe = document.getElementById('target-frame');
    const outputElement = document.getElementById('output');
    
    outputElement.innerHTML += '\n--- 準備執行腳本 ---\n';
    
    try {
        const iframeWindow = iframe.contentWindow;
        const iframeDoc = iframeWindow.document;
        
        //🔥 模擬 Tampermonkey 的 unsafeWindow
        iframeWindow.unsafeWindow = iframeWindow;
        
        //🔥 模擬 Tampermonkey 的腳本資訊物件
        iframeWindow.GM_info = {
            script: { name: '線上測試腳本', version: '1.0' },
            scriptMetaStr: ''
        };
        
        //🔥 模擬 GM_addStyle (用來在網頁中注入 CSS 樣式)
        iframeWindow.GM_addStyle = function(css) {
            const style = iframeDoc.createElement('style');
            style.textContent = css;
            (iframeDoc.head || iframeDoc.documentElement).appendChild(style);
        };
        
        //🔥 模擬 GM_setValue (使用 iframe 內的 localStorage 來儲存資料)
        iframeWindow.GM_setValue = function(name, value) {
            iframeWindow.localStorage.setItem('GM_' + name, JSON.stringify(value));
        };
        
        //🔥 模擬 GM_getValue (讀取儲存的資料)
        iframeWindow.GM_getValue = function(name, defaultValue) {
            const value = iframeWindow.localStorage.getItem('GM_' + name);
            if (value === null) return defaultValue;
            try {
                return JSON.parse(value);
            } catch (e) {
                return value;
            }
        };
        
        //🔥 模擬 GM_deleteValue (刪除資料)
        iframeWindow.GM_deleteValue = function(name) {
            iframeWindow.localStorage.removeItem('GM_' + name);
        };
        
        //🔥 模擬 GM_xmlhttpRequest (使用 fetch API 來模擬外部請求)
        iframeWindow.GM_xmlhttpRequest = function(details) {
            fetch(details.url, {
                method: details.method || 'GET',
                headers: details.headers,
                body: details.data
            })
            .then(response => response.text().then(text => ({ response, text })))
            .then(({ response, text }) => {
                if (details.onload) {
                    details.onload({
                        status: response.status,
                        statusText: response.statusText,
                        responseText: text,
                        readyState: 4
                    });
                }
            })
            .catch(err => {
                if (details.onerror) {
                    details.onerror(err);
                }
            });
        };
        
        // 嘗試在 iframe 的環境下使用 eval 執行程式碼
        iframeWindow.eval(code);
        
        outputElement.innerHTML += '腳本執行指令已送出。\n';
    } catch (error) {
        outputElement.innerHTML += '<span style="color: #ff5555;">執行失敗：' + error.message + '</span>\n';
    }
}
