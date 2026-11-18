/**
 * @name 纪念币信息填写助手
 * @license GPL-3.0
 * @copyright 2025 [DYexb或DINGYIerxiangbo]
 *
 * 本项目采用GPLv3许可证。允许非商业使用，禁止商业售卖。
 * 完整许可证: https://github.com/DINGYIerxiangbo/Chinese-commemorative-coin-information-filling-assistant/blob/main/LICENSE
 */
// 弹窗(1.html)与编辑窗(3.html)共用的 UI 工具，避免在 1.js / 3.js 里各写一份。
(() => {
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // 统一的提示条：样式来自 1.css / 3.css 的 .notification 规则
    const showNotification = (message, type = 'info') => {
        document.querySelector('.notification')?.remove();
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        requestAnimationFrame(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 6000);
        });
    };

    globalThis.CoinCommon = { escapeHtml, showNotification };
    // 1.js / 3.js 里有大量 showNotification(...) 直接调用，这里保留同名全局函数，
    // 既只维护一份实现，又不用改动 37 处调用点。
    globalThis.showNotification = showNotification;
})();
