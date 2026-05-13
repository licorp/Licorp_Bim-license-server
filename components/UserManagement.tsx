
import React, { useState } from 'react';
import { User } from '../types';
import { 
  Search, 
  Trash2, 
  Eye, 
  EyeOff, 
  X, 
  Save, 
  Edit3, 
  Monitor, 
  Calendar, 
  Clock,
  Key, 
  UserPlus, 
  Copy, 
  Check, 
  ShieldAlert,
  Download
} from 'lucide-react';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onUpdateStatus: (id: string, status: User['status']) => void;
  onUpdateLicenseType: (id: string, type: User['licenseType']) => void;
  onUpdateExpiration: (id: string, date: string) => void;
  onDeleteUser: (id: string) => void;
}

const INITIAL_FORM_STATE: Partial<User> = {
  name: '',
  email: '',
  password: '',
  company: '',
  licenseType: 'subscription',
  status: 'active',
  expirationDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  createdAt: new Date().toISOString().split('T')[0],
  machineIds: [],
};

const ADMIN_SECRET_KEY = "Licorp 2026";

export const UserManagement: React.FC<UserManagementProps> = ({ 
  users = [], 
  onAddUser,
  onEditUser,
  onUpdateStatus, 
  onUpdateLicenseType,
  onUpdateExpiration,
  onDeleteUser 
}) => {
  const [search, setSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>(INITIAL_FORM_STATE);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleCopyPassword = (userId: string, pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      ...INITIAL_FORM_STATE,
      createdAt: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    // Khi sửa, mật khẩu để trống để ám chỉ "giữ nguyên" trừ khi nhập mới
    setFormData({ ...user, password: '' });
    setIsModalOpen(true);
  };

  const handleRemoveMachine = (machineId: string) => {
    if (!formData.machineIds) return;
    const newList = formData.machineIds.filter(id => id !== machineId);
    setFormData({ ...formData, machineIds: newList });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(INITIAL_FORM_STATE);
    setShowFormPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const dataToSubmit = { ...formData };
      if (dataToSubmit.password === '') {
        delete dataToSubmit.password;
      }
      onEditUser({ ...editingUser, ...dataToSubmit } as User);
    } else {
      const newUser: User = {
        ...formData,
        id: `U${Date.now()}`,
        lastLogin: new Date().toISOString(),
        createdAt: formData.createdAt || new Date().toISOString().split('T')[0],
        machineIds: formData.machineIds || []
      } as User;
      onAddUser(newUser);
    }
    setIsModalOpen(false);
  };

  const handleSeedAdmin = async () => {
    if (!window.confirm("Bạn có muốn tạo tài khoản Admin mặc định cho Tool không?\nEmail: admin@bim-tools.com\nPass: admin")) return;
    setIsSeeding(true);
    try {
      const response = await fetch(`/api/register?key=${ADMIN_SECRET_KEY}&action=seed_admin`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${ADMIN_SECRET_KEY}`,
          'x-admin-key': ADMIN_SECRET_KEY
        }
      });
      const res = await response.json();
      alert(res.Message);
      if (res.Success) {
          window.location.reload();
      }
    } catch (e) {
      alert("Lỗi khi kết nối tới Server.");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleExportCSV = () => {
    if (users.length === 0) return;
    
    // Header for CSV
    const headers = ["ID", "Ho Ten", "Email", "Cong Ty", "Trang Thai", "Loai License", "Ngay Het Han", "Ngay Tao", "HWID"];
    
    const rows = users.map(u => [
      u.id,
      u.name,
      u.email,
      u.company || "Ca nhan",
      u.status.toUpperCase(),
      u.licenseType.toUpperCase(),
      u.expirationDate,
      u.createdAt,
      (u.machineIds || []).join(" | ")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bim_users_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    return (u.name || '').toLowerCase().includes(s) || 
           (u.email || '').toLowerCase().includes(s) || 
           (u.company || '').toLowerCase().includes(s) ||
           (u.machineIds || []).some(id => id.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Quản lý License</h2>
            <p className="text-sm text-slate-500">Xem mật khẩu, quản lý HWID và thời hạn BIM Tool.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              placeholder="Tìm tên, email, công ty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
             onClick={handleExportCSV}
             className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 hover:bg-slate-50"
             title="Xuất danh sách ra Excel/CSV"
          >
             <Download className="w-4 h-4" /> Xuất CSV
          </button>
          <button 
             onClick={handleSeedAdmin}
             disabled={isSeeding}
             className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
             title="Tạo user: admin@bim-tools.com / admin"
          >
             <ShieldAlert className="w-4 h-4" /> Khôi phục Admin
          </button>
          <button onClick={handleOpenAdd} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95">
            <UserPlus className="w-4 h-4" /> Thêm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Chủ sở hữu</th>
                <th className="px-6 py-4">Mật khẩu</th>
                <th className="px-6 py-4">HWID</th>
                <th className="px-6 py-4">Gói</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Ngày đăng ký</th>
                <th className="px-6 py-4">Ngày hết hạn</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{user.name}</div>
                    <div className="text-[11px] text-slate-500">{user.email}</div>
                    <div className="text-[10px] text-blue-600 mt-1 uppercase font-bold bg-blue-50 w-fit px-1.5 rounded">{user.company || 'Cá nhân'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-100 px-2 py-1 rounded font-mono text-[11px] text-slate-600 min-w-[100px] flex items-center justify-between">
                        <span>{visiblePasswords[user.id] ? user.password : '••••••••'}</span>
                        <button 
                          onClick={() => handleCopyPassword(user.id, user.password || '')}
                          className="ml-2 text-slate-400 hover:text-blue-600"
                        >
                          {copiedId === user.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <button 
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400"
                        title={visiblePasswords[user.id] ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {visiblePasswords[user.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {(user.machineIds || []).length > 0 ? (
                        user.machineIds.map((mid, idx) => (
                          <div key={idx} title={mid} className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">
                             {mid.substring(0, 8)}...
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">Chưa liên kết</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select value={user.licenseType} onChange={e => onUpdateLicenseType(user.id, e.target.value as any)} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 border-none outline-none cursor-pointer hover:bg-slate-200 transition-colors">
                      <option value="subscription">SUBSCRIPTION</option>
                      <option value="perpetual">PERPETUAL</option>
                      <option value="trial">TRIAL</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select value={user.status} onChange={e => onUpdateStatus(user.id, e.target.value as any)} className={`text-[10px] font-bold px-2 py-1 rounded border-none outline-none cursor-pointer transition-colors ${user.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' : user.status === 'blocked' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                      <option value="active">ACTIVE</option>
                      <option value="on_hold">PENDING</option>
                      <option value="blocked">BLOCKED</option>
                      <option value="expired">EXPIRED</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                       <Clock className="w-3.5 h-3.5 text-slate-400" />
                       {user.createdAt || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                       <Calendar className="w-3.5 h-3.5 text-slate-400" />
                       <input 
                         type="date" 
                         value={user.expirationDate} 
                         onChange={(e) => onUpdateExpiration(user.id, e.target.value)} 
                         className="bg-transparent border-none text-xs font-medium w-28 p-0 focus:ring-0" 
                       />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Sửa thông tin"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => onDeleteUser(user.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Xóa người dùng"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-slate-400">
             Không tìm thấy người dùng phù hợp.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    {editingUser ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">{editingUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'}</h3>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Họ tên chủ sở hữu</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nguyễn Văn A" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email (Tên đăng nhập)</label>
                  <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@gmail.com" required />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mật khẩu</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type={showFormPassword ? "text" : "password"}
                    className="w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-mono"
                    placeholder={editingUser ? "Để trống nếu không muốn đổi" : "Nhập mật khẩu..."}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                  />
                  <button type="button" onClick={() => setShowFormPassword(!showFormPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Công ty / Tổ chức</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Tên công ty" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ngày đăng ký</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="date" className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={formData.createdAt} onChange={e => setFormData({...formData, createdAt: e.target.value})} />
                  </div>
                </div>
              </div>

              {editingUser && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                   <label className="text-[10px] font-bold text-slate-700 uppercase mb-2 block flex items-center gap-1.5">
                     <Monitor className="w-3.5 h-3.5 text-blue-500"/> Thiết bị đang đăng ký ({(formData.machineIds || []).length}/4)
                   </label>
                   <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {(formData.machineIds || []).map((mid, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border text-[10px] font-mono shadow-sm">
                          <span className="truncate flex-1 text-slate-600">{mid}</span>
                          <button type="button" onClick={() => handleRemoveMachine(mid)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors" title="Xóa HWID này">
                            <Trash2 className="w-3.5 h-3.5"/>
                          </button>
                        </div>
                      ))}
                      {(formData.machineIds || []).length === 0 && <p className="text-[10px] text-slate-400 italic py-2 text-center">Chưa có mã máy nào được liên kết.</p>}
                   </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Đóng</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
                  <Save className="w-4 h-4" /> {editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
