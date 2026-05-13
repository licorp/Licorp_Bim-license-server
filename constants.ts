
import { User, Session } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'U-ADMIN-01',
    name: 'Administrator System',
    email: 'admin@bim-tools.com',
    company: 'BIM Tools Management',
    status: 'active',
    licenseType: 'perpetual',
    machineIds: ['SERVER-MASTER-CONTROL', 'ADMIN-LAPTOP-01'],
    expirationDate: '2099-12-31',
    createdAt: '2024-01-01',
    lastLogin: new Date().toISOString(),
    password: 'adminpassword'
  }
];

export const MOCK_SESSIONS: Session[] = [];
