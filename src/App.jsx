import { useEffect, useMemo, useRef, useState } from 'react';
import TextScramble from '@twistezo/react-text-scramble';
import baffle from 'baffle';
import { gsap } from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { motion } from 'motion/react';
import { Plus, Play, RotateCcw, TimerReset, Trash2 } from 'lucide-react';
import shuffleLetters from 'shuffle-letters';
import ShuffleText from 'shuffle-text';
import TextMorph from './components/TextMorph.jsx';
import { createTextMorphPlayer } from './lib/index.js';

gsap.registerPlugin(ScrambleTextPlugin);

const INITIAL_WORDS = [
  'Dendi200822',
  'Wolfy169',
  'TactiKot',
  'Cat',
  'amatsuhikoni',
  'Eternal_Rival',
];
const SEQUENCE_START_MS = 220;
const SEQUENCE_GAP_MS = 1330;
const SEQUENCE_ANIMATION_MS = 780;
const STATUS_OFFSET_MS = 630;
const SPEED_OPTIONS = [
  { factor: 1, label: '1x', note: 'обычно' },
  { factor: 3, label: '3x', note: 'медленнее' },
  { factor: 5, label: '5x', note: 'медленнее' },
  { factor: 10, label: '10x', note: 'медленнее' },
];
const STEP_BASE_STEP_MS = 85;
const STEP_BASE_HOLD_MS = 620;

function scaleMs(value, slowdown) {
  return Math.round(value * slowdown);
}

function getTotalRunMs(words) {
  return (
    SEQUENCE_START_MS +
    SEQUENCE_GAP_MS * Math.max(0, words.length - 2) +
    SEQUENCE_ANIMATION_MS +
    700
  );
}

function getScrambleChars(words) {
  return `${words.join('')}0123456789#_+=?`.replace(/\s/g, '');
}

function getTwistezoWords(words) {
  const lastWord = words[words.length - 1];

  return lastWord ? [...words, lastWord] : words;
}

function getWordSchedule(
  words,
  slowdown,
  offsetMs = 0,
  gapMs = SEQUENCE_GAP_MS,
) {
  return words.slice(1).map((word, index) => ({
    word,
    delay: scaleMs(offsetMs + index * gapMs, slowdown),
  }));
}

function getTwistezoStopMs(words) {
  const letterSpeed = 65;
  const pauseTime = 420;
  const twistezoWords = getTwistezoWords(words);
  const revealMs = twistezoWords.reduce((total, word, index) => {
    const pause = index === twistezoWords.length - 1 ? 0 : pauseTime;

    return total + word.length * letterSpeed + pause;
  }, 0);

  return revealMs + 300;
}

