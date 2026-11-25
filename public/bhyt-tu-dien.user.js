// ==UserScript==
// @name         QLNS – Tự điền tra cứu hạn thẻ BHYT
// @namespace    qlns-b11
// @version      1.0
// @description  Nhận mã thẻ, họ tên, ngày sinh từ phần mềm QLNS (nút "Kiểm tra hạn thẻ") và điền vào form tra cứu của BHXH. Người dùng tự nhập mã xác nhận.
// @match        https://baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thoi-han-su-dung-the-bhyt.aspx*
// @match        https://www.baohiemxahoi.gov.vn/tracuu/Pages/tra-cuu-thoi-han-su-dung-the-bhyt.aspx*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
// Giữ đồng bộ với AUTOFILL_SOURCE trong utils/bhytTraCuu.ts

(function () {
    if (!window.opener) return; // chỉ chạy khi trang được mở từ phần mềm QLNS
    function fill(d) {
        function set(id, v) {
            var el = document.getElementById(id);
            if (!el || !v) return;
            el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        set('txtMaThe', d.maThe);
        set('txtHoTen', d.hoTen);
        set('txtNgaySinh', d.ngaySinh);
        var c = document.getElementById('tokenRecaptch');
        if (c) { c.scrollIntoView({ block: 'center' }); c.focus(); }
    }
    window.addEventListener('message', function (e) {
        var d = e.data;
        if (d && d.type === 'qlns-bhyt-fill') fill(d);
    });
    window.__qlnsBhyt = function () { window.opener.postMessage({ type: 'qlns-bhyt-ready' }, '*'); };
    window.__qlnsBhyt();
})();
