/// <reference types="node" />

import express from "express";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// --- CẤU HÌNH MẶC ĐỊNH ---
const DEFAULT_ADMIN_KEY = "Licorp 2026";
const MAX_MACHINES = 4;

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || DEFAULT_ADMIN_KEY;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bim-manager";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "LICORP_ACCESS_SECRET_CHANGE_ME";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "LICORP_REFRESH_SECRET_CHANGE_ME";
const ACCESS_TOKEN_TTL_SECONDS = 60 * 15;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const OFFLINE_GRACE_DAYS = 7;
const LOCKOUT_MINUTES = 15;
const MAX_LOGIN_ATTEMPTS = 8;
const MAX_VERIFY_ATTEMPTS = 40;
const MAX_DEVICES_PER_LICENSE = 4;
const LOGIN_FAIL_SPIKE_THRESHOLD_PER_5M = 20;

// --- KẾT NỐI MONGODB ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err: any) => console.error("MongoDB connection error:", err));

// --- MONGOOSE MODELS ---
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String },
  company: { type: String },
  status: { type: String, enum: ['active', 'on_hold', 'blocked', 'expired'], default: 'on_hold' },
  licenseType: { type: String, enum: ['trial', 'perpetual', 'subscription'], default: 'trial' },
  expirationDate: { type: String },
  createdAt: { type: String },
  machineIds: { type: [String], default: [] }
});

const deviceSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  fingerprint: { type: String, required: true, index: true },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "deactivated"], default: "active" }
});

const sessionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  refreshTokenHash: { type: String, required: true, unique: true },
  deviceFingerprint: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date }
});