function useTimedStatus(runId, slowdown, words) {
  const [status, setStatus] = useState(words[0] ?? '');

  useEffect(() => {
    setStatus(words[0] ?? '');

    const timers = getWordSchedule(
      words,
      slowdown,
      SEQUENCE_START_MS + STATUS_OFFSET_MS,
    ).map(({ word, delay }) => window.setTimeout(() => setStatus(word), delay));

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [runId, slowdown, words]);

  return status;
}

function useSequenceTimers(runId, steps) {
  useEffect(() => {
    const timers = steps.map(([delay, fn]) => window.setTimeout(fn, delay));

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [runId, steps]);
}

function WordShell({ children }) {
  return (
    <div className="word-shell" aria-live="polite">
      {children}
    </div>
  );
}

function getStepLabel(step) {
  if (!step) return 'ожидание';
  if (step.type === 'add') return `добавить "${step.char}" @ ${step.index + 1}`;
  if (step.type === 'delete') return `удалить "${step.char}" @ ${step.index + 1}`;

  return `заменить ${step.index + 1} → "${step.to}"`;
}

function StepTextMorphDemo({ runId, words, slowdown }) {
  const [displayText, setDisplayText] = useState(words[0] ?? '');
  const [transition, setTransition] = useState(null);
  const [stepState, setStepState] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const stepMs = scaleMs(STEP_BASE_STEP_MS, slowdown);
  const holdMs = scaleMs(STEP_BASE_HOLD_MS, slowdown);

  useEffect(() => {
    setDisplayText(words[0] ?? '');
    setStepState(null);
    setIsComplete(false);

    if (words.length === 0) return undefined;

    const player = createTextMorphPlayer({
      words,
      stepMs,
      holdMs,
      startDelayMs: scaleMs(140, slowdown),
      seed: runId + stepMs + holdMs + words.join('').length,
      onUpdate: setDisplayText,
      onTransition: (plan, transitionIndex) => {
        setTransition({ ...plan, transitionIndex });
        setStepState(null);
      },
      onStep: (step, stepIndex, plan) => {
        setStepState({
          ...step,
          stepIndex,
          totalSteps: plan.steps.length,
        });
      },
      onComplete: () => {
        setIsComplete(true);
      },
    });

    player.start();

    return () => {
      player.stop();
    };
  }, [runId, stepMs, holdMs, slowdown, words]);

  const commonLetters = transition?.commonLetters.map((item) => item.char).join('');
  const speedLabel = `${stepMs} ms шаг · ${holdMs} ms пауза`;
  const ticketCount = stepState?.candidateCount ?? transition?.steps[0]?.candidateCount ?? 0;

  return (
    <section className="library-panel" aria-labelledby="custom-library-title">
      <div className="library-panel__head">
        <div>
          <p className="eyebrow">Step Text Morph</p>
          <h2 id="custom-library-title">Наша пошаговая библиотека</h2>
        </div>
        <span className="meta-pill">local JS module</span>
      </div>

      <div className="library-workbench">
        <div className="library-preview">
          <WordShell>
            <span className="demo-word">{displayText}</span>
          </WordShell>
          <div className="step-meta" aria-live="polite">
            <span>{isComplete ? 'готово' : getStepLabel(stepState)}</span>
            <span>
              {stepState
                ? `${stepState.stepIndex + 1}/${stepState.totalSteps}`
                : '0/0'}
            </span>
          </div>
        </div>

        <div className="library-controls" aria-label="План новой библиотеки">
          <dl className="plan-stats">
            <div>
              <dt>Общие</dt>
              <dd>{commonLetters || 'нет'}</dd>
            </div>
            <div>
              <dt>Варианты</dt>
              <dd>{ticketCount}</dd>
            </div>
            <div>
              <dt>Структура</dt>
              <dd>{transition?.structuralStepCount ?? 0}</dd>
            </div>
            <div>
              <dt>Скорость</dt>
              <dd>{speedLabel}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function GsapScrambleDemo({ runId, slowdown, words, scrambleChars }) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    element.textContent = words[0] ?? '';
    gsap.killTweensOf(element);

    const timeline = gsap.timeline({ defaults: { ease: 'none' } });
    timeline.timeScale(1 / slowdown);

    words.slice(1).forEach((word, index) => {
      timeline.to(element, {
        duration: 0.95,
        scrambleText: {
          text: word,
          chars: scrambleChars,
          revealDelay: 0.08,
          speed: 0.35,
        },
      });

      if (index < words.length - 2) {
        timeline.to({}, { duration: 0.28 });
      }
    });

    return () => {
      timeline.kill();
      gsap.killTweensOf(element);
    };
  }, [runId, slowdown, words, scrambleChars]);

  return (
    <WordShell>
      <span className="demo-word" ref={elementRef}>
        {words[0] ?? ''}
      </span>
    </WordShell>
  );
}

function MotionPrimitiveDemo({ runId, slowdown, words }) {
  const [word, setWord] = useState(words[0] ?? '');
  const transition = useMemo(
    () => ({
      duration: 0.35 * slowdown,
      ease: [0.22, 1, 0.36, 1],
    }),
    [slowdown],
  );

  useSequenceTimers(
    runId,
    useMemo(
      () => {
        const targetSteps = getWordSchedule(words, slowdown, 650, 1200).map(
          ({ word, delay }) => [delay, () => setWord(word)],
        );

        return [[0, () => setWord(words[0] ?? '')], ...targetSteps];
      },
      [slowdown, words],
    ),
  );

  return (
    <WordShell>
      <TextMorph as="span" className="demo-word" transition={transition}>
        {word}
      </TextMorph>
    </WordShell>
  );
}

function TwistezoScrambleDemo({ runId, words }) {
  const [paused, setPaused] = useState(false);
  const texts = useMemo(() => getTwistezoWords(words), [words]);

  useEffect(() => {
    setPaused(false);
    const stop = window.setTimeout(
      () => setPaused(true),
      getTwistezoStopMs(words),
    );

    return () => {
      window.clearTimeout(stop);
    };
  }, [runId, words]);

  return (
    <WordShell>
      <TextScramble
        key={runId}
        className="demo-word"
        texts={texts}
        letterSpeed={18}
        nextLetterSpeed={65}
        pauseTime={420}
        paused={paused}
      />
    </WordShell>
  );
}

function BaffleDemo({ runId, slowdown, words, scrambleChars }) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    element.textContent = words[0] ?? '';
    const instance = baffle(element, {
      characters: scrambleChars,
      speed: 42,
    });

    const timers = getWordSchedule(words, slowdown, SEQUENCE_START_MS).map(
      ({ word, delay }) =>
        window.setTimeout(() => {
          instance
            .start()
            .text(() => word)
            .reveal(scaleMs(SEQUENCE_ANIMATION_MS, slowdown));
        }, delay),
    );

    return () => {
      timers.forEach(window.clearTimeout);
      instance.stop();
    };
  }, [runId, slowdown, words, scrambleChars]);

  return (
    <WordShell>
      <span className="demo-word" ref={elementRef}>
        {words[0] ?? ''}
      </span>
    </WordShell>
  );
}

