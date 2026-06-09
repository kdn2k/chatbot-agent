import { create } from 'zustand'

interface User {
  id: string
  username: string
  email: string
  full_name?: string
  is_admin: boolean
}

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },
}))
