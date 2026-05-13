
import React, { useState, useMemo, useEffect } from 'react';
import { User, Session } from '../types';
import { CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { Wifi, AlertTriangle, ShieldCheck, Activity, BellRing, X, UserCheck, Settings2, Filter, Eye, EyeOff } from 'lucide-react';

interface DashboardProps {
  users: User[];
  sessions: Session[];
  onUpdateStatus: (id: string, status: User['status']) => void;
  onUpdateLicenseType: (id: string, type: User['licenseType']) => void;
}

type ModalType = 'new' | 'online' | 'expired' | 'active' | null;
type TimeRange = 'week' | 'month' | 'year';
type MetricType = 'registrations' | 'expirations' | 'active_sessions';

interface DashboardConfig {
  visibleCharts: {
    trend: boolean;
    distribution: boolean;
  };
  mainMetric: MetricType;
}

export const Dashboard: React.FC<DashboardProps> = ({ users = [], sessions = [], onUpdateStatus, onUpdateLicenseType }) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Load config from localStorage
  const [config, setConfig] = useState<DashboardConfig>(() => {
    const saved = localStorage.getItem('dashboard_config');
    return saved ? JSON.parse(saved) : {
      visibleCharts: { trend: true, distribution: true },
      mainMetric: 'registrations'
    };
  });

  useEffect(() => {
    localStorage.setItem('dashboard_config', JSON.stringify(config));
  }, [config]);

  const safeUsers = Array.isArray(users) ? users : [];
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  const onHoldUsers = safeUsers.filter(u => u.status === 'on_hold');
  const onlineSessions = safeSessions;
  const expiredUsers = safeUsers.filter(u => u.status === 'expired');
  const activeUsers = safeUsers.filter(u => u.status === 'active');

  // Logic xử lý dữ liệu biểu đồ theo Metric và TimeRange
  const chartData = useMemo(() => {
    const now = new Date();
    const dataMap: Record<string, number> = {};
    
    // Khởi tạo các mốc thời gian
    if (timeRange === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dataMap[d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })] = 0;
      }
    } else if (timeRange === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        dataMap[d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })] = 0;
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        dataMap[d.toLocaleDateString('vi-VN', { month: 'short' })] = 0;
      }
    }

    // Điền dữ liệu dựa trên Metric được chọn
    const dataSource = config.mainMetric === 'expirations' ? safeUsers : 
                       config.mainMetric === 'active_sessions' ? safeSessions : safeUsers;

    dataSource.forEach((item: any) => {
      let dateRaw = item.lastLogin || item.loginTime || item.expirationDate || Date.now();
      const date = new Date(dateRaw);
      
      let key = "";
      if (timeRange === 'year') {
        key = date.toLocaleDateString('vi-VN', { month: 'short' });
      } else {
        key = date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
      }
      
      if (dataMap[key] !== undefined) {
        // Nếu là 'expirations', chỉ đếm những user có trạng thái expired hoặc sắp hết hạn
        if (config.mainMetric === 'expirations' && item.status !== 'expired') return;
        dataMap[key]++;
      }
    });

    return Object.entries(dataMap).map(([name, count]) => ({ name, count }));
  }, [safeUsers, safeSessions, timeRange, config.mainMetric]);

  const licenseTypeData = [
    { name: 'Subscription', value: safeUsers.filter(u => u.licenseType === 'subscription').length },
    { name: 'Perpetual', value: safeUsers.filter(u => u.licenseType === 'perpetual').length },
    { name: 'Trial', value: safeUsers.filter(u => u.licenseType === 'trial').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#8b5cf6', '#64748b'];

  const getMetricLabel = () => {
    switch(config.mainMetric) {
      case 'registrations': return 'Đăng ký mới';
      case 'expirations': return 'Lượt hết hạn';
      case 'active_sessions': return 'Phiên hoạt động';
      default: return 'Dữ liệu';
    }
  };

  const StatCard = ({ title, value, subValue, icon: Icon, color, bg, highlight, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`w-full text-left bg-white p-6 rounded-2xl shadow-sm border ${highlight ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100'} flex items-start justify-between hover:shadow-lg hover:border-blue-300 transition-all hover:-translate-y-1 active:scale-95 group relative`}
    >
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1 group-hover:text-blue-600 transition-colors">{title}</p>
        <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
            {subValue && <span className={`text-xs font-medium ${highlight ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`}>{subValue}</span>}
        </div>
      </div>
      <div className={`p-3 rounded-xl transition-colors ${bg} group-hover:bg-opacity-80`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </button>
  );

  // Added missing renderModalContent function
  const renderModalContent = () => {
    if (activeModal === 'new') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <BellRing className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-slate-800">Yêu cầu kích hoạt mới</h3>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
            {onHoldUsers.map(user => (
              <div key={user.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-center group">
                <div>
                  <div className="font-bold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                  <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{user.company}</div>
                </div>
                <button 
                  onClick={() => {
                    onUpdateStatus(user.id, 'active');
                    setActiveModal(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                  Kích hoạt
                </button>
              </div>
            ))}
            {onHoldUsers.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Không có yêu cầu nào đang chờ.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeModal === 'active') {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold text-slate-800">Người dùng hoạt động</h3>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
            {activeUsers.map(user => (
              <div key={user.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                    user.licenseType === 'subscription' ? 'bg-blue-100 text-blue-700' : 
                    user.licenseType === 'perpetual' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {user.licenseType}
                  </span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  Hạn dùng: {user.expirationDate}
                </div>
              </div>
            ))}
            {activeUsers.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <p>Chưa có người dùng hoạt động.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Dashboard Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Tùy chỉnh Dashboard</h2>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setIsEditMode(!isEditMode)}
             className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isEditMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
             {isEditMode ? <ShieldCheck className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
             {isEditMode ? 'Hoàn tất' : 'Chỉnh sửa'}
           </button>
        </div>
      </div>

      {/* Edit Mode Panel */}
      {isEditMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-blue-50/50 p-6 rounded-2xl border border-dashed border-blue-200 animate-in slide-in-from-top-4">
          <div className="space-y-3">
             <label className="text-xs font-bold text-blue-600 uppercase">Hiển thị biểu đồ</label>
             <div className="flex flex-col gap-2">
                <button 
                  onClick={() => setConfig({...config, visibleCharts: {...config.visibleCharts, trend: !config.visibleCharts.trend}})}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100 text-sm"
                >
                   <span className="font-medium text-slate-700">Xu hướng đăng ký</span>
                   {config.visibleCharts.trend ? <Eye className="w-4 h-4 text-blue-500" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                </button>
                <button 
                  onClick={() => setConfig({...config, visibleCharts: {...config.visibleCharts, distribution: !config.visibleCharts.distribution}})}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-100 text-sm"
                >
                   <span className="font-medium text-slate-700">Phân loại License</span>
                   {config.visibleCharts.distribution ? <Eye className="w-4 h-4 text-blue-500" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                </button>
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-xs font-bold text-blue-600 uppercase">Loại dữ liệu (Metric)</label>
             <select 
               value={config.mainMetric}
               onChange={(e) => setConfig({...config, mainMetric: e.target.value as MetricType})}
               className="w-full p-3 bg-white rounded-xl border border-blue-100 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
             >
                <option value="registrations">Người dùng đăng ký mới</option>
                <option value="expirations">Tài khoản hết hạn</option>
                <option value="active_sessions">Phiên hoạt động BIM Tool</option>
             </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Yêu cầu mới" value={onHoldUsers.length} subValue="Cần kích hoạt" icon={BellRing} color="text-blue-600" bg="bg-blue-50" highlight={onHoldUsers.length > 0} onClick={() => setActiveModal('new')} />
        <StatCard title="Đang Online" value={onlineSessions.length} subValue="Phiên BIM Tool" icon={Wifi} color="text-green-600" bg="bg-green-50" onClick={() => setActiveModal(null)} />
        <StatCard title="Đã hết hạn" value={expiredUsers.length} subValue="Cần gia hạn" icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50" onClick={() => setActiveModal(null)} />
        <StatCard title="User hoạt động" value={activeUsers.length} subValue="Tổng License" icon={ShieldCheck} color="text-purple-600" bg="bg-purple-50" onClick={() => setActiveModal('active')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {config.visibleCharts.trend && (
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[450px]">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-500" /> {getMetricLabel()}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Dữ liệu theo: {timeRange}</p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                      {(['week', 'month', 'year'] as TimeRange[]).map((range) => (
                        <button 
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${timeRange === range ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {range === 'week' ? 'Tuần' : range === 'month' ? 'Tháng' : 'Năm'}
                        </button>
                      ))}
                  </div>
              </div>
              
              <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                          <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 10, fill: '#64748b'}} 
                              interval={timeRange === 'month' ? 4 : 0}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                          <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}
                          />
                          <Area 
                              type="monotone" 
                              dataKey="count" 
                              stroke="#6366f1" 
                              strokeWidth={3} 
                              fillOpacity={1} 
                              fill="url(#colorCount)"
                              dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                              activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
        )}

        {config.visibleCharts.distribution && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[450px]">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-500" /> Phân loại License
              </h3>
              <div className="flex-1 relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie 
                              data={licenseTypeData.length ? licenseTypeData : [{name: 'Trống', value: 1}]} 
                              innerRadius={70} 
                              outerRadius={100} 
                              paddingAngle={8} 
                              dataKey="value"
                              animationDuration={1000}
                          >
                              {licenseTypeData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-slate-800">{safeUsers.length}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng User</span>
                  </div>
              </div>
              <div className="mt-4 space-y-2">
                  {licenseTypeData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="text-slate-600 font-medium">{entry.name}</span>
                          </div>
                          <span className="font-bold text-slate-800">{entry.value}</span>
                      </div>
                  ))}
              </div>
          </div>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-end mb-2">
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
};
