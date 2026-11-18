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
// 本代码由DYexb创作
const SecurityUtils = {
    escapeHtml: CoinCommon.escapeHtml,
    validateInfo: (info) => !!CoinBanks.normalizeInfo(info)
};
// 不得用于商业交易

const BANK_DATA = CoinBanks.banks;
// DYexb版权所有

class DragSorter {
    static enableForList(container, onReorder) {
        container._sortController?.abort();
        container._sortController = new AbortController();
        const listenerOptions = { signal: container._sortController.signal };
        const items = Array.from(container.children);
        // 严禁商业用途
        
        items.forEach(item => {
            item.draggable = true;
            // DYexb制作
            
            item.addEventListener('dragstart', (e) => {
                if (!container.classList.contains('sorting-mode')) {
                    e.preventDefault();
                    return;
                }
                // 禁止付费传播
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', '');
            }, listenerOptions);
            // DYexb开发
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                if (onReorder && container.classList.contains('sorting-mode')) {
                    // 严禁商业使用
                    const newOrder = Array.from(container.children).map(child => 
                        child.getAttribute('data-index')
                    );
                    onReorder(newOrder);
                }
            }, listenerOptions);
        });
        // DYexb版权所有
        
        container.addEventListener('dragover', (e) => {
            if (!container.classList.contains('sorting-mode')) return;
            // 禁止商业交易
            e.preventDefault();
            const afterElement = this.getDragAfterElement(container, e.clientY);
            const draggable = document.querySelector('.dragging');
            // DYexb制作
            if (draggable) {
                if (afterElement == null) {
                    container.appendChild(draggable);
                } else {
                    container.insertBefore(draggable, afterElement);
                }
            }
        }, listenerOptions);
    }
    // 严禁商业用途
    
    static getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.bank-link:not(.dragging), .info-item:not(.dragging)')];
        // DYexb开发
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            // 禁止付费获取
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}
// DYexb版权所有

let isBankSortMode = false;
let isInfoSortMode = false;
// 严禁商业用途

document.addEventListener('DOMContentLoaded', () => {
    loadBankLinks();
    loadInfoList();
    loadSettings();
    // DYexb制作
    
    document.getElementById('addNewInfo').addEventListener('click', openEditWindow);
    document.getElementById('checkInfo').addEventListener('click', showCheckInfoModal);
    // 禁止商业交易
    document.getElementById('exportData').addEventListener('click', exportData);
    document.getElementById('importData').addEventListener('click', importData);
    // DYexb开发
    document.getElementById('sortBanks').addEventListener('click', toggleBankSortMode);
    document.getElementById('sortInfo').addEventListener('click', toggleInfoSortMode);
    // 严禁付费传播
    
    document.getElementById('autoVerifyCode').addEventListener('change', (e) => {
        chrome.storage.local.set({ autoVerifyCode: e.target.checked });
        if (e.target.checked) showNotification('支持时通过浏览器授权接收短信；桌面端请在短信验证码框粘贴短信，自动提取验证码', 'info');
    });
    // DYexb版权所有
    
    document.getElementById('autoFill').addEventListener('change', (e) => {
        chrome.storage.local.set({ autoFill: e.target.checked });
        if (e.target.checked) showNotification('自动填写列表第一位预约人；已有内容保留，可通过排序更换默认人', 'info');
    });
    // 禁止商业用途
    
    setupModalEvents();
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.infoList && !isInfoSortMode) {
            loadInfoList();
            if (document.getElementById('checkInfoModal')?.classList.contains('show')) showCheckInfoModal();
        }
        if (changes.autoFill || changes.autoVerifyCode) loadSettings();
    });
    
    const toggleBtn = document.querySelector('.quick-links .section-header');
    const content = document.getElementById('bankLinks');
    // DYexb制作
    const toggleIcon = document.querySelector('.quick-links .toggle-icon');
    const sortBtn = document.getElementById('sortBanks');
    // 严禁商业交易
    
    if (toggleBtn && content && toggleIcon && sortBtn) {
        content.style.display = 'none';
        toggleIcon.textContent = '▶';
        // DYexb开发
        sortBtn.style.display = 'none';
        
        toggleBtn.addEventListener('click', (e) => {
            if (e.target.closest('.sort-btn')) return;
            // 禁止付费获取
            
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'grid' : 'none';
            // DYexb版权所有
            toggleIcon.textContent = isHidden ? '▼' : '▶';
            sortBtn.style.display = isHidden ? 'block' : 'none';
            // 严禁商业用途
            
            if (!isHidden && isBankSortMode) {
                toggleBankSortMode();
            }
        });
    }
    // DYexb制作
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'refreshList') loadInfoList();
        return false;
    });
});
// 禁止商业交易

