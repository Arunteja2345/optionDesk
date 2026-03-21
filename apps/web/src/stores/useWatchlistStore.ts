import { create } from 'zustand'
import { api } from '../services/api'

export interface WatchlistItem {
  id: string
  contractId: string
  indexName: string
  strikePrice: number
  optionType: 'CE' | 'PE'
  expiryDate: string
  addedAt: string
}

interface WatchlistState {
  items: WatchlistItem[]
  loading: boolean
  fetch: () => Promise<void>
  add: (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => Promise<{ success: boolean; error?: string }>
  remove: (id: string) => Promise<void>
  isWatched: (contractId: string) => boolean
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/api/watchlist')
      set({ items: data })
    } catch (e) {
      console.error('Failed to fetch watchlist:', e)
    } finally {
      set({ loading: false })
    }
  },

  add: async (item) => {
    try {
      const { data } = await api.post('/api/watchlist', item)
      set(state => ({ items: [...state.items, data] }))
      return { success: true }
    } catch (e: any) {
      return {
        success: false,
        error: e.response?.data?.error || 'Failed to add to watchlist'
      }
    }
  },

  remove: async (id) => {
    // Optimistic update — remove immediately from UI
    set(state => ({ items: state.items.filter(i => i.id !== id) }))
    try {
      await api.delete(`/api/watchlist/${id}`)
    } catch (e) {
      // Rollback on failure — refetch
      get().fetch()
      console.error('Failed to remove from watchlist:', e)
    }
  },

  isWatched: (contractId) => {
    return get().items.some(i => i.contractId === contractId)
  },
}))