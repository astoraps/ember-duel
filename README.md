# ember-duel

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/astoraps/ember-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/astoraps/ember-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Ember Duel** — an original 1v1 card battler. You face the Ashen Warden across a felt table. Both start at 20 HP; each round you gain mana (1, 2, 3 … up to 7) and play cards from a 5-card hand drawn from a 24-card deck. Cards have a cost, a power, one of four elements (Flame, Frost, Leaf, Bolt — told apart by colour *and* shape), and a type: Strike, Guard, Siphon, or Surge (a second card of the same element in one turn hits +2). Spend your mana or lose it. First to 0 HP loses.

## Play it

Serve `game/` with any static server and open `game/index.html` in a desktop browser — no network, no build step:

```sh
node serve.ts
# open http://localhost:8080
```

Click a card to play it (dimmed cards are unaffordable), click End Turn to pass. Keys: 1–5 play hand cards, Space/Enter ends the turn and starts from the title screen.

## Hand it in

`main.ts` copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are real renders of the game's own code: `1-start.jpg` (title), `2-play.jpg` (the table mid-duel), `3-win.jpg` (victory), `4-lose.jpg` (defeat).
