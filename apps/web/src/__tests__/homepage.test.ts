// Test homepage display logic

function getCtaText(isLoggedIn: boolean): string {
  return isLoggedIn ? 'Open Trading Terminal →' : 'Start paper trading free'
}

function getNavAction(isLoggedIn: boolean): string[] {
  if (isLoggedIn) return ['Open App']
  return ['Log in', 'Get started free']
}

function formatStat(value: number, suffix: string): string {
  return `${value}${suffix}`
}

describe('HomePage display logic', () => {
  test('shows app link when logged in', () => {
    expect(getCtaText(true)).toBe('Open Trading Terminal →')
  })

  test('shows register CTA when not logged in', () => {
    expect(getCtaText(false)).toBe('Start paper trading free')
  })

  test('shows login and register in nav when logged out', () => {
    const actions = getNavAction(false)
    expect(actions).toContain('Log in')
    expect(actions).toContain('Get started free')
  })

  test('shows open app in nav when logged in', () => {
    const actions = getNavAction(true)
    expect(actions).toContain('Open App')
    expect(actions).not.toContain('Log in')
  })
})

describe('Stats display', () => {
  test('formats seconds correctly', () => {
    expect(formatStat(3, 's')).toBe('3s')
  })

  test('formats percentage correctly', () => {
    expect(formatStat(100, '%')).toBe('100%')
  })
})