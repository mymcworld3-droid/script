function loadUrl() {
    const url = document.getElementById('url-input').value;
    const iframe = document.getElementById('target-frame');
    const outputElement = document.getElementById('output');
    
    if (url) {
        const proxyUrl = '/proxy?url=' + encodeURIComponent(url);
        iframe.src = proxyUrl;
        
        outputElement.innerHTML = '嘗試透過代理伺服器載入：' + url + '\n';
        outputElement.innerHTML += '【系統提示】網頁載入中，現在 iframe 與主網頁屬於同源 (localhost)，腳本將可正常執行。\n';
    } else {
        outputElement.innerHTML = '請先輸入網址。\n';
    }
}

async function fetchScriptCode() {
    const scriptUrl = document.getElementById('script-url-input').value;
    const codeInput = document.getElementById('code-input');
    const outputElement = document.getElementById('output');
    
    if (!scriptUrl) {
        outputElement.innerHTML += '請先輸入腳本網址。\n';
        return;
    }
    
    outputElement.innerHTML += '\n嘗試下載腳本：' + scriptUrl + '\n';
    
    try {
        const response = await fetch('/fetch-script?url=' + encodeURIComponent(scriptUrl));
        
        if (!response.ok) {
            throw new Error(`伺服器回應狀態碼 ${response.status}`);
        }
        
        const code = await response.text();
        codeInput.value = code;
        
        //🔥 新增：透過按鈕下載腳本成功後，也自動儲存進 localStorage
        localStorage.setItem('savedCode', code);
        
        outputElement.innerHTML += '腳本下載成功！已經填入下方輸入框。\n';
        
    } catch (error) {
        outputElement.innerHTML += '<span style="color: #ff5555;">下載失敗：' + error.message + '</span>\n';
    }
}

async function runScript() {
    const url = document.getElementById('url-input').value;
    const code = document.getElementById('code-input').value;
    const iframe = document.getElementById('target-frame');
    const outputElement = document.getElementById('output');
    
    if (!url) {
        outputElement.innerHTML += '請先輸入上方要載入的網頁網址。\n';
        return;
    }
    
    outputElement.innerHTML += '\n--- 準備在網頁載入前注入腳本 ---\n';
    
    try {
        const response = await fetch('/prepare-inject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code })
        });
        
        if (!response.ok) {
            throw new Error('腳本上傳到伺服器失敗');
        }
        
        const data = await response.json();
        const injectId = data.id;
        
        const proxyUrl = `/proxy?url=${encodeURIComponent(url)}&injectId=${injectId}`;
        iframe.src = proxyUrl;
        
        outputElement.innerHTML += '腳本已與網頁合併，正在重新載入網頁...\n';
        outputElement.innerHTML += '【系統提示】為了突破封鎖，腳本將在網頁初始化 (document-start) 時自動執行。\n';
    } catch (error) {
        outputElement.innerHTML += '<span style="color: #ff5555;">執行失敗：' + error.message + '</span>\n';
    }
}

function toggleFullscreen() {
    const iframe = document.getElementById('target-frame');
    
    if (!document.fullscreenElement) {
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
        } else if (iframe.webkitRequestFullscreen) {
            iframe.webkitRequestFullscreen();
        } else if (iframe.msRequestFullscreen) {
            iframe.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

//🔥 新增：負責記憶網址與腳本的核心邏輯
window.addEventListener('DOMContentLoaded', () => {
    // 從 localStorage 讀取之前儲存的資料
    const savedUrl = localStorage.getItem('savedUrl');
    const savedScriptUrl = localStorage.getItem('savedScriptUrl');
    const savedCode = localStorage.getItem('savedCode');

    const urlInput = document.getElementById('url-input');
    const scriptUrlInput = document.getElementById('script-url-input');
    const codeInput = document.getElementById('code-input');

    // 如果有儲存過的資料，就填入輸入框
    if (savedUrl) urlInput.value = savedUrl;
    if (savedScriptUrl) scriptUrlInput.value = savedScriptUrl;
    if (savedCode) codeInput.value = savedCode;

    // 監聽輸入框的變更，只要有打字就自動儲存
    urlInput.addEventListener('input', function() {
        localStorage.setItem('savedUrl', this.value);
    });
    
    scriptUrlInput.addEventListener('input', function() {
        localStorage.setItem('savedScriptUrl', this.value);
    });

    codeInput.addEventListener('input', function() {
        localStorage.setItem('savedCode', this.value);
    });
});
