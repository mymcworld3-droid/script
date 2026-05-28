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
        outputElement.innerHTML += '腳本下載成功！已經填入下方輸入框。\n';
        
    } catch (error) {
        outputElement.innerHTML += '<span style="color: #ff5555;">下載失敗：' + error.message + '</span>\n';
    }
}

function runScript() {
    const code = document.getElementById('code-input').value;
    const iframe = document.getElementById('target-frame');
    const outputElement = document.getElementById('output');
    
    outputElement.innerHTML += '\n--- 準備執行腳本 ---\n';
    
    try {
        const iframeWindow = iframe.contentWindow;
        
        iframeWindow.eval(code);
        
        outputElement.innerHTML += '腳本執行指令已送出。\n';
    } catch (error) {
        outputElement.innerHTML += '<span style="color: #ff5555;">執行失敗：' + error.message + '</span>\n';
    }
}

//🔥 新增：處理進入與退出全螢幕的核心邏輯
function toggleFullscreen() {
    const iframe = document.getElementById('target-frame');
    
    if (!document.fullscreenElement) {
        // 如果目前不是全螢幕，則要求 iframe 進入全螢幕
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
        } else if (iframe.webkitRequestFullscreen) { // 支援 Safari
            iframe.webkitRequestFullscreen();
        } else if (iframe.msRequestFullscreen) { // 支援 IE/Edge
            iframe.msRequestFullscreen();
        }
    } else {
        // 如果已經是全螢幕，則要求整份文件退出全螢幕
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // 支援 Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // 支援 IE/Edge
            document.msExitFullscreen();
        }
    }
}
