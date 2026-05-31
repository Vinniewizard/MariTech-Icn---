import { Asset } from './types';

export const ASSETSList: Asset[] = [
  {
    id: 'R_10',
    name: 'LWEX Flow',
    symbol: 'MFLOW',
    type: 'syndicate',
    price: 155.45,
    change: 0.12,
    volatility: 0.22,
    trendBias: 0.001,
    decimals: 2,
    description: 'A custom synthetic index simulating the steady electronic flow of LWEX systems with 10% constant variation.'
  },
  {
    id: 'R_25',
    name: 'Tidal Flux',
    symbol: 'TFLUX',
    type: 'syndicate',
    price: 325.80,
    change: 0.28,
    volatility: 0.55,
    trendBias: 0,
    decimals: 2,
    description: 'A rhythmic volatility index reflecting the natural rise and fall of maritime data streams.'
  },
  {
    id: 'R_50',
    name: 'Titan Swell',
    symbol: 'TITAN',
    type: 'syndicate',
    price: 1845.20,
    change: -0.15,
    volatility: 1.1,
    trendBias: 0.002,
    decimals: 2,
    description: 'A powerful market engine with moderate surges, engineered for balanced risk-return profiles.'
  },
  {
    id: 'R_75',
    name: 'Oracle Storm',
    symbol: 'ORM',
    type: 'syndicate',
    price: 384560.25,
    change: -0.45,
    volatility: 38.5,
    trendBias: 0.0005,
    decimals: 4,
    description: 'Highly dynamic and aggressive price oscillations as predicted by the LWEX Oracle system.'
  },
  {
    id: 'R_100',
    name: 'Wizard’s Eye',
    symbol: 'WIZARD',
    type: 'syndicate',
    price: 9815.10,
    change: 1.05,
    volatility: 2.1,
    trendBias: -0.001,
    decimals: 2,
    description: 'Rapid-fire market execution with extreme frequency, simulating the chaotic precision of the Wizard’s Eye.'
  },
  {
    id: 'J_10',
    name: 'Chrono Rift',
    symbol: 'RIFT',
    type: 'syndicate',
    price: 50200.45,
    change: 0.05,
    volatility: 2.5,
    trendBias: 0,
    decimals: 4,
    description: 'Sub-second temporal distortions causing sudden price jumps in the matrix.'
  },
  {
    id: 'J_100',
    name: 'Aether Shift',
    symbol: 'ASHIFT',
    type: 'syndicate',
    price: 1205.15,
    change: 0.88,
    volatility: 0.9,
    trendBias: 0.001,
    decimals: 2,
    description: 'A stable aetherial index that experiences significant shifts at predictable intervals.'
  },
  {
    id: 'R_BEAR',
    name: 'Abyssal Plunge',
    symbol: 'ABYSS',
    type: 'syndicate',
    price: 2840.50,
    change: -1.78,
    volatility: 1.6,
    trendBias: -0.012,
    decimals: 2,
    description: 'Engineered to follow the descent into the deep abyss, mimicking deep-cycle bearish market trends.'
  },
  {
    id: 'R_BULL',
    name: 'Golden Crest',
    symbol: 'CREST',
    type: 'syndicate',
    price: 4920.75,
    change: 2.14,
    volatility: 1.9,
    trendBias: 0.015,
    decimals: 2,
    description: 'Inspired by the sunlit crest of a winning wave, this index maintains strong bullish momentum.'
  },
  {
    id: 'FRX_EURUSD',
    name: 'Meridian Link',
    symbol: 'M-LINK',
    type: 'forex',
    price: 1.08451,
    change: 0.02,
    volatility: 0.00008,
    trendBias: 0,
    decimals: 5,
    description: 'The primary maritime trade link between the European and US economic zones.'
  },
  {
    id: 'FRX_GBPUSD',
    name: 'Sterling Anchor',
    symbol: 'S-ANCHOR',
    type: 'forex',
    price: 1.26782,
    change: -0.08,
    volatility: 0.00012,
    trendBias: 0.00001,
    decimals: 5,
    description: 'The historic anchor pair for transatlantic trade and stability.'
  },
  {
    id: 'CRY_BTCUSD',
    name: 'Crypto Neptune',
    symbol: 'C-NEPT',
    type: 'crypto',
    price: 68420.50,
    change: 1.84,
    volatility: 9.5,
    trendBias: 0.01,
    decimals: 2,
    description: 'The largest digital asset, ruling the crypto-ocean with vast volatility.'
  }
];

export const CONTRACT_TUTORIALS = [
  {
    id: 'rise-fall',
    title: 'Rise / Fall (Standard Binary Options)',
    description: 'Predict whether the price at expiration will be higher or lower than the entry spot.',
    rules: [
      'Choose Rise if you predict the exit spot will be strictly higher than the entry spot.',
      'Choose Fall if you predict the exit spot will be strictly lower than the entry spot.',
      'Payout is realized if your prediction is correct at the second of expiry.',
      'Standard payouts offer up to a high-yield return (e.g. 95.5% net profit).'
    ],
    payoutDesc: 'Flat payout return on stake.'
  },
  {
    id: 'higher-lower',
    title: 'Higher / Lower (Barrier Options)',
    description: 'Predict whether the price at expiration will end up above or below a customized barrier level.',
    rules: [
      'A barrier is established as an offset (e.g., +1.50 or -0.80) from the entry spot.',
      'Choose Higher if you predict the exit spot will be strictly above the calculated barrier level.',
      'Choose Lower if you predict the exit spot will be strictly below the calculated barrier level.',
      'Barrier offsets can modify the risk-to-reward ratio, generating asymmetric high payouts!'
    ],
    payoutDesc: 'Variable returns depending on the barrier closeness.'
  },
  {
    id: 'touch-no-touch',
    title: 'Touch / No Touch (Trigger Options)',
    description: 'Predict whether the price will hit or avoid a specific barrier level at any point during the duration.',
    rules: [
      'Choose Touch if you predict the price will touch the barrier level at least once before expiry.',
      'Choose No Touch if you predict the price will never touch the barrier level from start to finish.',
      'Touch contracts win instantly the millisecond the price touches the barrier.',
      'No Touch contracts win only at expiration if the barrier was successfully avoided.'
    ],
    payoutDesc: 'Instant win for Touch, passive endurance for No Touch.'
  },
  {
    id: 'digit-over-under',
    title: 'Digits (Over / Under)',
    description: 'Predict if the last digit of the final price will be over or under a target digit.',
    rules: [
      'The "Last Digit" is the final decimal place of the asset price on the final tick.',
      'Choose Over if you predict the last digit will be strictly greater than your target.',
      'Choose Under if you predict the last digit will be strictly less than your target.',
      'This contract is settled on the very last tick of the duration.'
    ],
    payoutDesc: 'High yield for specific digit probabilities.'
  }
];
