# Wordle Clone

I love playing Wordle, so I built my own version in React. Partly for fun but also as a small project to practice animation, state management, and accessibility basics.

## Fun Details

- Added some Brooklyn Nine-Nine references!

🎮 **[Play it live here](https://wordle-clone-three-inky.vercel.app/)**


## Features

- 6-row / 5-column guess board with per-letter feedback (correct / present / absent)
- On-screen keyboard that recolors keys as you play, plus full physical keyboard support (letters, `Enter`, `Backspace`)
- Staggered flip-reveal animation on submit, a shake animation on invalid guesses, and a bounce animation on a win
- Toast-style messages for win/loss/invalid input, including guess-count-based win copy
- "Share result" button that copies an emoji grid (🟩🟨⬛) to the clipboard, Wordle-style
- Unlimited games — "New Game" picks a fresh word instantly, no page reload needed
- No external dependencies beyond React — styling is done with inline style objects and a small `<style>` block for keyframes

## How it works

- `WORDS` is a local list of words (see `words.js`); it's filtered down to 5-letter entries and uppercased into `VALID_WORDS` on load, since the board is fixed at 5 columns.
- `pickWord()` picks the day's `answer` at random from `VALID_WORDS`, held in component state so a "New Game" click can reset it without reloading the page.
- `scoreGuess(guess, answer)` implements the standard two-pass Wordle scoring algorithm: exact matches first (marked and removed from the letter pool), then present-but-misplaced matches against what's left in the pool. This correctly handles repeated letters (e.g. guessing "LLAMA" against an answer with only one "L").
- Guesses are stored as `{ word, result }` pairs in `guesses` state; `current` holds the in-progress guess before it's submitted.
- Submitting a guess is checked against `VALID_WORDS` before scoring — an invalid word triggers a shake animation and a toast instead of being added to `guesses`.
- Reveal, shake, and bounce animations are coordinated with `setTimeout`s that match their CSS animation durations, so React state (e.g. "can the player type yet") stays in sync with what's visually happening on screen.
- Keyboard key colors are derived from all past guesses, keeping the highest-priority state per letter (`correct` > `present` > `absent`).



## Known limitations

- Word list source: [cfreshman's word list gist](https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b)
- Guesses are checked against this project's own `words.js` list rather than an external dictionary, so a real word can still get rejected if it hasn't been added yet. This same list doubles as the pool of possible answers, so entries should be real 5-letter words you'd be happy to see as either a guess or a solution.
- No persistence (at this level felt it was unnecessary) progress resets on refresh, no `localStorage` used).

## Possible next steps

- Tile-level `aria-label`s so a screen reader announces each letter's result (correct/present/absent), not just the keyboard
- A stats/streak tracker using `localStorage`
- Split the word list into a small curated "answers" pool and a bigger "accepted guesses" pool, closer to how the real game works
- Sound effects on submit/win/loss

## New things I learnt

- Coordinating CSS keyframe animations with React state — staggering per-tile `animation-delay`s and timing `setTimeout`s to match, so the UI stays interactive-safe (e.g. blocking input) exactly as long as an animation is actually playing
- Using CSS custom properties (`--tile-bg`) inside `@keyframes` to drive a single shared animation with per-element colors, instead of writing a separate keyframe block per state
- Writing a small Node CLI script (`make-words.js`) to turn a raw newline-separated word list into clean, deduplicated, properly formatted JS — a good reminder that data hygiene (trimming, dedup, validation) matters even for small personal projects

Happy Wordling!

