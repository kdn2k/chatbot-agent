import { useState } from 'react'
import { executeCommand, cancelCommand } from '../services/api'

interface Agent {
  id: string
  name: string
  os_type: string
  shell_type: string
}

interface CommandPayload {
  command: string
  shell_type: string
  description: string
  suggested_agent?: string
  risk_level: string
}

interface Props {
  messageId: string
  payload: CommandPayload
  agents: Agent[]
  onDone: (updatedMsg: any) => void
}

const RISK_COLORS: Record<string, string> = {
  low: '#00ff88',
  medium: '#ffa500',
  high: '#ff4444',
}

export default function CommandConfirmPanel({ messageId, payload, agents, onDone }: Props) {
  const suggested = agents.find((a) => a.name === payload.suggested_agent) || agents[0]
  const [selectedAgent, setSelectedAgent] = useState<string>(suggested?.id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExecute = async () => {
    if (!selectedAgent) { setError('Select a server first'); return }
    setLoading(true)
    setError('')
    try {
      const updated = await executeCommand(messageId, selectedAgent)
      onDone(updated)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Execution failed')
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setLoading(true)
    try {
      const updated = await cancelCommand(messageId)
      onDone(updated)
    } catch {
      setLoading(false)
    }
  }

  const riskColor = RISK_COLORS[payload.risk_level] || '#ffa500'

  return (
    <div style={{
      background: '#0f1419',
      border: '1px solid #1e2d3d',
      borderLeft: `3px solid ${riskColor}`,
      borderRadius: 6,
      padding: '16px 18px',
      marginTop: 10,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ fontSize: 10, color: riskColor, letterSpacing: 2, marginBottom: 12 }}>
        ⚡ COMMAND PREVIEW — RISK: {payload.risk_level.toUpperCase()}
      </div>

      {/* Command block */}
      <div style={{
        background: '#070b0f',
        border: '1px solid #1e2d3d',
        borderRadius: 4,
        padding: '10px 14px',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 4 }}>
          {payload.shell_type}
        </div>
        <code style={{ color: '#00ff88', fontSize: 13, wordBreak: 'break-all' }}>
          {payload.command}
        </code>
      </div>

      <div style={{ fontSize: 12, color: '#718096', marginBottom: 16 }}>
        {payload.description}
      </div>

      {/* Server selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#00ff88', letterSpacing: 2, marginBottom: 6 }}>
          TARGET SERVER
        </div>
        <select
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
          style={{
            width: '100%',
            background: '#070b0f',
            border: '1px solid #1e2d3d',
            borderRadius: 4,
            padding: '8px 12px',
            color: '#e8eaf0',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.os_type} · {a.shell_type})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 12 }}>✗ {error}</div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleExecute}
          disabled={loading}
          style={{
            flex: 1,
            background: loading ? '#0a3020' : '#00ff88',
            color: '#0a0e13',
            border: 'none',
            borderRadius: 4,
            padding: '10px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'EXECUTING...' : '▶ CONFIRM EXECUTE'}
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          style={{
            flex: 1,
            background: 'transparent',
            color: '#ff6b6b',
            border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: 4,
            padding: '10px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ✗ CANCEL
        </button>
      </div>
    </div>
  )
}
