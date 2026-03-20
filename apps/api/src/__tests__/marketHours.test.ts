import { isMarketHours } from '../utils/marketHours'

// Create a UTC Date that represents a specific IST time
// IST = UTC + 5:30, so to get IST time X, set UTC to X - 5:30
function makeDate(dayOfWeek: number, istHour: number, istMinute: number): Date {
  // Start from a known Monday (2024-01-01 was a Monday)
  const base = new Date('2024-01-01T00:00:00.000Z') // Monday UTC midnight

  // Adjust to the desired day of week (0=Sun, 1=Mon ... 6=Sat)
  // Jan 1 2024 = Monday = day 1
  const baseDayOfWeek = 1
  const dayDiff = dayOfWeek - baseDayOfWeek
  base.setUTCDate(base.getUTCDate() + dayDiff)

  // Set the UTC time such that IST = istHour:istMinute
  // UTC = IST - 5:30
  let utcHour = istHour - 5
  let utcMinute = istMinute - 30

  if (utcMinute < 0) {
    utcMinute += 60
    utcHour -= 1
  }
  if (utcHour < 0) {
    utcHour += 24
    base.setUTCDate(base.getUTCDate() - 1)
  }

  base.setUTCHours(utcHour, utcMinute, 0, 0)
  return base
}

describe('isMarketHours', () => {
  test('open at 9:15 AM IST Monday', () => {
    expect(isMarketHours(makeDate(1, 9, 15))).toBe(true)
  })

  test('open at 10:30 AM IST Wednesday', () => {
    expect(isMarketHours(makeDate(3, 10, 30))).toBe(true)
  })

  test('open at 3:30 PM IST Friday (closing boundary)', () => {
    expect(isMarketHours(makeDate(5, 15, 30))).toBe(true)
  })

  test('open at 12:00 PM IST Tuesday', () => {
    expect(isMarketHours(makeDate(2, 12, 0))).toBe(true)
  })

  test('closed at 9:14 AM IST (one minute before open)', () => {
    expect(isMarketHours(makeDate(1, 9, 14))).toBe(false)
  })

  test('closed at 3:31 PM IST (one minute after close)', () => {
    expect(isMarketHours(makeDate(1, 15, 31))).toBe(false)
  })

  test('closed at 8:00 AM IST (early morning)', () => {
    expect(isMarketHours(makeDate(1, 8, 0))).toBe(false)
  })

  test('closed at 6:00 PM IST (evening)', () => {
    expect(isMarketHours(makeDate(1, 18, 0))).toBe(false)
  })

  test('closed on Saturday at 11:00 AM IST', () => {
    expect(isMarketHours(makeDate(6, 11, 0))).toBe(false)
  })

  test('closed on Sunday at 11:00 AM IST', () => {
    expect(isMarketHours(makeDate(0, 11, 0))).toBe(false)
  })
})