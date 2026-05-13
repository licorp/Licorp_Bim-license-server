
import React, { useState } from 'react';
import { AppView } from '../types';
import { 
  LayoutDashboard, 
  Users, 
  MonitorPlay, 
  Bot, 
  Box,
  LogOut,
  X,
  FileCode,
  AlertCircle
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isMobileOpen, onCloseMobile, onLogout }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems = [
    { view: AppView.DASHBOARD, icon: LayoutDashboard, label: 'Tổng quan' },
    { view: AppView.USERS, icon: Users, label: 'Người dùng' },
    { view: AppView.SESSIONS, icon: MonitorPlay, label: 'Phiên hoạt động' },
    { view: AppView.AI_INSIGHTS, icon: Bot, label: 'Trợ lý AI' },
    { view: AppView.INTEGRATION, icon: FileCode, label: 'Tích hợp & Deploy' },
  ];

  const handleItemClick = (view: AppView) => {
    setCurrentView(view);
    onCloseMobile();
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <div className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:shadow-none flex flex-col
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Box className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="font-bold text-lg leading-tight">BIM Tool</h1>
              <p className="text-xs text-slate-400">Quản lý License</p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.view}
              onClick={() => handleItemClick(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentView === item.view
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogoutClick}
            className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors px-4 py-2 w-full hover:bg-red-500/10 rounded-lg group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Đăng xuất</span>
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Xác nhận đăng xuất</h3>
              <p className="text-slate-500 text-sm mb-6">
                Bạn có chắc chắn muốn thoát khỏi hệ thống quản trị không?
              </p>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={confirmLogout}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-100 transition-all active:scale-95"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
