import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuthStore } from '../store/authStore'
import { getSessions, getMessages, sendMessage, getAgents, getMe } from '../services/api'
import CommandConfirmPanel from '../components/CommandConfirmPanel'

interface Message {
  id: string
  session_id: string
  role: string
  content: string
  command_payload?: any
  exec_result?: any
  exec_status?: string
  created_at: string
}

interface Session { id: string; title?: string; created_at: string }
interface Agent { id: string; name: string; os_type: string; shell_type: string; is_active: boolean }

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/login'); return }
    loadInitialData()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadInitialData = async () => {
    try {
      await getMe() // validate token
      const [sess, agts] = await Promise.all([getSessions(), getAgents()])
      setSessions(sess)
      setAgents(agts)
    } catch {
      navigate('/login')
    }
  }

  const loadSession = async (sessionId: string) => {
    setActiveSession(sessionId)
    const msgs = await getMessages(sessionId)
    setMessages(msgs)
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)

    // Optimistic user message
    const tempId = 'temp-' + Date.now()
    setMessages((prev) => [...prev, {
      id: tempId, session_id: activeSession || '',
      role: 'user', content, created_at: new Date().toISOString(),
    }])

    try {
      const reply = await sendMessage(content, activeSession || undefined)
      // Set active session from reply
      if (!activeSession) {
        setActiveSession(reply.session_id)
        const sess = await getSessions()
        setSessions(sess)
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        reply,
      ])
    } catch (e: any) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempId),
        {
          id: 'err-' + Date.now(),
          session_id: activeSession || '',
          role: 'assistant',
          content: 'Error: ' + (e.response?.data?.detail || e.message),
          created_at: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleCommandDone = (updatedMsg: Message) => {
    setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)))
  }

  const newChat = () => {
    setActiveSession(null)
    setMessages([])
    inputRef.current?.focus()
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#070b0f',
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      color: '#e8eaf0',
    }}>

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div style={{
          width: 260, flexShrink: 0,
          background: '#0a0e13',
          borderRight: '1px solid #1e2d3d',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Logo */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e2d3d',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#00ff88',
              boxShadow: '0 0 6px #00ff88',
            }}/>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: '#00ff88' }}>
              OPS CONSOLE
            </span>
          </div>

          {/* New chat */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d3d' }}>
            <button onClick={newChat} style={{
              width: '100%',
              background: 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.2)',
              borderRadius: 4,
              padding: '8px',
              color: '#00ff88',
              fontSize: 11,
              letterSpacing: 2,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              + NEW SESSION
            </button>
          </div>

          {/* Sessions list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {sessions.length === 0 && (
              <div style={{ padding: '16px', fontSize: 11, color: '#2d3748', textAlign: 'center' }}>
                No sessions yet
              </div>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => loadSession(s.id)}
                style={{
                  padding: '10px 20px',
                  cursor: 'pointer',
                  background: activeSession === s.id ? 'rgba(0,255,136,0.06)' : 'transparent',
                  borderLeft: activeSession === s.id ? '2px solid #00ff88' : '2px solid transparent',
                  fontSize: 12,
                  color: activeSession === s.id ? '#e8eaf0' : '#4a5568',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  transition: 'all 0.15s',
                }}
              >
                ▸ {s.title || 'Session'}
              </div>
            ))}
          </div>

          {/* Agents status */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2d3d' }}>
            <div style={{ fontSize: 10, color: '#2d3748', letterSpacing: 2, marginBottom: 8 }}>
              AGENTS
            </div>
            {agents.map((a) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: a.is_active ? '#00ff88' : '#ff4444',
                }}/>
                <span style={{ fontSize: 11, color: '#718096' }}>{a.name}</span>
              </div>
            ))}
          </div>

          {/* User */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #1e2d3d',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, color: '#e8eaf0' }}>{user?.username || '...'}</div>
              <div style={{ fontSize: 10, color: '#2d3748' }}>{user?.is_admin ? 'ADMIN' : 'USER'}</div>
            </div>
            <button onClick={handleLogout} style={{
              background: 'transparent',
              border: '1px solid #1e2d3d',
              borderRadius: 4,
              padding: '4px 10px',
              color: '#4a5568',
              fontSize: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: 1,
            }}>
              EXIT
            </button>
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #1e2d3d',
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#0a0e13',
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            background: 'transparent', border: 'none',
            color: '#4a5568', cursor: 'pointer', fontSize: 16, padding: '0 4px',
          }}>☰</button>
          <span style={{ fontSize: 11, color: '#4a5568', letterSpacing: 1 }}>
            {activeSession ? `SESSION: ${activeSession.slice(0, 8).toUpperCase()}` : 'NEW SESSION'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {agents.map((a) => (
              <div key={a.id} title={a.name} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, color: '#4a5568',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: a.is_active ? '#00ff88' : '#ff4444' }}/>
                {a.name}
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.15 }}>⚡</div>
              <div style={{ fontSize: 13, color: '#2d3748', letterSpacing: 2 }}>
                READY FOR COMMANDS
              </div>
              <div style={{ fontSize: 11, color: '#1a2030', marginTop: 8 }}>
                Type your server operation request below
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} style={{
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '100%',
            }}>
              {/* Role label */}
              <div style={{
                fontSize: 9, letterSpacing: 2,
                color: msg.role === 'user' ? '#00ff88' : '#4a5568',
                marginBottom: 4,
              }}>
                {msg.role === 'user' ? `▸ ${user?.username?.toUpperCase()}` : '▸ SYSTEM'}
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '78%',
                background: msg.role === 'user' ? 'rgba(0,255,136,0.06)' : '#0f1419',
                border: `1px solid ${msg.role === 'user' ? 'rgba(0,255,136,0.15)' : '#1e2d3d'}`,
                borderRadius: msg.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                padding: '12px 16px',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#c5c8d6',
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>

                {/* Command confirm panel */}
                {msg.role === 'assistant' && msg.command_payload && msg.exec_status === 'pending' && (
                  <CommandConfirmPanel
                    messageId={msg.id}
                    payload={msg.command_payload}
                    agents={agents.filter((a) => a.is_active)}
                    onDone={handleCommandDone}
                  />
                )}

                {/* Execution result */}
                {msg.exec_result && (
                  <div style={{
                    marginTop: 12,
                    background: '#070b0f',
                    border: `1px solid ${msg.exec_result.success ? 'rgba(0,255,136,0.2)' : 'rgba(255,68,68,0.2)'}`,
                    borderRadius: 4,
                    padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: 10, color: msg.exec_result.success ? '#00ff88' : '#ff6b6b', letterSpacing: 2, marginBottom: 6 }}>
                      {msg.exec_result.success ? '✓ EXECUTED' : '✗ FAILED'} — exit {msg.exec_result.exitCode ?? msg.exec_result.exit_code ?? '?'} — {msg.exec_result.durationMs?.toFixed(0) ?? '?'}ms
                    </div>
                    {msg.exec_result.output && (
                      <pre style={{ margin: 0, fontSize: 11, color: '#718096', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {msg.exec_result.output}
                      </pre>
                    )}
                    {msg.exec_result.error && (
                      <pre style={{ margin: 0, fontSize: 11, color: '#ff6b6b', whiteSpace: 'pre-wrap' }}>
                        {msg.exec_result.error}
                      </pre>
                    )}
                  </div>
                )}

                {/* Status badges */}
                {msg.exec_status && msg.exec_status !== 'pending' && (
                  <div style={{
                    marginTop: 8,
                    fontSize: 10, letterSpacing: 2,
                    color: {
                      executed: '#00ff88',
                      failed: '#ff6b6b',
                      cancelled: '#4a5568',
                      confirmed: '#ffa500',
                    }[msg.exec_status] || '#4a5568',
                  }}>
                    [{msg.exec_status.toUpperCase()}]
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4, marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: '#4a5568', letterSpacing: 2 }}>▸ SYSTEM</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: '#00ff88',
                    animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                  }}/>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef}/>
        </div>

        {/* Input */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #1e2d3d',
          background: '#0a0e13',
        }}>
          <div style={{
            display: 'flex', gap: 12, alignItems: 'flex-end',
            background: '#0f1419',
            border: '1px solid #1e2d3d',
            borderRadius: 6,
            padding: '4px 4px 4px 16px',
          }}>
            <span style={{ color: '#00ff88', fontSize: 13, paddingBottom: 10, opacity: 0.5 }}>$</span>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the operation you want to perform..."
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e8eaf0',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'none',
                paddingTop: 10,
                paddingBottom: 10,
                lineHeight: 1.5,
                maxHeight: 120,
                overflowY: 'auto',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              style={{
                background: !input.trim() || sending ? '#0a3020' : '#00ff88',
                color: '#0a0e13',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                margin: '4px',
                alignSelf: 'flex-end',
              }}
            >
              {sending ? '...' : 'SEND'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#1a2030', marginTop: 8, textAlign: 'center' }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        * { scrollbar-width: thin; scrollbar-color: #1e2d3d #070b0f; }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-track { background: #070b0f; }
        *::-webkit-scrollbar-thumb { background: #1e2d3d; border-radius: 2px; }
        code { font-family: inherit; }
        pre { font-family: inherit; }
      `}</style>
    </div>
  )
}
