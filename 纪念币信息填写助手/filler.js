/* DOM-only filling engine; never submits, requests SMS, or accepts agreements. */
(() => {
    const aliases = {
        userName: ['userName', 'username', 'custName', 'customerName', 'name', 'txtName', 'USR_NM', 'CST_NM', 'oppAcNme'],
        idCard: ['idCard', 'idcard', 'idCardNo', 'idNo', 'certNo', 'certificateNo', 'cardNo', 'saveCardNo', 'txtIdNo', 'CRDT_NO', 'sfzh', 'credNumTemp'],
        phone: ['phone', 'mobile', 'mobileNo', 'mobilePhone', 'phoneNo', 'tel', 'txtMobile', 'MBLPH_NO', 'MBL_NO', 'mblph_no', 'sjhm'],
        province: ['province', 'provinceCode', 'provinceName'],
        city: ['city', 'cityCode', 'cityName'],
        district: ['district', 'area', 'county', 'districtCode', 'areaCode'],
        appointmentBranch: ['appointmentBranch', 'branch', 'branchName', 'branchCode', 'outlet', 'outletName', 'orgName'],
        appointmentQuantity: ['appointmentQuantity', 'quantity', 'amount', 'coinNum', 'reserveNum', 'orderNum', 'bookNum']
    };
    const patterns = {
        userName: /姓名|预约人姓名|客户名称/,
        idCard: /身份证(?:号码|号)?|证件(?:号码|号)|证件编号/,
        phone: /手机(?:号码|号)?|联系电话|移动电话/,
        province: /省份|省市|选择省|所在省|所属省|^省$/,
        city: /地市|城市|选择市|所在市|所属市|^市$/,
        district: /区县|县区|所在区|选择区|选择县|所属区|^区$|^县$/,
        appointmentBranch: /预约网点|兑换网点|营业网点|选择网点|预约机构|兑换机构/,
        appointmentQuantity: /预约数量|兑换数量|预约枚数|预约张数|预约套数|预约数额/
    };
    const controls = 'input,select,textarea,[role="combobox"]';
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const clean = value => String(value || '').replace(/[\s*：:]/g, '');
    const regionName = value => clean(value).replace(/分行$/u, '').replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市)$/u, '');
    const abcDistrict = value => clean(value).replace(/(支行|分行|区|县)$/u, '');
    function visible(el) {
        if (!el || !el.isConnected || el.closest('[hidden],[aria-hidden="true"],[inert],.hidden-columns')) return false;
        for (let p = el; p; p = p.parentElement) {
            const style = p.ownerDocument.defaultView.getComputedStyle(p);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        }
        return el.getClientRects().length > 0;
    }
    function label(el) {
        const doc = el.ownerDocument;
        const associated = [...(el.labels || [])].map(x => x.textContent);
        // ABC renders one table row with parallel stacks of labels and inputs.
        const item = el.closest('.information-input');
        const cell = item?.closest('td');
        if (cell) {
            const inputs = [...cell.querySelectorAll('.information-input')];
            const titles = cell.parentElement.cells[0]?.querySelectorAll('.information-item');
            if (titles?.length === inputs.length) associated.push(titles[inputs.indexOf(item)]?.textContent || '');
        }
        for (const id of (el.getAttribute('aria-labelledby') || '').split(/\s+/)) {
            if (id) associated.push(doc.getElementById(id)?.textContent || '');
        }
        const container = el.closest('.el-form-item,.van-field,.v-input,.form-group,tr,li,.sn-ui-input-item-container');
        if (container) {
            associated.push(...[...container.querySelectorAll('label,.el-form-item__label,.van-field__label,.item-title')].map(x => x.textContent));
            if (container.classList.contains('sn-ui-input-item-container')) associated.push(container.textContent);
            if (container.tagName === 'TR' && !item) associated.push(container.cells[0]?.textContent || '');
        }
        // Only inspect a small row containing ONE control, never a whole form's text.
        let row = el.parentElement;
        for (let i = 0; row && i < 3; i++, row = row.parentElement) {
            if (row.querySelectorAll(controls).length !== 1) break;
            const text = row.textContent.replace(/\s+/g, '').trim();
            if (text && text.length < 60) associated.push(text);
        }
        return associated.join(' ');
    }
    function description(el) {
        return [el.id, el.getAttribute('name'), el.getAttribute('placeholder'), el.getAttribute('aria-label'), label(el)].filter(Boolean).join(' ');
    }
    function excluded(el) {
        return /验证码|校验码|动态码|密码|captcha|verify|verification|sms|otp|password|证件类型|证件种类|cardtype|idtype|certtype|银行卡|卡账号|代理人|代办人/i.test(description(el)) || /^(金额|面值)$/.test(clean(label(el)));
    }
    function candidates(doc, field, bank) {
        if (bank?.id === 'hsbank' && ['city', 'appointmentBranch'].includes(field)) {
            const el = doc.querySelector(field === 'city' ? 'input[placeholder="请选择分行"]' : 'input[placeholder="请选择支行"]');
            if (visible(el)) return { el };
        }
        if (bank?.id === 'abc' && ['province', 'city', 'district', 'appointmentBranch'].includes(field)) {
            const chain = [...doc.querySelectorAll('.el-table__body-wrapper input[placeholder="请选择兑换网点"]')].filter(visible);
            if (chain.length) {
                const el = chain[['province', 'city', 'district', 'appointmentBranch'].indexOf(field)];
                return el ? { el } : { status: 'missing' };
            }
        }
        if (bank?.id === 'boc' && ['province', 'city', 'district'].includes(field)) {
            const el = doc.querySelector({ province: '#sel_province', city: '#sel_city', district: '#sel_county_0826' }[field]);
            if (visible(el)) return { el };
        }
        if (bank?.id === 'psbc' && ['province', 'city', 'district', 'appointmentBranch'].includes(field)) {
            // 邮储用 div/span 伪下拉（.e-select-province / .e-select-city / .e-select-country）
            const map = {
                province: '.e-select-province',
                city: '.e-select-city',
                district: '.e-select-country',
                appointmentBranch: '.branch-select'
            };
            const el = doc.querySelector(map[field]);
            if (visible(el)) return { el };
        }
        if (bank?.id === 'hxb' && ['province', 'city', 'district'].includes(field)) {
            // 华夏新版（jnb.hxb.com.cn）用 Element Plus：同一行三个 .el-select.region-select，按顺序即省/市/区。
            // 内部 input 被 is-hidden 包着，Element Plus 只认 .el-select__wrapper 上的点击，所以返回 wrapper。
            const boxes = [...doc.querySelectorAll('.el-select.region-select')].filter(visible);
            if (boxes.length >= 3) {
                const box = boxes[['province', 'city', 'district'].indexOf(field)];
                if (!box) return { status: 'missing' };
                return { el: box.querySelector('.el-select__wrapper') || box };
            }
        }
        const scored = [];
        for (const el of doc.querySelectorAll(controls)) {
            if (!visible(el) || /^(hidden|password|checkbox|radio|button|submit|file|reset)$/i.test(el.type || '') || excluded(el)) continue;
            // 银行专属选择器命中时直接采纳，避免被“行文字里同时出现别的字段名”挡掉（如建行的省/市下拉）
            const explicit = (bank?.fields?.[field] || []).some(selector => el.matches(selector));
            if (!explicit) {
                const semantic = [el.getAttribute('placeholder'), el.getAttribute('aria-label'), label(el)].filter(Boolean).join(' ');
                const matchedFields = Object.keys(patterns).filter(key => patterns[key].test(semantic));
                if (matchedFields.length && !matchedFields.includes(field)) continue;
            }
            const semantic = [el.getAttribute('placeholder'), el.getAttribute('aria-label'), label(el)].filter(Boolean).join(' ');
            let score = explicit ? 100 : 0;
            if (aliases[field].some(name => [el.id, el.getAttribute('name')].some(v => v?.toLowerCase() === name.toLowerCase()))) score = Math.max(score, 80);
            if (patterns[field].test(semantic)) score = Math.max(score, 90);
            if (score) scored.push({ el, score });
        }
        scored.sort((a, b) => b.score - a.score);
        if (!scored.length) {
            // Element Plus：内部 input 被 is-hidden 包裹，用可见的 .el-select 容器兜底（点击要落在 wrapper 上）
            for (const box of doc.querySelectorAll('.el-select')) {
                if (!visible(box) || excluded(box)) continue;
                const semantic = [box.textContent, label(box)].filter(Boolean).join(' ');
                if (patterns[field].test(semantic)) {
                    const matchedFields = Object.keys(patterns).filter(key => patterns[key].test(semantic));
                    if (matchedFields.length && !matchedFields.includes(field)) continue;
                    return { el: box.querySelector('.el-select__wrapper') || box };
                }
            }
            return { status: 'missing' };
        }
        const best = scored.filter(x => x.score === scored[0].score);
        // A wrapper and its nested input are the same control.
        const leaves = best.filter(x => !best.some(y => x !== y && x.el.contains(y.el)));
        return leaves.length === 1 ? { el: leaves[0].el } : { status: 'ambiguous' };
    }
    function nativeSet(el, value) {
        const win = el.ownerDocument.defaultView;
        const prototype = el.tagName === 'SELECT' ? win.HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, value);
        for (const type of ['input', 'change', 'blur']) el.dispatchEvent(new win.Event(type, { bubbles: true }));
    }
    // 中行等页面用 <a href="javascript:...">，直接 .click() 会触发被 CSP 拦下的 javascript: 导航。
    // 去掉 href 再派发 click，只走页面自己的事件监听。
    function safeClick(el) {
        if (!el || typeof el.dispatchEvent !== 'function') return false;
        const doc = el.ownerDocument, win = doc.defaultView;
        const href = el.getAttribute && el.getAttribute('href');
        const isJavascript = !!href && /^\s*javascript:/i.test(href);
        if (isJavascript) el.removeAttribute('href');
        let ok = true;
        try {
            for (const type of ['mousedown', 'mouseup', 'click']) {
                el.dispatchEvent(new win.MouseEvent(type, { bubbles: true, cancelable: true, view: win }));
            }
        } catch (e) { ok = false; }
        if (isJavascript) el.setAttribute('href', href);
        return ok;
    }
    function matching(options, value, field) {
        const available = options.filter(o => !o.disabled && o.getAttribute('aria-disabled') !== 'true' && !o.classList.contains('is-disabled') && !o.closest('optgroup[disabled]') && clean(o.textContent) && !/^(请选择|选择|全部|不限|无$)/.test(clean(o.textContent)));
        let matches = available.filter(o => clean(o.textContent) === clean(value));
        if (!matches.length) matches = available.filter(o => o.value && String(o.value) === value);
        if (!matches.length && ['province', 'city'].includes(field)) matches = available.filter(o => regionName(o.textContent) === regionName(value));
        // 直辖市常见「天津市辖区」这类写法：去掉省/市后缀后互相包含也算唯一匹配
        if (!matches.length && ['province', 'city', 'district'].includes(field)) {
            const target = regionName(value);
            const fuzzy = available.filter(o => {
                const text = regionName(o.textContent);
                return target && text && (text.indexOf(target) !== -1 || target.indexOf(text) !== -1);
            });
            if (fuzzy.length === 1) matches = fuzzy;
        }
        if (!matches.length && field === 'district' && available[0]?.ownerDocument.location.hostname === 'eapply.abchina.com') matches = available.filter(o => abcDistrict(o.textContent) === abcDistrict(value));
        return matches.length === 1 ? matches[0] : null;
    }
    function isCustom(el) {
        // div/span 伪下拉（邮储 .e-select-*、.branch-select 等）也要走 customSelect
        if (!('value' in el) && el.tagName !== 'SELECT') return true;
        return el.classList.contains('sel') || el.getAttribute('role') === 'combobox' || el.hasAttribute('aria-controls') || !!el.closest('.el-select,.ant-select,.v-select');
    }
    function current(el) {
        if ('value' in el) {
            if (el.value) return el.value;
            // Element Plus 把选中文字放在 .el-select__selected-item，input 的 value 始终为空
            const sel = el.closest('.el-select');
            if (sel) {
                const shown = sel.querySelector('.el-select__selected-item')?.textContent.trim()
                    || sel.querySelector('.el-select__placeholder')?.textContent.trim() || '';
                if (shown) return shown;
            }
            return el.value;
        }
        return el.classList.contains('sel') ? el.querySelector('.title .txt')?.textContent.trim() || '' : el.textContent.trim();
    }
    function equals(el, value, field) {
        if (el.tagName === 'SELECT') return matching([...el.options], value, field)?.selected === true;
        const a = clean(current(el)), b = clean(value);
        if (field === 'city' && el.ownerDocument.location.hostname === 'wxyh.hsbank.cc') return regionName(a.replace(/^徽商银行/, '')) === regionName(b.replace(/^徽商银行/, ''));
        if (field === 'city' && el.ownerDocument.location.hostname === 'wap0.spdb.com.cn') return current(el).split(/[\s/\-，,]+/).some(part => regionName(part) === regionName(value));
        // 网点名称允许分隔符/前缀差异（如「武汉分行-某某支行」）
        if (field === 'appointmentBranch') {
            const na = clean(a).replace(/[-—–/\s]/g, ''), nb = clean(b).replace(/[-—–/\s]/g, '');
            if (na && nb && (na === nb || na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1)) return true;
        }
        // 直辖市「天津市辖区」这类写法：去掉省/市后缀后互相包含即视为一致
        if (['province', 'city', 'district'].includes(field)) {
            const ra = regionName(a), rb = regionName(b);
            if (ra && rb && (ra === rb || ra.indexOf(rb) !== -1 || rb.indexOf(ra) !== -1)) return true;
        }
        return a === b || (field === 'district' && el.ownerDocument.location.hostname === 'eapply.abchina.com' && abcDistrict(a) === abcDistrict(b));
    }
    async function customSelect(el, value, field, deadline, cancelled) {
        const doc = el.ownerDocument;
        if (el.classList.contains('sel')) {
            safeClick(el.querySelector('.title'));
            while (Date.now() < deadline && !cancelled()) {
                const option = matching([...el.querySelectorAll('ul.list > li')], value, field);
                if (option) { safeClick(option.querySelector('a') || option); await delay(100); return equals(el, value, field); }
                await delay(100);
            }
            return false;
        }
        const menuSelector = '[role="listbox"],.el-select-dropdown,.ant-select-dropdown,.v-menu__content,.e-select-list';
        const optionSelector = '[role="option"],.el-select-dropdown__item,.ant-select-item-option,.v-list-item,.e-select-list-item,.e-select-list li';
        const visibleMenus = () => [...doc.querySelectorAll(menuSelector)].filter(visible);
        const matchIn = menus => {
            for (const menu of menus) {
                const option = matching([...menu.querySelectorAll(optionSelector)].filter(visible), value, field);
                if (option) return option;
            }
            return null;
        };
        const box = el.closest('.el-select') || el;
        const target = box.querySelector('.el-select__wrapper') || el;
        const focusable = box.querySelector('input') || target;
        // 先关掉上一级残留的弹层，避免把上级菜单里的同名选项当成自己的（华夏省→市就会踩到）
        try {
            focusable.focus?.();
            focusable.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        } catch (e) { }
        await delay(80);
        const before = new Set(visibleMenus());
        target.click();
        let lastClick = Date.now();
        while (Date.now() < deadline && !cancelled()) {
            // 只认“点击之后新出现”的弹层
            const fresh = visibleMenus().filter(menu => !before.has(menu));
            const option = matchIn(fresh);
            if (option) { safeClick(option); await delay(80); return equals(el, value, field); }
            // 弹层没打开/被重绘关掉时，隔 600ms 再点一次
            if (!fresh.length && Date.now() - lastClick > 600) {
                target.click();
                lastClick = Date.now();
            }
            await delay(100);
        }
        try { focusable.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); } catch (e) { }
        return false;
    }
    async function spdbKeyboard(el, value, deadline, cancelled) {
        // The bank intentionally uses a readonly input with its own numeric keyboard.
        // Click that keyboard rather than remove readonly or modify framework internals.
        if (!/^[\dX]+$/.test(value)) return false;
        const doc = el.ownerDocument;
        const closeKeyboard = keyboard => keyboard.closest('.modal-content-index')?.parentElement.querySelector('.modal-backdrop:not(.modal-content-index)')?.click();
        for (const open of [...doc.querySelectorAll('.sn-keyboard')].filter(visible)) closeKeyboard(open);
        await delay(80);
        el.focus();
        el.click();
        await delay(100);
        const tap = key => {
            if (!key) return;
            // This bank binds numeric keys to touchstart/touchend, not click.
            key.dispatchEvent(new doc.defaultView.Event('touchstart', { bubbles: true, cancelable: true }));
            key.dispatchEvent(new doc.defaultView.Event('touchend', { bubbles: true, cancelable: true }));
        };
        let keyboard;
        while (Date.now() < deadline && !cancelled()) {
            const open = [...doc.querySelectorAll('.sn-keyboard')].filter(visible);
            keyboard = open.length === 1 ? open[0] : null;
            if (keyboard) break;
            await delay(80);
        }
        if (!keyboard) return false;
        const clearKey = [...keyboard.querySelectorAll('.sn-keyboard__btn')].find(e => e.textContent.trim() === '清空');
        if (current(el) && clearKey) { tap(clearKey); await delay(30); }
        for (let i = current(el).length; i > 0 && !cancelled(); i--) {
            tap(keyboard.querySelector('.sn-keyboard__btn--delete')); await delay(20);
        }
        if (current(el)) return false;
        for (const char of value) {
            if (cancelled()) return false;
            const keys = [...keyboard.querySelectorAll('.sn-keyboard__btn')].filter(e => e.textContent.trim() === char);
            if (keys.length !== 1) return false;
            tap(keys[0]); await delay(25);
        }
        // Close/confirm only this keyboard, never a form's confirmation button.
        const confirm = [...keyboard.querySelectorAll('.sn-keyboard__btn')].find(e => e.textContent.trim() === '确定');
        if (confirm) tap(confirm);
        closeKeyboard(keyboard);
        el.blur();
        await delay(80);
        return current(el) === value;
    }
    async function bocBranch(el, value, deadline, cancelled) {
        const doc = el.ownerDocument;
        if (!visible(doc.querySelector('#txtSearchName'))) {
            safeClick([...(el.closest('li')?.querySelectorAll('a') || [])].find(a => clean(a.textContent) === '选择网点'));
            await delay(200);
        }
        const search = doc.querySelector('#txtSearchName');
        if (!visible(search)) return false;
        nativeSet(search, value);
        safeClick(doc.querySelector('#btn_branch_name'));
        while (Date.now() < deadline && !cancelled()) {
            const rows = [...doc.querySelectorAll('tr')].filter(row => visible(row) && clean(row.cells[0]?.textContent) === clean(value));
            if (rows.length === 1) {
                const choice = [...rows[0].querySelectorAll('a,button')].find(a => clean(a.textContent) === '选择');
                if (choice) { safeClick(choice); await delay(100); return equals(el, value, 'appointmentBranch'); }
            }
            await delay(100);
        }
        return false;
    }
    async function wheelSelect(el, value, field, bank, data, deadline, cancelled) {
        const doc = el.ownerDocument, win = doc.defaultView;
        const hs = bank.id === 'hsbank';
        (hs ? el.parentElement : el).click();
        await delay(150);
        let picker;
        while (Date.now() < deadline && !cancelled()) {
            const open = [...doc.querySelectorAll(hs ? '.vue-picker' : '.sn-ui-picker-block,.sn-ui-slide-picker')].filter(visible);
            if (open.length === 1) { picker = open[0]; break; }
            await delay(80);
        }
        if (!picker) return false;
        const abort = () => { picker.querySelector(hs ? '.header .left .btn' : '.cancel-btn')?.click(); return false; };
        const lists = () => [...picker.querySelectorAll(hs ? '.list > ul' : '.content > div > ul')];
        const wanted = !hs && field === 'city' ? [data.province, value] : [value];
        if (lists().length !== wanted.length || wanted.some(x => !x)) return abort();
        for (let column = 0; column < wanted.length; column++) {
            if (cancelled()) return abort();
            const ul = lists()[column];
            const items = [...ul.children];
            const regionField = !hs && field === 'city' ? (column === 0 ? 'province' : 'city') : field;
            const target = hs && field === 'city'
                ? items.filter(x => regionName(clean(x.textContent).replace(/^徽商银行/, '')) === regionName(clean(value).replace(/^徽商银行/, '')))
                : [matching(items, wanted[column], regionField)].filter(Boolean);
            if (target.length !== 1) return abort();
            const height = parseFloat(win.getComputedStyle(target[0]).height) || target[0].getBoundingClientRect().height;
            const box = ul.parentElement;
            const y = new win.DOMMatrixReadOnly(win.getComputedStyle(ul).transform).m42;
            const desired = (box.clientHeight - height) / 2 - items.indexOf(target[0]) * height;
            if (!height || !Number.isFinite(desired)) return abort();
            if (hs) box.dispatchEvent(new win.WheelEvent('wheel', { deltaY: y - desired, bubbles: true, cancelable: true }));
            else {
                for (const [type, screenY] of [['mousedown', 500], ['mousemove', 500 + desired - y], ['mouseup', 500 + desired - y]]) {
                    box.dispatchEvent(new win.MouseEvent(type, { screenY, clientY: screenY, bubbles: true, cancelable: true }));
                }
            }
            await delay(hs ? 400 : 250);
            const actual = new win.DOMMatrixReadOnly(win.getComputedStyle(ul).transform).m42;
            if (Math.abs(actual - desired) > 2) return abort();
        }
        if (cancelled()) return abort();
        picker.querySelector(hs ? '.header .right .btn' : '.confirm-btn')?.click();
        await delay(150);
        return equals(el, value, field);
    }
    async function fill(data, options = {}) {
        const doc = options.document || document;
        const bank = CoinBanks.bankForUrl(doc.location.href);
        const normalized = CoinBanks.normalizeInfo(data);
        if (!bank || !normalized) return { success: false, error: !bank ? '当前页面不在银行白名单中' : '数据格式错误', filledFields: 0, fields: [] };
        const timeout = options.timeout ?? 3000;
        const cancelled = options.cancelled || (() => false);
        const fields = [];
        const used = new Set();
        const spdbCity = bank.id === 'spdb' && candidates(doc, 'city', bank).el;
        const spdbWheel = spdbCity?.readOnly && spdbCity.closest('.sn-ui-input-container');
        let dependencyFailed = false;
        // Region changes may reset the branch. Fill quantity only after selecting the branch.
        for (const field of Object.keys(CoinBanks.labels)) {
            const value = normalized[field];
            if (!value) continue;
            const result = { field, label: CoinBanks.labels[field], status: 'missing' };
            fields.push(result);
            if (cancelled()) { result.status = 'cancelled'; continue; }
            if (spdbWheel && ['province', 'district'].includes(field)) { result.status = 'not-applicable'; continue; }
            // These current bank forms do not expose province/district controls.
            if (bank.id === 'hsbank' && ['province', 'district'].includes(field) && !candidates(doc, field, bank).el) { result.status = 'not-applicable'; continue; }
            if (bank.id === 'boc' && ['province', 'city', 'district'].includes(field) && !visible(doc.querySelector('#sel_province'))) {
                const branch = doc.querySelector('#dept_name');
                const opener = [...(branch?.closest('li')?.querySelectorAll('a') || [])].find(a => clean(a.textContent) === '选择网点');
                if (opener && !(options.emptyOnly && branch.value)) { safeClick(opener); await delay(200); }
            }
            const dependent = ['province', 'city', 'district', 'appointmentBranch'].includes(field);
            if (dependent && dependencyFailed) { result.status = 'blocked'; continue; }
            const deadline = Date.now() + timeout;
            do {
                if (cancelled()) { result.status = 'cancelled'; break; }
                const found = candidates(doc, field, bank);
                if (!found.el) { result.status = found.status; if (found.status === 'ambiguous') break; }
                else {
                    const el = found.el;
                    if (used.has(el)) { result.status = 'ambiguous'; break; }
                    const provinceMatches = !spdbWheel || field !== 'city' || !normalized.province || current(el).split(/[\s/\-，,]+/).some(part => regionName(part) === regionName(normalized.province));
                    if (equals(el, value, field) && provinceMatches) { result.status = 'unchanged'; result.element = el; used.add(el); break; }
                    if (options.emptyOnly && current(el) && !/^请选择/.test(current(el)) && !(el.tagName === 'SELECT' && !el.selectedOptions[0]?.value)) { result.status = 'preserved'; break; }
                    if (bank.id === 'boc' && field === 'appointmentBranch' && el.id === 'dept_name') {
                        result.status = await bocBranch(el, value, deadline, cancelled) ? 'filled' : 'option-missing';
                        result.element = el; used.add(el); break;
                    } else if ((bank.id === 'hsbank' && /^请选择[分支]行$/.test(el.placeholder)) || (spdbWheel && ['city', 'appointmentBranch'].includes(field))) {
                        result.status = await wheelSelect(el, value, field, bank, normalized, deadline, cancelled) ? 'filled' : 'option-missing';
                        result.element = el; used.add(el); break;
                    } else if (el.disabled || el.getAttribute('aria-disabled') === 'true') result.status = 'disabled';
                    else if (el.tagName === 'SELECT') {
                        const option = matching([...el.options], value, field);
                        if (option) { nativeSet(el, option.value); result.status = 'filled'; result.element = el; used.add(el); break; }
                        result.status = 'option-missing';
                    } else if (isCustom(el)) {
                        result.status = await customSelect(el, value, field, deadline, cancelled) ? 'filled' : 'option-missing';
                        if (result.status === 'filled') { result.element = el; used.add(el); }
                        break;
                    } else if (bank.id === 'spdb' && el.readOnly && ['idCard', 'phone', 'appointmentQuantity'].includes(field) && el.closest('.sn-ui-input-container')) {
                        const max = el.placeholder.match(/最多(\d+)/)?.[1];
                        if (field === 'appointmentQuantity' && max && Number(value) > Number(max)) { result.status = 'invalid'; break; }
                        result.status = await spdbKeyboard(el, value, deadline, cancelled) ? 'filled' : 'rejected';
                        result.element = el; used.add(el); break;
                    } else if (el.readOnly || el.getAttribute('aria-readonly') === 'true' || !('value' in el)) { result.status = 'readonly'; break; }
                    else {
                        const number = Number(value);
                        if ((el.maxLength > 0 && value.length > el.maxLength) || (field === 'appointmentQuantity' && ((el.min && number < Number(el.min)) || (el.max && number > Number(el.max))))) { result.status = 'invalid'; break; }
                        nativeSet(el, value);
                        await delay(50);
                        result.status = equals(el, value, field) ? 'filled' : 'rejected';
                        result.element = el; used.add(el); break;
                    }
                }
                if (Date.now() >= deadline) break;
                await delay(100);
            } while (Date.now() <= deadline);
            if (dependent) {
                dependencyFailed = !['filled', 'unchanged'].includes(result.status);
                if (!dependencyFailed) await delay(150);
            }
        }
        await delay(120);
        for (const result of fields) {
            if (spdbWheel && result.field === 'province') {
                result.status = current(spdbCity).split(/[\s/\-，,]+/).some(part => regionName(part) === regionName(normalized.province)) ? 'unchanged' : 'blocked';
                continue;
            }
            if (['filled', 'unchanged'].includes(result.status)) {
                // 优先回读“当初实际填的那个控件”，避免页面重排后 candidates 变成 ambiguous 导致误判
                const latest = (result.element && result.element.isConnected) ? result.element : candidates(doc, result.field, bank).el;
                const bocClosedRegion = bank.id === 'boc' && ['province', 'city', 'district'].includes(result.field) && fields.some(x => x.field === 'appointmentBranch' && x.status === 'filled');
                if (!bocClosedRegion && (!latest || !equals(latest, normalized[result.field], result.field))) result.status = 'rejected';
            }
            delete result.element;
        }
        const completed = fields.filter(x => ['filled', 'unchanged'].includes(x.status));
        const missing = fields.filter(x => !['filled', 'unchanged', 'not-applicable'].includes(x.status));
        return { success: completed.length > 0, complete: missing.length === 0, filledFields: completed.length, fields, bank: bank.name,
            message: `已填写/确认 ${completed.length} 项` + (missing.length ? `；需手动检查：${missing.map(x => x.label).join('、')}` : '，请核对后手动提交'),
            error: completed.length ? undefined : '未找到可填写字段，请进入预约表单；检查页面加载、预约开放状态或手动选择网点' };
    }
    function isOtp(el) {
        return el?.matches?.('input') && visible(el) && !el.disabled && !el.readOnly && !/图形|图片|captcha|image/i.test(description(el)) && (el.autocomplete === 'one-time-code' || /短信验证码|手机验证码|动态码|smsCode|sms_code|otp/i.test(description(el)));
    }
    function extractOtp(text) {
        if (/^\s*\d{4,8}\s*$/.test(text)) return text.trim();
        const matches = [...String(text).matchAll(/(?:验证码|动态码|verification code|one.time code)[^\d]{0,12}(\d{4,8})(?!\d)/gi)];
        return matches.length === 1 ? matches[0][1] : null;
    }
    globalThis.CoinFiller = { fill, candidates, visible, nativeSet, isOtp, extractOtp };
})();
