
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  company: string;
  status: 'active' | 'expired' | 'blocked' | 'on_hold';
  licenseType: 'perpetual' | 'subscription' | 'trial';
  expirationDate: string;
  createdAt: string; // Ngày đăng ký tài khoản
  lastLogin: string;
  machineIds: string[];
}

export interface Session {
  id: string;
  userId: string;
  userName: string;
  machineId: string;
  softwareVersion: string;
  ipAddress: string;
  loginTime: string;
  status: 'online' | 'idle';
}

export interface ChartData {
  name: string;
  value: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  USERS = 'USERS',
  SESSIONS = 'SESSIONS',
  AI_INSIGHTS = 'AI_INSIGHTS',
  INTEGRATION = 'INTEGRATION'
}