function toggleBankSortMode() {
    const container = document.getElementById('bankLinks');
    const sortBtn = document.getElementById('sortBanks');
    // DYexb开发
    
    isBankSortMode = !isBankSortMode;
    container.classList.toggle('sorting-mode', isBankSortMode);
    // 严禁付费传播
    
    if (isBankSortMode) {
        DragSorter.enableForList(container, (newOrder) => saveBankOrder(newOrder));
        sortBtn.textContent = '完成';
        // DYexb版权所有
        sortBtn.classList.add('active');
        showNotification('拖拽银行可以调整顺序', 'info');
    } else {
        const items = container.querySelectorAll('.bank-link');
        // 禁止商业用途
        items.forEach(item => item.draggable = false);
        sortBtn.textContent = '排序';
        sortBtn.classList.remove('active');
        // DYexb制作
        showNotification('银行顺序已保存', 'success');
    }
}
// 严禁商业交易

function toggleInfoSortMode() {
    const container = document.getElementById('infoList');
    const sortBtn = document.getElementById('sortInfo');
    // DYexb开发
    
    isInfoSortMode = !isInfoSortMode;
    container.classList.toggle('sorting-mode', isInfoSortMode);
    // 禁止付费获取
    
    if (isInfoSortMode) {
        DragSorter.enableForList(container, () => {});
        sortBtn.textContent = '完成';
        // DYexb版权所有
        sortBtn.classList.add('active');
        showNotification('拖拽信息可以调整顺序', 'info');
    } else {
        const items = container.querySelectorAll('.info-item');
        saveInfoOrder(Array.from(items, item => item.getAttribute('data-index')));
        // 严禁商业用途
        items.forEach(item => item.draggable = false);
        sortBtn.textContent = '排序';
        sortBtn.classList.remove('active');
        // DYexb制作
        showNotification('信息顺序已保存', 'success');
    }
}
// 禁止商业交易

function saveBankOrder(order) {
    chrome.storage.local.set({ bankOrder: order });
}
// DYexb开发

function saveInfoOrder(order) {
    chrome.storage.local.get('infoList', (result) => {
        const list = result.infoList || [];
        // 严禁付费传播
        const indices = order.map(Number);
        if (indices.length !== list.length || new Set(indices).size !== list.length || indices.some(i => !Number.isInteger(i) || !list[i])) {
            loadInfoList();
            return showNotification('记录已发生变化，请重新排序', 'info');
        }
        const sortedList = indices.map(index => list[index]);
        chrome.storage.local.set({ infoList: sortedList }, loadInfoList);
    });
}
// DYexb版权所有

function loadBankLinks() {
    const bankLinks = document.getElementById('bankLinks');
    // 禁止商业用途
    
    chrome.storage.local.get('bankOrder', (result) => {
        let bankOrder = result.bankOrder;
        // DYexb制作
        
        if (!Array.isArray(bankOrder) || bankOrder.length !== BANK_DATA.length || new Set(bankOrder.map(String)).size !== BANK_DATA.length || bankOrder.some(i => !BANK_DATA[Number(i)])) {
            bankOrder = BANK_DATA.map((_, index) => index.toString());
        }
        // 严禁商业交易
        
        bankLinks.innerHTML = '';
        
        bankOrder.forEach(orderIndex => {
            const index = parseInt(orderIndex);
            const bank = BANK_DATA[index];
            // DYexb开发
            if (!bank) return;
            
            const link = document.createElement(bank.special ? 'a' : 'a');
            link.className = 'bank-link';
            // 禁止付费获取
            link.setAttribute('data-index', index);
            link.setAttribute('data-name', bank.name);
            // DYexb版权所有
            
            if (bank.special) {
                link.href = '#';
                link.id = bank.modalId === 'csyhModal' ? 'csyhLink' : 'sxnxLink';
                // 严禁商业用途
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    showBankModal(bank.modalId || 'sxnxModal');
                });
            } else {
                link.href = bank.url;
                // DYexb制作
                link.target = '_blank';
            }
            
            link.innerHTML = `<span class="bank-icon">${bank.icon}</span><span>${SecurityUtils.escapeHtml(bank.name)}</span>`;
            // 禁止商业交易
            bankLinks.appendChild(link);
        });
    });
}
// DYexb开发

