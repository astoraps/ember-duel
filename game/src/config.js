// Every tuning number, colour and the full 24-card deck in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends on
// the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const MAX_HP = 20;
export const MAX_MANA = 7;
export const HAND_SIZE = 5;
export const STARTING_MANA = 1;

export const CARD = { width: 150, height: 205 };
export const MINI_CARD = { width: 62, height: 86 };

/** Card types and what they do, in the words shown on the card face. */
export const TYPE_STRIKE = 'Strike';
export const TYPE_GUARD = 'Guard';
export const TYPE_SIPHON = 'Siphon';
export const TYPE_SURGE = 'Surge';

/**
 * Elements are told apart by BOTH colour and a drawn shape, never by text alone:
 * Flame is red with a flame (triangle) mark, Frost is ice blue with a snowflake (asterisk),
 * Leaf is green with a leaf (ellipse), Bolt is gold with a lightning zigzag.
 */
export const ELEMENTS = {
  flame: { label: 'Flame', color: '#e5534b', dark: '#7d1f18', light: '#ff8a7a', icon: 'flame' },
  frost: { label: 'Frost', color: '#5fb8e8', dark: '#1d5a80', light: '#a8dcf5', icon: 'frost' },
  leaf: { label: 'Leaf', color: '#58b368', dark: '#1f5c2e', light: '#9ed6a8', icon: 'leaf' },
  bolt: { label: 'Bolt', color: '#f2c94c', dark: '#8a6d0f', light: '#fbe08a', icon: 'bolt' },
};

/** The 24-card deck: 6 cards per element. name, element, cost, power, type. */
export const CARD_DECK = [
  // Flame
  { id: 'cinder-fang', name: 'Cinder Fang', element: 'flame', cost: 1, power: 2, type: TYPE_STRIKE },
  { id: 'bonfire', name: 'Bonfire', element: 'flame', cost: 2, power: 3, type: TYPE_STRIKE },
  { id: 'wildfire', name: 'Wildfire', element: 'flame', cost: 3, power: 5, type: TYPE_STRIKE },
  { id: 'ember-wall', name: 'Ember Wall', element: 'flame', cost: 2, power: 3, type: TYPE_GUARD },
  { id: 'phoenix-sip', name: 'Phoenix Sip', element: 'flame', cost: 2, power: 2, type: TYPE_SIPHON },
  { id: 'flare-burst', name: 'Flare Burst', element: 'flame', cost: 4, power: 6, type: TYPE_SURGE },
  // Frost
  { id: 'icicle', name: 'Icicle', element: 'frost', cost: 1, power: 2, type: TYPE_STRIKE },
  { id: 'glacier', name: 'Glacier', element: 'frost', cost: 2, power: 3, type: TYPE_GUARD },
  { id: 'deep-chill', name: 'Deep Chill', element: 'frost', cost: 3, power: 4, type: TYPE_STRIKE },
  { id: 'snow-veil', name: 'Snow Veil', element: 'frost', cost: 1, power: 2, type: TYPE_GUARD },
  { id: 'cold-snap', name: 'Cold Snap', element: 'frost', cost: 2, power: 3, type: TYPE_SIPHON },
  { id: 'blizzard', name: 'Blizzard', element: 'frost', cost: 4, power: 5, type: TYPE_SURGE },
  // Leaf
  { id: 'thorn-whip', name: 'Thorn Whip', element: 'leaf', cost: 1, power: 2, type: TYPE_STRIKE },
  { id: 'root-hold', name: 'Root Hold', element: 'leaf', cost: 2, power: 3, type: TYPE_GUARD },
  { id: 'bloom', name: 'Bloom', element: 'leaf', cost: 2, power: 2, type: TYPE_SIPHON },
  { id: 'vine-snare', name: 'Vine Snare', element: 'leaf', cost: 3, power: 4, type: TYPE_STRIKE },
  { id: 'canopy', name: 'Canopy', element: 'leaf', cost: 1, power: 3, type: TYPE_GUARD },
  { id: 'overgrowth', name: 'Overgrowth', element: 'leaf', cost: 4, power: 6, type: TYPE_SURGE },
  // Bolt
  { id: 'spark', name: 'Spark', element: 'bolt', cost: 1, power: 2, type: TYPE_STRIKE },
  { id: 'static-shield', name: 'Static Shield', element: 'bolt', cost: 2, power: 3, type: TYPE_GUARD },
  { id: 'chain-zap', name: 'Chain Zap', element: 'bolt', cost: 3, power: 4, type: TYPE_STRIKE },
  { id: 'storm-call', name: 'Storm Call', element: 'bolt', cost: 4, power: 6, type: TYPE_SURGE },
  { id: 'surge-leech', name: 'Surge Leech', element: 'bolt', cost: 2, power: 2, type: TYPE_SIPHON },
  { id: 'tesla-coil', name: 'Tesla Coil', element: 'bolt', cost: 3, power: 5, type: TYPE_STRIKE },
];

export const PALETTE = {
  backdrop: '#0d1512',
  felt: '#1d4a2f',
  feltDark: '#122e1d',
  feltLight: '#2a6b44',
  rim: '#c9a227',
  rimDark: '#8a6d0f',
  panel: '#101a14',
  cream: '#f6eeda',
  ink: '#241d12',
  text: '#f2ead8',
  muted: '#9aa78f',
  hp: '#e5534b',
  hpEmpty: '#3a2020',
  shield: '#5fb8e8',
  mana: '#ff9a3c',
  manaEmpty: '#4a3423',
  gold: '#f2c94c',
  button: '#c9a227',
  buttonText: '#241d12',
  log: '#c8d2bd',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best victory is kept between visits (this browser only). */
export const BEST_KEY = 'ember-duel.best';
