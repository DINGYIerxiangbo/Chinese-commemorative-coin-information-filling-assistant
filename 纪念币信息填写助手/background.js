/**
 * @name 纪念币信息填写助手
 * @version [1.0]
 * @license GPL-3.0
 * @copyright 2025 [DYexb或DINGYIerxiangbo]
 * 
 * 本项目采用GPLv3许可证。允许非商业使用，禁止商业售卖。
 * 衍生作品必须开源。商业使用需获得授权。
 * 
 * 完整许可证: https://github.com/DINGYIerxiangbo/Chinese-commemorative-coin-information-filling-assistant/blob/main/LICENSE
 */
importScripts('banks.js');
const inFlight = new Set();
async function fillTab(tabId, data) {
    if (!Number.isInteger(tabId) || !CoinBanks.normalizeInfo(data)) return { success: false, error: '数据格式错误' };
    if (inFlight.has(tabId)) return { success: false, error: '正在填写，请等待本次完成' };
    inFlight.add(tabId);
    try {
        const tab = await chrome.tabs.get(tabId);
        const bank = CoinBanks.bankForUrl(tab.url);
        if (!bank) return { success: false, error: '请在银行预约页面使用此功能' };
        const frames = await chrome.webNavigation.getAllFrames({ tabId });
        const probes = await Promise.all((frames || []).filter(f => CoinBanks.bankForUrl(f.url)?.id === bank.id).map(async frame => {
            try { return { frameId: frame.frameId, ...await chrome.tabs.sendMessage(tabId, { action: 'probeCoinForm' }, { frameId: frame.frameId }) }; }
            catch { return { frameId: frame.frameId, fields: 0 }; }
        }));
        probes.sort((a, b) => b.fields - a.fields);
        if (!probes[0]?.fields) return { success: false, error: '未找到预约表单，请进入填写页面；更新扩展后请刷新银行页面' };
        if (probes[1]?.fields === probes[0].fields) return { success: false, error: '检测到多个预约表单，请关闭多余表单后重试' };
        return await chrome.tabs.sendMessage(tabId, { action: 'fillPersonalInfo', data }, { frameId: probes[0].frameId });
    } finally { inFlight.delete(tabId); }
}
chrome.runtime.onMessage.addListener((request, sender, respond) => {
    if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('1.html') || request.action !== 'fillCoinTab') return false;
    fillTab(request.tabId, request.data).then(respond, () => respond({ success: false, error: '连接失败，请刷新银行页面后重试' }));
    return true;
});
