import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getPartyDossier, PartyDossier, HUY_HIEU_DANG_MOC } from '../services/partyService';
import { exportPartyCard } from '../utils/partyCardExport';
import { Employee } from '../services/personnelService';
import { ArrowLeft, FileDown, Loader2, Pencil, Maximize2, Minimize2 } from 'lucide-react';

interface PartyCardPreviewProps {
    employee: Employee;
    canEdit: boolean;
    onClose: () => void;
    onEdit?: () => void;
}

// ------------------------------------------------------------- Helper dữ liệu
const val = (value?: string | number | null) => (value === null || value === undefined ? '' : String(value));

const fmtDate = (value?: string | null) => {
    if (!value) return '';
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : String(value);
};

const fmtMonthYear = (value?: string | null) => {
    if (!value) return '';
    const iso = String(value).match(/^(\d{4})-(\d{2})/);
    return iso ? `${iso[2]}/${iso[1]}` : String(value);
};

const DATE_SLOT = '...../...../.........';

// Kích thước trang A4 @96dpi - dùng để thu nhỏ vừa màn hình hẹp
const A4_WIDTH = 794; // 21cm
const A4_MIN_HEIGHT = 1123; // 29,7cm

// ------------------------------------------------------- Thành phần bố cục
/** Đường chấm kéo dài phần còn lại của dòng - giống dot leader trong Word. */
const Dots = () => (
    <span className="flex-1 self-end border-b border-dotted border-black mb-[5px] ml-1 min-w-[16px]" />
);

/** Một ô: có dữ liệu thì in chữ, chưa có thì kéo dòng chấm. */
const Slot = ({ text, filled }: { text: string; filled: boolean }) => (
    <>
        {text && <span className="whitespace-pre-wrap">{text}</span>}
        {!filled && <Dots />}
    </>
);

const slot = (value?: string | number | null) => {
    const text = val(value);
    return { text, filled: !!text };
};

const dateSlot = (value?: string | null) => {
    const d = fmtDate(value);
    return d ? { text: d, filled: true } : { text: DATE_SLOT, filled: false };
};

/** Dòng chỉ có 1 ô thông tin. */
const Line1 = ({ label, s, indent = 0 }: { label: string; s: ReturnType<typeof slot>; indent?: number }) => (
    <div className="flex items-baseline" style={{ paddingLeft: indent }}>
        <span className="shrink-0">{label}&nbsp;</span>
        <Slot {...s} />
    </div>
);

/** Dòng có 2 ô - ô thứ hai bắt đầu đúng giữa trang như bản Word. */
const Line2 = ({
    label1,
    s1,
    label2,
    s2,
    indent = 0,
    split = 0.5,
}: {
    label1: string;
    s1: ReturnType<typeof slot>;
    label2: string;
    s2: ReturnType<typeof slot>;
    indent?: number;
    split?: number;
}) => (
    <div className="flex items-baseline" style={{ paddingLeft: indent }}>
        <span className="flex items-baseline shrink-0" style={{ width: `${split * 100}%` }}>
            <span className="shrink-0">{label1}&nbsp;</span>
            <Slot {...s1} />
        </span>
        <span className="flex items-baseline flex-1">
            <span className="shrink-0">{label2}&nbsp;</span>
            <Slot {...s2} />
        </span>
    </div>
);

/** Nhãn một dòng, nội dung xuống dòng dưới - cho mục có nhãn dài (23, 25). */
const LineBlock = ({ label, s }: { label: string; s: ReturnType<typeof slot> }) => (
    <div>
        <p>{label}</p>
        {/* min-h: dòng chỉ chứa gạch chấm nên cần chiều cao tối thiểu để không sập về 0 */}
        <div className="flex items-baseline min-h-[1.42em]">
            {s.text && <span className="whitespace-pre-wrap">{s.text}</span>}
            {!s.filled && <Dots />}
        </div>
        {/* Chưa có dữ liệu thì chừa 2 dòng chấm như mẫu in sẵn */}
        {!s.filled && (
            <div className="flex items-baseline min-h-[1.42em]">
                <Dots />
            </div>
        )}
    </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="text-center font-bold mt-4 mb-1">{children}</p>
);

