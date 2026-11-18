/* Shared bank registry. Original extension copyright: DYexb / DINGYIerxiangbo. */
(() => {
    const banks = [
        { id: 'bocom', name: '交通银行', hosts: ['apply.95559.com.cn'], url: 'https://apply.95559.com.cn/personbank/commemorativeOrderCoins/index.html#/order' },
        { id: 'boc', name: '中国银行', hosts: ['cmcoins.boc.cn'], url: 'https://cmcoins.boc.cn/BOC15_CoinSeller/welcome.html', fields: { userName: ['#txtName'], idCard: ['#txtIdNo', '#saveCardNo'], phone: ['#txtMobile'] } },
        { id: 'abc', name: '农业银行', hosts: ['eapply.abchina.com'], url: 'https://eapply.abchina.com/coin/coin/CoinIssuesDistribution?typeid=202307' },
        { id: 'icbc', name: '工商银行', hosts: ['static.jnb.icbc.com.cn', 'jnb.icbc.com.cn'], url: 'https://static.jnb.icbc.com.cn/ICBC/ICBCCOIN/roccentryPC.html' },
        { id: 'ccb', name: '建设银行', hosts: ['ccb.com', 'www.ccb.com', 'jinianbi.ccb.com', 'jinianbi.ccb.cn'], url: 'https://ccb.com/cn/jnb/subject/index.html', fields: { userName: ['#USR_NM', '#CST_NM'], idCard: ['#CRDT_NO'], phone: ['#MBLPH_NO', '#MBL_NO'], province: ['#Prov_Cd'], city: ['#City_Cd'], district: ['#CntyAndDstc_Cd'], appointmentQuantity: ['#BOOKING_NUM'], appointmentBranch: ['#xzwd'] } },
        { id: 'hxb', name: '华夏银行', hosts: ['mcm.hxb.com.cn', 'jnb.hxb.com.cn'], url: 'https://mcm.hxb.com.cn/p/coin/coinHomeWeb.html?publish_channel_id=006', fields: { province: ['#province'], city: ['#city'], district: ['#area'] } },
        { id: 'psbc', name: '邮储银行', hosts: ['pbank.psbc.com'], url: 'https://pbank.psbc.com/perbank/commemorativeCoinMake.gate', fields: { userName: ['#oppAcNme'], idCard: ['#credNumTemp'], phone: ['#mblph_no'] } },
        { id: 'spdb', name: '浦发银行', hosts: ['wap0.spdb.com.cn'], url: 'https://wap0.spdb.com.cn/mspmk-cli-coinrsv/CoinHome' },
        { id: 'suzhou', name: '苏州银行', hosts: ['upbp.startbank.com.cn'], url: 'https://upbp.startbank.com.cn/rvccPC/JNB/index.html?channel=07#' },
        { id: 'hsbank', name: '徽商银行', hosts: ['wxyh.hsbank.cc', 'download.hsbank.cc'], url: 'https://wxyh.hsbank.cc:10443/indexpzbe4b4e59c217393025f434cf3efca9105.html?_ChannleId=GUANWANG&type=1234' },
        { id: 'csyh', name: '长沙银行', hosts: [], url: '#', special: true, modalId: 'csyhModal' },
        { id: 'sxnx', name: '陕西农信', hosts: [], url: '#', special: true, modalId: 'sxnxModal' }
    ].map(bank => ({ ...bank, icon: '🏦' }));
    const labels = { userName: '姓名', idCard: '身份证号', phone: '手机号', province: '省份', city: '城市', district: '区县', appointmentBranch: '预约网点', appointmentQuantity: '预约数量' };
    function bankForUrl(value) {
        try {
            const url = new URL(value);
            if (url.protocol !== 'https:' || url.username || url.password) return null;
            if (url.port && !(url.hostname === 'wxyh.hsbank.cc' && url.port === '10443')) return null;
            return banks.find(bank => bank.hosts.includes(url.hostname)) || null;
        } catch { return null; }
    }
    function normalizeInfo(info) {
        if (!info || typeof info !== 'object' || Array.isArray(info)) return null;
        const result = {};
        for (const key of Object.keys(labels)) {
            if (info[key] != null && typeof info[key] !== 'string') return null;
            result[key] = (info[key] || '').trim();
            const max = key === 'userName' ? 50 : key === 'appointmentBranch' ? 100 : 30;
            if (result[key].length > max || /[<>"'&\x00-\x1f]/.test(result[key])) return null;
        }
        result.idCard = result.idCard.toUpperCase();
        if (!result.userName || !/^(\d{15}|\d{17}[\dX])$/.test(result.idCard) || !/^1[3-9]\d{9}$/.test(result.phone)) return null;
        if (result.appointmentQuantity && !/^(?:[1-9]\d?|100)$/.test(result.appointmentQuantity)) return null;
        return result;
    }
    globalThis.CoinBanks = { banks, labels, bankForUrl, normalizeInfo };
})();
