
import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
};

// --- CẤU HÌNH MẶC ĐỊNH ---
const DEFAULT_ADMIN_KEY = "DSH_SECRET_2024";
const MAX_MACHINES = 4; 

// --- HELPER FUNCTIONS ---
const getEnv = (key: string) => process.env[key] || '';

// Tạo response JSON chuẩn để Tool C# luôn đọc được
const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    },
  });
};

export default async function handler(req: Request) {
  // 1. Xử lý CORS Preflight (cho trình duyệt)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
      },
    });
  }

  try {
    const url = new URL(req.url);
    
    // 2. Lấy thông tin cấu hình Environment
    const databaseUrl = getEnv('DATABASE_URL');
    const ADMIN_SECRET_KEY = getEnv('ADMIN_SECRET_KEY') || DEFAULT_ADMIN_KEY;

    // 3. Kiểm tra kết nối Database
    if (!databaseUrl) {
      console.error("Database Missing Configuration");
      return jsonResponse({ 
        Success: false, 
        Message: "Server chưa cấu hình Database (Neon). Vui lòng kiểm tra biến môi trường DATABASE_URL." 
      });
    }

    const sql = neon(databaseUrl);

    // Khởi tạo bảng nếu chưa có
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        company VARCHAR(255),
        status VARCHAR(50),
        "licenseType" VARCHAR(50),
        "expirationDate" VARCHAR(50),
        "createdAt" VARCHAR(50),
        "machineIds" JSONB DEFAULT '[]'::jsonb
      )
    `;

    // 4. Parse Request Body (Quan trọng: Xử lý lỗi nếu JSON không hợp lệ)
    let body: any = {};
    let action = url.searchParams.get('action') || '';

    if (req.method !== 'GET') {
      try {
        const text = await req.text();
        if (text) {
          body = JSON.parse(text);
          // Ưu tiên action trong body nếu có
          if (body.action) action = body.action;
        }
      } catch (e) {
        return jsonResponse({ Success: false, Message: "Lỗi định dạng JSON gửi lên Server." });
      }
    }

    // Tự động nhận diện action nếu thiếu (Hỗ trợ tool cũ)
    if (!action && body.email && (body.password || body.machineId)) {
      action = 'verify_license';
    }

    // --- XỬ LÝ DATABASE ---
    
    const getAllUsers = async (): Promise<any[]> => {
      try {
        const rows = await sql`SELECT * FROM users ORDER BY "createdAt" DESC`;
        return rows.map(row => ({
          ...row,
          machineIds: row.machineIds || []
        }));
      } catch (dbError: any) {
        console.error("DB Error:", dbError);
        throw new Error("Không thể đọc dữ liệu từ Database: " + dbError.message);
      }
    };

    // ============================================================
    // KHU VỰC 1: PUBLIC ACTIONS (BIM Tool gọi, không cần Admin Key)
    // ============================================================

    if (action === 'verify_license' || action === 'login') {
      const { email, password, machineId } = body;
      
      if (!email) return jsonResponse({ Success: false, Message: "Vui lòng gửi kèm Email." });

      const users = await sql`SELECT * FROM users WHERE email ILIKE ${email}`;
      const user = users[0];

      // Case 1: Không tìm thấy User
      if (!user) {
        return jsonResponse({ Success: false, Message: "Tài khoản không tồn tại trên hệ thống." });
      }

      // Case 2: Sai mật khẩu (nếu có gửi password)
      if (password && user.password && user.password !== password) {
        return jsonResponse({ Success: false, Message: "Mật khẩu không chính xác." });
      }

      // Case 3: Kiểm tra Machine ID
      // Đảm bảo machineIds luôn là mảng
      let machineIds = user.machineIds || [];
      if (!Array.isArray(machineIds)) machineIds = [];

      if (machineId) {
        if (!machineIds.includes(machineId)) {
          if (machineIds.length >= MAX_MACHINES) {
            return jsonResponse({ Success: false, Message: `Tài khoản đã đạt giới hạn ${MAX_MACHINES} máy.` });
          }
          // Add new machine
          machineIds.push(machineId);
          await sql`UPDATE users SET "machineIds" = ${JSON.stringify(machineIds)}::jsonb WHERE id = ${user.id}`;
          user.machineIds = machineIds;
        }
      }

      // Case 4: Kiểm tra trạng thái
      if (user.status !== 'active') {
        const statusMsg = user.status === 'on_hold' ? "chờ duyệt" : user.status === 'blocked' ? "bị khóa" : "hết hạn";
        return jsonResponse({ Success: false, Message: `Tài khoản đang ${statusMsg}. Vui lòng liên hệ Admin.` });
      }

      // Case 5: Kiểm tra ngày hết hạn
      const today = new Date().toISOString().split('T')[0];
      if (user.expirationDate && user.expirationDate !== '2099-12-31' && user.expirationDate < today) {
        return jsonResponse({ Success: false, Message: "Bản quyền đã hết hạn sử dụng." });
      }

      // LOGIN SUCCESS
      return jsonResponse({ Success: true, User: user, Message: "Đăng nhập thành công." });
    }

    if (action === 'register') {
      const { email, password, fullName, company, machineId } = body;
      
      if (!email || !password) return jsonResponse({ Success: false, Message: "Thiếu Email hoặc Mật khẩu." });

      const existing = await sql`SELECT id FROM users WHERE email ILIKE ${email}`;
      if (existing.length > 0) {
        return jsonResponse({ Success: false, Message: "Email này đã được đăng ký." });
      }

      const newUser = {
        id: `U${Date.now()}`,
        name: fullName || email.split('@')[0],
        email: email,
        password: password,
        company: company || "Cá nhân",
        status: 'on_hold', // Mặc định chờ duyệt
        licenseType: 'trial',
        expirationDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        createdAt: new Date().toISOString().split('T')[0],
        machineIds: machineId ? [machineId] : []
      };

      await sql`
        INSERT INTO users (id, name, email, password, company, status, "licenseType", "expirationDate", "createdAt", "machineIds")
        VALUES (${newUser.id}, ${newUser.name}, ${newUser.email}, ${newUser.password}, ${newUser.company}, ${newUser.status}, ${newUser.licenseType}, ${newUser.expirationDate}, ${newUser.createdAt}, ${JSON.stringify(newUser.machineIds)}::jsonb)
      `;

      return jsonResponse({ Success: true, Message: "Đăng ký thành công! Vui lòng chờ Admin kích hoạt." });
    }

    // ============================================================
    // KHU VỰC 2: ADMIN ACTIONS (Yêu cầu Admin Key)
    // ============================================================
    
    // Lấy Key từ nhiều nguồn
    const providedKey = req.headers.get('Authorization')?.replace('Bearer ', '') || 
                        req.headers.get('x-admin-key') || 
                        url.searchParams.get('key');

    // Nếu không đúng Key, chặn ngay
    if (providedKey !== ADMIN_SECRET_KEY) {
      return jsonResponse({ 
        Success: false, 
        Message: "Authentication Failed: Admin Key không khớp.",
        Detail: "Vui lòng kiểm tra ADMIN_SECRET_KEY trong App.tsx và Environment Variables."
      }, 401);
    }

    if (action === 'get_all' || action === '') {
      const data = await getAllUsers();
      return jsonResponse(data); // Trả về mảng user
    }

    if (action === 'seed_admin') {
      const adminEmail = "admin@bim-tools.com";
      const existing = await sql`SELECT id FROM users WHERE email = ${adminEmail}`;
      if (existing.length > 0) {
        return jsonResponse({ Success: false, Message: "Admin đã tồn tại." });
      }
      
      const adminUser = {
        id: 'U-ADMIN-DEFAULT',
        name: 'System Administrator',
        email: adminEmail,
        password: 'admin',
        company: 'BIM Manager',
        status: 'active',
        licenseType: 'perpetual',
        expirationDate: '2099-12-31',
        createdAt: new Date().toISOString().split('T')[0],
        machineIds: []
      };

      await sql`
        INSERT INTO users (id, name, email, password, company, status, "licenseType", "expirationDate", "createdAt", "machineIds")
        VALUES (${adminUser.id}, ${adminUser.name}, ${adminUser.email}, ${adminUser.password}, ${adminUser.company}, ${adminUser.status}, ${adminUser.licenseType}, ${adminUser.expirationDate}, ${adminUser.createdAt}, ${JSON.stringify(adminUser.machineIds)}::jsonb)
      `;

      return jsonResponse({ Success: true, Message: "Đã tạo tài khoản Admin mặc định." });
    }

    if (action === 'add_user') {
      if (!body.user) return jsonResponse({ Success: false, Message: "Thiếu dữ liệu user." });
      const u = body.user;
      await sql`
        INSERT INTO users (id, name, email, password, company, status, "licenseType", "expirationDate", "createdAt", "machineIds")
        VALUES (${u.id}, ${u.name}, ${u.email}, ${u.password}, ${u.company}, ${u.status}, ${u.licenseType}, ${u.expirationDate}, ${u.createdAt}, ${JSON.stringify(u.machineIds || [])}::jsonb)
      `;
      return jsonResponse({ Success: true });
    }

    if (action === 'update_user') {
      const u = body.data;
      if (!body.id) return jsonResponse({ Success: false, Message: "Không tìm thấy User ID để update." });
      
      const existing = await sql`SELECT * FROM users WHERE id = ${body.id}`;
      if (existing.length === 0) return jsonResponse({ Success: false, Message: "User không tồn tại." });

      const current = existing[0];
      const updated = { ...current, ...u };
      
      // Giữ mật khẩu cũ nếu không gửi mật khẩu mới
      if (u.password === undefined || u.password === "") {
        updated.password = current.password;
      }

      await sql`
        UPDATE users SET
          name = ${updated.name},
          email = ${updated.email},
          password = ${updated.password},
          company = ${updated.company},
          status = ${updated.status},
          "licenseType" = ${updated.licenseType},
          "expirationDate" = ${updated.expirationDate},
          "machineIds" = ${JSON.stringify(updated.machineIds || [])}::jsonb
        WHERE id = ${body.id}
      `;
      
      return jsonResponse({ Success: true });
    }

    if (action === 'delete_user') {
      if (!body.id) return jsonResponse({ Success: false, Message: "Thiếu User ID." });
      await sql`DELETE FROM users WHERE id = ${body.id}`;
      return jsonResponse({ Success: true });
    }

    return jsonResponse({ Success: false, Message: `Action '${action}' không hợp lệ.` }, 400);

  } catch (globalError: any) {
    console.error("GLOBAL API ERROR:", globalError);
    // TRẢ VỀ JSON LỖI THAY VÌ 500 ĐỂ CLIENT ĐỌC ĐƯỢC
    return jsonResponse({ 
      Success: false, 
      Message: "Lỗi Server nội bộ: " + globalError.message 
    }, 200); // Vẫn trả status 200 để client đọc được body JSON
  }
}
