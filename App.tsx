import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  UserCheck,
  CalendarClock,
  FlaskConical,
  Award,
  ShieldAlert,
  CalendarDays,
  Briefcase,
  Settings,
  Menu,
  ChevronDown,
  ChevronRight,
  Bell,
  Search,
  LogOut,
  FileText,
  HeartPulse,
  GraduationCap,
  History,
  BadgeCheck,
  Baby,
  Activity,
  Package,
  Stethoscope,
  Monitor,
  BriefcaseMedical,
  Shirt,
  User,
  Trash2,
  X,
  Save,
  Plus,
  Eye,
  Edit
} from 'lucide-react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MenuItem } from './types';
import { Assistant } from './components/Assistant';
import { ScheduleModule } from './components/ScheduleModule';
import { Login } from './components/Login';
import { Settings as SettingsPage } from './components/Settings';
import { User as AuthUser } from './services/authService';
import { getPersonnel, createPersonnel, updatePersonnel, bulkCreatePersonnel, bulkUpdatePersonnel, deletePersonnel, getEmployeeDetails, Employee, Family, WorkHistory, Training, Salary } from './services/personnelService';
import * as XLSX from 'xlsx';
import { EmployeeDetailsModal } from './components/EmployeeDetailsModal';
import { LeaveModule } from './components/LeaveModule';

// Charts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { StatCard } from './components/StatCard';

// Mock Data
const dataBar = [
  { name: 'T1', employees: 400, hired: 24, left: 10 },
  { name: 'T2', employees: 414, hired: 18, left: 5 },
  { name: 'T3', employees: 427, hired: 20, left: 7 },
  { name: 'T4', employees: 440, hired: 25, left: 12 },
  { name: 'T5', employees: 453, hired: 15, left: 2 },
  { name: 'T6', employees: 466, hired: 30, left: 8 },
];

const dataPie = [
  { name: 'Chính thức', value: 400 },
  { name: 'Thử việc', value: 50 },
  { name: 'CTV', value: 30 },
  { name: 'Thực tập', value: 20 },
];
// Updated colors to match #009900 theme
const COLORS = ['#009900', '#16a34a', '#4ade80', '#cbd5e1'];

// --- Components ---

