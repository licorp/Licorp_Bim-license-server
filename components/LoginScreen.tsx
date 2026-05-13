
import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight, ShieldCheck, Eye, EyeOff, Layers } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  speed: Math.random() * 0.4 + 0.1,
  opacity: Math.random() * 0.5 + 0.1,
}));

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const ADMIN_USER = (import.meta as any).env?.VITE_ADMIN_USER;
  const ADMIN_PASS = (import.meta as any).env?.VITE_ADMIN_PASS;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [particles, setParticles] = useState(PARTICLES);
  const animRef = useRef<number | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('admin_rem_user');
    const savedPass = localStorage.getItem('admin_rem_pass');
    if (savedUser && savedPass) {
      setUsername(savedUser);
      setPassword(savedPass);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const animate = () => {
      tickRef.current += 1;
      if (tickRef.current % 2 === 0) {
        setParticles(prev =>
          prev.map(p => ({
            ...p,
            y: p.y - p.speed < -5 ? 105 : p.y - p.speed,
            x: p.x + Math.sin((tickRef.current + p.id * 30) * 0.01) * 0.05,
          }))
        );
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!ADMIN_USER || !ADMIN_PASS) {
      setError('Thiếu cấu hình. Vui lòng set VITE_ADMIN_USER và VITE_ADMIN_PASS trong file .env');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      if (username === ADMIN_USER && password === ADMIN_PASS) {
        if (rememberMe) {
          localStorage.setItem('admin_rem_user', username);
          localStorage.setItem('admin_rem_pass', password);
        } else {
          localStorage.removeItem('admin_rem_user');
          localStorage.removeItem('admin_rem_pass');
        }
        onLogin();
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không đúng');
        setLoading(false);
      }
    }, 900);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a3e 40%, #0d1b3e 70%, #0a0a1f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* Animated background orbs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'orbFloat 8s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'orbFloat2 10s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '30%', right: '5%',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)',
        filter: 'blur(30px)', animation: 'orbFloat 12s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }} />

      {/* Floating particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.6)',
          opacity: p.opacity,
          pointerEvents: 'none',
          boxShadow: `0 0 ${p.size * 2}px rgba(99,102,241,0.4)`,
        }} />
      ))}

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Login Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
        animation: 'cardIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>

        {/* Logo area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(99,102,241,0.5)',
            marginBottom: '1.25rem',
            animation: 'logoGlow 3s ease-in-out infinite',
          }}>
            <Layers style={{ width: '30px', height: '30px', color: '#fff' }} />
          </div>
          <h1 style={{
            fontSize: '1.35rem', fontWeight: 700,
            color: '#f1f5f9',
            letterSpacing: '-0.02em',
            textAlign: 'center',
            marginBottom: '0.35rem',
          }}>
            BIM Tool License Manager
          </h1>
          <p style={{
            fontSize: '0.78rem', color: 'rgba(148,163,184,0.8)',
            fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            Admin Control Panel
          </p>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)',
          marginBottom: '1.75rem',
        }} />

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Username */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(148,163,184,0.9)', marginBottom: '0.5rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.7rem 1rem',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                color: '#111827',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={e => {
                e.target.style.border = '1px solid rgba(99,102,241,0.8)';
                e.target.style.background = 'rgba(255,255,255,0.98)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)';
              }}
              onBlur={e => {
                e.target.style.border = '1px solid rgba(255,255,255,0.2)';
                e.target.style.background = 'rgba(255,255,255,0.92)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(148,163,184,0.9)', marginBottom: '0.5rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '0.7rem 2.75rem 0.7rem 1rem',
                  background: 'rgba(255,255,255,0.92)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  color: '#111',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={e => {
                  e.target.style.border = '1px solid rgba(99,102,241,0.8)';
                  e.target.style.background = 'rgba(255,255,255,0.98)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)';
                }}
                onBlur={e => {
                  e.target.style.border = '1px solid rgba(255,255,255,0.2)';
                  e.target.style.background = 'rgba(255,255,255,0.92)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(148,163,184,0.6)', padding: '0.2rem',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              style={{
                width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                border: rememberMe ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.2)',
                background: rememberMe ? '#6366f1' : 'transparent',
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {rememberMe && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span style={{ fontSize: '0.82rem', color: 'rgba(148,163,184,0.8)', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setRememberMe(!rememberMe)}>
              Ghi nhớ tài khoản
            </span>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              animation: 'shakeIn 0.4s ease',
            }}>
              <ShieldCheck style={{ width: '15px', height: '15px', color: '#f87171', flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: '0.82rem', color: '#f87171', lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.8rem 1.5rem',
              background: loading
                ? 'rgba(99,102,241,0.5)'
                : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none', borderRadius: '12px',
              color: '#fff', fontWeight: 700, fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: loading ? 'none' : '0 8px 25px rgba(99,102,241,0.4)',
              transition: 'all 0.25s',
              letterSpacing: '0.02em',
              marginTop: '0.25rem',
            }}
            onMouseEnter={e => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 35px rgba(99,102,241,0.5)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = loading ? 'none' : '0 8px 25px rgba(99,102,241,0.4)';
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Lock style={{ width: '15px', height: '15px' }} />
                <span>Đăng nhập Admin</span>
                <ArrowRight style={{ width: '15px', height: '15px' }} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.72rem', color: 'rgba(100,116,139,0.7)', lineHeight: 1.6 }}>
            © 2024 BIM Tool License Manager<br />
            <span style={{ color: 'rgba(99,102,241,0.6)' }}>● </span>
            Bảo mật & Đồng bộ thời gian thực
          </p>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.97); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, -30px) scale(1.08); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 8px 30px rgba(99,102,241,0.5); }
          50% { box-shadow: 0 8px 50px rgba(139,92,246,0.7); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shakeIn {
          0% { opacity: 0; transform: translateX(-6px); }
          60% { transform: translateX(4px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        input::placeholder { color: rgba(100,116,139,0.6); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px rgba(255,255,255,0.95) inset !important;
          -webkit-text-fill-color: #111827 !important;
        }
      `}</style>
    </div>
  );
};
