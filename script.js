function loadUrl() {
    const url = document.getElementById('url-input').value;
    const iframe = document.getElementById('target-frame');
    const outputElement = document.getElementById('output');
    
    if (url) {
        iframe.src = url;
        outputElement.innerHTML = '嘗試載入：' + url + '\n';
        outputElement.innerHTML += '【注意】如果上方畫面保持空白，是因為該網站啟用了防止被嵌入的安全機制 (X-Frame-Options)。\n';
    } else {
        outputElement.innerHTML = '請先輸入網址。\n';
    }
}

function runScript() {
    const code = document.getElementById('code-input').value;
    const iframe = document.getElementById('target-frame');
    const outputElement = document.getElementById('output');
    
    outputElement.innerHTML += '\n--- 準備執行腳本 ---\n';
    
    try {
        // 嘗試獲取 iframe 內部的 window 物件
        const iframeWindow = iframe.contentWindow;
        
        // 嘗試在 iframe 的環境下使用 eval 執行程式碼
        // 若為跨網域，這一行或上一行就會觸發 SecurityError
        iframeWindow.eval(code);
        
        outputElement.innerHTML += '腳本執行指令已送出。\n';
    } catch (error) {
        outputElement.innerHTML += '<span style="color: #ff5555;">執行失敗：' + error.message + '</span>\n';
        outputElement.innerHTML += '<span style="color: #ffaa00;">(這通常是因為「同源政策」阻擋了跨網域的腳本存取，瀏覽器不允許你修改不屬於你的網站內容)</span>\n';
    }
}
