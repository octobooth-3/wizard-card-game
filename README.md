# 🧙 Wizard — Card Game

A browser-based implementation of the classic trick-prediction card game **Wizard**,
for one human player against two automated opponents (Bot A & Bot B).

It's a single self-contained `index.html` — **no build step, no dependencies**.

## 🎮 Play

Just open `index.html` in any modern browser (double-click it, or drag it into a browser
window). Then click **New Game**. 🚀

Optionally serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 📖 How to play

- 🃏 Each round you're dealt more cards (round 1 = 1 card, round 20 = 20 cards).
- 🔮 **Bid** how many tricks you think you'll win using the bid buttons.
- 👉 **Play** a card by clicking it — legal cards glow green, illegal ones are dimmed.
- 🤖 Bots bid and play automatically.
- 🖐️ Your hand is at the **bottom**, the current trick is shown in the **middle**, and a
  running **log** 📜 on the right narrates everything that happens.
- ⏱️ Use the **Speed** control to slow down or speed up the bots.

## 📜 Rules implemented

- 🂠 **Deck (60 cards):** four suits (♠ ♥ ♦ ♣) ranked 1–13, plus 4 **Wizards** 🧙 and 4 **Jesters** 🃏.
- 🔁 **20 rounds.** Round *n* deals *n* cards to each of the 3 players; the dealer rotates.
- ♣️ **Trump:** after dealing, the next card is flipped. A Wizard → the dealer chooses trump;
  a Jester (or an empty deck in the final round) → no trump; otherwise that card's suit is trump.
- 🔮 **Bidding:** each player predicts how many tricks they'll take (0..n).
- 🎯 **Trick play:** you must follow the led suit if you can; Wizards and Jesters may be played
  any time. The winner is the first Wizard played, else the highest trump, else the highest
  card of the led suit. A Jester only wins a trick made up entirely of Jesters.
- 🏆 **Scoring:** hit your bid exactly → **20 + 10 × bid** points; miss → **−10** per trick
  over/under. Highest cumulative total after 20 rounds wins (ties are shared).

## 🤖 Bot strategy

- 🔮 **Bidding:** estimates likely tricks from Wizards, high trumps, and off-suit high cards.
- ♟️ **Card play (bid-aware):** wins as cheaply as possible when still short of its bid, and
  ducks/discards when its bid is already met — always respecting the follow-suit rule.
