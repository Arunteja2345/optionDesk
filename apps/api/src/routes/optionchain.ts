import { Router, Request, Response } from 'express'
import { fetchOptionChain, getCachedChain } from '../services/OptionChainService'
import type { IndexName } from '../types'

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
  const expiry = req.query.expiry as string

  if (!expiry) {
    res.status(400).json({ error: 'expiry query param required' })
    return
  }

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

export { router as optionChainRouter }

// need this type for findValidExpiry
import type { OptionChainResponse } from '../types'