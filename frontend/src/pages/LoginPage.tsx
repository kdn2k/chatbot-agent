import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(username, password)
      setAuth(data.access_token, data.user)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0e13',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}/>

      <div style={{ width: 400, position: 'relative' }}>
        {/* Header bar */}
        <div style={{
          background: '#00ff88',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: '6px 6px 0 0',
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0a3020' }}/>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0a3020' }}/>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0a3020' }}/>
          <span style={{ marginLeft: 8, fontSize: 11, color: '#0a3020', fontWeight: 700, letterSpacing: 2 }}>
            WEBCHAT_OPS // AUTH
          </span>
        </div>

        {/* Main card */}
        <div style={{
          background: '#0f1419',
          border: '1px solid #1e2d3d',
          borderTop: 'none',
          padding: '40px 36px 36px',
          borderRadius: '0 0 6px 6px',
        }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, color: '#00ff88', letterSpacing: 3, marginBottom: 8 }}>
              SYSTEM ACCESS
            </div>
            <div style={{ fontSize: 22, color: '#e8eaf0', fontWeight: 700, letterSpacing: -0.5 }}>
              Operations Console
            </div>
            <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>
              Authenticate to continue
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 10, color: '#00ff88', letterSpacing: 2, marginBottom: 6 }}>
                USERNAME
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="enter username"
                autoComplete="username"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0a0e13',
                  border: '1px solid #1e2d3d',
                  borderRadius: 4,
                  padding: '10px 14px',
                  color: '#e8eaf0',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#00ff88'}
                onBlur={e => e.target.style.borderColor = '#1e2d3d'}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 10, color: '#00ff88', letterSpacing: 2, marginBottom: 6 }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0a0e13',
                  border: '1px solid #1e2d3d',
                  borderRadius: 4,
                  padding: '10px 14px',
                  color: '#e8eaf0',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#00ff88'}
                onBlur={e => e.target.style.borderColor = '#1e2d3d'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,59,48,0.1)',
                border: '1px solid rgba(255,59,48,0.3)',
                borderRadius: 4,
                padding: '10px 14px',
                marginBottom: 20,
                fontSize: 12,
                color: '#ff6b6b',
              }}>
                ✗ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#0a3020' : '#00ff88',
                color: '#0a0e13',
                border: 'none',
                borderRadius: 4,
                padding: '12px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 2,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'AUTHENTICATING...' : '▶ CONNECT'}
            </button>
          </form>

          <div style={{ marginTop: 20, fontSize: 11, color: '#2d3748', textAlign: 'center' }}>
            Default: admin / Admin@123
          </div>
        </div>
      </div>
    </div>
  )
}