const auditLogSchema = new mongoose.Schema({
  userId: { type: String },
  action: { type: String, required: true },
  detail: { type: String },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const authThrottleSchema = new mongoose.Schema({
  key: { type: String, required: true },
  scope: { type: String, required: true, enum: ["login", "verify"] },
  count: { type: Number, required: true, default: 0 },
  firstAt: { type: Date, required: true, default: Date.now },
  lockUntil: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

deviceSchema.index({ userId: 1, fingerprint: 1 }, { unique: true });
deviceSchema.index({ status: 1, lastSeenAt: -1 });
sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
authThrottleSchema.index({ updatedAt: 1 }, { expireAfterSeconds: LOCKOUT_MINUTES * 60 * 4 });
authThrottleSchema.index({ scope: 1, key: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const Device = mongoose.model('Device', deviceSchema);
const Session = mongoose.model('Session', sessionSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const AuthThrottle = mongoose.model('AuthThrottle', authThrottleSchema);

type MetricsState = {
  totalRequests: number;
  total5xx: number;
  loginFailed5m: number[];
  latencyMs: number[];
};

const metrics: MetricsState = {
  totalRequests: 0,
  total5xx: 0,
  loginFailed5m: [],
  latencyMs: []
};

function requireAdmin(req: express.Request, res: express.Response): boolean {
  const provided = (req.headers["x-admin-key"] as string) || "";
  if (!provided || provided !== ADMIN_SECRET_KEY) {
    apiError(res, 401, "ADMIN_UNAUTHORIZED", "Unauthorized admin key.");
    return false;
  }
  return true;
}

function addMetricLatency(valueMs: number): void {
  metrics.latencyMs.push(valueMs);
  if (metrics.latencyMs.length > 2000) metrics.latencyMs.shift();
}

function avgLatencyMs(): number {
  if (!metrics.latencyMs.length) return 0;
  return Math.round(metrics.latencyMs.reduce((a, b) => a + b, 0) / metrics.latencyMs.length);
}

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const started = Date.now();
  metrics.totalRequests += 1;
  res.on("finish", () => {
    const latency = Date.now() - started;
    addMetricLatency(latency);
    if (res.statusCode >= 500) metrics.total5xx += 1;
  });
  next();
});

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signToken(payload: Record<string, unknown>, secret: string, ttlSeconds: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = nowSeconds();
  const exp = iat + ttlSeconds;
  const body = { ...payload, iat, exp };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedBody = b64url(JSON.stringify(body));
  const content = `${encodedHeader}.${encodedBody}`;
  const signature = crypto.createHmac("sha256", secret).update(content).digest("base64url");
  return `${content}.${signature}`;
}

function verifyToken(token: string, secret: string): any | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const content = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac("sha256", secret).update(content).digest("base64url");
  if (expected !== parts[2]) return null;
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (!payload?.exp || payload.exp < nowSeconds()) return null;
  return payload;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getClientKey(req: express.Request, fallback: string): string {
  return `${req.ip || "unknown"}:${fallback}`;
}

function apiError(res: express.Response, status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return res.status(status).json({ success: false, code, message, ...(extra || {}) });
}

async function checkRateLimit(scope: "login" | "verify", key: string): Promise<{ ok: boolean; retryAfterSeconds?: number }> {
  const state = await AuthThrottle.findOne({ scope, key });
  if (!state) return { ok: true };
  const now = Date.now();
  if (state.lockUntil && state.lockUntil.getTime() > now) {
    return { ok: false, retryAfterSeconds: Math.ceil((state.lockUntil.getTime() - now) / 1000) };
  }
  if (now - state.firstAt.getTime() > LOCKOUT_MINUTES * 60 * 1000) {
    await AuthThrottle.deleteOne({ _id: state._id });
  }
  return { ok: true };
}

async function registerFailure(scope: "login" | "verify", key: string, maxAttempts: number): Promise<void> {
  const now = Date.now();
  const existing = await AuthThrottle.findOne({ scope, key });
  if (!existing || now - existing.firstAt.getTime() > LOCKOUT_MINUTES * 60 * 1000) {
    await AuthThrottle.findOneAndUpdate(
      { scope, key },
      { $set: { count: 1, firstAt: new Date(now), lockUntil: null, updatedAt: new Date(now) } },
      { upsert: true }
    );
    return;
  }

  const nextCount = existing.count + 1;
  const patch: any = { count: nextCount, updatedAt: new Date(now) };
  if (nextCount >= maxAttempts) {
    patch.lockUntil = new Date(now + LOCKOUT_MINUTES * 60 * 1000);
    await new AuditLog({ action: `${scope}_lockout`, detail: `key=${key};count=${nextCount}`, createdAt: new Date() }).save();
  }
  await AuthThrottle.updateOne({ _id: existing._id }, { $set: patch });
}

async function resetFailures(scope: "login" | "verify", key: string): Promise<void> {
  await AuthThrottle.deleteOne({ scope, key });
}

function normalizeDateOnly(input?: string): string {
  if (!input) return "";
  return input.split("T")[0];
}

function isUserExpired(user: any): boolean {
  const today = new Date().toISOString().split("T")[0];
  const exp = normalizeDateOnly(user?.expirationDate);
  return !!exp && exp !== "2099-12-31" && exp < today;
}

function buildLoginPayload(user: any, deviceFingerprint: string) {
  const graceUntil = new Date(Date.now() + OFFLINE_GRACE_DAYS * 86400000).toISOString();
  const accessToken = signToken({ sub: user.id, email: user.email, fp: deviceFingerprint, typ: "access" }, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_TTL_SECONDS);
  const refreshToken = signToken({ sub: user.id, email: user.email, fp: deviceFingerprint, typ: "refresh" }, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_TTL_SECONDS);
  return { accessToken, refreshToken, graceUntil };
}

app.post("/api/v1/auth/login", async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, machineId, deviceFingerprint } = req.body || {};
    if (!email || !password || !deviceFingerprint) {
      return apiError(res, 400, "AUTH_MISSING_FIELDS", "Missing email/password/deviceFingerprint.");
    }

    const limitKey = getClientKey(req, String(email).toLowerCase());
    const limitState = await checkRateLimit("login", limitKey);
    if (!limitState.ok) {
      await new AuditLog({ action: "login_rate_limited", detail: `key=${limitKey}`, ip: req.ip }).save();
      return apiError(res, 429, "AUTH_LOGIN_RATE_LIMITED", "Too many login attempts.", { retryAfterSeconds: limitState.retryAfterSeconds });
    }

    const user = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } });
    if (!user || user.password !== password) {
      await registerFailure("login", limitKey, MAX_LOGIN_ATTEMPTS);
      metrics.loginFailed5m.push(Date.now());
      await new AuditLog({ action: "login_failed", detail: `email=${email}`, ip: req.ip }).save();
      return apiError(res, 401, "AUTH_INVALID_CREDENTIALS", "Invalid credentials.");
    }

    if (user.status !== "active") {
      return apiError(res, 403, "AUTH_ACCOUNT_NOT_ACTIVE", `Account status is ${user.status}.`);
    }
    if (isUserExpired(user)) {
      return apiError(res, 403, "AUTH_LICENSE_EXPIRED", "License expired.");
    }

    const existingDevice = await Device.findOne({ userId: user.id, fingerprint: deviceFingerprint });
    if (!existingDevice) {
      const activeDeviceCount = await Device.countDocuments({ userId: user.id, status: "active" });
      if (activeDeviceCount >= MAX_DEVICES_PER_LICENSE) {
        return apiError(res, 403, "AUTH_MAX_DEVICES_REACHED", `Maximum ${MAX_DEVICES_PER_LICENSE} devices reached.`);
      }
      await new Device({ userId: user.id, fingerprint: deviceFingerprint }).save();
    } else {
      existingDevice.lastSeenAt = new Date();
      existingDevice.status = "active";
      await existingDevice.save();
    }

    const { accessToken, refreshToken, graceUntil } = buildLoginPayload(user, deviceFingerprint);
    await new Session({
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      deviceFingerprint,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
    }).save();

    await resetFailures("login", limitKey);
    await new AuditLog({ userId: user.id, action: "login_success", detail: `fp=${deviceFingerprint}`, ip: req.ip }).save();

    return res.json({
      success: true,
      message: "Login success.",
      accessToken,
      refreshToken,
      graceUntil,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        licenseType: user.licenseType,
        expirationDate: user.expirationDate
      }
    });
  } catch (error: any) {
    return apiError(res, 500, "AUTH_LOGIN_FAILED", error.message || "Login failed.");
  }
});

