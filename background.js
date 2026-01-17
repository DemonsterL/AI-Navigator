// background.js
// 监听 URL 变化，解决 SPA 状态同步问题

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 只有当 URL 发生变化且属于 Gemini 域名时才触发
  if (changeInfo.url && changeInfo.url.includes('gemini.google.com')) {
    chrome.tabs.sendMessage(tabId, {
      type: 'URL_CHANGE',
      url: changeInfo.url
    }).catch(err => {
      // 忽略内容脚本未加载的错误
    });
  }
});