function ShuffleLettersDemo({ runId, words }) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    const clearFns = [];
    element.textContent = words[0] ?? '';

    const timers = getWordSchedule(words, 1, 250, 1250).map(({ word, delay }) =>
      window.setTimeout(() => {
        clearFns.push(
          shuffleLetters(element, {
            text: word,
            iterations: 10,
            fps: 45,
          }),
        );
      }, delay),
    );

    return () => {
      timers.forEach(window.clearTimeout);
      clearFns.forEach((clear) => clear?.());
    };
  }, [runId, words]);

  return (
    <WordShell>
      <span className="demo-word" ref={elementRef}>
        {words[0] ?? ''}
      </span>
    </WordShell>
  );
}

function ShuffleTextDemo({ runId, slowdown, words, scrambleChars }) {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    element.textContent = words[0] ?? '';
    const shuffle = new ShuffleText(element);
    shuffle.duration = scaleMs(680, slowdown);
    shuffle.emptyCharacter = '_';
    shuffle.sourceRandomCharacter = scrambleChars;

    const timers = getWordSchedule(words, slowdown, 260, 1270).map(({ word, delay }) =>
      window.setTimeout(() => {
        shuffle.setText(word);
        shuffle.start();
      }, delay),
    );

    return () => {
      timers.forEach(window.clearTimeout);
      shuffle.dispose();
    };
  }, [runId, slowdown, words, scrambleChars]);

  return (
    <WordShell>
      <span className="demo-word" ref={elementRef}>
        {words[0] ?? ''}
      </span>
    </WordShell>
  );
}

const demos = [
  {
    id: 'gsap',
    title: 'GSAP',
    subtitle: 'ScrambleTextPlugin',
    meta: 'timeline + plugin',
    speedNote: 'честный timeScale',
    Component: GsapScrambleDemo,
  },
  {
    id: 'motion-primitives',
    title: 'Motion Primitives',
    subtitle: 'Text Morph',
    meta: 'React component + motion',
    speedNote: 'transition duration',
    Component: MotionPrimitiveDemo,
  },
  {
    id: 'twistezo',
    title: 'twistezo/react-text-scramble',
    subtitle: '@twistezo/react-text-scramble',
    meta: 'React component',
    speedNote: 'скорость не применяется',
    Component: TwistezoScrambleDemo,
  },
  {
    id: 'baffle',
    title: 'baffle.js',
    subtitle: 'baffle',
    meta: 'DOM obfuscation',
    speedNote: 'reveal duration',
    Component: BaffleDemo,
  },
  {
    id: 'shuffle-letters',
    title: 'shuffle-letters',
    subtitle: 'vanilla JS effect',
    meta: 'function API',
    speedNote: 'скорость не применяется',
    Component: ShuffleLettersDemo,
  },
  {
    id: 'shuffle-text',
    title: 'shuffle-text',
    subtitle: 'ShuffleText',
    meta: 'class API',
    speedNote: 'duration',
    Component: ShuffleTextDemo,
  },
];