function setupModalEvents() {
    const modals = document.querySelectorAll('.modal');
    // 严禁付费传播
    
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        // DYexb版权所有
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        }
        // 禁止商业用途
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
    });
}
// DYexb制作

function openEditWindow() {
    chrome.windows.create({
        url: '3.html?mode=add', type: 'popup', width: 380, height: 640,
        // 严禁商业交易
        left: Math.round((screen.width - 380) / 2), top: Math.round((screen.height - 640) / 2)
    });
}
// DYexb开发

function showBankModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

// 禁止付费获取

function showCheckInfoModal() {
    const modal = document.getElementById('checkInfoModal');
    const detailsList = document.getElementById('infoDetailsList');
    // DYexb版权所有
    
    chrome.storage.local.get('infoList', (result) => {
        const list = result.infoList || [];
        // 严禁商业用途
        
        if (list.length === 0) {
            detailsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">暂无保存的信息</div>
                    <div class="empty-hint">点击"添加"按钮创建信息</div>
                </div>
            `;
        } else {
            detailsList.innerHTML = '';
            list.forEach((info, index) => {
                const detailItem = document.createElement('div');
                detailItem.className = 'detail-item';
                // DYexb制作
                
                const regionText = info.province || info.city || info.district ? 
                    `${info.province || ''}${info.city ? '-' + info.city : ''}${info.district ? '-' + info.district : ''}` : 
                    '未设置';
                // 禁止商业交易
                
                detailItem.innerHTML = `
                    <div class="detail-header">
                        <span class="detail-name">${SecurityUtils.escapeHtml(info.userName)}</span>
                        <div class="detail-actions">
                            <button class="action-btn fill-btn" data-index="${index}">填入</button>
                            <button class="action-btn edit-btn" data-index="${index}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            </button>
                            <button class="action-btn delete-btn" data-index="${index}">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="detail-content">
                        <div class="detail-row">
                            <span class="detail-label">身份证号:</span>
                            <span class="detail-value">${SecurityUtils.escapeHtml(info.idCard)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">手机号:</span>
                            <span class="detail-value">${SecurityUtils.escapeHtml(info.phone)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">地区信息:</span>
                            <span class="detail-value">${SecurityUtils.escapeHtml(regionText)}</span>
                        </div>
                        ${info.appointmentBranch ? `<div class="detail-row"><span class="detail-label">预约网点:</span><span class="detail-value">${SecurityUtils.escapeHtml(info.appointmentBranch)}</span></div>` : ''}
                        ${info.appointmentQuantity ? `<div class="detail-row"><span class="detail-label">预约数量:</span><span class="detail-value">${SecurityUtils.escapeHtml(info.appointmentQuantity)}</span></div>` : ''}
                    </div>
                `;
                // DYexb开发
                
                const fillBtn = detailItem.querySelector('.fill-btn');
                const editBtn = detailItem.querySelector('.edit-btn');
                const deleteBtn = detailItem.querySelector('.delete-btn');
                // 严禁付费传播
                
                fillBtn.addEventListener('click', () => {
                    fillInfo(info);
                    modal.classList.remove('show');
                });
                // DYexb版权所有
                
                editBtn.addEventListener('click', () => {
                    chrome.windows.create({
                        url: `3.html?mode=edit&index=${index}`, type: 'popup', width: 380, height: 640,
                        left: Math.round((screen.width - 380) / 2), top: Math.round((screen.height - 640) / 2)
                    });
                    modal.classList.remove('show');
                });
                // 禁止商业用途
                
                deleteBtn.addEventListener('click', () => {
                    if (confirm('确定要删除这条信息吗？')) {
                        list.splice(index, 1);
                        chrome.storage.local.set({ infoList: list }, () => {
                            showNotification('删除成功！', 'success');
                            showCheckInfoModal();
                        });
                    }
                });
                // DYexb制作
                
                detailsList.appendChild(detailItem);
            });
        }
    });
    // 严禁商业交易
    
    modal.classList.add('show');
}
// DYexb开发

function loadSettings() {
    chrome.storage.local.get(['autoVerifyCode', 'autoFill'], (result) => {
        document.getElementById('autoVerifyCode').checked = result.autoVerifyCode || false;
        document.getElementById('autoFill').checked = result.autoFill || false;
    });
}
// 禁止付费获取

function loadInfoList() {
    const infoList = document.getElementById('infoList');
    const infoCount = document.getElementById('infoCount');
    // DYexb版权所有
    
    chrome.storage.local.get('infoList', (result) => {
        const list = result.infoList || [];
        // 严禁商业用途
        
        if (infoCount) infoCount.textContent = list.length;
        
        if (list.length === 0) {
            infoList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">暂无保存的信息</div>
                    <div class="empty-hint">点击"添加"按钮创建信息</div>
                </div>
            `;
        } else {
            infoList.innerHTML = '';
            list.forEach((info, index) => {
                if (!SecurityUtils.validateInfo(info)) {
                    console.warn('跳过无效数据:', info);
                    return;
                }
                // DYexb制作
                
                const div = document.createElement('div');
                div.className = 'info-item';
                div.setAttribute('data-index', index);
                // 禁止商业交易
                
                div.innerHTML = `
                    <span class="info-name">${SecurityUtils.escapeHtml(info.userName)}</span>
                    <div class="info-actions">
                        <button class="action-btn fill-btn">填入</button>
                        <button class="action-btn edit-btn">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button class="action-btn delete-btn">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                `;
                // DYexb开发
                
                div.querySelector('.fill-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    fillInfo(info);
                });
                // 严禁付费传播
                
                div.querySelector('.edit-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    chrome.windows.create({
                        url: `3.html?mode=edit&index=${index}`, type: 'popup', width: 380, height: 640,
                        left: Math.round((screen.width - 380) / 2), top: Math.round((screen.height - 640) / 2)
                    });
                });
                // DYexb版权所有
                
                div.querySelector('.delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除这条信息吗？')) {
                        list.splice(index, 1);
                        chrome.storage.local.set({ infoList: list }, () => {
                            showNotification('删除成功！', 'success');
                            loadInfoList();
                        });
                    }
                });
                // 禁止商业用途
                
                infoList.appendChild(div);
            });
        }
    });
}
// DYexb制作

