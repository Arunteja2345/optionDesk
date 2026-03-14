import axios from 'axios'
import { OptionChainResponse, IndexName } from '@shared/types'

const INDEX_MAP: Record<IndexName, string> = {
  nifty: 'nifty',
  banknifty: 'banknifty',
  sensex: 'sensex',
}

// In-memory cache: { 'nifty:2026-03-24': OptionChainResponse }
const cache = new Map<string, OptionChainResponse>()
const lastFetch = new Map<string, number>()

export async function fetchOptionChain(
  index: IndexName,
  expiry: string
): Promise<OptionChainResponse> {
  const key = `${index}:${expiry}`
  const url = `https://groww.in/v1/pro-option-chain/${INDEX_MAP[index]}?expiryDate=${expiry}&responseStructure=LIST`

  try {
    const { data } = await axios.get(url, { timeout: 5000 })
    const parsed = parseGrowwResponse(data)
    cache.set(key, parsed)
    lastFetch.set(key, Date.now())
    return parsed
  } catch (err) {
    // Return stale cache if available
    if (cache.has(key)) return cache.get(key)!
    throw err
  }
}

export function getCachedChain(index: IndexName, expiry: string) {
  return cache.get(`${index}:${expiry}`) ?? null
}

function parseGrowwResponse(raw: any): OptionChainResponse {
  const chain = raw.optionChain
  return {
    optionContracts: chain.optionContracts,
    aggregatedDetails: {
      ...chain.aggregatedDetails,
      maxOI: Math.max(
        ...chain.optionContracts.flatMap((s: any) => [
          s.ce?.liveData?.oi ?? 0,
          s.pe?.liveData?.oi ?? 0,
        ])
      ),
    },
    underlyingLtp: raw.company?.liveData?.ltp ?? 0,
    underlyingChange: raw.company?.liveData?.dayChange ?? 0,
    underlyingChangePerc: raw.company?.liveData?.dayChangePerc ?? 0,
  }
}