import { useState, useEffect, useCallback } from 'react'
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

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/watchlist')
      setItems(data)
    } catch (e) {
      console.error('Failed to fetch watchlist:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = async (item: Omit<WatchlistItem, 'id' | 'addedAt'>) => {
    try {
      const { data } = await api.post('/api/watchlist', item)
      setItems(prev => [...prev, data])
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.response?.data?.error || 'Failed to add' }
    }
  }

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/watchlist/${id}`)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (e) {
      console.error('Failed to remove:', e)
    }
  }

  const isWatched = (contractId: string) =>
    items.some(i => i.contractId === contractId)

  return { items, loading, add, remove, isWatched, refresh: fetch }
}