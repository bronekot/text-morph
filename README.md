# text-morph

Framework-independent JavaScript utilities for planning and playing text morph
animations.

`text-morph` does not render UI. It produces deterministic step plans and a
small timer-driven player that you can connect to React, Vue, Svelte, Canvas,
plain DOM, OBS browser sources, or any other rendering layer.

## Features

- Works with plain JavaScript strings and Unicode characters.
- Preserves common letters as anchors while morphing.
- Supports growing, shrinking, and same-length transitions.
- Can run deterministically with a numeric `seed` or custom `rng`.
- Has no runtime dependencies and no framework dependency.
- Exposes low-level transition plans and a simple high-level player.

## Install

From this public GitHub repository:

```sh
npm install git+https://github.com/bronekot/text-morph.git
```

From a sibling local checkout:

```sh
npm install ../text_morph
```

If this package is published to npm later, the dependency can be changed to the
published package name.

## Quick Start

```js
import { createTextMorphPlayer, createTextMorphSteps } from 'text-morph';

const transition = createTextMorphSteps('Dendi200822', 'Wolfy169', {
  seed: 42,
});

console.log(transition.steps.map((step) => step.text));

const player = createTextMorphPlayer({
  words: ['Dendi200822', 'Wolfy169', 'TactiKot'],
  stepMs: 85,
  holdMs: 620,
  seed: 42,
  onUpdate: (text) => {
    document.querySelector('[data-morph]').textContent = text;
  },
});

player.start();
```

## Browser ESM

For a browser page without a build step, import the pinned GitHub Pages bundle:

```html
<span data-morph>Dendi200822</span>

<script type="module">
  import {
    createTextMorphPlayer,
    createTextMorphSteps,
  } from 'https://bronekot.github.io/text-morph/v0.1.0/text-morph.js';

  const transition = createTextMorphSteps('Cat', 'amatsuhikoni', {
    seed: 1,
  });

  console.log(transition.steps);

  const player = createTextMorphPlayer({
    words: ['Dendi200822', 'Wolfy169', 'TactiKot'],
    seed: 42,
    onUpdate: (text) => {
      document.querySelector('[data-morph]').textContent = text;
    },
  });

  player.start();
</script>
```

Use a versioned Pages path such as `/v0.1.0/` instead of the root latest bundle
when a browser page should not pick up new releases automatically.

The latest Pages build is also available at:

```js
import { createTextMorphSteps } from 'https://bronekot.github.io/text-morph/text-morph.js';
```

For immutable GitHub source imports through jsDelivr, use:

```js
import { createTextMorphSteps } from 'https://cdn.jsdelivr.net/gh/bronekot/text-morph@v0.1.0/src/index.js';
```

## API

### `createTextMorphSteps(source, target, options)`

Creates a transition plan from `source` to `target`.

```js
const transition = createTextMorphSteps('Cat', 'amatsuhikoni', {
  maxSteps: 1000,
  seed: 1,
});
```

Returns:

```js
{
  source: 'Cat',
  target: 'amatsuhikoni',
  commonLetters: [
    { char: 'a', sourceIndex: 1, targetIndex: 0 },
    { char: 't', sourceIndex: 2, targetIndex: 3 },
  ],
  structuralStepCount: 9,
  candidateChoiceCount: 123,
  randomStepCount: 12,
  targetStepCount: 8,
  steps: [
    {
      type: 'add',
      index: 0,
      char: 'b',
      direction: 'grow',
      target: 'a',
      targetIndex: 0,
      text: 'bCat',
      before: 'Cat',
    },
  ],
}
```

Each item in `steps` is one operation:

- `add` inserts one character.
- `delete` removes one character.
- `change` replaces one character.

Every step includes `before` and `text`, so renderers can apply the plan by
assigning `step.text`.

### `createTextMorphSequence(words, options)`

Creates transition plans for each adjacent pair in `words`.

```js
const sequence = createTextMorphSequence(['one', 'two', 'three'], {
  seed: 7,
});
```

### `createTextMorphPlayer(options)`

Creates a timer-driven player around `createTextMorphSteps`.

```js
const player = createTextMorphPlayer({
  words: ['one', 'two', 'three'],
  stepMs: 90,
  holdMs: 650,
  startDelayMs: 120,
  seed: 7,
  onTransition: (transition, index) => {},
  onStep: (step, stepIndex, transition) => {},
  onUpdate: (text, step, transition) => {},
  onComplete: (finalText) => {},
});

player.start();
player.stop();
```

The player returns:

```js
{
  start,
  stop,
  createSequence,
}
```

### `findCommonLetters(source, target)`

Returns common characters used as stable alignment anchors.

```js
findCommonLetters('Cat', 'amatsuhikoni');
// [{ char: 'a', sourceIndex: 1, targetIndex: 0 }, ...]
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxSteps` | `number` | `1000` | Safety cap for a single transition plan. |
| `symbols` | `string` | dynamic | Characters used for temporary scramble states. |
| `seed` | `number` | none | Deterministic seed for repeatable plans. |
| `rng` | `() => number` | `Math.random` | Custom random number generator. |
| `words` | `string[]` | `[source, target]` | Player word sequence. |
| `source` | `string` | none | Player source when `words` is not provided. |
| `target` | `string` | none | Player target when `words` is not provided. |
| `stepMs` | `number` | `90` | Delay between player steps. |
| `holdMs` | `number` | `650` | Delay between transitions. |
| `startDelayMs` | `number` | `120` | Delay before the first transition. |

When `symbols` is omitted, the library builds a symbol set from the source and
target text. English letters, Russian letters, digits, and special characters
are added only when they are relevant to the transition.

## Browser Bundle

Build the ESM and UMD artifacts:

```sh
npm run build
```

The build outputs:

- `dist/text-morph.js`
- `dist/text-morph.umd.js`

GitHub Pages serves the same files from:

- `https://bronekot.github.io/text-morph/text-morph.js`
- `https://bronekot.github.io/text-morph/text-morph.umd.js`
- `https://bronekot.github.io/text-morph/v0.1.0/text-morph.js`
- `https://bronekot.github.io/text-morph/v0.1.0/text-morph.umd.js`

The repository exports source files directly, so local Git dependencies work
without a build step. Built artifacts are useful for browser and OBS usage.

## Development

```sh
npm install
npm test
npm run build
npm run build:pages
npm run check
```

`npm run check` runs the test suite and the library build. `npm run build:pages`
builds the GitHub Pages artifact in `site/`.

## Public Repository Notes

This repository intentionally contains only the framework-independent library.
The demo application and OBS browser-source files live outside this repository.

No secrets are required to build or test the package. Keep `.env` files and OBS
tokens outside the repository.

## License

MIT. See [LICENSE](LICENSE).