app.post("/api/v1/auth/verify", async (req: express.Request, res: express.Response) => {
  try {
    const { accessToken, deviceFingerprint } = req.body || {};
    if (!accessToken || !deviceFingerprint) {
      return apiError(res, 400, "AUTH_MISSING_FIELDS", "Missing accessToken/deviceFingerprint.");
    }

    const limitKey = getClientKey(req, deviceFingerprint);
    const limitState = await checkRateLimit("verify", limitKey);
    if (!limitState.ok) {
      await new AuditLog({ action: "verify_rate_limited", detail: `key=${limitKey}`, ip: req.ip }).save();
      return apiError(res, 429, "AUTH_VERIFY_RATE_LIMITED", "Too many verify attempts.", { retryAfterSeconds: limitState.retryAfterSeconds });
    }

    const payload = verifyToken(accessToken, ACCESS_TOKEN_SECRET);
    if (!payload || payload.typ !== "access") {
      await registerFailure("verify", limitKey, MAX_VERIFY_ATTEMPTS);
      return apiError(res, 401, "AUTH_INVALID_ACCESS_TOKEN", "Invalid access token.");
    }
    if (payload.fp !== deviceFingerprint) {
      await registerFailure("verify", limitKey, MAX_VERIFY_ATTEMPTS);
      return apiError(res, 401, "AUTH_FINGERPRINT_MISMATCH", "Fingerprint mismatch.");
    }

    const user = await User.findOne({ id: payload.sub });
    if (!user || user.status !== "active" || isUserExpired(user)) {
      await registerFailure("verify", limitKey, MAX_VERIFY_ATTEMPTS);
      return apiError(res, 403, "AUTH_USER_NOT_VALID", "User not valid for license verification.");
    }

    const device = await Device.findOne({ userId: user.id, fingerprint: deviceFingerprint, status: "active" });
    if (!device) {
      await registerFailure("verify", limitKey, MAX_VERIFY_ATTEMPTS);
      return apiError(res, 403, "AUTH_DEVICE_NOT_REGISTERED", "Device not registered.");
    }

    device.lastSeenAt = new Date();
    await device.save();
    await resetFailures("verify", limitKey);

    return res.json({ success: true, message: "Verify success.", userId: user.id, graceDays: OFFLINE_GRACE_DAYS });
  } catch (error: any) {
    return apiError(res, 500, "AUTH_VERIFY_FAILED", error.message || "Verify failed.");
  }
});

