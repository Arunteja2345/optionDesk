export function isMarketHours(now: Date = new Date()): boolean {
  // Convert to IST: UTC + 5 hours 30 minutes
  const istOffset = 5.5 * 60 * 60 * 1000
  const ist = new Date(now.getTime() + istOffset)

  const day = ist.getUTCDay()   // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false

  const hours = ist.getUTCHours()
  const minutes = ist.getUTCMinutes()
  const time = hours * 100 + minutes

  // Market open: 9:15 AM to 3:30 PM IST
  return time >= 915 && time <= 1530
}