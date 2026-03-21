import { Router, Request, Response } from 'express'
import type { IndexName, OptionChainResponse } from '../types'
import { fetchOptionChain, getCachedChain, cache } from '../services/OptionChainService'

const router = Router()

const today = () => new Date().toISOString().split('T')[0]

// GET /api/optionchain/search?q=nifty+25000
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q as string ?? '').toLowerCase().trim()

  if (!query || query.length < 3) {
    res.json([])
    return
  }

  const parts = query.split(/\s+/)
  const indexPart = parts[0]
  const strikePart = parts[1]

  const indexMap: Record<string, IndexName> = {
    nifty: 'nifty',
    banknifty: 'banknifty',
    'bank': 'banknifty',
    sensex: 'sensex',
  }

  const indexName = indexMap[indexPart]
  if (!indexName) {
    res.json([])
    return
  }

  const strikeDisplay = strikePart ? parseInt(strikePart) : null
  if (!strikeDisplay || isNaN(strikeDisplay)) {
    res.json([])
    return
  }

  const strikeRaw = strikeDisplay * 100

  try {
    // Step 1: Get all available expiries for this index
    // First try cache, then fetch fresh
    let allExpiries: string[] = []

    // Check if we have any cached chain for this index to get expiry list
    for (const [key, chain] of cache.entries()) {
      if (key.startsWith(indexName + ':')) {
        allExpiries = chain.aggregatedDetails.expiryDates ?? []
        break
      }
    }

    // If no cache, fetch current expiry to get the expiry list
    if (allExpiries.length === 0) {
      try {
        const fresh = await fetchOptionChain(indexName, '')
        allExpiries = fresh.aggregatedDetails.expiryDates ?? []
      } catch {
        res.json([])
        return
      }
    }

    // Step 2: Filter out expired expiries
    const validExpiries = allExpiries.filter(e => e >= today())

    if (validExpiries.length === 0) {
      res.json([])
      return
    }

    // Step 3: Fetch all valid expiries in parallel (use cache where available)
    const chains = await Promise.allSettled(
      validExpiries.map(expiry => {
        const cached = getCachedChain(indexName, expiry)
        if (cached) return Promise.resolve({ expiry, chain: cached })
        return fetchOptionChain(indexName, expiry)
          .then(chain => ({ expiry, chain }))
          .catch(() => null)
      })
    )

    // Step 4: Search each expiry for the strike
    const results: any[] = []

    for (const result of chains) {
      if (result.status !== 'fulfilled' || !result.value) continue

      const { expiry, chain } = result.value as { expiry: string; chain: OptionChainResponse }

      const strike = chain.optionContracts.find(
        (s: any) => s.strikePrice === strikeRaw
      )
      if (!strike) continue

      if (strike.ce) {
        results.push({
          contractId: strike.ce.growwContractId,
          displayName: strike.ce.displayName,
          longDisplayName: strike.ce.longDisplayName,
          indexName,
          strikePrice: strikeRaw,
          displayStrike: strikeDisplay,
          optionType: 'CE',
          expiryDate: expiry,
          ltp: strike.ce.liveData?.ltp ?? 0,
          iv: strike.ce.greeks?.iv ?? 0,
          delta: strike.ce.greeks?.delta ?? 0,
          oi: strike.ce.liveData?.oi ?? 0,
          dayChangePerc: strike.ce.liveData?.dayChangePerc ?? 0,
          isIlliquid: strike.ce.markers?.includes('ILLIQUID') ?? false,
        })
      }

      if (strike.pe) {
        results.push({
          contractId: strike.pe.growwContractId,
          displayName: strike.pe.displayName,
          longDisplayName: strike.pe.longDisplayName,
          indexName,
          strikePrice: strikeRaw,
          displayStrike: strikeDisplay,
          optionType: 'PE',
          expiryDate: expiry,
          ltp: strike.pe.liveData?.ltp ?? 0,
          iv: strike.pe.greeks?.iv ?? 0,
          delta: strike.pe.greeks?.delta ?? 0,
          oi: strike.pe.liveData?.oi ?? 0,
          dayChangePerc: strike.pe.liveData?.dayChangePerc ?? 0,
          isIlliquid: strike.pe.markers?.includes('ILLIQUID') ?? false,
        })
      }
    }

    // Sort: closest expiry first, then CE before PE within same expiry
    results.sort((a, b) => {
      const expiryDiff = a.expiryDate.localeCompare(b.expiryDate)
      if (expiryDiff !== 0) return expiryDiff
      return a.optionType.localeCompare(b.optionType) // CE before PE
    })

    res.json(results)
  } catch (err: any) {
    console.error('Search error:', err.message)
    res.status(500).json({ error: 'Search failed' })
  }
})

// GET /api/optionchain/:index/expiries
router.get('/:index/expiries', async (req: Request, res: Response): Promise<void> => {
  const index = req.params.index as IndexName
  try {
    const data = await fetchOptionChain(index, '')
    res.json({
      expiries: data.aggregatedDetails.expiryDates,
      currentExpiry: data.aggregatedDetails.currentExpiry,
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch expiries' })
  }
})

// GET /api/optionchain/:index/:expiry
router.get('/:index/:expiry', async (req: Request, res: Response): Promise<void> => {
  const index = req.params.index as IndexName
  const expiry = req.params.expiry
  try {
    const cached = getCachedChain(index, expiry)
    if (cached) { res.json(cached); return }
    const data = await fetchOptionChain(index, expiry)
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch option chain' })
  }
})

// GET /api/optionchain/:index
router.get('/:index', async (req: Request, res: Response): Promise<void> => {
  const index = req.params.index as IndexName
  try {
    const data = await fetchOptionChain(index, '')
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export { router as optionChainRouter }