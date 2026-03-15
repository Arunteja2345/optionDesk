import axios from 'axios'
import type { OptionChainResponse, IndexName } from '../types'

// These are the exact slugs Groww API accepts
const INDEX_SLUG: Record<IndexName, string> = {
  nifty: 'nifty',
  banknifty: 'bank-nifty',
  sensex: 'sensex',
}

const cache = new Map<string, OptionChainResponse>()
const lastFetch = new Map<string, number>()

export async function fetchOptionChain(
  index: IndexName,
  expiry: string
): Promise<OptionChainResponse> {
  const key = `${index}:${expiry}`
  const slug = INDEX_SLUG[index]
  const url = `https://groww.in/v1/pro-option-chain/${slug}?expiryDate=${expiry}&responseStructure=LIST`

  try {
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://groww.in/',
        'Origin': 'https://groww.in',
      }
    })
    const parsed = parseGrowwResponse(data)
    cache.set(key, parsed)
    lastFetch.set(key, Date.now())
    return parsed
  } catch (err: any) {
    console.error(`fetchOptionChain failed for ${index}:${expiry}`, err?.response?.status, err?.response?.data)
    if (cache.has(key)) return cache.get(key)!
    throw err
  }
}

export function getCachedChain(index: IndexName, expiry: string) {
  return cache.get(`${index}:${expiry}`) ?? null
}

export function getAllCachedKeys() {
  return Array.from(cache.keys())
}

function parseGrowwResponse(raw: any): OptionChainResponse {
  const chain = raw.optionChain
  const contracts = chain.optionContracts ?? []

  return {
    optionContracts: contracts,
    aggregatedDetails: {
      currentExpiry: chain.aggregatedDetails?.currentExpiry ?? '',
      expiryDates: chain.aggregatedDetails?.expiryDates ?? [],
      lotSize: chain.aggregatedDetails?.lotSize ?? 25,
      freezeQty: chain.aggregatedDetails?.freezeQty ?? 0,
      maxOI: Math.max(
        1,
        ...contracts.flatMap((s: any) => [
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