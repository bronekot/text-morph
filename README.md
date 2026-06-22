# Step Text Morph

Framework-independent JavaScript text morphing utilities.

The library is exported from `src/index.js` and does not import React or any
browser UI framework.

The local project is split into three parts:

- `text_morph` - this repository, the library package
- `text_morph_demo` - a separate Vite demo package with a local `file:../text_morph` dependency
- `text_morph_obs` - standalone OBS HTML/config files

Later, CI can build this package and the demo/OBS files can load the built
library from GitHub. For now the demo uses the local package and the OBS files
stay standalone.

```js
import { createTextMorphPlayer, createTextMorphSteps } from 'text-morph';

const plan = createTextMorphSteps('Dendi200822', 'Wolfy169');

const player = createTextMorphPlayer({
  words: ['Dendi200822', 'Wolfy169', 'TactiKot'],
  stepMs: 85,
  holdMs: 620,
  onUpdate: (text) => console.log(text),
});

player.start();
```

By default every step first aligns the current text to the target while
preserving existing common characters where possible. For example, `Cat` keeps
the existing `at` when morphing to `amatsuhikoni`. Then it builds a ticket list
and picks one ticket randomly. The list contains one `change(index)` ticket for
every mismatched aligned position, plus repeated generic `add` / `delete`
tickets for the remaining length difference. After an `add` or `delete` ticket
wins, the exact position is chosen from the current alignment. Added characters
are temporary scramble characters and do not have to match the target
immediately.

After a `change(index)` ticket wins, the replacement is resolved at that moment:
it can be either the target character or a temporary scramble character. Near
the end of a transition, changes settle to target characters so the morph always
finishes.

Rules:

- each step performs exactly one action: `add`, `delete`, or `change`
- shrinking text only deletes characters; it never adds temporary characters
- growing text only adds characters; it never deletes temporary characters
- existing common characters are used as anchors before choosing add/delete
  positions
- added characters can be temporary and are later corrected by `change(index)`
- replacement characters can also be temporary; `change(index)` does not always
  jump directly to the target character
- action probability follows the ticket list; if four deletes are still needed,
  four delete tickets are present