app.post("/api/v1/auth/refresh", async (req: express.Request, res: express.Response) => {
  try {
    const { refreshToken, deviceFingerprint } = req.body || {};
    if (!refreshToken || !deviceFingerprint) {
      return apiError(res, 400, "AUTH_MISSING_FIELDS", "Missing refreshToken/deviceFingerprint.");
    }

    const payload = verifyToken(refreshToken, REFRESH_TOKEN_SECRET);
    if (!payload || payload.typ !== "refresh" || payload.fp !== deviceFingerprint) {
      return apiError(res, 401, "AUTH_INVALID_REFRESH_TOKEN", "Invalid refresh token.");
    }

    const tokenHash = sha256(refreshToken);
    const session = await Session.findOne({ refreshTokenHash: tokenHash, revokedAt: { $exists: false } });
    if (!session || session.expiresAt < new Date()) {
      return apiError(res, 401, "AUTH_REFRESH_SESSION_INVALID", "Refresh session expired or revoked.");
    }

    const user = await User.findOne({ id: payload.sub });
    if (!user || user.status !== "active" || isUserExpired(user)) {
      return apiError(res, 403, "AUTH_USER_NOT_VALID", "User no longer valid.");
    }

    session.revokedAt = new Date();
    await session.save();

    const next = buildLoginPayload(user, deviceFingerprint);
    await new Session({
      userId: user.id,
      refreshTokenHash: sha256(next.refreshToken),
      deviceFingerprint,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000)
    }).save();

    return res.json({ success: true, message: "Refresh success.", ...next });
  } catch (error: any) {
    return apiError(res, 500, "AUTH_REFRESH_FAILED", error.message || "Refresh failed.");
  }
});

app.post("/api/v1/auth/register", async (req: express.Request, res: express.Response) => {
  const { email, password, fullName, company, deviceFingerprint } = req.body || {};
  if (!email || !password) return apiError(res, 400, "AUTH_MISSING_FIELDS", "Missing email/password.");
  const existing = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, "i") } });
  if (existing) return apiError(res, 409, "AUTH_EMAIL_EXISTS", "Email already exists.");

  const user = await new User({
    id: `U${Date.now()}`,
    name: fullName || email.split("@")[0],
    email,
    password,
    company: company || "Individual",
    status: "on_hold",
    licenseType: "trial",
    expirationDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    createdAt: new Date().toISOString().split("T")[0],
    machineIds: []
  }).save();

  if (deviceFingerprint) {
    await new Device({ userId: user.id, fingerprint: deviceFingerprint }).save();
  }

  await new AuditLog({ userId: user.id, action: "register", detail: "new user registered", ip: req.ip }).save();
  return res.json({ success: true, message: "Registered. Waiting for admin activation." });
});

