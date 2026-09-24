/* ============================================================
   WIZARD — pure game-logic helpers (deck, cards, trick rules).
   No DOM access here so this file can be loaded directly by the
   browser (classic <script>) and by Node-based unit tests.
   ============================================================ */
(function (root) {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const SUIT_NAME = { '♠': 'Spades', '♥': 'Hearts', '♦': 'Diamonds', '♣': 'Clubs' };
  const RED = new Set(['♥', '♦']);
  const RANK_NAME = { 1: '1', 11: 'Jack', 12: 'Queen', 13: 'King' };
  const WIZARD = 'W', JESTER = 'J';

  /* ---------- deck helpers ---------- */
  function makeDeck() {
    const d = [];
    for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ t: 'n', suit: s, rank: r });
    for (let i = 0; i < 4; i++) d.push({ t: WIZARD });
    for (let i = 0; i < 4; i++) d.push({ t: JESTER });
    return d;
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function cardLabel(c) {
    if (c.t === WIZARD) return 'a Wizard';
    if (c.t === JESTER) return 'a Jester';
    const r = RANK_NAME[c.rank] || c.rank;
    return `${r} of ${SUIT_NAME[c.suit]}`;
  }
  function shortLabel(c) {
    if (c.t === WIZARD) return 'Wizard';
    if (c.t === JESTER) return 'Jester';
    const r = RANK_NAME[c.rank] || c.rank;
    return `${r}${c.suit}`;
  }
  function sortHand(hand) {
    const order = c => c.t === WIZARD ? 100 : c.t === JESTER ? -1 : (SUITS.indexOf(c.suit) * 20 + c.rank);
    return [...hand].sort((a, b) => order(a) - order(b));
  }

  /* ---------- trick logic ---------- */
  function legalCards(hand, ledSuit) {
    // Wizards & Jesters always legal. If a led suit exists and you hold it, must follow (but W/J still allowed).
    if (ledSuit === null || ledSuit === undefined) return [...hand];
    const hasLed = hand.some(c => c.t === 'n' && c.suit === ledSuit);
    if (!hasLed) return [...hand];
    return hand.filter(c => c.t !== 'n' || c.suit === ledSuit);
  }

  function trickWinner(trick, trump) {
    // First Wizard wins.
    for (const pl of trick) if (pl.card.t === WIZARD) return pl.player;
    // Determine led suit (first non-jester card; wizard handled above).
    let led = null;
    for (const pl of trick) { if (pl.card.t === 'n') { led = pl.card.suit; break; } }
    // If all jesters, first jester wins.
    if (led === null) {
      for (const pl of trick) if (pl.card.t === JESTER) return pl.player;
      return trick[0].player;
    }
    let best = null;
    for (const pl of trick) {
      const c = pl.card;
      if (c.t !== 'n') continue;
      const isTrump = trump && c.suit === trump;
      const isLed = c.suit === led;
      if (!isTrump && !isLed) continue;
      const score = (isTrump ? 100 : 0) + c.rank;
      if (best === null || score > best.score) best = { player: pl.player, score };
    }
    return best ? best.player : trick[0].player;
  }

  /* ---------- bot helpers ---------- */
  function playStrength(c, trump) {
    if (c.t === WIZARD) return 1000;
    if (c.t === JESTER) return -1000;
    return (trump && c.suit === trump ? 100 : 0) + c.rank;
  }
  function lowestDump(legal, trump) {
    const jesters = legal.filter(c => c.t === JESTER);
    if (jesters.length) return jesters[0];
    // lowest non-trump if possible
    const nonTrump = legal.filter(c => c.t === 'n' && (!trump || c.suit !== trump));
    const pool = nonTrump.length ? nonTrump : legal.filter(c => c.t !== WIZARD);
    const usePool = pool.length ? pool : legal;
    return usePool.sort((a, b) => playStrength(a, trump) - playStrength(b, trump))[0];
  }
  function currentTrickStrength(trick, trump) {
    if (trick.length === 0) return -Infinity;
    // is there a wizard already?
    if (trick.some(pl => pl.card.t === WIZARD)) return Infinity;
    let led = null;
    for (const pl of trick) { if (pl.card.t === 'n') { led = pl.card.suit; break; } }
    let best = -Infinity;
    for (const pl of trick) {
      const c = pl.card;
      if (c.t !== 'n') continue;
      const isTrump = trump && c.suit === trump;
      const isLed = c.suit === led;
      if (!isTrump && !isLed) continue;
      best = Math.max(best, (isTrump ? 100 : 0) + c.rank);
    }
    return { val: best, led, hasReal: best > -Infinity };
  }
  function cardBeatsCurrent(c, trump, cur, trickLength) {
    if (trickLength === 0) return true; // leading: "wins" for now
    if (cur === Infinity) return c.t === WIZARD; // only a wizard beats a wizard
    if (c.t === WIZARD) return true;
    if (c.t === JESTER) return false;
    // determine led suit
    let led = (cur && cur.led !== undefined) ? cur.led : null;
    if (led === null) {
      // table is all jesters so far → any real card leads/wins
      return true;
    }
    const best = cur.hasReal ? cur.val : -Infinity;
    const isTrump = trump && c.suit === trump;
    const isLed = c.suit === led;
    if (!isTrump && !isLed) return false;
    const v = (isTrump ? 100 : 0) + c.rank;
    return v > best;
  }

  const GameLogic = {
    SUITS, SUIT_NAME, RED, RANK_NAME, WIZARD, JESTER,
    makeDeck, shuffle, cardLabel, shortLabel, sortHand,
    legalCards, trickWinner,
    playStrength, lowestDump, currentTrickStrength, cardBeatsCurrent,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLogic;
  } else {
    root.GameLogic = GameLogic;
  }
})(typeof window !== 'undefined' ? window : globalThis);