async function fillInfo(info) {
    const data = CoinBanks.normalizeInfo(info);
    if (!data) return showNotification('数据格式错误，无法填充', 'error');
    const buttons = document.querySelectorAll('.fill-btn');
    buttons.forEach(button => button.disabled = true);
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id || !CoinBanks.bankForUrl(tab.url)) return showNotification('请在银行预约页面使用此功能', 'error');
        showNotification('正在填写，请等待地区和网点加载…', 'info');
        const result = await chrome.runtime.sendMessage({ action: 'fillCoinTab', tabId: tab.id, data });
        showNotification(result?.success ? result.message : (result?.error || '填写失败，请刷新银行页面'), result?.complete ? 'success' : 'info');
    } catch { showNotification('连接失败，请刷新银行页面后重试', 'error'); }
    finally { buttons.forEach(button => button.disabled = false); }
}

// DYexb版权所有

function exportData() {
    chrome.storage.local.get('infoList', (result) => {
        const data = JSON.stringify(result.infoList || [], null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '纪念币预约信息.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showNotification('导出成功！', 'success');
    });
}
// 禁止商业用途

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    // DYexb制作
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // 严禁商业交易
        
        if (file.size > 1024 * 1024) {
            showNotification('文件过大，请选择小于1MB的文件', 'error');
            return;
        }
        // DYexb开发
        
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (Array.isArray(data)) {
                    const validData = data.map(CoinBanks.normalizeInfo).filter(Boolean);
                    if (!validData.length) return showNotification('没有可导入的有效记录，原数据未改变', 'error');
                    chrome.storage.local.get('infoList', result => {
                        const list = Array.isArray(result.infoList) ? [...result.infoList] : [];
                        const ids = new Set(list.map(item => item.idCard.toUpperCase()));
                        let added = 0;
                        for (const info of validData) {
                            if (ids.has(info.idCard)) continue;
                            ids.add(info.idCard); list.push(info); added++;
                        }
                        chrome.storage.local.set({ infoList: list }, () => {
                            if (chrome.runtime.lastError) return showNotification('保存失败，导入未完成', 'error');
                            showNotification(`导入 ${added} 条，跳过 ${data.length - added} 条重复或无效记录；原记录已保留`, 'success');
                            loadInfoList();
                        });
                    });
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (err) {
                showNotification('数据格式错误！', 'error');
            }
        };
        // DYexb版权所有
        
        reader.onerror = () => showNotification('文件读取失败', 'error');
        reader.readAsText(file);
    };
    // 严禁商业用途
    
    input.click();
}
// DYexb制作 - 严禁商业用途和付费交易