app.post("/api/v1/admin/licenses/:userId/revoke", async (req: express.Request, res: express.Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const userId = req.params.userId;
    const user = await User.findOne({ id: userId });
    if (!user) return apiError(res, 404, "ADMIN_USER_NOT_FOUND", "User not found.");

    user.status = "blocked";
    await user.save();
    await Session.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    await new AuditLog({ userId, action: "license_revoked", detail: "revoked by admin", ip: req.ip }).save();
    return res.json({ success: true, message: "License revoked and active sessions revoked." });
  } catch (error: any) {
    return apiError(res, 500, "ADMIN_REVOKE_FAILED", error.message || "Revoke failed.");
  }
});

app.post("/api/v1/admin/devices/:deviceId/deactivate", async (req: express.Request, res: express.Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const device = await Device.findById(req.params.deviceId);
    if (!device) return apiError(res, 404, "ADMIN_DEVICE_NOT_FOUND", "Device not found.");

    device.status = "deactivated";
    device.lastSeenAt = new Date();
    await device.save();
    await Session.updateMany(
      { userId: device.userId, deviceFingerprint: device.fingerprint, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    await new AuditLog({ userId: device.userId, action: "device_deactivated", detail: `device=${device.id}`, ip: req.ip }).save();
    return res.json({ success: true, message: "Device deactivated." });
  } catch (error: any) {
    return apiError(res, 500, "ADMIN_DEVICE_DEACTIVATE_FAILED", error.message || "Deactivate device failed.");
  }
});

app.get("/api/v1/admin/audit-logs", async (req: express.Request, res: express.Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 500));
    const page = Math.max(1, Number(req.query.page || 1));
    const action = String(req.query.action || "").trim();
    const userId = String(req.query.userId || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const filter: any = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      logs
    });
  } catch (error: any) {
    return apiError(res, 500, "ADMIN_AUDIT_LOGS_FAILED", error.message || "Get audit logs failed.");
  }
});

app.get("/api/v1/admin/metrics", async (req: express.Request, res: express.Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const since = Date.now() - 5 * 60 * 1000;
    metrics.loginFailed5m = metrics.loginFailed5m.filter((t) => t >= since);
    const loginFailSpike = metrics.loginFailed5m.length >= LOGIN_FAIL_SPIKE_THRESHOLD_PER_5M;
    const high5xxRate = metrics.totalRequests >= 20 && (metrics.total5xx / metrics.totalRequests) >= 0.05;
    const latencyHigh = avgLatencyMs() >= 1200;

    return res.json({
      success: true,
      metrics: {
        totalRequests: metrics.totalRequests,
        total5xx: metrics.total5xx,
        avgLatencyMs: avgLatencyMs(),
        loginFailedIn5m: metrics.loginFailed5m.length,
        loginFailSpike,
        high5xxRate,
        latencyHigh,
        alerts: {
          loginFailSpike,
          high5xxRate,
          latencyHigh
        }
      }
    });
  } catch (error: any) {
    return apiError(res, 500, "ADMIN_METRICS_FAILED", error.message || "Get metrics failed.");
  }
});

// --- ADMIN USER CRUD ---

app.get("/api/v1/admin/users", async (req: express.Request, res: express.Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const users = await User.find({}).lean();
    return res.json({ success: true, users });
  } catch (error: any) {
    return apiError(res, 500, "ADMIN_GET_USERS_FAILED", error.message || "Failed to get users.");
  }
});

app.post("/api/v1/admin/users", async (req: express.Request, res: express.Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const data = req.body;
    if (!data?.email) return apiError(res, 400, "ADMIN_MISSING_FIELDS", "Missing email.");
    const existing = await User.findOne({ id: data.id });
    if (existing) return apiError(res, 409, "ADMIN_USER_EXISTS", "User ID already exists.");
    const user = await new User({
      id: data.id || `U${Date.now()}`,
      name: data.name || data.email,
      email: data.email,
      password: data.password || "",
      company: data.company || "",
      status: data.status || "on_hold",
      licenseType: data.licenseType || "trial",
      expirationDate: data.expirationDate || "",
      createdAt: data.createdAt || new Date().toISOString().split("T")[0],
      machineIds: data.machineIds || []
    }).save();
    await new AuditLog({ userId: user.id, action: "admin_add_user", detail: `email=${user.email}`, ip: req.ip }).save();
    return res.json({ success: true, message: "User created.", user });
  } catch (error: any) {
    return apiError(res, 500, "ADMIN_CREATE_USER_FAILED", error.message || "Failed to create user.");
  }
});

