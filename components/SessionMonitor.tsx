import React, { useState } from 'react';
import { Session, User } from '../types';
import { Monitor, Cpu, Clock, Globe, Trash2, Plus, Play, X } from 'lucide-react';

interface SessionMonitorProps {
  sessions: Session[];
  users: User[];
  onKillSession: (sessionId: string) => void;
  onAddSession: (session: Session) => void;
}

export const SessionMonitor: React.FC<SessionMonitorProps> = ({ sessions, users, onKillSession, onAddSession }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    userId: '',
    machineId: 'DESKTOP-' + Math.floor(Math.random() * 9000 + 1000),
    softwareVersion: 'Version 2024',
    ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
  });

  const activeUsers = users.filter(u => u.status === 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSession.userId) return;

    const user = users.find(u => u.id === newSession.userId);
    if (!user) return;

    const session: Session = {
        id: `S${Date.now()}`,
        userId: user.id,
        userName: user.name,
        machineId: newSession.machineId,
        softwareVersion: newSession.softwareVersion,
        ipAddress: newSession.ipAddress,
        loginTime: new Date().toISOString(),
        status: 'online'
    };

    onAddSession(session);
    setIsModalOpen(false);
    // Reset form for next time, but keep random values dynamic
    setNewSession({
        userId: '',
        machineId: 'DESKTOP-' + Math.floor(Math.random() * 9000 + 1000),
        softwareVersion: 'Version 2024',
        ipAddress: '192.168.1.' + Math.floor(Math.random() * 255),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Phiên hoạt động trực tuyến</h2>
          <p className="text-slate-500 text-sm mt-1">Danh sách các máy đang mở BIM Tool.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
            >
                <Plus className="w-4 h-4" />
                <span>Tạo phiên giả lập</span>
            </button>
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Trực tuyến
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 relative group hover:shadow-md transition-shadow">
            <div className="absolute top-4 right-4">
              <span className={`inline-block w-2 h-2 rounded-full ${session.status === 'online' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{session.userName}</h3>
                <p className="text-xs text-slate-500">ID: {session.userId}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Cpu className="w-4 h-4" />
                  <span>Mã máy (HWID)</span>
                </div>
                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">{session.machineId}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>Giờ đăng nhập</span>
                </div>
                <span className="text-slate-700">{new Date(session.loginTime).toLocaleTimeString('vi-VN')}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Globe className="w-4 h-4" />
                  <span>Địa chỉ IP</span>
                </div>
                <span className="text-slate-700">{session.ipAddress}</span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded">
                  {session.softwareVersion}
                </span>
                <button 
                  onClick={() => onKillSession(session.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors group-hover:opacity-100 opacity-0"
                  title="Buộc đăng xuất"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 flex flex-col items-center">
            <Monitor className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">Không có phiên hoạt động nào.</p>
            <p className="text-sm text-slate-400 mb-4">Hãy tạo một phiên giả lập để kiểm tra chức năng.</p>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-blue-200"
            >
                Tạo phiên ngay
            </button>
          </div>
        )}
      </div>

      {/* Add Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600" />
                Giả lập Đăng nhập
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeUsers.length === 0 && (
                 <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200 mb-2">
                    Cảnh báo: Không có người dùng nào đang Active để đăng nhập.
                 </div>
              )}

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Chọn Người dùng</label>
                 <select
                   required
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                   value={newSession.userId}
                   onChange={e => setNewSession({...newSession, userId: e.target.value})}
                 >
                   <option value="">-- Chọn người dùng --</option>
                   {activeUsers.map(u => (
                       <option key={u.id} value={u.id}>{u.name} ({u.company})</option>
                   ))}
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Phiên bản phần mềm</label>
                     <select 
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                       value={newSession.softwareVersion}
                       onChange={e => setNewSession({...newSession, softwareVersion: e.target.value})}
                     >
                       <option value="Version 2022">Version 2022</option>
                       <option value="Version 2023">Version 2023</option>
                       <option value="Version 2024">Version 2024</option>
                       <option value="Version 2025">Version 2025</option>
                     </select>
                 </div>
                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Mã máy (Giả lập)</label>
                     <input 
                       type="text"
                       required
                       className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                       value={newSession.machineId}
                       onChange={e => setNewSession({...newSession, machineId: e.target.value})}
                     />
                 </div>
              </div>
              
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ IP (Giả lập)</label>
                 <input 
                   type="text"
                   required
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                   value={newSession.ipAddress}
                   onChange={e => setNewSession({...newSession, ipAddress: e.target.value})}
                 />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={activeUsers.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm shadow-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bắt đầu phiên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};