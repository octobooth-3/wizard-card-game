'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  SUITS, WIZARD, JESTER,
  makeDeck, shuffle, cardLabel, shortLabel, sortHand,
  legalCards, trickWinner,
  playStrength, lowestDump, currentTrickStrength, cardBeatsCurrent,
} = require('../game-logic.js');

const n = (suit, rank) => ({ t: 'n', suit, rank });
const wiz = () => ({ t: WIZARD });
const jest_ = () => ({ t: JESTER });

describe('makeDeck', () => {
  test('has 60 cards: 52 numbered + 4 Wizards + 4 Jesters', () => {
    const deck = makeDeck();
    assert.equal(deck.length, 60);
    assert.equal(deck.filter(c => c.t === WIZARD).length, 4);
    assert.equal(deck.filter(c => c.t === JESTER).length, 4);
    assert.equal(deck.filter(c => c.t === 'n').length, 52);
  });

  test('has 13 ranks (1-13) for each of the 4 suits', () => {
    const deck = makeDeck();
    for (const s of SUITS) {
      const ranks = deck.filter(c => c.t === 'n' && c.suit === s).map(c => c.rank).sort((a, b) => a - b);
      assert.deepEqual(ranks, Array.from({ length: 13 }, (_, i) => i + 1));
    }
  });
});

describe('shuffle', () => {
  test('returns an array with the same elements (no loss/duplication)', () => {
    const deck = makeDeck();
    const copy = [...deck];
    const shuffled = shuffle(copy);
    assert.equal(shuffled.length, deck.length);
    // same multiset of references
    const sameSet = deck.every(c => shuffled.includes(c));
    assert.ok(sameSet);
  });

  test('shuffles in place (returns the same array reference)', () => {
    const deck = makeDeck();
    const result = shuffle(deck);
    assert.equal(result, deck);
  });
});

describe('cardLabel / shortLabel', () => {
  test('labels Wizards and Jesters', () => {
    assert.equal(cardLabel(wiz()), 'a Wizard');
    assert.equal(cardLabel(jest_()), 'a Jester');
    assert.equal(shortLabel(wiz()), 'Wizard');
    assert.equal(shortLabel(jest_()), 'Jester');
  });

  test('labels face cards by name and numbers by rank', () => {
    assert.equal(cardLabel(n('♠', 12)), 'Queen of Spades');
    assert.equal(cardLabel(n('♥', 7)), '7 of Hearts');
    assert.equal(shortLabel(n('♣', 11)), 'Jack♣');
    assert.equal(shortLabel(n('♦', 3)), '3♦');
  });
});

describe('sortHand', () => {
  test('orders Jesters first, then suits/ranks, then Wizards last', () => {
    const hand = [n('♣', 5), wiz(), jest_(), n('♠', 2), n('♠', 10)];
    const sorted = sortHand(hand);
    assert.equal(sorted[0].t, JESTER);
    assert.equal(sorted[sorted.length - 1].t, WIZARD);
    // spades (index 0) come before clubs (index 3)
    const spadeIdx = sorted.findIndex(c => c.t === 'n' && c.suit === '♠');
    const clubIdx = sorted.findIndex(c => c.t === 'n' && c.suit === '♣');
    assert.ok(spadeIdx < clubIdx);
  });

  test('does not mutate the original hand', () => {
    const hand = [n('♠', 10), n('♠', 2)];
    const original = [...hand];
    sortHand(hand);
    assert.deepEqual(hand, original);
  });
});

describe('legalCards', () => {
  test('all cards legal when nothing has been led yet', () => {
    const hand = [n('♠', 5), n('♥', 9), wiz()];
    assert.deepEqual(legalCards(hand, null), hand);
  });

  test('must follow suit when holding the led suit', () => {
    const hand = [n('♠', 5), n('♥', 9), wiz(), jest_()];
    const legal = legalCards(hand, '♠');
    assert.deepEqual(legal, [n('♠', 5), wiz(), jest_()]);
  });

  test('any card is legal when the led suit is not held', () => {
    const hand = [n('♥', 9), n('♦', 3)];
    assert.deepEqual(legalCards(hand, '♠'), hand);
  });
});

