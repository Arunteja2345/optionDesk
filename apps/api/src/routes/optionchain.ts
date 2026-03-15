import { Router, Request, Response } from 'express'
import { fetchOptionChain, getCachedChain } from '../services/OptionChainService'
import type { IndexName } from '../types'

const router = Router()

// GET /api/optionchain/:index/expiries
router.get('/:index/expiries', async (req: Request, res: Response): Promise<void> => {
  const index = req.params.index as IndexName
  // Use a default near expiry to fetch the expiry list
  const defaultExpiry = getNextThursday()
  
  try {
    const data = await fetchOptionChain(index, defaultExpiry)
    res.json({ expiries: data.aggregatedDetails.expiryDates })
  } catch {
    res.status(500).json({ error: 'Failed to fetch expiries' })
  }
})

// GET /api/optionchain/:index (returns cached or fetches with nearest expiry)
router.get('/:index', async (req: Request, res: Response): Promise<void> => {
  const index = req.params.index as IndexName
  const expiry = req.query.expiry as string ?? getNextThursday()
  
  try {
    const cached = getCachedChain(index, expiry)
    if (cached) {
      res.json(cached)
      return
    }
    const data = await fetchOptionChain(index, expiry)
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to fetch option chain' })
  }
})

// GET /api/optionchain/:index/:expiry
router.get('/:index/:expiry', async (req: Request, res: Response): Promise<void> => {
  const index = req.params.index as IndexName
  const expiry = req.params.expiry
  
  try {
    const cached = getCachedChain(index, expiry)
    if (cached) {
      res.json(cached)
      return
    }
    const data = await fetchOptionChain(index, expiry)
    res.json(data)
  } catch {
    res.status(500).json({ error: 'Failed to fetch option chain' })
  }
})

function getNextThursday(): string {
  const now = new Date()
  const day = now.getDay()
  const daysUntilThursday = (4 - day + 7) % 7 || 7
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntilThursday)
  return next.toISOString().split('T')[0]
}

export { router as optionChainRouter }