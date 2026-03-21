import { useEffect } from 'react'
import { useWatchlistStore } from '../stores/useWatchlistStore'

export type { WatchlistItem } from '../stores/useWatchlistStore'

export function useWatchlist() {
  const store = useWatchlistStore()

  useEffect(() => {
    // Fetch only once (prevents duplicate API calls)
    if (store.items.length === 0) {
      store.fetch()
    }
  }, [])

  return {
    items: store.items,
    loading: store.loading,
    add: store.add,
    remove: store.remove,
    isWatched: store.isWatched,
    refresh: store.fetch, // optional manual refresh
  }
}