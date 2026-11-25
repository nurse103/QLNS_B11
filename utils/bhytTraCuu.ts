/**
 * Tra cứu hạn thẻ BHYT trên Cổng BHXH Việt Nam.
 *
 * Trang BHXH chặn nhúng iframe (X-Frame-Options: SAMEORIGIN) và là trang khác tên miền,
 * nên app không điền trực tiếp được. Cách làm:
 *  1. App mở trang tra cứu trong cửa sổ nổi (giữ liên kết window.opener).
 *  2. Script tự điền chạy trên trang BHXH (userscript Tampermonkey hoặc bookmarklet)
 *     gửi tin "ready" về app.
 *  3. App trả lại mã thẻ, họ tên, ngày sinh qua postMessage, chỉ gửi tới đúng tên miền BHXH.
 *     Thông tin không đưa lên URL. Người dùng tự nhập mã xác nhận và bấm Tra cứu.
 */
export const TRA_CUU_BHYT_URL = 'https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thoi-han-su-dung-the-bhyt.aspx';
const BHXH_ORIGINS = ['https://baohiemxahoi.gov.vn', 'https://www.baohiemxahoi.gov.vn'];
const MSG_READY = 'qlns-bhyt-ready';
const MSG_FILL = 'qlns-bhyt-fill';

export interface TraCuuPayload {
    maThe: string;
    hoTen: string;
    ngaySinh: string; // dd/mm/yyyy hoặc yyyy
}

let pending: TraCuuPayload | null = null;
let listening = false;

const ensureListener = () => {
    if (listening) return;
    listening = true;
    window.addEventListener('message', (e: MessageEvent) => {
        if (!BHXH_ORIGINS.includes(e.origin)) return;
        if (e.data?.type !== MSG_READY || !pending || !e.source) return;
        (e.source as Window).postMessage({ type: MSG_FILL, ...pending }, e.origin);
    });
};

/** 'YYYY-MM-DD' → 'dd/mm/yyyy'; chỉ có năm → 'yyyy' */
export const ngaySinhTraCuu = (d?: string | null) => {
    const s = String(d ?? '').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return /^\d{4}$/.test(s) ? s : s;
};

/** Mở cửa sổ tra cứu; có payload thì chờ script trên trang BHXH xin dữ liệu để tự điền */
export const openTraCuuBhyt = (payload?: TraCuuPayload) => {
    ensureListener();
    pending = payload ?? null;
    if (payload?.maThe) navigator.clipboard?.writeText(payload.maThe).catch(() => { });

    const sw = window.screen.availWidth || window.outerWidth || 1280;
    const sh = window.screen.availHeight || window.outerHeight || 900;
    const w = Math.max(400, Math.min(1100, sw - 40));
    const h = Math.max(400, Math.min(850, sh - 60));
    const left = Math.max(0, Math.round((sw - w) / 2));
    const top = Math.max(0, Math.round((sh - h) / 2));
    const win = window.open(TRA_CUU_BHYT_URL, 'tra_cuu_bhyt', `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
    if (win) win.focus(); else window.open(TRA_CUU_BHYT_URL, '_blank');
};

/** Đoạn script chạy trên trang BHXH: báo "ready" cho app, nhận dữ liệu rồi điền vào form */
export const AUTOFILL_SOURCE = `(function(){
if(window.__qlnsBhyt){window.__qlnsBhyt();return;}
function fill(d){
 function set(id,v){var el=document.getElementById(id);if(!el||!v)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
 set('txtMaThe',d.maThe);set('txtHoTen',d.hoTen);set('txtNgaySinh',d.ngaySinh);
 var c=document.getElementById('tokenRecaptch');if(c){c.scrollIntoView({block:'center'});c.focus();}
}
window.addEventListener('message',function(e){var d=e.data;if(d&&d.type==='${MSG_FILL}')fill(d);});
window.__qlnsBhyt=function(){if(window.opener)window.opener.postMessage({type:'${MSG_READY}'},'*');else alert('Hãy mở trang này bằng nút "Kiểm tra hạn thẻ" trong phần mềm QLNS.');};
window.__qlnsBhyt();
})();`;

/** Bookmarklet: kéo lên thanh dấu trang, bấm khi đang ở trang tra cứu */
export const AUTOFILL_BOOKMARKLET = 'javascript:' + encodeURIComponent(AUTOFILL_SOURCE.replace(/\n/g, ''));
