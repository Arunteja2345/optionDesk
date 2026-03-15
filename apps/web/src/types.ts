
export type OrderSide = 'BUY' | 'SELL'
export type OrderStatus = 'pending' | 'executed' | 'cancelled' | 'rejected'
export type OptionType = 'CE' | 'PE'
export type IndexName = 'nifty' | 'banknifty' | 'sensex'

export interface LiveData {
  ltp: number
  close: number
  dayChange: number
  dayChangePerc: number
  oi: number
  prevOI: number
}

export interface Greeks {
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
  iv: number
  pop: number
}

export interface OptionContract {
  growwContractId: string
  displayName: string
  token: string
  marketLot: number
  liveData: LiveData
  greeks: Greeks
  markers: string[]
}

export interface OptionStrike {
  strikePrice: number
  ce: OptionContract
  pe: OptionContract
}

export interface OptionChainResponse {
  optionContracts: OptionStrike[]
  aggregatedDetails: {
    currentExpiry: string
    expiryDates: string[]
    lotSize: number
    freezeQty: number
    maxOI: number
  }
  underlyingLtp: number
  underlyingChange: number
  underlyingChangePerc: number
}