describe('trickWinner', () => {
  test('first Wizard played always wins, regardless of order', () => {
    const trick = [
      { player: 0, card: n('♠', 13) },
      { player: 1, card: wiz() },
      { player: 2, card: wiz() },
    ];
    assert.equal(trickWinner(trick, '♥'), 1);
  });

  test('highest trump wins over the led suit', () => {
    const trick = [
      { player: 0, card: n('♠', 13) },
      { player: 1, card: n('♥', 2) },
      { player: 2, card: n('♠', 5) },
    ];
    assert.equal(trickWinner(trick, '♥'), 1);
  });

  test('highest card of the led suit wins when no trump is played', () => {
    const trick = [
      { player: 0, card: n('♠', 4) },
      { player: 1, card: n('♦', 9) },
      { player: 2, card: n('♠', 11) },
    ];
    assert.equal(trickWinner(trick, '♥'), 2);
  });

  test('all-Jesters trick is won by the first Jester', () => {
    const trick = [
      { player: 0, card: jest_() },
      { player: 1, card: jest_() },
      { player: 2, card: jest_() },
    ];
    assert.equal(trickWinner(trick, '♥'), 0);
  });

  test('Jesters are ignored when a real card is on the table', () => {
    const trick = [
      { player: 0, card: jest_() },
      { player: 1, card: n('♣', 6) },
      { player: 2, card: jest_() },
    ];
    assert.equal(trickWinner(trick, null), 1);
  });
});

describe('playStrength', () => {
  test('Wizard is strongest, Jester is weakest', () => {
    assert.ok(playStrength(wiz(), '♥') > playStrength(n('♥', 13), '♥'));
    assert.ok(playStrength(jest_(), '♥') < playStrength(n('♠', 1), '♥'));
  });

  test('trump cards outrank equal-rank non-trump cards', () => {
    assert.ok(playStrength(n('♥', 5), '♥') > playStrength(n('♠', 5), '♥'));
  });
});

describe('lowestDump', () => {
  test('prefers a Jester when available', () => {
    const legal = [n('♠', 10), jest_(), n('♥', 2)];
    assert.deepEqual(lowestDump(legal, '♥'), jest_());
  });

  test('otherwise dumps the lowest non-trump card', () => {
    const legal = [n('♠', 10), n('♥', 2), n('♦', 1)];
    assert.deepEqual(lowestDump(legal, '♥'), n('♦', 1));
  });

  test('dumps lowest trump when only trump/Wizards are held', () => {
    const legal = [n('♥', 10), n('♥', 3)];
    assert.deepEqual(lowestDump(legal, '♥'), n('♥', 3));
  });
});

describe('currentTrickStrength', () => {
  test('empty trick has -Infinity strength', () => {
    const result = currentTrickStrength([], '♥');
    assert.equal(result, -Infinity);
  });

  test('a Wizard on the table makes the trick strength Infinity', () => {
    const trick = [{ player: 0, card: wiz() }];
    assert.equal(currentTrickStrength(trick, '♥'), Infinity);
  });

  test('tracks the led suit and best value among real cards', () => {
    const trick = [{ player: 0, card: n('♠', 4) }, { player: 1, card: n('♠', 9) }];
    const result = currentTrickStrength(trick, '♥');
    assert.equal(result.led, '♠');
    assert.equal(result.val, 9);
    assert.equal(result.hasReal, true);
  });
});

describe('cardBeatsCurrent', () => {
  test('leading (empty trick) always "wins" for now', () => {
    assert.equal(cardBeatsCurrent(n('♠', 2), '♥', -Infinity, 0), true);
  });

  test('only a Wizard beats an existing Wizard', () => {
    assert.equal(cardBeatsCurrent(wiz(), '♥', Infinity, 1), true);
    assert.equal(cardBeatsCurrent(n('♥', 13), '♥', Infinity, 1), false);
  });

  test('a Wizard always beats a non-Wizard current best', () => {
    const cur = { val: 13, led: '♠', hasReal: true };
    assert.equal(cardBeatsCurrent(wiz(), '♥', cur, 1), true);
  });

  test('a Jester never beats the current best', () => {
    const cur = { val: 2, led: '♠', hasReal: true };
    assert.equal(cardBeatsCurrent(jest_(), '♥', cur, 1), false);
  });

  test('off-suit non-trump cards cannot beat the current best', () => {
    const cur = { val: 4, led: '♠', hasReal: true };
    assert.equal(cardBeatsCurrent(n('♦', 13), '♥', cur, 1), false);
  });

  test('a higher trump beats a led-suit best', () => {
    const cur = { val: 9, led: '♠', hasReal: true };
    assert.equal(cardBeatsCurrent(n('♥', 2), '♥', cur, 1), true);
  });

  test('a higher led-suit card beats a lower led-suit best', () => {
    const cur = { val: 4, led: '♠', hasReal: true };
    assert.equal(cardBeatsCurrent(n('♠', 9), '♥', cur, 1), true);
  });
});
