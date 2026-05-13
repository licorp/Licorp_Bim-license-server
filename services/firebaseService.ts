
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  QuerySnapshot,
  DocumentData
} from "firebase/firestore";
import { User, Session } from '../types';

// CẤU HÌNH FIREBASE: Thay thế bằng thông số từ dự án Firebase của bạn
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Các hàm thao tác với Users
export const subscribeToUsers = (callback: (users: User[]) => void) => {
  const q = query(collection(db, "users"), orderBy("name", "asc"));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
    callback(users);
  });
};

export const updateFirestoreUser = async (userId: string, data: Partial<User>) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, data);
};

export const addFirestoreUser = async (user: User) => {
  const userRef = doc(db, "users", user.id);
  await setDoc(userRef, user);
};

export const deleteFirestoreUser = async (userId: string) => {
  await deleteDoc(doc(db, "users", userId));
};

// Các hàm thao tác với Sessions
export const subscribeToSessions = (callback: (sessions: Session[]) => void) => {
  const q = query(collection(db, "sessions"), orderBy("loginTime", "desc"));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const sessions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Session));
    callback(sessions);
  });
};

export const addFirestoreSession = async (session: Session) => {
  const sessionRef = doc(db, "sessions", session.id);
  await setDoc(sessionRef, session);
};

export const deleteFirestoreSession = async (sessionId: string) => {
  await deleteDoc(doc(db, "sessions", sessionId));
};

// Hàm khởi tạo dữ liệu mẫu nếu Database trống (Dùng cho lần đầu setup)
export const seedDatabase = async (mockUsers: User[], mockSessions: Session[]) => {
    for (const user of mockUsers) {
        await addFirestoreUser(user);
    }
    for (const session of mockSessions) {
        await addFirestoreSession(session);
    }
};
