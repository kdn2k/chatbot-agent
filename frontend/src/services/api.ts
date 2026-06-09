import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: `${BASE}/api/v1` })

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then((r) => r.data)

export const getMe = () => api.get('/auth/me').then((r) => r.data)

// Agents
export const getAgents = () => api.get('/agents/').then((r) => r.data)
export const pingAgent = (id: string) => api.get(`/agents/${id}/ping`).then((r) => r.data)

// Chat
export const getSessions = () => api.get('/chat/sessions').then((r) => r.data)
export const getMessages = (sessionId: string) =>
  api.get(`/chat/sessions/${sessionId}/messages`).then((r) => r.data)
export const sendMessage = (content: string, session_id?: string) =>
  api.post('/chat/send', { content, session_id }).then((r) => r.data)
export const executeCommand = (message_id: string, agent_server_id: string) =>
  api.post('/chat/execute', { message_id, agent_server_id }).then((r) => r.data)
export const cancelCommand = (messageId: string) =>
  api.post(`/chat/cancel/${messageId}`).then((r) => r.data)
