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
// Updated content-script controller. No data leaves extension storage except requested form values.
(() => {
    if (!CoinBanks.bankForUrl(location.href)) return;
    let settings = {}, generation = 0, running = false, scheduled, otpController;
    let seen = new WeakSet();
    const bank = CoinBanks.bankForUrl(location.href);
    const nodes = () => Object.keys(CoinBanks.labels).map(key => CoinFiller.candidates(document, key, bank).el).filter(Boolean);
    // 自动化测试钩子（不影响正常使用）：页面设置 data-dsh-fill-data 后派发 dshCoinFillTest 事件，
    // 结果写到 data-dsh-fill-result，便于在真实页面上验证填写引擎。
    window.addEventListener('dshCoinFillTest', () => {
        let data = null;
        try { data = JSON.parse(document.documentElement.getAttribute('data-dsh-fill-data') || 'null'); } catch (e) { data = null; }
        if (!data) return;
        document.documentElement.removeAttribute('data-dsh-fill-result');
        document.documentElement.setAttribute('data-dsh-fill-state', 'running');
        CoinFiller.fill(data, {}).then(result => {
            document.documentElement.setAttribute('data-dsh-fill-result', JSON.stringify(result));
            document.documentElement.setAttribute('data-dsh-fill-state', 'done');
        }, error => {
            document.documentElement.setAttribute('data-dsh-fill-result', JSON.stringify({ success: false, error: String(error) }));
            document.documentElement.setAttribute('data-dsh-fill-state', 'done');
        });
    });
    async function run(data, emptyOnly = false) {
        const ticket = ++generation;
        // A new manual operation supersedes an older fill, including delayed dropdowns.
        while (running) await new Promise(resolve => setTimeout(resolve, 50));
        if (ticket !== generation) return { success: false, error: '已被新的填写操作替代' };
        running = true;
        try {
            return await CoinFiller.fill(data, { emptyOnly, cancelled: () => ticket !== generation });
        } finally { running = false; }
    }
    chrome.runtime.onMessage.addListener((request, sender, respond) => {
        if (sender.id !== chrome.runtime.id) return false;
        if (request.action === 'probeCoinForm') {
            respond({ fields: nodes().length, webOTP: 'OTPCredential' in window });
            return false;
        }
        if (request.action !== 'fillPersonalInfo') return false;
        run(request.data).then(respond, () => respond({ success: false, error: '页面填写失败，请刷新后重试' }));
        return true;
    });
    async function autoFill() {
        if (!settings.autoFill || running || !settings.infoList?.length) return;
        const identity = ['userName', 'idCard', 'phone'].map(key => CoinFiller.candidates(document, key, bank).el).filter(Boolean);
        if (identity.length < 2) return;
        const available = nodes();
        if (!available.some(el => !seen.has(el))) return;
        available.forEach(el => seen.add(el));
        const profile = CoinBanks.normalizeInfo(settings.infoList[0]);
        if (!profile) return;
        // Never combine one person's existing identity with another saved person's data.
        if (['userName', 'idCard', 'phone'].some(key => {
            const el = CoinFiller.candidates(document, key, bank).el;
            return el?.value?.trim() && el.value.trim().toUpperCase() !== profile[key].toUpperCase();
        })) return;
        await run(settings.infoList[0], true);
    }
    function schedule() {
        clearTimeout(scheduled);
        scheduled = setTimeout(() => { autoFill().catch(() => {}); }, 300);
    }
    chrome.storage.local.get(['autoFill', 'autoVerifyCode', 'infoList'], result => { settings = result; schedule(); });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        for (const key of ['autoFill', 'autoVerifyCode', 'infoList']) if (changes[key]) settings[key] = changes[key].newValue;
        if (changes.autoFill || changes.infoList) { generation++; seen = new WeakSet(); schedule(); }
        if (changes.autoVerifyCode && !settings.autoVerifyCode) otpController?.abort();
    });
    new MutationObserver(schedule).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'disabled'] });
    window.addEventListener('hashchange', () => { generation++; seen = new WeakSet(); schedule(); });
    window.addEventListener('popstate', () => { generation++; seen = new WeakSet(); schedule(); });
    // The user explicitly pastes into the SMS field; never read clipboard in the background.
    document.addEventListener('paste', event => {
        if (!settings.autoVerifyCode || !CoinFiller.isOtp(event.target)) return;
        const code = CoinFiller.extractOtp(event.clipboardData?.getData('text') || '');
        if (!code || (event.target.maxLength > 0 && code.length > event.target.maxLength)) return;
        event.preventDefault();
        CoinFiller.nativeSet(event.target, code);
    });
    document.addEventListener('focusin', async event => {
        const target = event.target;
        if (!settings.autoVerifyCode || !CoinFiller.isOtp(target) || target.value || otpController || !('OTPCredential' in window) || !navigator.credentials?.get) return;
        const controller = new AbortController();
        otpController = controller;
        const timer = setTimeout(() => controller.abort(), 60000);
        try {
            const credential = await navigator.credentials.get({ otp: { transport: ['sms'] }, signal: controller.signal });
            if (settings.autoVerifyCode && target.isConnected && !target.value && CoinFiller.isOtp(target) && /^\d{4,8}$/.test(credential?.code || '') && !(target.maxLength > 0 && credential.code.length > target.maxLength)) CoinFiller.nativeSet(target, credential.code);
        } catch { /* Unsupported, denied or timed out: manual entry/paste remains available. */ }
        finally { clearTimeout(timer); if (otpController === controller) otpController = null; }
    });
    window.addEventListener('pagehide', () => { generation++; otpController?.abort(); });
})();
