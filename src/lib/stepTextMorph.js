export const DEFAULT_MORPH_SYMBOLS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#_+=?';

export const DEFAULT_MORPH_OPTIONS = {
  maxSteps: 1000,
  symbols: DEFAULT_MORPH_SYMBOLS,
};

const DEFAULT_OPTIONS = DEFAULT_MORPH_OPTIONS;
const TARGET_CHANGE_CHANCE = 0.58;
const FORCE_TARGET_TICKET_COUNT = 2;

const DEFAULT_PLAYER_OPTIONS = {
  stepMs: 90,
  holdMs: 650,
  startDelayMs: 120,
};

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeRng(options) {
  if (typeof options.rng === 'function') return options.rng;
  if (Number.isInteger(options.seed)) return createSeededRandom(options.seed);

  return Math.random;
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function splitText(value) {
  return Array.from(String(value));
}

function chooseRandomItem(items, random) {
  return items[Math.floor(random() * items.length)];
}

function getMismatchIndexes(current, target, length = target.length) {
  const indexes = [];

  for (let index = 0; index < length; index += 1) {
    if (current[index] !== target[index]) indexes.push(index);
  }

  return indexes;
}

function createFittedAlignment(shortChars, longChars) {
  const shortLength = shortChars.length;
  const longLength = longChars.length;
  const dp = Array.from({ length: shortLength + 1 }, () =>
    Array(longLength + 1).fill(-Infinity),
  );

  for (let j = 0; j <= longLength; j += 1) dp[0][j] = 0;

  for (let i = 1; i <= shortLength; i += 1) {
    for (let j = 1; j <= longLength; j += 1) {
      const skipScore = dp[i][j - 1];
      const matchScore =
        dp[i - 1][j - 1] + (shortChars[i - 1] === longChars[j - 1] ? 1 : 0);

      dp[i][j] = Math.max(skipScore, matchScore);
    }
  }

  const shortToLong = Array(shortLength).fill(null);
  const longToShort = Array(longLength).fill(null);
  let i = shortLength;
  let j = longLength;

  while (i > 0 && j > 0) {
    const matchScore =
      dp[i - 1][j - 1] + (shortChars[i - 1] === longChars[j - 1] ? 1 : 0);

    if (matchScore >= dp[i][j - 1]) {
      shortToLong[i - 1] = j - 1;
      longToShort[j - 1] = i - 1;
      i -= 1;
      j -= 1;
    } else {
      j -= 1;
    }
  }

  return { shortToLong, longToShort };
}

function createTextAlignment(sourceChars, targetChars) {
  const sourceLength = sourceChars.length;
  const targetLength = targetChars.length;
  const sourceToTarget = Array(sourceLength).fill(null);
  const targetToSource = Array(targetLength).fill(null);

  if (sourceLength === 0 || targetLength === 0) {
    return { sourceToTarget, targetToSource };
  }

  if (sourceLength <= targetLength) {
    const alignment = createFittedAlignment(sourceChars, targetChars);

    for (let sourceIndex = 0; sourceIndex < sourceLength; sourceIndex += 1) {
      const targetIndex = alignment.shortToLong[sourceIndex];

      sourceToTarget[sourceIndex] = targetIndex;
      if (targetIndex !== null) targetToSource[targetIndex] = sourceIndex;
    }
  } else {
    const alignment = createFittedAlignment(targetChars, sourceChars);

    for (let targetIndex = 0; targetIndex < targetLength; targetIndex += 1) {
      const sourceIndex = alignment.shortToLong[targetIndex];

      targetToSource[targetIndex] = sourceIndex;
      if (sourceIndex !== null) sourceToTarget[sourceIndex] = targetIndex;
    }
  }

  return { sourceToTarget, targetToSource };
}

function normalizeMorphOptions(options) {
  const merged = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  return {
    ...merged,
    maxSteps: Math.max(
      1,
      Math.round(normalizePositiveNumber(merged.maxSteps, DEFAULT_OPTIONS.maxSteps)),
    ),
    symbols: String(merged.symbols || DEFAULT_MORPH_SYMBOLS),
  };
}

function createChangeTickets(current, targetChars, alignment) {
  return alignment.sourceToTarget.flatMap((targetIndex, sourceIndex) => {
    if (targetIndex === null || current[sourceIndex] === targetChars[targetIndex]) {
      return [];
    }

    return [{
      type: 'change',
      index: sourceIndex,
      targetIndex,
    }];
  });
}

function createAddOptions(current, targetChars, alignment) {
  if (current.length >= targetChars.length) return [];

  const options = [];

  for (let insertIndex = 0; insertIndex <= current.length; insertIndex += 1) {
    const previousTarget =
      insertIndex === 0 ? -1 : alignment.sourceToTarget[insertIndex - 1];
    const nextTarget =
      insertIndex === current.length
        ? targetChars.length
        : alignment.sourceToTarget[insertIndex];

    for (
      let targetIndex = previousTarget + 1;
      targetIndex < nextTarget;
      targetIndex += 1
    ) {
      options.push({
        index: insertIndex,
        targetIndex,
        target: targetChars[targetIndex],
      });
    }
  }

  return options;
}

function createDeleteOptions(current, alignment) {
  return alignment.sourceToTarget.flatMap((targetIndex, sourceIndex) => {
    if (targetIndex !== null) return [];

    return [{
      index: sourceIndex,
      char: current[sourceIndex],
    }];
  });
}

function createCandidateTickets(current, targetChars) {
  const alignment = createTextAlignment(current, targetChars);
  const tickets = createChangeTickets(current, targetChars, alignment);
  const deleteCount = Math.max(0, current.length - targetChars.length);
  const addCount = Math.max(0, targetChars.length - current.length);

  for (let index = 0; index < deleteCount; index += 1) {
    tickets.push({
      type: 'delete',
    });
  }

  for (let index = 0; index < addCount; index += 1) {
    tickets.push({
      type: 'add',
    });
  }

  return tickets;
}

function chooseInsertedChar(targetChar, settings, random) {
  const symbolChars = splitText(settings.symbols);
  const candidates = symbolChars.filter((char) => char !== targetChar);

  return chooseRandomItem(candidates.length ? candidates : symbolChars, random) ?? '';
}

function chooseReplacementChar(currentChar, targetChar, settings, random) {
  const symbolChars = splitText(settings.symbols);
  const candidates = symbolChars.filter(
    (char) => char !== currentChar && char !== targetChar,
  );

  return chooseRandomItem(candidates.length ? candidates : symbolChars, random);
}

function shouldUseTargetChange(ticketCount, random) {
  return ticketCount <= FORCE_TARGET_TICKET_COUNT || random() < TARGET_CHANGE_CHANCE;
}

function resolveTicket(ticket, current, targetChars, settings, random, ticketCount) {
  const alignment = createTextAlignment(current, targetChars);

  if (ticket.type === 'change') {
    const targetIndex = ticket.targetIndex ?? alignment.sourceToTarget[ticket.index];

    if (targetIndex === null) {
      return {
        operation: null,
        optionCount: 0,
      };
    }

    const targetChar = targetChars[targetIndex];
    const useTarget = shouldUseTargetChange(ticketCount, random);
    const replacement = useTarget
      ? targetChar
      : chooseReplacementChar(current[ticket.index], targetChar, settings, random);
    const mode = replacement === targetChar ? 'target' : 'scramble';

    return {
      operation: {
        type: 'change',
        mode,
        index: ticket.index,
        from: current[ticket.index],
        to: replacement,
        target: targetChar,
        targetIndex,
      },
      optionCount: 1,
    };
  }

  if (ticket.type === 'delete') {
    const options = createDeleteOptions(current, alignment);
    const option = chooseRandomItem(options, random);

    if (!option) {
      return {
        operation: null,
        optionCount: 0,
      };
    }

    return {
      operation: {
        type: 'delete',
        index: option.index,
        char: option.char,
        direction: 'shrink',
      },
      optionCount: options.length,
    };
  }

  const options = createAddOptions(current, targetChars, alignment);
  const option = chooseRandomItem(options, random);

  if (!option) {
    return {
      operation: null,
      optionCount: 0,
    };
  }

  const char = chooseInsertedChar(option.target, settings, random);

  return {
    operation: {
      type: 'add',
      index: option.index,
      char,
      direction: 'grow',
      target: option.target,
      targetIndex: option.targetIndex,
    },
    optionCount: options.length,
  };
}

function chooseNextOperation(current, targetChars, settings, random) {
  const tickets = createCandidateTickets(current, targetChars);
  const ticketCount = tickets.length;

  while (tickets.length) {
    const ticketIndex = Math.floor(random() * tickets.length);
    const [ticket] = tickets.splice(ticketIndex, 1);
    const resolved = resolveTicket(
      ticket,
      current,
      targetChars,
      settings,
      random,
      ticketCount,
    );

    if (resolved.operation) {
      return {
        ...resolved.operation,
        candidateCount: ticketCount,
        optionCount: resolved.optionCount,
      };
    }
  }

  return null;
}

function pushStep(steps, current, operation) {
  const before = current.join('');

  if (operation.type === 'add') {
    current.splice(operation.index, 0, operation.char);
  }

  if (operation.type === 'delete') {
    current.splice(operation.index, 1);
  }

  if (operation.type === 'change') {
    current[operation.index] = operation.to;
  }

  const text = current.join('');

  steps.push({
    ...operation,
    before,
    text,
  });
}

export function findCommonLetters(source, target) {
  const sourceChars = splitText(source);
  const targetChars = splitText(target);
  const rows = sourceChars.length + 1;
  const cols = targetChars.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = sourceChars.length - 1; i >= 0; i -= 1) {
    for (let j = targetChars.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        sourceChars[i] === targetChars[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const common = [];
  let i = 0;
  let j = 0;

  while (i < sourceChars.length && j < targetChars.length) {
    if (sourceChars[i] === targetChars[j]) {
      common.push({
        char: sourceChars[i],
        sourceIndex: i,
        targetIndex: j,
      });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return common;
}

export function createTextMorphSteps(source, target, options = {}) {
  const sourceText = String(source);
  const targetText = String(target);
  const targetChars = splitText(targetText);
  const current = splitText(sourceText);
  const settings = normalizeMorphOptions(options);
  const random = normalizeRng(settings);
  const commonLetters = findCommonLetters(sourceText, targetText);
  const steps = [];

  while (current.join('') !== targetText && steps.length < settings.maxSteps) {
    const operation = chooseNextOperation(current, targetChars, settings, random);

    if (!operation) break;

    pushStep(steps, current, operation);
  }

  return {
    source: sourceText,
    target: targetText,
    commonLetters,
    structuralStepCount: Math.abs(targetChars.length - splitText(sourceText).length),
    candidateChoiceCount: steps.reduce(
      (total, step) => total + (step.candidateCount ?? 0),
      0,
    ),
    randomStepCount: steps.filter((step) => step.mode === 'scramble').length,
    targetStepCount: steps.filter((step) => step.mode === 'target').length,
    steps,
  };
}

export function createTextMorphSequence(words, options = {}) {
  const values = words.map(String);
  const transitions = [];

  for (let index = 0; index < values.length - 1; index += 1) {
    transitions.push(createTextMorphSteps(values[index], values[index + 1], options));
  }

  return transitions;
}

export function createTextMorphPlayer(options = {}) {
  const settings = {
    ...DEFAULT_PLAYER_OPTIONS,
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const words = (settings.words ?? [settings.source, settings.target])
    .filter((word) => word !== undefined)
    .map(String);
  const timers = new Set();
  let stopped = true;

  const setTimer = (fn, delay) => {
    const timer = globalThis.setTimeout(() => {
      timers.delete(timer);
      fn();
    }, delay);

    timers.add(timer);
    return timer;
  };

  const clearTimers = () => {
    timers.forEach((timer) => globalThis.clearTimeout(timer));
    timers.clear();
  };

  const stop = () => {
    stopped = true;
    clearTimers();
  };

  const start = () => {
    stop();
    stopped = false;

    if (words.length === 0) return;

    let transitionIndex = 0;
    settings.onUpdate?.(words[0]);

    const playTransition = () => {
      if (stopped || transitionIndex >= words.length - 1) {
        settings.onComplete?.(words[words.length - 1]);
        return;
      }

      const transition = createTextMorphSteps(
        words[transitionIndex],
        words[transitionIndex + 1],
        settings,
      );
      let stepIndex = 0;
      settings.onTransition?.(transition, transitionIndex);

      const tick = () => {
        if (stopped) return;

        if (stepIndex >= transition.steps.length) {
          transitionIndex += 1;
          setTimer(playTransition, settings.holdMs);
          return;
        }

        const step = transition.steps[stepIndex];
        settings.onStep?.(step, stepIndex, transition);
        settings.onUpdate?.(step.text, step, transition);
        stepIndex += 1;
        setTimer(tick, settings.stepMs);
      };

      tick();
    };

    setTimer(playTransition, settings.startDelayMs);
  };

  return {
    start,
    stop,
    createSequence: () => createTextMorphSequence(words, settings),
  };
}
