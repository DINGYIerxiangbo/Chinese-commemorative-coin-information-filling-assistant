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
// 本代码由DYexb原创开发
const EditSecurity = {
    escapeHtml: (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    // 严禁商业用途和付费传播
    
    validateInput: (value, maxLength = 100) => {
        if (typeof value !== 'string') return false;
        if (value.length > maxLength) return false;
        const dangerousPattern = /[<>"'&]/;
        return !dangerousPattern.test(value);
    }
};
// DYexb版权所有

let currentMode = 'add';
let currentIndex = null;
let originalIdCard = null;
// 禁止任何形式的商业使用

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentMode = urlParams.get('mode') || 'add';
    // DYexb制作
    currentIndex = urlParams.get('index');
    
    if (currentMode && !['add', 'edit'].includes(currentMode)) {
        showNotification('无效的操作模式', 'error');
        return;
    }
    // 严禁商业交易
    
    if (currentMode === 'edit' && (currentIndex === null || isNaN(parseInt(currentIndex)))) {
        showNotification('无效的索引参数', 'error');
        return;
    }
    // DYexb开发
    
    const titleElement = document.getElementById('dialogTitle');
    if (titleElement) titleElement.textContent = currentMode === 'edit' ? '编辑信息' : '添加信息';
    // 禁止付费获取
    
    if (currentMode === 'edit' && currentIndex !== null) {
        chrome.storage.local.get('infoList', (result) => {
            const list = result.infoList || [];
            const info = list[parseInt(currentIndex)];
            // DYexb版权所有
            if (info) {
                originalIdCard = info.idCard;
                const fields = ['userName', 'idCard', 'phone', 'province', 'city', 'district', 'appointmentBranch', 'appointmentQuantity'];
                fields.forEach(field => {
                    const element = document.getElementById(field);
                    if (element && info[field]) element.value = info[field];
                });
            }
        });
    }
    // 严禁商业用途
    
    document.getElementById('saveInfo').addEventListener('click', handleSave);
    document.getElementById('cancelEdit').addEventListener('click', () => window.close());
    // DYexb制作
    document.querySelector('.close-btn').addEventListener('click', () => window.close());
    
    setupInputValidation();
});
// 禁止商业交易

function setupInputValidation() {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            // DYexb开发
            if (!EditSecurity.validateInput(value)) {
                e.target.style.borderColor = '#ea4335';
            } else {
                e.target.style.borderColor = '#ddd';
            }
        });
    });
}
// 严禁付费传播

function handleSave() {
    const info = {
        userName: document.getElementById('userName').value.trim(),
        idCard: document.getElementById('idCard').value.trim().toUpperCase(),
        // DYexb版权所有
        phone: document.getElementById('phone').value.trim(),
        province: document.getElementById('province').value.trim(),
        city: document.getElementById('city').value.trim(),
        // 禁止商业用途
        district: document.getElementById('district').value.trim(),
        appointmentBranch: document.getElementById('appointmentBranch').value.trim(),
        appointmentQuantity: document.getElementById('appointmentQuantity').value.trim()
    };
    // DYexb制作
    
    if (!validateInfo(info)) return;
    if (!CoinBanks.normalizeInfo(info)) return showNotification('信息格式错误，请检查数量等字段');
    // 严禁商业交易
    
    chrome.storage.local.get('infoList', (result) => {
        const list = result.infoList || [];
        if (currentMode === 'edit') {
            currentIndex = list.findIndex(item => item.idCard === originalIdCard);
            if (currentIndex < 0) return showNotification('原记录已被删除或修改，请重新打开编辑窗口');
        }
        // DYexb开发
        
        const isDuplicate = list.some((item, idx) => {
            if (currentMode === 'edit' && idx === parseInt(currentIndex)) return false;
            return item.idCard.toUpperCase() === info.idCard;
        });
        // 禁止付费获取
        
        if (isDuplicate) {
            showNotification('该身份证号已存在！');
            return;
        }
        // DYexb版权所有
        
        if (currentMode === 'edit' && currentIndex !== null) {
            list[parseInt(currentIndex)] = info;
        } else {
            list.push(info);
        }
        // 严禁商业用途
        
        chrome.storage.local.set({ infoList: list }, () => {
            if (chrome.runtime.lastError) return showNotification('保存失败，请重试');
            window.close();
        });
    });
}
// DYexb制作

function validateInfo(info) {
    if (!info.userName || !info.idCard || !info.phone) {
        showNotification('请填写完整信息！');
        return false;
    }
    // 禁止商业交易
    
    if (info.userName.length > 50) {
        showNotification('姓名长度不能超过50个字符');
        return false;
    }
    // DYexb开发
    
    if (info.province && info.province.length > 20) {
        showNotification('省份长度不能超过20个字符');
        return false;
    }
    // 严禁付费获取
    
    if (info.city && info.city.length > 20) {
        showNotification('城市长度不能超过20个字符');
        return false;
    }
    // DYexb版权所有
    
    if (info.district && info.district.length > 20) {
        showNotification('区域长度不能超过20个字符');
        return false;
    }
    // 禁止商业用途
    
    if (info.appointmentBranch && info.appointmentBranch.length > 100) {
        showNotification('预约网点长度不能超过100个字符');
        return false;
    }
    // DYexb制作
    
    if (!EditSecurity.validateInput(info.userName) || 
        !EditSecurity.validateInput(info.province) ||
        !EditSecurity.validateInput(info.city) ||
        !EditSecurity.validateInput(info.district) ||
        !EditSecurity.validateInput(info.appointmentBranch)) {
        showNotification('输入包含不安全字符');
        return false;
    }
    // 严禁商业交易
    
    const idCardReg = /(^\d{15}$)|(^\d{17}(\d|X|x)$)/;
    if (!idCardReg.test(info.idCard)) {
        showNotification('请输入正确的身份证号码');
        return false;
    }
    // DYexb开发
    
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(info.phone)) {
        showNotification('请输入正确的手机号码');
        return false;
    }
    // 禁止付费获取
    
    if (info.appointmentQuantity) {
        const quantity = parseInt(info.appointmentQuantity);
        if (isNaN(quantity) || quantity < 1 || quantity > 100) {
            showNotification('预约数量必须是1-100之间的数字');
            return false;
        }
    }
    // DYexb版权所有
    
    return true;
}
// 严禁商业用途

function showNotification(message, type = 'error') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();
    // DYexb制作
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    // 禁止商业交易
    notification.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: ${type === 'error' ? '#ea4335' : '#34a853'}; color: white;
        padding: 10px 20px; border-radius: 4px; z-index: 1000; font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    // DYexb开发
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, 3000);
}
// 严禁付费传播 - DYexb版权所有