export default function App() {
  const [runId, setRunId] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [slowdown, setSlowdown] = useState(1);
  const [words, setWords] = useState(INITIAL_WORDS);
  const [newWord, setNewWord] = useState('');
  const playableWords = useMemo(() => {
    const cleaned = words.map((word) => word.trim()).filter(Boolean);

    return cleaned.length ? cleaned : [''];
  }, [words]);
  const scrambleChars = useMemo(() => getScrambleChars(playableWords), [playableWords]);
  const activeSpeed = SPEED_OPTIONS.find((option) => option.factor === slowdown);
  const status = useTimedStatus(runId, slowdown, playableWords);

  useEffect(() => {
    setIsRunning(true);
    const done = window.setTimeout(
      () => setIsRunning(false),
      scaleMs(getTotalRunMs(playableWords), slowdown),
    );

    return () => {
      window.clearTimeout(done);
    };
  }, [runId, slowdown, playableWords]);

  const replay = () => {
    setRunId((current) => current + 1);
  };

  const updateWord = (index, value) => {
    setWords((current) =>
      current.map((word, wordIndex) => (wordIndex === index ? value : word)),
    );
    setRunId((current) => current + 1);
  };

  const addWord = (event) => {
    event.preventDefault();

    const value = newWord.trim();
    if (!value) return;

    setWords((current) => [...current, value]);
    setNewWord('');
    setRunId((current) => current + 1);
  };

  const removeWord = (index) => {
    setWords((current) => current.filter((_, wordIndex) => wordIndex !== index));
    setRunId((current) => current + 1);
  };

  const changeSpeed = (factor) => {
    if (factor === slowdown) return;

    setSlowdown(factor);
    setRunId((current) => current + 1);
  };

  return (
    <main className="page-shell">
      <section className="topbar" aria-labelledby="page-title">
        <div className="title-block">
          <p className="eyebrow">Text morph demo</p>
          <h1 id="page-title">Одинаковая смена слова в разных библиотеках</h1>
        </div>

        <div className="control-panel">
          <div className="route" aria-label="Последовательность слов">
            {playableWords.map((word, index) => (
              <span
                className={word === status ? 'route-step is-current' : 'route-step'}
                key={`${word}-${index}`}
              >
                {index + 1}. {word}
              </span>
            ))}
          </div>
          <div className="action-row">
            <div
              className="speed-control"
              role="radiogroup"
              aria-label="Множитель замедления для поддерживающих библиотек"
            >
              {SPEED_OPTIONS.map((option) => (
                <button
                  className={
                    option.factor === slowdown
                      ? 'speed-option is-selected'
                      : 'speed-option'
                  }
                  type="button"
                  role="radio"
                  aria-checked={option.factor === slowdown}
                  key={option.factor}
                  onClick={() => changeSpeed(option.factor)}
                >
                  <span>{option.label}</span>
                  <small>{option.note}</small>
                </button>
              ))}
            </div>
            <button
              className="run-button"
              type="button"
              onClick={replay}
              title="Запустить все демо заново"
            >
              {isRunning ? <RotateCcw size={18} /> : <Play size={18} />}
              <span>{isRunning ? 'Повторить' : 'Запустить'}</span>
            </button>
          </div>
        </div>
      </section>

      <section className="summary-strip" aria-label="Текущий переход">
        <div>
          <span className="summary-label">Сценарий</span>
          {playableWords.map((word, index) => (
            <span className="summary-word" key={`${word}-${index}`}>
              {index > 0 ? <span className="arrow">→</span> : null}
              <strong>{word}</strong>
            </span>
          ))}
        </div>
        <div>
          <TimerReset size={16} />
          <span>
            {isRunning
              ? `анимация идет, ${activeSpeed.label} ${activeSpeed.note}`
              : `финальное состояние, ${activeSpeed.label} ${activeSpeed.note}`}
          </span>
        </div>
      </section>

      <section className="word-editor" aria-label="Редактирование сценария слов">
        <div className="word-editor__head">
          <span>Слова сценария</span>
          <small>{playableWords.length} шт.</small>
        </div>

        <div className="word-list">
          {words.map((word, index) => (
            <label className="word-item" key={index}>
              <span>{index + 1}</span>
              <input
                aria-label={`Слово ${index + 1}`}
                value={word}
                onChange={(event) => updateWord(index, event.target.value)}
              />
              <button
                className="icon-button"
                type="button"
                title="Удалить слово"
                aria-label={`Удалить слово ${index + 1}`}
                onClick={() => removeWord(index)}
                disabled={words.length <= 1}
              >
                <Trash2 size={16} />
              </button>
            </label>
          ))}
        </div>

        <form className="add-word-form" onSubmit={addWord}>
          <input
            aria-label="Новое слово"
            placeholder="Новое слово"
            value={newWord}
            onChange={(event) => setNewWord(event.target.value)}
          />
          <button className="run-button" type="submit">
            <Plus size={17} />
            <span>Добавить</span>
          </button>
        </form>
      </section>

      <StepTextMorphDemo
        runId={runId}
        words={playableWords}
        slowdown={slowdown}
      />

      <section className="demo-grid" aria-label="Демонстрации библиотек">
        {demos.map(({ id, title, subtitle, meta, speedNote, Component }, index) => (
          <motion.article
            className="demo-card"
            key={id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.035 }}
          >
            <div className="demo-card__header">
              <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
                <p className="speed-note">{speedNote}</p>
              </div>
              <span className="meta-pill">{meta}</span>
            </div>
            <Component
              runId={runId}
              slowdown={slowdown}
              words={playableWords}
              scrambleChars={scrambleChars}
            />
          </motion.article>
        ))}
      </section>
    </main>
  );
}
