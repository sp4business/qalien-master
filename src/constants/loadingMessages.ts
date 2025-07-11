/**
 * QAlien Loading Messages
 * 
 * Entertaining messages to display during loading screens.
 * These are shuffled randomly to keep the loading experience fresh and engaging.
 */

export const QALIEN_LOADING_MESSAGES = [
  "Beaming your creative to the Mothership for intergalactic approval...",
  "Running neural scans... detecting optimal engagement frequency.",
  "Abducting bad CTRs.",
  "Training a small alien to understand your brand guidelines.",
  "Filing creative with the Interplanetary Ad Review Council.",
  "Deploying ML probes into the attention economy.",
  "Analyzing pixels... judging silently.",
  "Letting the QAlien cook... 👨‍🚀🍳",
  "Creative orbit detected. Preparing for launch.",
  "Cross-referencing with Galactic Ad Standards…",
  "Waiting for interstellar budget approval.",
  "Touching grass (on Mars) while we await feedback.",
  "Neural net thinks your logo placement is... bold.",
  "The creative just got beamed up. We'll let you know if it returns.",
  "Running A/B test on Earth vs. Venus demographics.",
  "Awaiting signal from Saturn's brand team.",
  "Calculating ideal ad spend in Martian credits.",
  "Your creative is under observation by a friendly lifeform.",
  "Plotting engagement heatmaps across galaxies.",
  "Uploading your idea to the cosmic hive mind.",
  "Waiting for alien intern to wake up from hypersleep.",
  "This creative slaps... in at least 3 dimensions.",
  "Aligning pixels with the stars.",
  "Retrofitting your copy for universal comprehension.",
  "Awaiting psychic nod from creative overlord.",
  "Searching for a planet where this CTA converts.",
  "The QAlien is vibing with your font choice.",
  "Synthesizing ROI... please remain calm.",
  "Crunching data from 12 dimensions of audience behavior.",
  "Your ad is now being judged by a quantum being.",
  "If this loads fast, it's because we paid for warp speed.",
  "Reading the creative's aura for vibes & violations.",
  "Optimizing performance for both humans and extraterrestrials.",
  "Campaign energy detected: chaotic good.",
  "This ad has a 99.99% chance of slaying.",
  "Rewriting copy in Galactic Common.",
  "We've submitted your asset to the vibe committee.",
  "One small step for you, one giant leap for campaign metrics.",
  "Conducting a deep audit of your creative's soul.",
  "Interpreting ambiguous client feedback: \"Can it pop more?\"",
  "Running diagnostics: too much sparkle? Never.",
  "Validating ad formats.",
  "Ad approved in 6 galaxies. Earth pending.",
  "Just a quick detour through the conversion nebula.",
  "Rebalancing pixel karma.",
  "This one's spicy. Review might take a minute.",
  "Manifesting approvals through the power of vibes.",
  "Your ad just made the QAlien raise an eyebrow. Respect.",
  "Model is debating if that font is ironic or just 2014.",
  "Calculating how much space dust to sprinkle on this CTA.",
  "Evaluating synergy between headline and universal truth.",
  "Running creative through the anti-cringe filter.",
  "This might just be the ad that unites all intelligent life.",
  "Rendering visuals at warp 9.",
  "Pinging your campaign's aura for alignment.",
  "Converting KPIs into star charts.",
  "The QAlien is impressed. And that's rare.",
  "Your ad is now in the psychic approval queue.",
  "That shade of green? Approved by 9 intergalactic style councils.",
  "Energy detected: low funnel with high flavor.",
  "Brushing off your metrics for interstellar polish.",
  "Simulating audience sentiment in 47 species.",
  "QAlien doing a lil' dance while the model loads.",
  "Reviewing impact across time, space, and ROAS.",
  "Beam complete. Campaign is... almost ready for liftoff."
];

/**
 * Get a random loading message from the collection
 */
export const getRandomLoadingMessage = (): string => {
  const randomIndex = Math.floor(Math.random() * QALIEN_LOADING_MESSAGES.length);
  return QALIEN_LOADING_MESSAGES[randomIndex];
};

/**
 * Shuffle the messages array for sequential playback
 */
export const shuffleMessages = (): string[] => {
  const shuffled = [...QALIEN_LOADING_MESSAGES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Default messages mapping for different loading types
 * These are used as fallbacks when no specific message is provided
 */
export const DEFAULT_TYPE_MESSAGES = {
  organizations: 'Scanning the galaxy for organizations...',
  brands: 'Discovering brand universes...',
  campaigns: 'Exploring campaign constellations...',
  processing: 'Computing with alien precision...',
  uploading: 'Beaming files to the mothership...',
  auth: 'Establishing secure alien connection...',
  general: 'QAlien is thinking...',
  error: 'Houston, we have a problem...',
  success: 'Mission accomplished! 🛸',
  empty: 'The universe seems empty here...'
} as const;