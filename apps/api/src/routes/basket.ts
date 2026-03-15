import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { placeOrder, calculateMargin } from '../services/OrderService'
import { getCachedChain } from '../services/OptionChainService'
import { z } from 'zod'

const router = Router()

const legSchema = z.object({
  contractId: z.string(),
  indexName: z.enum(['nifty', 'banknifty', 'sensex']),
  strikePrice: z.number(),
  expiryDate: z.string(),
  optionType: z.enum(['CE', 'PE']),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().min(1),   // lots
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
  limitPrice: z.number().optional(),
})

const basketSchema = z.object({
  name: z.string().optional(),
  legs: z.array(legSchema).min(1).max(4),
})

// Preview basket — show margin, cost, payoff summary before executing
router.post('/preview', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const result = basketSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { legs } = result.data
  let totalRequired = 0
  const legPreviews = []

  for (const leg of legs) {
    const chain = getCachedChain(leg.indexName, leg.expiryDate)
    const strike = chain?.optionContracts?.find(
      (s: any) => s.strikePrice === leg.strikePrice
    )
    const contract = leg.optionType === 'CE' ? strike?.ce : strike?.pe
    const ltp = contract?.liveData?.ltp ?? 0
    const underlyingLtp = chain?.underlyingLtp ?? 0
    const lotSize = chain?.aggregatedDetails?.lotSize ?? 65

    const marginInfo = calculateMargin(leg.side, leg.quantity, lotSize, ltp, underlyingLtp)
    totalRequired += marginInfo.requiredAmount

    legPreviews.push({
      ...leg,
      ltp,
      lotSize,
      marginInfo,
      displayStrike: leg.strikePrice / 100,
    })
  }

  res.json({
    legs: legPreviews,
    totalRequired,
    summary: {
      buyLegs: legs.filter(l => l.side === 'BUY').length,
      sellLegs: legs.filter(l => l.side === 'SELL').length,
      totalLegs: legs.length,
    }
  })
})

// Execute all legs atomically
router.post('/execute', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const result = basketSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { legs } = result.data
  const userId = req.userId!
  const results = []
  const errors = []

  for (const leg of legs) {
    try {
      const orderResult = await placeOrder({ ...leg, userId })
      results.push({ success: true, leg, order: orderResult.order, marginInfo: orderResult.marginInfo })
    } catch (err: any) {
      errors.push({ leg, error: err.message })
      // If any leg fails, stop and report
      break
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      message: `Basket partially failed. ${results.length} of ${legs.length} legs executed.`,
      executed: results,
      failed: errors,
    })
    return
  }

  res.json({
    message: `All ${legs.length} legs executed successfully`,
    executed: results,
  })
})

export { router as basketRouter }