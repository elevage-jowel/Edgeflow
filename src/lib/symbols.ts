export interface SymbolGroup {
  label: string
  symbols: string[]
}

export const SYMBOL_GROUPS: SymbolGroup[] = [
  {
    label: 'Forex Majors',
    symbols: [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
    ],
  },
  {
    label: 'Forex Minors',
    symbols: [
      'EURGBP', 'EURJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD',
      'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'GBPNZD',
      'AUDJPY', 'AUDCHF', 'AUDCAD', 'AUDNZD',
      'CADJPY', 'CADCHF', 'NZDJPY', 'NZDCHF', 'CHFJPY',
    ],
  },
  {
    label: 'Crypto',
    symbols: [
      'BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'AVAXUSD',
      'DOTUSD', 'LINKUSD', 'MATICUSD', 'LTCUSD', 'BNBUSD', 'DOGEUSD',
      'SHIBUSD', 'UNIUSD', 'ATOMUSD',
    ],
  },
  {
    label: 'Indices',
    symbols: [
      'US30', 'US500', 'NAS100', 'UK100', 'GER40', 'FRA40',
      'JPN225', 'AUS200', 'HK50', 'ESP35',
    ],
  },
  {
    label: 'Commodities',
    symbols: [
      'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD',
      'USOIL', 'UKOIL', 'NATGAS',
      'CORN', 'WHEAT', 'SOYBEAN', 'SUGAR', 'COFFEE', 'COCOA',
    ],
  },
  {
    label: 'Stocks',
    symbols: [
      'AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META',
      'NFLX', 'AMD', 'INTC', 'BA', 'JPM', 'GS', 'SPY', 'QQQ',
    ],
  },
]

export const ALL_SYMBOLS = SYMBOL_GROUPS.flatMap(g => g.symbols)

export function getSymbolGroup(symbol: string): string {
  for (const group of SYMBOL_GROUPS) {
    if (group.symbols.includes(symbol.toUpperCase())) return group.label
  }
  return 'Custom'
}