const Th = ({ children, w }: { children: React.ReactNode; w?: string }) => (
    <th className="border border-black px-1 py-1 text-center font-bold align-middle" style={{ width: w }}>
        {children}
    </th>
);

const Td = ({ children, center }: { children?: React.ReactNode; center?: boolean }) => (
    <td className={`border border-black px-1 py-1 align-top ${center ? 'text-center' : ''}`}>{children}</td>
);

// ------------------------------------------------------------------ Component
export const PartyCardPreview: React.FC<PartyCardPreviewProps> = ({ employee, canEdit, onClose, onEdit }) => {
    const [dossier, setDossier] = useState<PartyDossier | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    // Trên màn hình hẹp, trang A4 (794px) tràn ngang -> thu nhỏ cho vừa bề ngang
    const [availWidth, setAvailWidth] = useState(A4_WIDTH);
    const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
    // Bề rộng thật có thể lớn hơn khổ A4 nếu một bảng bên trong bị tràn
    const [pageSize, setPageSize] = useState({ w: A4_WIDTH, h: A4_MIN_HEIGHT });
    const areaRef = useRef<HTMLDivElement>(null);
    const pageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getPartyDossier(employee.id);
                if (!cancelled) setDossier(data);
            } catch (error) {
                console.error('Không tải được hồ sơ đảng viên:', error);
                alert('Không tải được hồ sơ đảng viên.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [employee.id]);

    // Bề ngang khả dụng của vùng xem (đã trừ padding)
    useEffect(() => {
        const el = areaRef.current;
        if (!el) return;
        const update = () => {
            const cs = getComputedStyle(el);
            const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            if (w > 0) setAvailWidth(w);
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Kích thước thật của trang (nội dung có thể dài/rộng hơn một trang A4)
    useEffect(() => {
        const el = pageRef.current;
        if (!el) return;
        const update = () =>
            setPageSize({ w: Math.max(A4_WIDTH, el.scrollWidth), h: Math.max(A4_MIN_HEIGHT, el.offsetHeight) });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [loading]);

    const handleExport = async () => {
        if (!dossier) return;
        setExporting(true);
        try {
            await exportPartyCard(dossier);
        } catch (error) {
            console.error(error);
            alert('Xuất file Word thất bại.');
        } finally {
            setExporting(false);
        }
    };

    const huyHieu = useMemo(() => new Set(dossier?.profile.huy_hieu_dang ?? []), [dossier]);

    const e = dossier?.employee ?? employee;
    const p = dossier?.profile ?? { dsnv_id: employee.id };

    // Tỉ lệ đang áp dụng cho trang A4
    const fitScale = Math.min(1, availWidth / pageSize.w);
    const scale = zoomMode === 'fit' ? fitScale : 1;

    const signDate = (() => {
        const m = String(p.ngay_khai ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `ngày ${m[3]} tháng ${m[2]} năm ${m[1]}` : 'ngày ...... tháng ...... năm 20......';
    })();

    return (
        /* Bố cục phẳng: nằm thẳng trong trang Quản lý Đảng viên, không phải popup */
        <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shadow-sm animate-fade-in">
            {/* Thanh công cụ - dính trên đầu khi cuộn trang */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0 shadow-sm sticky top-0 z-10">
                <div className="min-w-0 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
                        title="Quay lại danh sách"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="min-w-0">
                        <h2 className="font-bold text-slate-800 leading-tight truncate">
                            Xem trước phiếu đảng viên
                        </h2>
                        <p className="text-xs text-slate-500 truncate">
                            {e.ho_va_ten}
                            {e.chuc_vu ? ` — ${e.chuc_vu}` : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {fitScale < 1 && (
                        <button
                            onClick={() => setZoomMode(m => (m === 'fit' ? 'full' : 'fit'))}
                            className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 flex items-center gap-2"
                        >
                            {zoomMode === 'fit' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            <span>{zoomMode === 'fit' ? 'Cỡ thật' : 'Vừa màn hình'}</span>
                        </button>
                    )}
                    <button
                        onClick={handleExport}
                        disabled={loading || exporting}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
                    >
                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                        <span className="hidden sm:inline">Xuất lý lịch Word</span>
                        <span className="sm:hidden">Xuất</span>
                    </button>
                    {canEdit && onEdit && (
                        <button
                            onClick={onEdit}
                            className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                        >
                            <Pencil size={16} />
                            <span className="hidden sm:inline">Sửa phiếu</span>
                            <span className="sm:hidden">Sửa</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Trang A4 */}
            <div ref={areaRef} className="overflow-x-auto p-2 sm:p-4 md:p-8">
                {loading ? (
                    <div className="flex items-center justify-center h-40 text-slate-500 gap-2">
                        <Loader2 className="animate-spin" size={18} /> Đang tải hồ sơ...
                    </div>
                ) : (
                    <div
                        className="mx-auto"
                        style={{ width: pageSize.w * scale, height: pageSize.h * scale }}
                    >
                    <div
                        ref={pageRef}
                        className="bg-white shadow-2xl"
                        style={{
                            width: A4_WIDTH,
                            minHeight: A4_MIN_HEIGHT,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            padding: '87px 57px 76px 113px', // đúng lề 2,3 / 1,5 / 2,0 / 3,0 cm
                            fontFamily: '"Times New Roman", Times, serif',
                            fontSize: 16.5,
                            lineHeight: 1.42,
                            color: '#000',
                        }}
                    >
                        <p className="text-center font-bold underline" style={{ fontSize: 18.5 }}>
                            ĐẢNG CỘNG SẢN VIỆT NAM
                        </p>

                        {/* Khối đầu phiếu */}
                        <div className="flex mt-2" style={{ fontSize: 14.5 }}>
                            <div style={{ width: 222 }}>
                                <p>ĐẢNG BỘ TỈNH (tương đương):</p>
                                <p className="mt-1">ĐẢNG BỘ XÃ (tương đương):</p>
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold shrink-0" style={{ width: 155 }}>SỐ LÝ LỊCH:</span>
                                    <div className="flex">
                                        {Array.from({ length: 10 }, (_, i) => (
                                            <span
                                                key={i}
                                                className={`border border-black text-center ${i === 6 ? 'ml-3' : ''}`}
                                                style={{ width: 18, height: 22, lineHeight: '22px' }}
                                            >
                                                {val(p.so_ly_lich).replace(/\s/g, '')[i] ?? ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-bold shrink-0" style={{ width: 155 }}>SỐ THẺ ĐẢNG VIÊN:</span>
                                    <div className="flex">
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <span
                                                key={i}
                                                className="border border-black text-center"
                                                style={{ width: 18, height: 22, lineHeight: '22px' }}
                                            >
                                                {val(e.so_the_dang).replace(/\s/g, '')[i] ?? ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex mt-2">
                            <div style={{ width: 222, fontSize: 14.5 }}>
                                {[
                                    ['ĐẢNG BỘ CƠ SỞ:', p.dang_bo_chi_bo_co_so],
                                    ['ĐẢNG BỘ BỘ PHẬN:', p.dang_bo_bo_phan],
                                    ['CHI BỘ:', p.chi_bo],
                                ].map(([label, value]) => (
                                    <div key={label as string} className="mt-2">
                                        <p>{label}</p>
                                        {val(value) ? (
                                            <p className="font-bold">{val(value)}</p>
                                        ) : (
                                            <p className="border-b border-dotted border-black h-[18px]" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                                <p className="text-center font-bold leading-tight" style={{ fontSize: 27 }}>
                                    PHIẾU
                                    <br />
                                    ĐẢNG VIÊN
                                </p>
                            </div>
                            <div
                                className={`shrink-0 flex items-center justify-center ${e.avatar ? '' : 'border border-black'}`}
                                style={{ width: 113, height: 151 }}
                            >
                                {e.avatar ? (
                                    <img src={e.avatar} alt="Ảnh 3x4" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-center" style={{ fontSize: 13 }}>
                                        Ảnh
                                        <br />
                                        (3 x 4)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Mục 01 - 20 */}
                        <div className="mt-4 space-y-[3px]">
                            <Line2
                                label1="01) Họ và tên khai sinh:"
                                s1={slot(val(e.ho_va_ten).toUpperCase())}
                                label2="02) Giới tính (nam, nữ):"
                                s2={slot(e.gioi_tinh)}
                            />
                            <Line2 label1="03) Tên gọi khác:" s1={slot(p.ten_goi_khac)} label2="04) Sinh ngày:" s2={dateSlot(e.ngay_sinh)} />
                            <Line1 label="05) Nơi đăng ký khai sinh:" s={slot(p.noi_dang_ky_khai_sinh)} />
                            <Line1 label="06) Quê quán:" s={slot(e.que_quan)} />
                            <Line1 label="07) Nơi thường trú:" s={slot(e.noi_o_hien_nay)} />
                            <Line1 label="Nơi tạm trú:" s={slot(p.noi_tam_tru)} indent={28} />
                            <Line2 label1="08) Dân tộc:" s1={slot(p.dan_toc)} label2="09) Tôn giáo:" s2={slot(p.ton_giao)} />
                            <Line2 label1="10) Thành phần gia đình:" s1={slot(p.thanh_phan_gia_dinh)} label2="11) Nghề nghiệp hiện nay:" s2={slot(val(p.nghe_nghiep_hien_nay) || val(e.chuc_vu))} />
                            <Line2 label1="12) Ngày vào Đảng:" s1={dateSlot(e.ngay_vao_dang)} label2="Tại Chi bộ:" s2={slot(p.chi_bo_ket_nap)} />
                            <Line2 indent={28} label1="Người giới thiệu thứ 1:" s1={slot(p.nguoi_gioi_thieu_1)} label2="Chức vụ, đơn vị:" s2={slot(p.chuc_vu_nguoi_gt_1)} />
                            <Line2 indent={28} label1="Người giới thiệu thứ 2:" s1={slot(p.nguoi_gioi_thieu_2)} label2="Chức vụ, đơn vị:" s2={slot(p.chuc_vu_nguoi_gt_2)} />
                            <Line1 indent={28} label="Ngày cấp có thẩm quyền ra quyết định kết nạp:" s={dateSlot(p.ngay_qd_ket_nap)} />
                            <Line2 indent={28} label1="Ngày chính thức:" s1={dateSlot(e.ngay_chinh_thuc)} label2="Tại Chi bộ:" s2={slot(p.chi_bo_chinh_thuc)} />
                            <Line2 label1="13) Ngày được tuyển dụng:" s1={dateSlot(e.thang_nam_tuyen_dung)} label2="Cơ quan tuyển dụng:" s2={slot(p.co_quan_tuyen_dung)} />
                            <Line1 label="14) Ngày vào Đoàn TNCS Hồ Chí Minh:" s={dateSlot(p.ngay_vao_doan)} />
                            <Line1 label="15) Tham gia các tổ chức xã hội khác:" s={slot(p.to_chuc_xa_hoi_khac)} />
                            <Line2 label1="16) Ngày nhập ngũ:" s1={dateSlot(e.thang_nam_nhap_ngu)} label2="Ngày xuất ngũ, chuyển ngành:" s2={dateSlot(p.ngay_xuat_ngu)} />
                            <p>17) Trình độ hiện nay:</p>
                            <Line1 indent={28} label="- Giáo dục phổ thông:" s={slot(p.giao_duc_pho_thong)} />
                            <Line1 indent={28} label="- Chuyên môn, nghiệp vụ:" s={slot(p.chuyen_mon_nghiep_vu)} />
                            <Line2 indent={28} label1="- Học vị cao nhất:" s1={slot(p.hoc_vi)} label2="- Học hàm cao nhất:" s2={slot(p.hoc_ham)} />
                            <Line2 indent={28} label1="- Lý luận chính trị:" s1={slot(p.ly_luan_chinh_tri)} label2="- Ngoại ngữ:" s2={slot(p.ngoai_ngu)} />
                            <Line1 indent={28} label="- Tin học:" s={slot(p.tin_hoc)} />
                            <Line2 label1="18) Tình trạng sức khoẻ:" s1={slot(p.tinh_trang_suc_khoe)} label2="- Thương binh loại:" s2={slot(p.thuong_binh_loai)} />
                            <Line2 indent={28} label1="- Gia đình liệt sỹ:" s1={slot(p.gia_dinh_liet_sy)} label2="- Gia đình có công với CM:" s2={slot(p.gia_dinh_co_cong)} />
                            <Line2 split={0.385} label1="19) Số căn cước:" s1={slot(e.cccd)} label2="20) Miễn công tác và SHĐ ngày:" s2={dateSlot(p.ngay_mien_cong_tac_shd)} />
                        </div>

                        {/* Mục 21 */}
                        <SectionTitle>21) TÓM TẮT QUÁ TRÌNH HOẠT ĐỘNG VÀ CÔNG TÁC</SectionTitle>
                        <table className="w-full border-collapse" style={{ fontSize: 15 }}>
                            <thead>
                                <tr>
                                    <Th w="27%">Từ tháng, năm<br />đến tháng, năm</Th>
                                    <Th>
                                        Làm gì, chức vụ, đơn vị công tác
                                        <br />
                                        <i className="font-normal" style={{ fontSize: 13.5 }}>
                                            (Đảng, chính quyền, đoàn thể, kinh tế, văn hoá, xã hội...)
                                        </i>
                                    </Th>
                                </tr>
                            </thead>
                            <tbody>
                                {(dossier?.workHistory.length ? dossier.workHistory : [null]).map((w, i) => (
                                    <tr key={i}>
                                        <Td center>
                                            {w ? `${fmtMonthYear(w.tu_thang_nam) || '.......'} - ${fmtMonthYear(w.den_thang_nam) || 'nay'}` : <>&nbsp;</>}
                                        </Td>
                                        <Td>
                                            {w
                                                ? [
                                                      val(p.chuc_vu_dang) || (e.ngay_vao_dang || e.so_the_dang ? 'Đảng viên' : ''),
                                                      w.chuc_vu,
                                                      w.don_vi_cong_tac,
                                                  ]
                                                      .filter(Boolean)
                                                      .join('; ')
                                                : <>&nbsp;</>}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mục 22 */}
                        <SectionTitle>22) ĐÀO TẠO, BỒI DƯỠNG VỀ CHUYÊN MÔN, NGHIỆP VỤ, LÝ LUẬN CHÍNH TRỊ, NGOẠI NGỮ</SectionTitle>
                        <table className="w-full border-collapse" style={{ fontSize: 14.5 }}>
                            <thead>
                                <tr>
                                    <Th w="25%">Tên trường</Th>
                                    <Th w="25%">Ngành học hoặc tên lớp học</Th>
                                    <Th w="18%">Từ tháng/năm<br />đến tháng/năm</Th>
                                    <Th w="14%">Hình thức học</Th>
                                    <Th>Văn bằng, chứng chỉ,<br />trình độ gì</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {(dossier?.training.length ? dossier.training : [null]).map((t, i) => (
                                    <tr key={i}>
                                        <Td>{t ? val(t.ten_co_so_dao_tao) : <>&nbsp;</>}</Td>
                                        <Td>{t ? val(t.nganh_dao_tao) : <>&nbsp;</>}</Td>
                                        <Td center>
                                            {t ? `${fmtMonthYear(t.tu_thang_nam) || '.......'} - ${fmtMonthYear(t.den_thang_nam) || 'nay'}` : <>&nbsp;</>}
                                        </Td>
                                        <Td center>{t ? val(t.hinh_thuc_dao_tao) : <>&nbsp;</>}</Td>
                                        <Td>{t ? [t.trinh_do_dao_tao, t.xep_loai_tot_nghiep, t.ghi_chu].filter(Boolean).join(' - ') : <>&nbsp;</>}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mục 23 - 26 */}
                        <div className="mt-3 space-y-[3px]">
                            <LineBlock label="23) Khen thưởng (Huân chương, huy chương, bằng khen):" s={slot(p.khen_thuong)} />
                            <div className="flex items-baseline flex-wrap" style={{ fontSize: 15 }}>
                                <span className="shrink-0" style={{ fontSize: 16.5 }}>24) Đã được tặng HH Đảng:&nbsp;&nbsp;</span>
                                {HUY_HIEU_DANG_MOC.map(y => (
                                    <span key={y} className="mr-3 whitespace-nowrap">
                                        {huyHieu.has(y) ? '☒' : '☐'} {y} năm
                                    </span>
                                ))}
                            </div>
                            <LineBlock label='25) Danh hiệu được phong (chiến sĩ thi đua; anh hùng "LL vũ trang, lao động"; nhà giáo, nghệ sĩ, thầy thuốc "nhân dân, ưu tú"):' s={slot(p.danh_hieu_duoc_phong)} />
                            <Line1 label="26) Kỷ luật (Đảng, chính quyền, pháp luật):" s={slot(p.ky_luat)} />
                        </div>

                        {/* Mục 27 - 28 */}
                        <SectionTitle>27) ĐẶC ĐIỂM LỊCH SỬ BẢN THÂN</SectionTitle>
                        <div className="space-y-[3px]">
                            <p>a) Bị khai trừ hoặc xóa tên trong danh sách đảng viên hoặc xin ra khỏi Đảng:</p>
                            <Line2 indent={28} label1="Thời gian:" s1={slot(p.ls_khai_tru_thoi_gian)} label2="Tại Chi bộ:" s2={slot(p.ls_khai_tru_chi_bo)} />
                            <p>b) Được kết nạp lại vào Đảng:</p>
                            <Line2 indent={28} label1="- Ngày vào Đảng lần thứ 2:" s1={dateSlot(p.ngay_vao_dang_lan_2)} label2="Tại chi bộ:" s2={slot(p.chi_bo_ket_nap_lan_2)} />
                            <Line2 indent={28} label1="Người giới thiệu 1:" s1={slot(p.nguoi_gioi_thieu_1_lan_2)} label2="Chức vụ, đơn vị:" s2={slot(p.chuc_vu_nguoi_gt_1_lan_2)} />
                            <Line2 indent={28} label1="Người giới thiệu 2:" s1={slot(p.nguoi_gioi_thieu_2_lan_2)} label2="Chức vụ, đơn vị:" s2={slot(p.chuc_vu_nguoi_gt_2_lan_2)} />
                            <Line2 indent={28} label1="- Ngày chính thức lần thứ 2:" s1={dateSlot(p.ngay_chinh_thuc_lan_2)} label2="Tại chi bộ:" s2={slot(p.chi_bo_chinh_thuc_lan_2)} />
                            <Line2 label1="c) Ngày được khôi phục đảng tịch:" s1={dateSlot(p.ngay_khoi_phuc_dang_tich)} label2="Tại chi bộ:" s2={slot(p.chi_bo_khoi_phuc)} />
                            <Line1 label="d) Bị xử lý theo pháp luật (ngày, tháng, năm; chính quyền nào xử lý; hình thức xử lý, nơi thi hành án...):" s={slot(p.bi_xu_ly_phap_luat)} />
                            <Line1 label="e) Bản thân có làm việc trong chế độ cũ (ngày, tháng, năm; chức vụ; nơi làm việc...):" s={slot(p.lam_viec_che_do_cu)} />
                        </div>

                        <SectionTitle>28) QUAN HỆ VỚI NƯỚC NGOÀI</SectionTitle>
                        <div className="space-y-[3px]">
                            <Line1 label="a) Đã đi nước ngoài (nước nào, lý do, thời gian ra nước ngoài...):" s={slot(p.da_di_nuoc_ngoai)} />
                            <Line1 label="b) Tham gia hoặc có quan hệ với các tổ chức chính trị, kinh tế, xã hội nào ở nước ngoài:" s={slot(p.quan_he_to_chuc_nuoc_ngoai)} />
                            <Line1 label="c) Có người thân ở nước ngoài (tên người, quan hệ gì, ở nước nào ?):" s={slot(p.nguoi_than_nuoc_ngoai)} />
                        </div>

                        {/* Mục 29 */}
                        <SectionTitle>29) QUAN HỆ GIA ĐÌNH</SectionTitle>
                        <p className="text-center italic mb-1" style={{ fontSize: 15 }}>
                            Cha, mẹ đẻ; cha, mẹ vợ (chồng); vợ (chồng); các con; anh chị em ruột
                        </p>
                        <table className="w-full border-collapse" style={{ fontSize: 14.5 }}>
                            <thead>
                                <tr>
                                    <Th w="15%">Quan hệ</Th>
                                    <Th w="28%">HỌ VÀ TÊN</Th>
                                    <Th w="10%">Năm sinh</Th>
                                    <Th>Quê quán, nơi ở hiện nay (trong, ngoài nước),<br />nghề nghiệp, chức danh, chức vụ, đơn vị công tác</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {(dossier?.family.length ? dossier.family : [null]).map((f, i) => (
                                    <tr key={i}>
                                        <Td>{f ? val(f.moi_quan_he) : <>&nbsp;</>}</Td>
                                        <Td>{f ? val(f.ho_va_ten) : <>&nbsp;</>}</Td>
                                        <Td center>{f ? val(f.nam_sinh) : <>&nbsp;</>}</Td>
                                        <Td>
                                            {f
                                                ? [f.que_quan, f.noi_o_hien_nay, f.nghe_nghiep, f.chuc_vu_don_vi, f.ghi_chu]
                                                      .filter(Boolean)
                                                      .join('; ')
                                                : <>&nbsp;</>}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mục 30 */}
                        <SectionTitle>30) HOÀN CẢNH KINH TẾ CỦA BẢN THÂN VÀ GIA ĐÌNH</SectionTitle>
                        <div className="space-y-[3px]">
                            <p>
                                - Tổng thu nhập của hộ gia đình (trong 1 năm): {val(p.tong_thu_nhap) || '................'} đồng,
                                bình quân 1 người/hộ: {val(p.binh_quan_dau_nguoi) || '..............'} đồng
                            </p>
                            <p>
                                - Nhà ở: + Được cấp, được thuê, loại nhà {val(p.nha_duoc_cap_loai) || '..............'}, tổng
                                diện tích sử dụng {val(p.nha_duoc_cap_dien_tich) || '........'} m2
                            </p>
                            <p className="pl-[52px]">
                                + Nhà tự mua, tự xây, loại nhà {val(p.nha_tu_mua_loai) || '..............'}, tổng diện tích sử
                                dụng {val(p.nha_tu_mua_dien_tich) || '........'} m2
                            </p>
                            <p>
                                - Đất ở: + Đất được cấp: {val(p.dat_duoc_cap) || '............'} m2 &nbsp; + Đất tự mua:{' '}
                                {val(p.dat_tu_mua) || '............'} m2
                            </p>
                            <Line1 label="- Hoạt động kinh tế:" s={slot(p.hoat_dong_kinh_te)} />
                            <p className="pl-[28px]">
                                Diện tích đất kinh doanh trang trại {val(p.dien_tich_trang_trai) || '..........'} ha. Số lao
                                động thuê mướn {val(p.so_lao_dong_thue) || '........'} người
                            </p>
                            <p className="pl-[28px]">
                                Những tài sản có giá trị (50 triệu đồng trở lên): Tài sản:{' '}
                                {val(p.tai_san_gia_tri) || '....................'} Giá trị:{' '}
                                {val(p.gia_tri_tai_san) || '............'} đồng
                            </p>
                        </div>

                        {/* Khối ký */}
                        <div className="flex mt-8">
                            <div className="w-1/2 text-center">
                                <p className="italic">
                                    {val(p.noi_khai) || '.....................'}, {signDate}
                                </p>
                                <p className="font-bold mt-1">NGƯỜI KHAI</p>
                                <p className="italic" style={{ fontSize: 14.5 }}>
                                    Tôi xin cam đoan những lời khai trên đây là đúng sự thật
                                </p>
                                <p className="italic" style={{ fontSize: 14.5 }}>(Ký, ghi rõ họ tên)</p>
                                <p className="font-bold mt-16">{val(e.ho_va_ten).toUpperCase()}</p>
                            </div>
                            <div className="w-1/2 text-center">
                                <p className="font-bold mt-6">XÁC NHẬN CỦA CHI UỶ CHI BỘ</p>
                                <p className="italic" style={{ fontSize: 14.5 }}>(Chức vụ, ký, ghi rõ họ tên)</p>
                            </div>
                        </div>
                        <p className="text-center font-bold mt-10">XÁC NHẬN CỦA CẤP UỶ CƠ SỞ</p>
                        <p className="text-center italic" style={{ fontSize: 14.5 }}>
                            (Chức vụ, ký, đóng dấu, ghi rõ họ và tên)
                        </p>
                    </div>
                    </div>
                )}
            </div>
        </div>
    );
};
