function loadUrl() {
    const url = document.getElementById('url-input').value;
    const iframe = document.getElementById('target-frame');
    const outputElement = document.getElementById('output');
    
    if (url) {
        //🔥 改為透過我們架設的 proxy 伺服器載入
        const proxyUrl = '/proxy?url=' + encodeURIComponent(url);
        iframe.src = proxyUrl;
        
        //🔥 更新提示文字
        outputElement.innerHTML = '嘗試透過代理伺服器載入：' + url + '\n';
        outputElement.innerHTML += '【系統提示】網頁載入中，現在 iframe 與主網頁屬於同源 (localhost)，腳本將可正常執行。\n';
    } else {
        outputElement.innerHTML = '請先輸入網址。\n';
    }
}
