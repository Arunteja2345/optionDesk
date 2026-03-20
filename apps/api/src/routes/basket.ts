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
// Replace the preview route in basket.ts

router.post('/preview', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const result = basketSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() })
    return
  }

  const { legs } = result.data
  let totalRequired = 0
  const legPreviews = []

  // Separate buy and sell legs for spread margin netting
  const sellLegs = legs.filter(l => l.side === 'SELL')
  const buyLegs = legs.filter(l => l.side === 'BUY')

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

    // For SELL legs in a spread: reduce margin by the long leg premium
    // This mirrors how exchanges give hedge benefit
    let adjustedRequired = marginInfo.requiredAmount

    if (leg.side === 'SELL') {
      // Find matching buy leg of same type (spread hedge)
      const hedgeLeg = buyLegs.find(b =>
        b.optionType === leg.optionType &&
        b.indexName === leg.indexName &&
        b.expiryDate === leg.expiryDate
      )

      if (hedgeLeg) {
        const hedgeStrike = chain?.optionContracts?.find(
          (s: any) => s.strikePrice === hedgeLeg.strikePrice
        )
        const hedgeContract = hedgeLeg.optionType === 'CE'
          ? hedgeStrike?.ce
          : hedgeStrike?.pe
        const hedgeLtp = hedgeContract?.liveData?.ltp ?? 0
        const hedgeQty = Math.min(leg.quantity, hedgeLeg.quantity)

        // Hedge credit = difference between max loss of spread
        // For a vertical spread: max loss = strike difference * lot size
        const strikeDiff = Math.abs(leg.strikePrice - hedgeLeg.strikePrice) / 100
        const maxSpreadLoss = strikeDiff * lotSize * hedgeQty

        // Margin for spread = max possible loss (much lower than naked short)
        const spreadMargin = Math.min(adjustedRequired, maxSpreadLoss)
        adjustedRequired = spreadMargin
      }
    }

    if (leg.side === 'BUY') {
      // Buy legs: full premium cost regardless
      adjustedRequired = marginInfo.requiredAmount
    }

    totalRequired += adjustedRequired

    legPreviews.push({
      ...leg,
      ltp,
      lotSize,
      marginInfo: {
        ...marginInfo,
        requiredAmount: adjustedRequired,
        isHedged: leg.side === 'SELL' && buyLegs.some(b =>
          b.optionType === leg.optionType &&
          b.indexName === leg.indexName
        ),
      },
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
      isSpread: sellLegs.length > 0 && buyLegs.length > 0,
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