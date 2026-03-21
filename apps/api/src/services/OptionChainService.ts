import axios from 'axios'
import type { OptionChainResponse, IndexName } from '../types'

const INDEX_SLUG_MAP: Record<IndexName, string> = {
  nifty: 'nifty',
  banknifty: 'nifty-bank',
  sensex: 'sp-bse-sensex',
}

// Required headers — Groww blocks requests without these
const GROWW_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:148.0) Gecko/20100101 Firefox/148.0',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'x-platform': 'web',
  'X-APP-ID': 'growwWeb',
  'x-device-type': 'desktop',
  'Referer': 'https://groww.in/options/nifty',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
}

const cache = new Map<string, OptionChainResponse>()

export async function fetchOptionChain(
  index: IndexName,
  expiry: string
): Promise<OptionChainResponse> {
  const slug = INDEX_SLUG_MAP[index]
  const key = `${index}:${expiry}`

  // Build URL — expiry is optional (omit to get current expiry)
  const url = expiry
    ? `https://groww.in/v1/pro-option-chain/${slug}?expiryDate=${expiry}&responseStructure=LIST`
    : `https://groww.in/v1/pro-option-chain/${slug}?responseStructure=LIST`

  try {
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: {
        ...GROWW_HEADERS,
        // Referer changes per index
        'Referer': `https://groww.in/options/${slug}`,
      },
    })
    const parsed = parseGrowwResponse(data)
    cache.set(key, parsed)
    return parsed
  } catch (err: any) {
    console.error(`Groww API error for ${index}:`, err?.response?.status, err?.message)
    if (cache.has(key)) return cache.get(key)!
    throw new Error(`Failed to fetch option chain for ${index}`)
  }
}

export function getCachedChain(index: IndexName, expiry: string) {
  return cache.get(`${index}:${expiry}`) ?? null
}

export function getExpiryDates(index: IndexName): string[] {
  // Return from any cached chain for this index
  for (const [key, val] of cache.entries()) {
    if (key.startsWith(index)) {
      return val.aggregatedDetails.expiryDates
    }
  }
  return []
}

function parseGrowwResponse(raw: any): OptionChainResponse {
  const chain = raw.optionChain
  const contracts = chain.optionContracts ?? []
  
  const allOI = contracts.flatMap((s: any) => [
    s.ce?.liveData?.oi ?? 0,
    s.pe?.liveData?.oi ?? 0,
  ])

  return {
    optionContracts: contracts,
    aggregatedDetails: {
      ...chain.aggregatedDetails,
      maxOI: allOI.length ? Math.max(...allOI) : 1,
    },
    underlyingLtp: raw.company?.liveData?.ltp ?? 0,
    underlyingChange: raw.company?.liveData?.dayChange ?? 0,
    underlyingChangePerc: raw.company?.liveData?.dayChangePerc ?? 0,
  }
}

export {cache};