
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { UserManagement } from './components/UserManagement';
import { SessionMonitor } from './components/SessionMonitor';
import { AiAssistant } from './components/AiAssistant';
import { IntegrationGuide } from './components/IntegrationGuide';
import { LoginScreen } from './components/LoginScreen';
import { AppView, User, Session } from './types';
import { MOCK_USERS, MOCK_SESSIONS } from './constants';
import { Menu, RefreshCw } from 'lucide-react';

// QUAN TRỌNG: Mã này phải khớp với DEFAULT_ADMIN_KEY trong api/register.ts
// Hoặc khớp với biến môi trường ADMIN_SECRET_KEY trên Vercel
const ADMIN_SECRET_KEY = import.meta.env.VITE_ADMIN_KEY || "Licorp 2026";

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<AppView>(() => {
    const saved = localStorage.getItem('app_current_view') as AppView;
    return Object.values(AppView).includes(saved) ? saved : AppView.DASHBOARD;
  });
  
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('app_users_data');
    if (!saved || saved === '[]') return MOCK_USERS;
    try {
      return JSON.parse(saved);
    } catch { return MOCK_USERS; }
  });

  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('app_sessions_data');
    if (!saved || saved === '[]') return MOCK_SESSIONS;
    try {
      return JSON.parse(saved);
    } catch { return MOCK_SESSIONS; }
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'error'>('online');

  useEffect(() => {
    localStorage.setItem('app_users_data', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('app_sessions_data', JSON.stringify(sessions));
  }, [sessions]);

  const syncFromCloud = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const response = await fetch('/api/v1/admin/users', {
        method: 'GET',
        headers: { 
          'x-admin-key': ADMIN_SECRET_KEY,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        setSyncStatus('error');
        return;
      }

      const result = await response.json();
      if (result?.success && Array.isArray(result.users)) {
        setSyncStatus('online');
        setUsers(result.users);
      } else {
        setSyncStatus('online'); // connected but no data yet
      }
    } catch (e) {
      setSyncStatus('offline');
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      syncFromCloud(true);
      const interval = setInterval(() => syncFromCloud(true), 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, syncFromCloud]);

  const adminFetch = async (method: string, path: string, body?: any) => {
    try {
      const response = await fetch(path, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_SECRET_KEY
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const res = await response.json();
      if (!res?.success) {
        console.warn('API error:', res?.message);
      }
      return res;
    } catch (e) {
      return { success: false, message: 'Không thể kết nối tới Server' };
    }
  };

  const handleAddUser = async (u: User) => {
    setUsers(prev => [u, ...prev]);
    await adminFetch('POST', '/api/v1/admin/users', u);
    syncFromCloud(true);
  };

  const handleEditUser = async (u: User) => {
    setUsers(prev => prev.map(x => x.id === u.id ? u : x));
    await adminFetch('PUT', `/api/v1/admin/users/${u.id}`, u);
    syncFromCloud(true);
  };

  const handleUpdateStatus = async (id: string, status: User['status']) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    await adminFetch('PATCH', `/api/v1/admin/users/${id}`, { status });
  };

  const handleUpdateLicenseType = async (id: string, licenseType: User['licenseType']) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, licenseType } : u));
    await adminFetch('PATCH', `/api/v1/admin/users/${id}`, { licenseType });
  };

  const handleUpdateExpiration = async (id: string, expirationDate: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, expirationDate } : u));
    await adminFetch('PATCH', `/api/v1/admin/users/${id}`, { expirationDate });
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Xác nhận xóa vĩnh viễn người dùng này?")) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    await adminFetch('DELETE', `/api/v1/admin/users/${id}`);
  };

  if (!isAuthenticated) return <LoginScreen onLogin={() => {
    setIsAuthenticated(true);
    localStorage.setItem('app_auth_token', 'true');
  }} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onLogout={() => {
          setIsAuthenticated(false);
          localStorage.removeItem('app_auth_token');
        }}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="px-8 py-4 bg-white border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-600 p-1 hover:bg-slate-100 rounded"><Menu /></button>
             <div>
                <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
                  {currentView}
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'online' ? 'bg-green-500' : syncStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                  Hệ thống: <span className={syncStatus === 'online' ? 'text-green-500' : syncStatus === 'error' ? 'text-red-500' : 'text-amber-500'}>
                    {syncStatus === 'online' ? 'TRỰC TUYẾN' : syncStatus === 'error' ? 'LỖI KẾT NỐI' : 'NGOẠI TUYẾN'}
                  </span>
                </p>
             </div>
          </div>
          <button 
              onClick={() => syncFromCloud(false)} 
              disabled={isSyncing}
              className="p-2 hover:bg-slate-100 rounded-full transition-all disabled:opacity-50 active:scale-90 flex items-center gap-2"
          >
              <RefreshCw className={`w-5 h-5 text-slate-400 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
            {currentView === AppView.DASHBOARD && <Dashboard users={users} sessions={sessions} onUpdateStatus={handleUpdateStatus} onUpdateLicenseType={handleUpdateLicenseType} />}
            {currentView === AppView.USERS && (
              <UserManagement 
                users={users} 
                onAddUser={handleAddUser} 
                onEditUser={handleEditUser}
                onUpdateStatus={handleUpdateStatus}
                onUpdateLicenseType={handleUpdateLicenseType}
                onUpdateExpiration={handleUpdateExpiration}
                onDeleteUser={handleDeleteUser}
              />
            )}
            {currentView === AppView.SESSIONS && <SessionMonitor sessions={sessions} users={users} onKillSession={(id) => setSessions(sessions.filter(s => s.id !== id))} onAddSession={(s) => setSessions([s, ...sessions])} />}
            {currentView === AppView.AI_INSIGHTS && <AiAssistant users={users} sessions={sessions} />}
            {currentView === AppView.INTEGRATION && <IntegrationGuide />}
        </div>
      </main>
    </div>
  );
};

export default App;
