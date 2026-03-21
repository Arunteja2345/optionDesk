import { Router, Request, Response } from 'express'
import type { IndexName } from '../types'
import { fetchOptionChain, getCachedChain, getExpiryDates, cache } from '../services/OptionChainService'

const router = Router()

// Sensex expiries are on Fridays, Nifty/BankNifty on Thursdays
function getCandidateExpiries(): string[] {
  const candidates: string[] = []
  const now = new Date()
  // Generate next 8 weekly dates (both Thu and Fri to cover all indices)
  for (let i = 0; i < 60; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const day = d.getUTCDay()
    if (day === 4 || day === 5) { // Thursday or Friday
      candidates.push(d.toISOString().split('T')[0])
    }
  }
  return candidates.slice(0, 8)
}

async function findValidExpiry(index: IndexName): Promise<OptionChainResponse | null> {
  const candidates = getCandidateExpiries()
  for (const expiry of candidates) {
    try {
      const data = await fetchOptionChain(index, expiry)
      if (data.aggregatedDetails.expiryDates.length > 0) return data
    } catch {
      continue
    }
  }
  return null
}

// GET /api/optionchain/:index/expiries
router.get('/:index/expiries', async (req: Request, res: Response): Promise<void> => {
  const index = req.params.index as IndexName

  try {
    const data = await findValidExpiry(index)
    if (!data) {
      res.status(500).json({ error: 'Could not fetch expiries for ' + index })
      return
    }
    res.json({
      expiries: data.aggregatedDetails.expiryDates,
      currentExpiry: data.aggregatedDetails.currentExpiry,
    })
  } catch (err: any) {
    console.error('expiries error:', err.message)
    res.status(500).json({ error: 'Failed to fetch expiries' })
  }
})

// GET /api/optionchain/search?q=nifty+25000
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q as string ?? '').toLowerCase().trim()
  if (!query || query.length < 3) {
    res.json([])
    return
  }

  // Parse query: e.g. "nifty 25000" or "banknifty 23500"
  const parts = query.split(/\s+/)
  const indexPart = parts[0]
  const strikePart = parts[1]

  // Map to index name
  const indexMap: Record<string, string> = {
    nifty: 'nifty',
    'bank nifty': 'banknifty',
    banknifty: 'banknifty',
    sensex: 'sensex',
  }
  const indexName = indexMap[indexPart] as IndexName
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

  // Search across all cached expiries for this index
  const results: any[] = []

  for (const [key, chain] of cache.entries()) {
    if (!key.startsWith(indexName)) continue

    const expiry = key.split(':')[1]
    const strike = chain.optionContracts.find(
      (s: any) => s.strikePrice === strikeRaw
    )
    if (!strike) continue

    if (strike.ce) {
      results.push({
        contractId: strike.ce.growwContractId,
        displayName: strike.ce.displayName,
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
      })
    }
    if (strike.pe) {
      results.push({
        contractId: strike.pe.growwContractId,
        displayName: strike.pe.displayName,
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
      })
    }
  }

  // Sort: closest expiry first
  results.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))

  res.json(results.slice(0, 20))
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
    console.error('option chain error:', err.message)
    res.status(500).json({ error: 'Failed to fetch option chain' })
  }
})

// GET /api/optionchain/:index
router.get('/:index', async (req: Request, res: Response): Promise<void> => {
  const index = req.params.index as IndexName
  try {
    // Fetch without expiry — Groww returns current expiry data
    const data = await fetchOptionChain(index, '')
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})


export { router as optionChainRouter }

// need this type for findValidExpiry
import type { OptionChainResponse } from '../types'