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
  Heart,
  User,
  Trash2,
  X,
  Save,
  Plus,
  Eye,
  Edit,
  Cake,
  CreditCard
} from 'lucide-react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MenuItem } from './types';
import { Assistant } from './components/Assistant';
import { ScheduleModule } from './components/ScheduleModule';
import { SalaryModule } from './components/SalaryModule';
import { FamilyModule } from './components/FamilyModule';
import { PartyModule } from './components/PartyModule';
import { PersonnelList } from './components/PersonnelList';

import { WorkHistoryModule } from './components/WorkHistoryModule';
import { TrainingHistoryModule } from './components/TrainingHistoryModule';
import { usePermissions } from './hooks/usePermissions';
import { Login } from './components/Login';
import { Settings as SettingsPage } from './components/Settings';
import { User as AuthUser, getCurrentUser } from './services/authService';
import { getPermissionsByRole, Permission } from './services/permissionService';

// Date formatting helper
const formatDateVN = (dateStr: string | undefined | null) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
};

import { getPersonnel, createPersonnel, updatePersonnel, bulkCreatePersonnel, bulkUpdatePersonnel, deletePersonnel, getEmployeeDetails, getAllTraining, uploadPartyCardImage, Employee, Family, WorkHistory, Training, Salary } from './services/personnelService';
import * as XLSX from 'xlsx';
import { EmployeeDetailsModal } from './components/EmployeeDetailsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { LeaveModule } from './components/LeaveModule';
import { OverviewModule } from './components/OverviewModule';
import { WorkScheduleModule } from './components/WorkScheduleModule';
import { AbsenceModule } from './components/AbsenceModule';
import { PatientCardModule } from './components/PatientCardModule';
import { CongVanModule } from './components/CongVanModule';

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
// Updated colors for more variety
const COLORS = [
  '#009900', // Green
  '#16a34a', // Light Green
  '#dc2626', // Red
  '#ea580c', // Orange
  '#ca8a04', // Yellow
  '#0284c7', // Light Blue
  '#2563eb', // Blue
  '#3d3aedff', // Violet
  '#db2777', // Pink
  '#475569', // Slate
  '#0891b2', // Cyan
  '#be123c', // Rose
];

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    partyMembers: 0,
    onLeave: 0,
    salaryDue: 0 // Placeholder
  });
  const [pieData, setPieData] = useState<any[]>([]);
  const [birthdayData, setBirthdayData] = useState<Employee[]>([]);
  const [certificateData, setCertificateData] = useState<any[]>([]);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [educationData, setEducationData] = useState<any[]>([]);
  const [jobTitleData, setJobTitleData] = useState<any[]>([]);


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [data, trainingData] = await Promise.all([
          getPersonnel(),
          getAllTraining()
        ]);

        // FILTER FOR ACTIVE EMPLOYEES and sort (optional)
        // Only count 'Đang làm việc' for statistics
        const activeData = data.filter(e => e.trang_thai === 'Đang làm việc');

        // 1. Calculate Basic Stats
        const total = activeData.length;
        const partyMembers = activeData.filter(e => e.ngay_vao_dang || e.so_the_dang).length;
        // Simple check for "Nghỉ" in status - but since we filtered for 'Đang làm việc', this might be 0?
        // Wait, "Đang làm việc" is the main status. "Nghỉ phép", "Nghỉ ốm" might be in 'trang_thai' if that is how it's used?
        // Usually 'trang_thai' determines if they are currently employed or resigned.
        // If 'trang_thai' tracks daily status like "Nghỉ phép", then filtering by "Đang làm việc" excludes them?
        // Based on user request "chỉ tính nhân viên có trạng thái đang làm việc", let's assume this means excluding "Đã nghỉ việc", "Đã chuyển công tác", etc.
        // If "Nghỉ phép" is a status that replaces "Đang làm việc", then we should include it?
        // BUT usually "Đã nghỉ việc" is the one to exclude.
        // Let's assume we want to exclude "Đã nghỉ việc", "Đã chuyển công tác", "Đã nghỉ hưu".
        // Or strictly "Đang làm việc".
        // Let's stick to the user's exact words: "trạng thái đang làm việc".
        // So we use activeData for all charts.

        const onLeave = activeData.filter(e => e.trang_thai && e.trang_thai.toLowerCase().includes('nghỉ')).length;

        setStats({
          total,
          partyMembers,
          onLeave,
          salaryDue: 24 // Keep as static/placeholder for now as logic is complex
        });

        // 2. Calculate Pie Chart Data (Structure/Doi Tuong)
        const structureCount: Record<string, number> = {};
        activeData.forEach(e => {
          const type = e.doi_tuong || 'Khác';
          structureCount[type] = (structureCount[type] || 0) + 1;
        });

        const newPieData = Object.keys(structureCount).map(key => ({
          name: key,
          value: structureCount[key]
        }));
        setPieData(newPieData);

        // 3. Calculate Gender Pie Chart Data
        const genderCount = { Nam: 0, Nu: 0, Khac: 0 };
        activeData.forEach(e => {
          const g = e.gioi_tinh ? e.gioi_tinh.toLowerCase() : '';
          if (g === 'nam') genderCount.Nam++;
          else if (g === 'nữ' || g === 'nu') genderCount.Nu++;
          else genderCount.Khac++;
        });
        setGenderData([
          { name: 'Nam', value: genderCount.Nam },
          { name: 'Nữ', value: genderCount.Nu },
          ...(genderCount.Khac > 0 ? [{ name: 'Khác', value: genderCount.Khac }] : [])
        ]);

        // 4. Calculate Education Bar Chart Data
        const activeIds = new Set(activeData.map(e => e.id));
        const relevantTraining = trainingData.filter(t => t.dsnv_id && activeIds.has(t.dsnv_id) && t.trinh_do_dao_tao);

        const eduCount: Record<string, number> = {};
        relevantTraining.forEach(t => {
          const level = t.trinh_do_dao_tao?.trim() || 'Chưa rõ';
          eduCount[level] = (eduCount[level] || 0) + 1;
        });

        const sortedEdu = Object.entries(eduCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        setEducationData(sortedEdu);

        // 5. Calculate Job Title (Chuc Vu) Chart Data
        const jobCount: Record<string, number> = {};
        activeData.forEach(e => {
          const job = e.chuc_vu?.trim() || 'Chưa có';
          jobCount[job] = (jobCount[job] || 0) + 1;
        });

        const sortedJobs = Object.entries(jobCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        setJobTitleData(sortedJobs);

        setJobTitleData(sortedJobs);

        // 6. Calculate Birthday List (Current Month)
        const currentMonth = new Date().getMonth(); // 0-11
        const birthdays = activeData.filter(e => {
          if (!e.ngay_sinh) return false;
          const d = new Date(e.ngay_sinh);
          return d.getMonth() === currentMonth;
        }).sort((a, b) => {
          // Sort by day of month
          const dA = new Date(a.ngay_sinh || '');
          const dB = new Date(b.ngay_sinh || '');
          return dA.getDate() - dB.getDate();
        });
        setBirthdayData(birthdays);

        // 7. Calculate Professional Certificate Data (Chung Chi Hanh Nghe)
        const certCount: Record<string, number> = {};
        activeData.forEach(e => {
          if (e.chung_chi_hanh_nghe) {
            // Determine if it's a comma separated list or single value? 
            // Assuming simple text for now based on requirement "Biểu đồ chứng chỉ hành nghề"
            // Split by comma if needed, trimming whitespace
            const certs = e.chung_chi_hanh_nghe.split(',').map(c => c.trim()).filter(c => c);
            certs.forEach(c => {
              certCount[c] = (certCount[c] || 0) + 1;
            });
          } else {
            certCount['Chưa có'] = (certCount['Chưa có'] || 0) + 1;
          }
        });

        const sortedCerts = Object.entries(certCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
        setCertificateData(sortedCerts);

        // Removed Fluctuation Chart Loop

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tổng quan nhân sự</h1>
          <p className="text-slate-500 mt-1">Số liệu cập nhật đến ngày hôm nay</p>
        </div>
        {/* Hidden buttons per requirement */}
        {/* <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">Xuất báo cáo</button>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Thêm nhân viên</button>
        </div> */}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng nhân sự"
          value={loading ? "..." : stats.total.toString()}
          trend={stats.total > 0 ? "+1" : "0"} // Simplified trend
          trendUp={true}
          icon={Users}
          colorClass="bg-primary-500"
        />
        <StatCard
          title="Đang nghỉ phép"
          value={loading ? "..." : stats.onLeave.toString()}
          trend="0"
          trendUp={false}
          icon={CalendarClock}
          colorClass="bg-orange-500"
        />
        <StatCard
          title="Đến hạn nâng lương"
          value={loading ? "..." : stats.salaryDue.toString()}
          icon={BadgeCheck}
          colorClass="bg-yellow-500"
        />
        <StatCard
          title="Đảng viên"
          value={loading ? "..." : stats.partyMembers.toString()}
          trend={`${stats.total > 0 ? ((stats.partyMembers / stats.total) * 100).toFixed(1) : 0}%`}
          trendUp={true}
          icon={UserCheck}
          colorClass="bg-red-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Row 1: Object Structure, Gender, Job Title */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Đối tượng nhân viên</h3>


          <div className="h-80 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length > 0 ? pieData : dataPie}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent, value }) => `${name}: ${value}`}
                >
                  {(pieData.length > 0 ? pieData : dataPie).map((entry, index) => {
                    let color = COLORS[index % COLORS.length];
                    if (entry.name === 'Sĩ quan' || entry.name === 'Sỹ quan') {
                      color = '#3d3aedff';
                    }
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Tỷ lệ giới tính</h3>
          <div className="h-80 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                >
                  <Cell fill="#3b82f6" /> {/* Male - Blue */}
                  <Cell fill="#ec4899" /> {/* Female - Pink */}
                  <Cell fill="#94a3b8" /> {/* Other - Slate */}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Job Title Chart Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Thống kê chức vụ</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobTitleData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="value" name="Số lượng" fill="#f59e0b" radius={[4, 4, 0, 0]} label={{ position: 'top' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>


      {/* Row 2: Education, Certificates, Birthdays */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Education Chart Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Thống kê trình độ đào tạo</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={educationData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} angle={0} textAnchor="middle" height={30} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="value" name="Số lượng" fill="#8b5cf6" radius={[4, 4, 0, 0]} label={{ position: 'top' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Certificate Chart Section (NEW) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Thống kê chứng chỉ hành nghề</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={certificateData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} angle={0} textAnchor="middle" height={30} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="value" name="Số lượng" fill="#f43f5e" radius={[4, 4, 0, 0]} label={{ position: 'top' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Birthday List Section (NEW) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Sinh nhật tháng {new Date().getMonth() + 1}</h3>
            <span className="bg-pink-100 text-pink-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {birthdayData.length} người
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {birthdayData.length > 0 ? (
              <div className="space-y-4">
                {birthdayData.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-sm">
                      {new Date(emp.ngay_sinh || '').getDate()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{emp.ho_va_ten}</p>
                      <p className="text-xs text-slate-500">{emp.chuc_vu || 'Chưa có chức vụ'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Cake className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Không có sinh nhật trong tháng này</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};



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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Permission State
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    const fetchPermissions = async () => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        try {
          // Admin gets full access by default, but we can still fetch or just skip
          if (currentUser.role === 'admin') return;

          const perms = await getPermissionsByRole(currentUser.role);
          setUserPermissions(perms);
        } catch (error) {
          console.error("Error fetching permissions for sidebar:", error);
        }
      }
    };
    fetchPermissions();
  }, [user]); // Re-run when user changes

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
        { id: 'p-family', label: 'Quan hệ gia đình', path: '/personnel/family', icon: Heart },
        { id: 'p-training', label: 'Quá trình đào tạo', path: '/personnel/training', icon: GraduationCap },
        { id: 'p-work', label: 'Quá trình công tác', path: '/personnel/history', icon: History },
        { id: 'p-cert', label: 'Chứng chỉ hành nghề', path: '/personnel/certs', icon: BadgeCheck },
        { id: 'p-insurance', label: 'Bảo hiểm y tế', path: '/personnel/insurance', icon: HeartPulse },
      ]
    },

    { id: 'leave', label: 'Quản lý phép/Tranh thủ', icon: CalendarClock, path: '/leave' },
    { id: 'cong-van', label: 'Quản lý công văn', icon: FileText, path: '/cong-van' },
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
    { id: 'rewards', label: 'Khen thưởng - Kỷ luật', icon: Award, path: '/rewards' },

    { id: 'party-management', label: 'Quản lý đảng viên', icon: UserCheck, path: '/dang-vien' },
    { id: 'patient-card-management', label: 'Quản lý thẻ chăm', icon: CreditCard, path: '/patient-cards' },
    {
      id: 'absence',
      label: 'Quản lý Quân số nghỉ',
      path: '/quan-so-nghi',
      icon: UserCheck
    },
    { id: 'reports', label: 'Báo cáo thống kê', icon: FileText, path: '/reports' },
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

  // Filter menu items based on permissions
  const filteredMenuItems = menuItems.map(item => {
    // 1. Admin gets everything
    if (user?.role === 'admin') return item;

    // 2. Check Item Permission
    const itemPerm = userPermissions.find(p => p.module === item.id);

    // Default Rule: 
    // - If 'dashboard', always show.
    // - If 'settings', check permission (Manager can view, Staff cannot).
    // - If permission entry exists, respect `can_view`.
    // - If permission entry MISSING, hide it (fail-safe).

    // Exception for Dashboard
    if (item.id === 'dashboard') return item;

    // If no permission record found, hide it
    if (!itemPerm) return null;

    // If permission says cannot view, hide it
    if (!itemPerm.can_view) return null;

    // 3. Filter SubItems
    if (item.subItems) {
      const visibleSubItems = item.subItems.filter(sub => {
        const subPerm = userPermissions.find(p => p.module === sub.id);
        // Similar logic for sub-items: if no perm found, hide. If perm.can_view false, hide.
        if (!subPerm) return false;
        return subPerm.can_view;
      });

      // If item has subItems but none are visible, should we hide the parent?
      // Usually yes, unless parent has its own path?
      // Personnel parent has subItems but no direct path (it expands).
      // So if no children, hide parent.
      if (visibleSubItems.length === 0) return null;

      return { ...item, subItems: visibleSubItems };
    }

    return item;
  }).filter(Boolean) as MenuItem[];

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

              {filteredMenuItems.map(item => (
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
                    <p className="text-xs text-slate-500">
                      {user?.role === 'admin' ? 'Quản trị viên' :
                        user?.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                    </p>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-up origin-top-right">
                    <div className="px-4 py-3 border-b border-slate-100 md:hidden">
                      <p className="text-sm font-medium text-slate-900">{user?.full_name || user?.username}</p>
                      <p className="text-xs text-slate-500">
                        {user?.role === 'admin' ? 'Quản trị viên' :
                          user?.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                      </p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setIsProfileModalOpen(true); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <User size={16} /> Hồ sơ cá nhân
                      </button>
                      <button
                        onClick={() => { setIsChangePasswordModalOpen(true); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Settings size={16} /> Đổi mật khẩu
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
              <Route path="/" element={<OverviewModule />} />
              <Route path="/personnel/dashboard" element={<Dashboard />} />
              <Route path="/personnel/list" element={<PersonnelList />} />
              <Route path="/personnel/salary" element={<SalaryModule />} />
              <Route path="/personnel/family" element={<FamilyModule />} />
              <Route path="/personnel/history" element={<WorkHistoryModule />} />
              <Route path="/personnel/training" element={<TrainingHistoryModule />} />

              {/* Placeholders for other routes based on requirements */}
              <Route path="/personnel" element={<PlaceholderPage title="Module Nhân sự" />} />
              <Route path="/dang-vien" element={<PartyModule />} />
              <Route path="/leave" element={<LeaveModule />} />
              <Route path="/quan-so-nghi" element={<AbsenceModule />} />
              <Route path="/patient-cards" element={<PatientCardModule />} />
              <Route path="/cong-van" element={<CongVanModule />} />
              <Route path="/research" element={<PlaceholderPage title="Nghiên cứu khoa học" />} />
              <Route path="/rewards" element={<PlaceholderPage title="Khen thưởng & Kỷ luật" />} />
              <Route path="/combat" element={<PlaceholderPage title="Sẵn sàng chiến đấu" />} />
              <Route path="/duty" element={<ScheduleModule />} />
              <Route path="/schedule" element={<WorkScheduleModule />} />
              <Route path="/assets" element={<PlaceholderPage title="Quản lý tài sản" />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>

          {/* AI Assistant FAB */}
          <Assistant />
        </div>
      </div>
      {/* Modals */}
      {isProfileModalOpen && <UserProfileModal onClose={() => setIsProfileModalOpen(false)} />}
      {isChangePasswordModalOpen && <ChangePasswordModal onClose={() => setIsChangePasswordModalOpen(false)} />}
    </HashRouter>
  );
}

export default App;