app.put("/api/v1/admin/users/:userId", async (req: express.Request, res: express.Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const user = await User.findOne({ id: req.params.userId });
    if (!user) return apiError(res, 404, "ADMIN_USER_NOT_FOUND", "User not found.");
    const { id, _id, ...data } = req.body;
    Object.assign(user, data);
    await user.save();
    await new AuditLog({ userId: user.id, action: "admin_update_user", detail: "full update", ip: req.ip }).save();
    return res.json({ success: true, message: "User updated.", user });
  } catch (error: any) {
    return apiError(res, 500, "ADMIN_UPDATE_USER_FAILED", error.message || "Failed to update user.");
  }
});

app.patch("/api/v1/admin/users/:userId", async (req: express.Request, res: express.Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const user = await User.findOne({ id: req.params.userId });
    if (!user) return apiError(res, 404, "ADMIN_USER_NOT_FOUND", "User not found.");
    const { id, _id, ...patch } = req.body;
    Object.assign(user, patch);
    await user.save();
    await new AuditLog({ userId: user.id, action: "admin_patch_user", detail: JSON.stringify(patch), ip: req.ip }).save();
    return res.json({ success: true, message: "User patched.", user });
  } catch (error: any) {
    return apiError(res, 500, "ADMIN_PATCH_USER_FAILED", error.message || "Failed to patch user.");
  }
});

app.delete("/api/v1/admin/users/:userId", async (req: express.Request, res: express.Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const user = await User.findOne({ id: req.params.userId });
    if (!user) return apiError(res, 404, "ADMIN_USER_NOT_FOUND", "User not found.");
    await User.deleteOne({ id: req.params.userId });
    await Session.updateMany({ userId: req.params.userId }, { $set: { revokedAt: new Date() } });
    await new AuditLog({ userId: req.params.userId, action: "admin_delete_user", detail: "deleted by admin", ip: req.ip }).save();
    return res.json({ success: true, message: "User deleted." });
  } catch (error: any) {
    return apiError(res, 500, "ADMIN_DELETE_USER_FAILED", error.message || "Failed to delete user.");
  }
});

// Legacy action endpoint deprecated after v1 rollout.
app.all("/api/register", (_req: express.Request, res: express.Response) => {
  return apiError(res, 410, "API_LEGACY_DEPRECATED", "Legacy action API deprecated. Use /api/v1/auth/* endpoints.");
});

app.all("/api/login", (_req: express.Request, res: express.Response) => {
  return apiError(res, 410, "API_LEGACY_DEPRECATED", "Legacy login API deprecated. Use /api/v1/auth/login endpoint.");
});

app.all("/api/verify", (_req: express.Request, res: express.Response) => {
  return apiError(res, 410, "API_LEGACY_DEPRECATED", "Legacy verify API deprecated. Use /api/v1/auth/verify endpoint.");
});

app.all("/api/refresh", (_req: express.Request, res: express.Response) => {
  return apiError(res, 410, "API_LEGACY_DEPRECATED", "Legacy refresh API deprecated. Use /api/v1/auth/refresh endpoint.");
});

app.all("/api/action", (_req: express.Request, res: express.Response) => {
  return apiError(res, 410, "API_LEGACY_DEPRECATED", "Legacy action API deprecated. Use /api/v1/auth/* and /api/v1/admin/* endpoints.");
});

// --- HEALTH CHECK (Railway / Docker) ---
app.get("/health", (_req: express.Request, res: express.Response) => {
  const dbState = mongoose.connection.readyState;
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";
  const isHealthy = dbState === 1;
  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    db: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