// Sidebar Item Component
const SidebarItem = ({
  item,
  level = 0,
  isOpen,
  setIsOpen,
  onClick
}: {
  item: MenuItem;
  level?: number;
  isOpen?: boolean;
  setIsOpen?: (val: boolean) => void;
  onClick?: () => void
}) => {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const isActive = location.pathname === item.path;
  const hasSubs = item.subItems && item.subItems.length > 0;

  // Auto-collapse submenus when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setExpanded(false);
    }
  }, [isOpen]);

  const handleClick = () => {
    // If sidebar is collapsed and item has subs, open sidebar first
    if (!isOpen && hasSubs && setIsOpen) {
      setIsOpen(true);
      setExpanded(true);
      return;
    }

    if (hasSubs) {
      setExpanded(!expanded);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div className="w-full">
      <Link
        to={item.path || '#'}
        onClick={(e) => {
          if (hasSubs) e.preventDefault();
          handleClick();
        }}
        title={!isOpen && level === 0 ? item.label : ''}
        className={`
          flex items-center 
          ${!isOpen && level === 0 ? 'justify-center px-2' : 'justify-between px-4'} 
          py-3 w-full transition-colors duration-200
          ${isActive && !hasSubs ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
          ${level > 0 ? 'pl-10 text-sm' : ''}
        `}
      >
        <div className={`flex items-center ${!isOpen && level === 0 ? '' : 'gap-3'}`}>
          {item.icon && <item.icon size={level === 0 ? 20 : 16} strokeWidth={1.5} />}
          <span className={!isOpen && level === 0 ? 'hidden' : 'block'}>{item.label}</span>
        </div>
        {hasSubs && (isOpen || level > 0) && (
          <div className="text-slate-400">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        )}
      </Link>
      {hasSubs && expanded && (
        <div className="bg-slate-900/50">
          {item.subItems!.map(sub => (
            <SidebarItem
              key={sub.id}
              item={sub}
              level={level + 1}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Pages
const Dashboard = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tổng quan nhân sự</h1>
          <p className="text-slate-500 mt-1">Số liệu cập nhật đến ngày hôm nay</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">Xuất báo cáo</button>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Thêm nhân viên</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng nhân sự" value="512" trend="+12%" trendUp={true} icon={Users} colorClass="bg-primary-500" />
        <StatCard title="Đang nghỉ phép" value="18" trend="-5%" trendUp={false} icon={CalendarClock} colorClass="bg-orange-500" />
        <StatCard title="Đến hạn nâng lương" value="24" icon={BadgeCheck} colorClass="bg-yellow-500" />
        <StatCard title="Đảng viên" value="86" trend="+2%" trendUp={true} icon={UserCheck} colorClass="bg-red-500" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Biến động nhân sự (6 tháng gần đây)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataBar} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Legend />
                <Bar dataKey="employees" name="Tổng NV" fill="#009900" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hired" name="Tuyển mới" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="left" name="Thôi việc" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Cơ cấu lao động</h3>
          <div className="h-80 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataPie}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};



const PersonnelList = () => {
  const [personnel, setPersonnel] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // View Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState<{
    employee: Employee;
    family: Family[];
    workHistory: WorkHistory[];
    training: Training[];
    salary: Salary[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState('general');
  const [filterType, setFilterType] = useState<string>('all');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkObject, setBulkObject] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [familyList, setFamilyList] = useState<Family[]>([]);
  const [workHistoryList, setWorkHistoryList] = useState<WorkHistory[]>([]);
  const [trainingList, setTrainingList] = useState<Training[]>([]);
  const [salaryList, setSalaryList] = useState<Salary[]>([]);

  // Temp State for adding new items to lists
  const [tempFamily, setTempFamily] = useState<Partial<Family>>({});
  const [tempWork, setTempWork] = useState<Partial<WorkHistory>>({});
  const [tempTraining, setTempTraining] = useState<Partial<Training>>({});
  const [tempSalary, setTempSalary] = useState<Partial<Salary>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getPersonnel();
      setPersonnel(data);
    } catch (error) {
      console.error("Failed to fetch personnel:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ho_va_ten) {
      alert("Vui lòng nhập họ và tên");
      return;
    }

    try {
      if (formData.id) {
        await updatePersonnel(formData.id, formData, familyList, workHistoryList, trainingList, salaryList);
        alert("Cập nhật nhân viên thành công!");
      } else {
        await createPersonnel(formData as any, familyList, workHistoryList, trainingList, salaryList);
        alert("Thêm nhân viên thành công!");
      }
      setIsModalOpen(false);
      // Reset all form state
      setFormData({});
      setFamilyList([]);
      setWorkHistoryList([]);
      setTrainingList([]);
      setSalaryList([]);
      setActiveTab('general');
      fetchData();
    } catch (error) {
      console.error("Failed to create personnel:", error);
      alert("Có lỗi xảy ra khi lưu nhân viên.");
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filteredPersonnel.map(emp => emp.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    if (!bulkStatus && !bulkObject) {
      alert("Vui lòng chọn trạng thái hoặc đối tượng để cập nhật.");
      return;
    }

    try {
      const updates: Partial<Employee> = {};
      if (bulkStatus) updates.trang_thai = bulkStatus;
      if (bulkObject) updates.doi_tuong = bulkObject;

      await bulkUpdatePersonnel(Array.from(selectedIds), updates);
      alert(`Đã cập nhật cho ${selectedIds.size} nhân viên!`);
      setIsBulkUpdateModalOpen(false);
      setSelectedIds(new Set());
      setBulkStatus('');
      setBulkObject('');
      fetchData();
    } catch (error) {
      console.error("Bulk update failed:", error);
      alert("Có lỗi xảy ra khi cập nhật.");
    }
  };

  const handleView = async (emp: Employee) => {
    try {
      const details = await getEmployeeDetails(emp.id);
      setViewData(details);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch details for view:", error);
      alert("Không thể tải thông tin chi tiết.");
      // Ensure we don't open the modal if fetch fails
      setIsViewModalOpen(false);
      setViewData(null);
    }
  };

  const handleEdit = async (emp: Employee) => {
    try {
      const details = await getEmployeeDetails(emp.id);
      setFormData(details.employee);
      setFamilyList(details.family || []);
      setWorkHistoryList(details.workHistory || []);
      setTrainingList(details.training || []);
      setSalaryList(details.salary || []);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch details:", error);
      alert("Không thể tải thông tin chi tiết.");
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa nhân viên này không? Hành động này không thể hoàn tác.")) {
      try {
        await deletePersonnel(id);
        alert("Đã xóa nhân viên thành công!");
        fetchData();
      } catch (error) {
        console.error("Failed to delete personnel:", error);
        alert("Có lỗi xảy ra khi xóa nhân viên.");
      }
    }
  };

  const addItem = (listName: string, item: any, setItem: any, setList: any) => {
    setList((prev: any) => [...prev, item]);
    setItem({});
  };

  const removeItem = (index: number, setList: any) => {
    setList((prev: any) => prev.filter((_: any, i: number) => i !== index));
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Họ và tên", "Ngày sinh", "Giới tính", "Cấp bậc", "Chức vụ", "CCCD", "Ngày cấp CCCD",
      "CMQĐ", "Ngày cấp CMQĐ", "Quê quán", "Nơi ở hiện nay", "Điện thoại",
      "Tháng năm tuyển dụng", "Tháng năm nhập ngũ", "Ngày về khoa", "Trạng thái",
      "Diện quản lý", "Ngày vào đảng", "Ngày chính thức", "Số thẻ đảng", "Ngày cấp thẻ đảng"
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Lieu");
    XLSX.writeFile(wb, "Mau_Nhap_Lieu_Nhan_Su.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      // Remove header row
      const rows = data.slice(1);

      // Helper to process excel dates
      const processDate = (value: any) => {
        if (!value) return null;
        if (typeof value === 'number') {
          // Excel date serial number
          const date = new Date((value - (25567 + 2)) * 86400 * 1000);
          return date.toISOString().split('T')[0];
        }
        if (typeof value === 'string') {
          // Handle DD/MM/YYYY
          if (value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const [d, m, y] = value.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
          // Try standard date parse
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          } catch (e) { }
        }
        return null;
      };

      const newEmployees: Omit<Employee, 'id' | 'created_at'>[] = rows.map(row => ({
        ho_va_ten: row[0],
        ngay_sinh: processDate(row[1]),
        gioi_tinh: row[2],
        cap_bac: row[3],
        chuc_vu: row[4],
        cccd: row[5] ? String(row[5]) : null,
        ngay_cap_cccd: processDate(row[6]),
        cmqd: row[7] ? String(row[7]) : null,
        ngay_cap_cmqd: processDate(row[8]),
        que_quan: row[9],
        noi_o_hien_nay: row[10],
        dien_thoai: row[11] ? String(row[11]) : null,
        thang_nam_tuyen_dung: processDate(row[12]),
        thang_nam_nhap_ngu: processDate(row[13]),
        ngay_ve_khoa_cong_tac: processDate(row[14]),
        trang_thai: row[15],
        dien_quan_ly: row[16],
        ngay_vao_dang: processDate(row[17]),
        ngay_chinh_thuc: processDate(row[18]),
        so_the_dang: row[19] ? String(row[19]) : null,
        ngay_cap_the_dang: processDate(row[20]),
        // Default null for others
        thang_nam_roi_khoa: null,
        trang_thai_roi_khoa: null,
        noi_den: null,
        avatar: null,
        ghi_chu: null,
        doi_tuong: null
      })).filter(e => e.ho_va_ten); // Ensure name exists

      if (newEmployees.length > 0) {
        try {
          await bulkCreatePersonnel(newEmployees);
          alert(`Đã nhập thành công ${newEmployees.length} nhân viên!`);
          fetchData();
        } catch (error: any) {
          console.error("Import failed:", error);
          alert(`Có lỗi xảy ra khi nhập dữ liệu: ${error.message || JSON.stringify(error)}`);
        }
      }
    };
    reader.readAsBinaryString(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  const filteredPersonnel = (personnel || []).filter(emp => {
    if (filterType === 'all') return true;
    return emp.doi_tuong === filterType;
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Danh sách nhân viên</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input type="text" placeholder="Tìm kiếm theo tên..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-2 ml-auto">
            {/* Import Buttons */}
            <div className="flex gap-2 mr-4">
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setIsBulkUpdateModalOpen(true)}
                  className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-2 animate-fade-in"
                >
                  <Edit size={16} /> Cập nhật ({selectedIds.size})
                </button>
              )}

              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                onClick={handleDownloadTemplate}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
              >
                <FileText size={16} /> Tải mẫu
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
              >
                <FileText size={16} /> Import Excel
              </button>
            </div>

            <button
              onClick={() => {
                setFormData({ trang_thai: 'Đang làm việc' });
                setIsModalOpen(true);
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
            >
              <Users size={16} /> Thêm mới
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="px-4 pb-4 flex gap-2">
          {['all', 'Sĩ quan', 'QNCN', 'LĐHĐ'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterType === type
                ? 'bg-green-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {type === 'all' ? 'Tất cả' : type}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#009900] text-white font-medium">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredPersonnel.length > 0 && selectedIds.size === filteredPersonnel.length}
                      className="rounded border-slate-300 transform scale-125 accent-green-600"
                    />
                  </th>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Họ và Tên</th>
                  <th className="px-6 py-3">Cấp bậc</th>
                  <th className="px-6 py-3">Chức vụ</th>
                  <th className="px-6 py-3">Đối tượng</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3">Ngày về khoa</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                      Chưa có dữ liệu phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((emp) => (
                    <tr key={emp.id} className={`hover:bg-slate-50 ${selectedIds.has(emp.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(emp.id)}
                          onChange={() => toggleSelection(emp.id)}
                          className="rounded border-slate-300 transform scale-125 accent-green-600"
                        />
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900">#{emp.id}</td>
                      <td className="px-6 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {emp.ho_va_ten ? emp.ho_va_ten.charAt(0).toUpperCase() : 'NV'}
                        </div>
                        <span>{emp.ho_va_ten}</span>
                      </td>
                      <td className="px-6 py-3">{emp.cap_bac}</td>
                      <td className="px-6 py-3">{emp.chuc_vu}</td>
                      <td className="px-6 py-3 text-slate-600">{emp.doi_tuong}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.trang_thai === 'Đang làm việc' ? 'bg-green-100 text-green-700' :
                          emp.trang_thai?.includes('Nghỉ') ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                          {emp.trang_thai || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-3">{emp.ngay_ve_khoa_cong_tac}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleView(emp)}
                            className="text-slate-600 hover:text-primary-600 font-medium flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded"
                            title="Xem chi tiết"
                          >
                            <Eye size={16} /> Xem
                          </button>
                          <button
                            onClick={() => handleEdit(emp)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded"
                            title="Chỉnh sửa"
                          >
                            <Edit size={16} /> Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded"
                            title="Xóa"
                          >
                            <Trash2 size={16} /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
          <span>{personnel.length > 0 ? `Hiển thị ${personnel.length} nhân viên` : 'Không có dữ liệu'}</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50">Trước</button>
            <button className="px-3 py-1 bg-primary-600 text-white rounded">1</button>
            <button className="px-3 py-1 border rounded hover:bg-slate-50">2</button>
            <button className="px-3 py-1 border rounded hover:bg-slate-50">Sau</button>
          </div>
        </div>
      </div >

      {/* Employee Details View Modal */}
      {
        isViewModalOpen && viewData && (
          <EmployeeDetailsModal
            employee={viewData.employee}
            family={viewData.family}
            workHistory={viewData.workHistory}
            training={viewData.training}
            salary={viewData.salary}
            onClose={() => setIsViewModalOpen(false)}
          />
        )
      }

      {/* Add New Employee Modal */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">{formData.id ? 'Cập nhật thông tin nhân viên' : 'Thêm nhân viên mới'}</h2>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setFormData({});
                  setFamilyList([]);
                  setWorkHistoryList([]);
                  setTrainingList([]);
                  setSalaryList([]);
                  setActiveTab('general');
                }} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              {/* Tabs Header */}
              <div className="flex border-b border-slate-200 mt-2 sticky top-[73px] bg-slate-50 z-10 px-6 pt-2">
                {[
                  { id: 'general', label: 'Thông tin chung', icon: User },
                  { id: 'family', label: 'Gia đình', icon: Baby },
                  { id: 'work', label: 'QT Công tác', icon: Briefcase },
                  { id: 'training', label: 'QT Đào tạo', icon: GraduationCap },
                  { id: 'salary', label: 'Lên lương/QH', icon: Activity },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                            px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
                            ${activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                        `}
                  >
                    <tab.icon size={16} /> {tab.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">

                {activeTab === 'general' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Group 1: Thông tin cơ bản */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                        Thông tin cơ bản
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Họ và tên <span className="text-red-500">*</span></label>
                          <input type="text" name="ho_va_ten" value={formData.ho_va_ten || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Ngày sinh</label>
                          <input type="date" name="ngay_sinh" value={formData.ngay_sinh || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Giới tính</label>
                          <select name="gioi_tinh" value={formData.gioi_tinh || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">Chọn giới tính</option>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Cấp bậc</label>
                          <input type="text" name="cap_bac" value={formData.cap_bac || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Chức vụ</label>
                          <input type="text" name="chuc_vu" value={formData.chuc_vu || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Đối tượng</label>
                          <select name="doi_tuong" value={formData.doi_tuong || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">Chọn đối tượng</option>
                            <option value="Sĩ quan">Sĩ quan</option>
                            <option value="QNCN">QNCN</option>
                            <option value="HSQ-CS">HSQ-CS</option>
                            <option value="CN & VCQP">CN & VCQP</option>
                            <option value="LĐHĐ">LĐHĐ</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Diện quản lý</label>
                          <select name="dien_quan_ly" value={formData.dien_quan_ly || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">Chọn diện quản lý</option>
                            <option value="Cán bộ">Cán bộ</option>
                            <option value="Quân lực">Quân lực</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
                          <input type="text" name="dien_thoai" value={formData.dien_thoai || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">CCCD</label>
                          <input type="text" name="cccd" value={formData.cccd || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                          <select name="trang_thai" value={formData.trang_thai || 'Đang làm việc'} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="Đang làm việc">Đang làm việc</option>
                            <option value="Nghỉ phép">Nghỉ phép</option>
                            <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 my-4"></div>

                    {/* Group 2: Thông tin đảng viên */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-red-600 rounded-full"></span>
                        Thông tin đảng viên
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Ngày vào Đảng</label>
                          <input type="date" name="ngay_vao_dang" value={formData.ngay_vao_dang || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Ngày chính thức</label>
                          <input type="date" name="ngay_chinh_thuc" value={formData.ngay_chinh_thuc || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Số thẻ Đảng</label>
                          <input type="text" name="so_the_dang" value={formData.so_the_dang || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Ngày cấp thẻ Đảng</label>
                          <input type="date" name="ngay_cap_the_dang" value={formData.ngay_cap_the_dang || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'family' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* List */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Danh sách thành viên ({familyList.length})</h4>
                      {familyList.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">Chưa có thông tin gia đình.</p>
                      ) : (
                        <div className="space-y-2">
                          {familyList.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-slate-100 shadow-sm">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{item.ho_va_ten} ({item.nam_sinh})</p>
                                <p className="text-xs text-slate-500">{item.moi_quan_he} - {item.nghe_nghiep}</p>
                              </div>
                              <button type="button" onClick={() => removeItem(idx, setFamilyList)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Form */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><h4 className="text-sm font-bold text-slate-800">Thêm thành viên mới</h4></div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Mối quan hệ</label>
                        <input type="text" value={tempFamily.moi_quan_he || ''} onChange={e => setTempFamily({ ...tempFamily, moi_quan_he: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Vợ/Con/Bố/Mẹ..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Họ và tên</label>
                        <input type="text" value={tempFamily.ho_va_ten || ''} onChange={e => setTempFamily({ ...tempFamily, ho_va_ten: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Năm sinh</label>
                        <input type="number" value={tempFamily.nam_sinh || ''} onChange={e => setTempFamily({ ...tempFamily, nam_sinh: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Nghề nghiệp</label>
                        <input type="text" value={tempFamily.nghe_nghiep || ''} onChange={e => setTempFamily({ ...tempFamily, nghe_nghiep: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">SĐT</label>
                        <input type="text" value={tempFamily.so_dien_thoai || ''} onChange={e => setTempFamily({ ...tempFamily, so_dien_thoai: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={() => addItem('family', tempFamily, setTempFamily, setFamilyList)}
                          disabled={!tempFamily.ho_va_ten || !tempFamily.moi_quan_he}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          <Plus size={16} /> Thêm vào danh sách
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'work' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* List */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Lịch sử công tác ({workHistoryList.length})</h4>
                      {workHistoryList.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">Chưa có thông tin công tác.</p>
                      ) : (
                        <div className="space-y-2">
                          {workHistoryList.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-slate-100 shadow-sm">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{item.tu_thang_nam} - {item.den_thang_nam}: {item.don_vi_cong_tac}</p>
                                <p className="text-xs text-slate-500">{item.chuc_vu} - {item.cap_bac}</p>
                              </div>
                              <button type="button" onClick={() => removeItem(idx, setWorkHistoryList)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Form */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><h4 className="text-sm font-bold text-slate-800">Thêm quá trình mới</h4></div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Từ thời gian</label>
                        <input type="date" value={tempWork.tu_thang_nam || ''} onChange={e => setTempWork({ ...tempWork, tu_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Đến thời gian</label>
                        <input type="date" value={tempWork.den_thang_nam || ''} onChange={e => setTempWork({ ...tempWork, den_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium text-slate-700">Đơn vị công tác</label>
                        <input type="text" value={tempWork.don_vi_cong_tac || ''} onChange={e => setTempWork({ ...tempWork, don_vi_cong_tac: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Cấp bậc</label>
                        <input type="text" value={tempWork.cap_bac || ''} onChange={e => setTempWork({ ...tempWork, cap_bac: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Chức vụ</label>
                        <input type="text" value={tempWork.chuc_vu || ''} onChange={e => setTempWork({ ...tempWork, chuc_vu: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={() => addItem('work', tempWork, setTempWork, setWorkHistoryList)}
                          disabled={!tempWork.don_vi_cong_tac}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          <Plus size={16} /> Thêm vào danh sách
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'training' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* List */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Lịch sử đào tạo ({trainingList.length})</h4>
                      {trainingList.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">Chưa có thông tin đào tạo.</p>
                      ) : (
                        <div className="space-y-2">
                          {trainingList.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-slate-100 shadow-sm">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{item.tu_thang_nam} - {item.den_thang_nam}: {item.ten_co_so_dao_tao}</p>
                                <p className="text-xs text-slate-500">{item.nganh_dao_tao} - {item.trinh_do_dao_tao}</p>
                              </div>
                              <button type="button" onClick={() => removeItem(idx, setTrainingList)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Form */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><h4 className="text-sm font-bold text-slate-800">Thêm quá trình đào tạo</h4></div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Từ thời gian</label>
                        <input type="date" value={tempTraining.tu_thang_nam || ''} onChange={e => setTempTraining({ ...tempTraining, tu_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Đến thời gian</label>
                        <input type="date" value={tempTraining.den_thang_nam || ''} onChange={e => setTempTraining({ ...tempTraining, den_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-sm font-medium text-slate-700">Cơ sở đào tạo</label>
                        <input type="text" value={tempTraining.ten_co_so_dao_tao || ''} onChange={e => setTempTraining({ ...tempTraining, ten_co_so_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Ngành đào tạo</label>
                        <input type="text" value={tempTraining.nganh_dao_tao || ''} onChange={e => setTempTraining({ ...tempTraining, nganh_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Trình độ</label>
                        <input type="text" value={tempTraining.trinh_do_dao_tao || ''} onChange={e => setTempTraining({ ...tempTraining, trinh_do_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={() => addItem('training', tempTraining, setTempTraining, setTrainingList)}
                          disabled={!tempTraining.ten_co_so_dao_tao}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          <Plus size={16} /> Thêm vào danh sách
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'salary' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* List */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Lịch sử lương/quân hàm ({salaryList.length})</h4>
                      {salaryList.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">Chưa có thông tin lương.</p>
                      ) : (
                        <div className="space-y-2">
                          {salaryList.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-slate-100 shadow-sm">
                              <div>
                                <p className="text-sm font-medium text-slate-800">{item.thang_nam_nhan}: {item.quan_ham} - {item.loai_nhom}</p>
                                <p className="text-xs text-slate-500">Hệ số: {item.he_so} - Bậc: {item.bac}</p>
                              </div>
                              <button type="button" onClick={() => removeItem(idx, setSalaryList)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Form */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><h4 className="text-sm font-bold text-slate-800">Thêm đợt nâng lương/quân hàm</h4></div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Thời gian nhận</label>
                        <input type="date" value={tempSalary.thang_nam_nhan || ''} onChange={e => setTempSalary({ ...tempSalary, thang_nam_nhan: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Quân hàm</label>
                        <input type="text" value={tempSalary.quan_ham || ''} onChange={e => setTempSalary({ ...tempSalary, quan_ham: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Loại nhóm</label>
                        <input type="text" value={tempSalary.loai_nhom || ''} onChange={e => setTempSalary({ ...tempSalary, loai_nhom: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Bậc</label>
                        <input type="text" value={tempSalary.bac || ''} onChange={e => setTempSalary({ ...tempSalary, bac: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Hệ số</label>
                        <input type="number" step="0.01" value={tempSalary.he_so || ''} onChange={e => setTempSalary({ ...tempSalary, he_so: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                      </div>
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={() => addItem('salary', tempSalary, setTempSalary, setSalaryList)}
                          disabled={!tempSalary.thang_nam_nhan}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          <Plus size={16} /> Thêm vào danh sách
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2">
                    <Save size={18} /> Lưu nhân viên
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      {/* Bulk Update Modal */}
      {isBulkUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-scale-in">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Cập nhật trạng thái hàng loạt</h3>
            <p className="text-slate-600 mb-6">Bạn đang chọn update cho <strong>{selectedIds.size}</strong> nhân viên.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Chọn trạng thái mới (để trống nếu không đổi)</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Không thay đổi --</option>
                  <option value="Đang làm việc">Đang làm việc</option>
                  <option value="Nghỉ phép">Nghỉ phép</option>
                  <option value="Đi học">Đi học</option>
                  <option value="Tranh thủ">Tranh thủ</option>
                  <option value="Bệnh nhân">Bệnh nhân</option>
                  <option value="Chờ hưu">Chờ hưu</option>
                  <option value="Nghỉ hưu">Nghỉ hưu</option>
                  <option value="Chuyển công tác">Chuyển công tác</option>
                  <option value="Phục viên/Xuất ngũ">Phục viên/Xuất ngũ</option>
                  <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Chọn đối tượng mới (để trống nếu không đổi)</label>
                <select
                  value={bulkObject}
                  onChange={(e) => setBulkObject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Không thay đổi --</option>
                  <option value="Sĩ quan">Sĩ quan</option>
                  <option value="QNCN">QNCN</option>
                  <option value="HSQ-CS">HSQ-CS</option>
                  <option value="CN & VCQP">CN & VCQP</option>
                  <option value="LĐHĐ">LĐHĐ</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBulkUpdate}
                  className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg flex items-center gap-2"
                >
                  <Save size={18} /> Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}


const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-6 flex flex-col items-center justify-center min-h-[500px] text-center">
    <div className="bg-slate-100 p-6 rounded-full mb-4">
      <Settings size={48} className="text-slate-400" />
    </div>
    <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
    <p className="text-slate-500 max-w-md">Chức năng này đang được phát triển. Bạn có thể sử dụng Trợ lý AI ở góc phải để hỏi thông tin liên quan đến module này.</p>
  </div>
);

// Main App Layout & Logic
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setUserMenuOpen(false);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      icon: Home,
      path: '/'
    },
    {
      id: 'personnel',
      label: 'Nhân sự',
      icon: Users,
      subItems: [
        { id: 'p-dashboard', label: 'Dashboard Nhân sự', path: '/personnel/dashboard', icon: Activity },
        { id: 'p-list', label: 'Danh sách nhân viên', path: '/personnel/list', icon: FileText },
        { id: 'p-salary', label: 'Lên lương', path: '/personnel/salary', icon: Users },
        { id: 'p-training', label: 'Quá trình đào tạo', path: '/personnel/training', icon: GraduationCap },
        { id: 'p-work', label: 'Quá trình công tác', path: '/personnel/history', icon: History },
        { id: 'p-cert', label: 'Chứng chỉ hành nghề', path: '/personnel/certs', icon: BadgeCheck },
        { id: 'p-family', label: 'Gia đình', path: '/personnel/family', icon: Baby },
        { id: 'p-insurance', label: 'Bảo hiểm y tế', path: '/personnel/insurance', icon: HeartPulse },
      ]
    },
    { id: 'party', label: 'Đảng viên', icon: UserCheck, path: '/party' },
    { id: 'leave', label: 'Quản lý phép/Tranh thủ', icon: CalendarClock, path: '/leave' },
    {
      id: 'research',
      label: 'Nghiên cứu khoa học',
      icon: FlaskConical,
      subItems: [
        { id: 'r-topics', label: 'Đề tài NCKH', path: '/research/topics', icon: FileText },
        { id: 'r-articles', label: 'Bài báo', path: '/research/articles', icon: FileText },
        { id: 'r-sports', label: 'Hội thao kỹ thuật', path: '/research/sports', icon: Award },
        { id: 'r-conference', label: 'Tham dự báo cáo', path: '/research/conference', icon: Users },
      ]
    },
    { id: 'rewards', label: 'Khen thưởng, kỷ luật', icon: Award, path: '/rewards' },
    { id: 'combat', label: 'Sẵn sàng chiến đấu', icon: ShieldAlert, path: '/combat' },
    { id: 'duty', label: 'Lịch trực', icon: CalendarClock, path: '/duty' },
    { id: 'schedule', label: 'Lịch công tác', icon: CalendarDays, path: '/schedule' },
    {
      id: 'assets',
      label: 'Quản lý tài sản',
      icon: Package,
      subItems: [
        { id: 'a-medical-equip', label: 'Thiết bị y tế', path: '/assets/medical-equipment', icon: Stethoscope },
        { id: 'a-it-equip', label: 'Thiết bị CNTT', path: '/assets/it-equipment', icon: Monitor },
        { id: 'a-medical-tools', label: 'Dụng cụ y tế', path: '/assets/medical-tools', icon: BriefcaseMedical },
        { id: 'a-uniforms', label: 'Quân trang, đồ vải', path: '/assets/uniforms', icon: Shirt },
      ]
    },
    { id: 'settings', label: 'Cài đặt', icon: Settings, path: '/settings' },
  ];

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
                ${sidebarOpen ? 'w-72' : 'w-0 lg:w-20'} 
                bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col z-20 shadow-xl
            `}
        >
          {/* Brand */}
          <div className={`h-16 flex items-center border-b border-slate-700 bg-slate-900 shrink-0 whitespace-nowrap overflow-hidden transition-all ${sidebarOpen ? 'px-6' : 'px-0 justify-center'}`}>
            <div className={`w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0 ${sidebarOpen ? 'mr-3' : ''}`}>
              <Briefcase className="text-white" size={20} />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-xl text-white animate-fade-in">
                HỒI SỨC NGOẠI
              </span>
            )}
          </div>

          {/* Menu */}
          <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
            <nav className="space-y-1">
              {menuItems.map(item => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isOpen={sidebarOpen}
                  setIsOpen={setSidebarOpen}
                  onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
                />
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {/* Header */}
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              >
                <Menu size={20} />
              </button>
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm nhanh..."
                  className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 w-64 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <div className="h-8 w-[1px] bg-slate-200"></div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 hover:bg-slate-100 p-2 rounded-lg transition-colors focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xs">
                    AD
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-slate-700">{user?.full_name || user?.username || 'Admin'}</p>
                    <p className="text-xs text-slate-500">{user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-up origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-100 md:hidden">
                      <p className="text-sm font-medium text-slate-900">Admin User</p>
                      <p className="text-xs text-slate-500">Quản trị viên</p>
                    </div>
                    <div className="py-1">
                      <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <User size={16} /> Hồ sơ cá nhân
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Settings size={16} /> Cài đặt tài khoản
                      </button>
                    </div>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <div className="py-1">
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <LogOut size={16} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto bg-slate-50 scrollbar-hide">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/personnel/dashboard" element={<Dashboard />} />
              <Route path="/personnel/list" element={<PersonnelList />} />

              {/* Placeholders for other routes based on requirements */}
              <Route path="/personnel" element={<PlaceholderPage title="Module Nhân sự" />} />
              <Route path="/party" element={<PlaceholderPage title="Quản lý Đảng viên" />} />
              <Route path="/leave" element={<LeaveModule />} />
              <Route path="/research" element={<PlaceholderPage title="Nghiên cứu khoa học" />} />
              <Route path="/rewards" element={<PlaceholderPage title="Khen thưởng & Kỷ luật" />} />
              <Route path="/combat" element={<PlaceholderPage title="Sẵn sàng chiến đấu" />} />
              <Route path="/duty" element={<PlaceholderPage title="Lịch trực" />} />
              <Route path="/schedule" element={<ScheduleModule />} />
              <Route path="/assets" element={<PlaceholderPage title="Quản lý tài sản" />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>

          {/* AI Assistant FAB */}
          <Assistant />
        </div>
      </div>
    </HashRouter>
  );
}

export default App;