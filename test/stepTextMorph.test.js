import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTextMorphPlayer,
  createTextMorphSequence,
  createTextMorphSteps,
  findCommonLetters,
} from '../src/index.js';

function finalText(transition) {
  return transition.steps.at(-1)?.text ?? transition.source;
}

test('createTextMorphSteps returns deterministic transitions for a seed', () => {
  const first = createTextMorphSteps('Dendi200822', 'Wolfy169', { seed: 42 });
  const second = createTextMorphSteps('Dendi200822', 'Wolfy169', { seed: 42 });

  assert.equal(first.source, 'Dendi200822');
  assert.equal(first.target, 'Wolfy169');
  assert.equal(finalText(first), 'Wolfy169');
  assert.deepEqual(second.steps, first.steps);
});

test('createTextMorphSteps handles growth, shrink, empty text, and unicode', () => {
  const cases = [
    ['', 'start'],
    ['start', ''],
    ['Cat', 'amatsuhikoni'],
    ['stream 42', 'стрим 100'],
  ];

  cases.forEach(([source, target], index) => {
    const transition = createTextMorphSteps(source, target, { seed: index + 1 });

    assert.equal(finalText(transition), target);
    assert.equal(
      transition.structuralStepCount,
      Math.abs(Array.from(target).length - Array.from(source).length),
    );
  });
});

test('maxSteps caps long-running transitions', () => {
  const transition = createTextMorphSteps('abcdef', 'uvwxyz', {
    maxSteps: 2,
    seed: 7,
  });

  assert.equal(transition.steps.length, 2);
});

test('findCommonLetters exposes stable anchors', () => {
  assert.deepEqual(
    findCommonLetters('Cat', 'amatsuhikoni').map((item) => item.char),
    ['a', 't'],
  );
});

test('createTextMorphSequence plans adjacent word pairs', () => {
  const sequence = createTextMorphSequence(['one', 'two', 'three'], { seed: 3 });

  assert.equal(sequence.length, 2);
  assert.equal(sequence[0].source, 'one');
  assert.equal(sequence[0].target, 'two');
  assert.equal(sequence[1].source, 'two');
  assert.equal(sequence[1].target, 'three');
});

test('createTextMorphPlayer plays updates and completes', async () => {
  const updates = [];

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('player did not complete'));
    }, 1000);

    const player = createTextMorphPlayer({
      words: ['ab', 'ac'],
      seed: 5,
      stepMs: 0,
      holdMs: 0,
      startDelayMs: 0,
      onUpdate: (text) => {
        updates.push(text);
      },
      onComplete: (text) => {
        clearTimeout(timeout);

        try {
          assert.equal(text, 'ac');
          assert.equal(updates[0], 'ab');
          assert.equal(updates.at(-1), 'ac');
          resolve();
        } catch (error) {
          reject(error);
        }
      },
    });

    player.start();
  });
});
