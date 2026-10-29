import { useEffect, useRef, useState } from 'react';

import { createAudio } from '../../game/audio';
import { CONFIG } from '../../game/config';
import { createGame, stepGame } from '../../game/engine';
import { createInput } from '../../game/input';
import { renderGame } from '../../game/renderer';
import { canvasSize } from '../../game/surface';
import type { Action, GameState } from '../../game/types';
import { resizeWorld } from '../../game/viewport';

import style from './App.module.less';

type Screen = 'ready' | 'playing' | 'paused' | 'gameover';
const SCREEN_COPY = {
  ready: {
    title: 'Asteroids',
    description: 'Разбивай астероиды и сбивай тарелки.\nСледи за перегревом оружия.',
    button: 'Играть',
    hint: '← → — поворот · ↑ — тяга · пробел — огонь',
  },
  paused: { title: 'Пауза', description: '', button: 'Продолжить', hint: 'Esc — продолжить' },
  gameover: { title: 'Игра окончена', description: '', button: 'Играть снова', hint: 'Enter — новая игра' },
  playing: { title: '', description: '', button: '', hint: '' },
};
const keyActions: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'thrust',
  KeyW: 'thrust',
  Space: 'fire',
};
const buttons: { action: Action; label: string; symbol: string; key: string }[] = [
  { action: 'left', label: 'Поворот влево', symbol: '↶', key: '← / A' },
  { action: 'thrust', label: 'Тяга', symbol: '↑', key: '↑ / W' },
  { action: 'right', label: 'Поворот вправо', symbol: '↷', key: '→ / D' },
  { action: 'fire', label: 'Огонь', symbol: 'Огонь', key: 'Пробел' },
];

function readBest(): number {
  try {
    return Math.max(0, Number(localStorage.getItem('safeboard-asteroids-best')) || 0);
  } catch {
    return 0;
  }
}

function snapshot(game: GameState) {
  return {
    score: game.score,
    lives: game.lives,
    wave: game.wave,
    heat: game.ship.weapon.heat,
    locked: game.ship.weapon.locked,
  };
}

export const App = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef(createGame(CONFIG, 1979));
  const input = useRef(createInput());
  const audio = useRef(createAudio());
  const mode = useRef<Screen>('ready');
  const [screen, setScreen] = useState<Screen>('ready');
  const [hud, setHud] = useState(snapshot(game.current));
  const [best, setBest] = useState(readBest);
  const bestRef = useRef(best);
  const [muted, setMuted] = useState(false);
  const [pressed, setPressed] = useState(input.current.read());
  const [fullscreen, setFullscreen] = useState(false);
  const cabinet = useRef<HTMLDivElement>(null);
  const fitCanvas = useRef<null | (() => void)>(null);

  function changeScreen(next: Screen) {
    mode.current = next;
    setScreen(next);
    input.current.reset();
    setPressed(input.current.read());
  }

  function start() {
    try {
      audio.current.unlock();
    } catch {
      /* Continue silently if audio is unsupported. */
    }
    game.current = createGame(CONFIG, Date.now());
    fitCanvas.current?.();
    setHud(snapshot(game.current));
    changeScreen('playing');
    canvas.current?.focus();
  }

  function togglePause() {
    if (mode.current === 'playing') changeScreen('paused');
    else if (mode.current === 'paused') {
      changeScreen('playing');
      canvas.current?.focus();
    }
  }

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return undefined;
    const surface = canvas.current;
    if (!surface) return undefined;
    const resize = () => {
      const rect = surface.getBoundingClientRect();
      const size = canvasSize(rect.width, rect.height, window.devicePixelRatio);
      if (rect.width > 0 && rect.height > 0)
        resizeWorld(game.current, (rect.width / rect.height) * CONFIG.height, CONFIG.height);
      if (surface.width !== size.width) surface.width = size.width;
      if (surface.height !== size.height) surface.height = size.height;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    fitCanvas.current = resize;
    window.addEventListener('resize', resize);
    resize();
    const clock = { frame: 0, lastTime: 0, accumulator: 0, lastHud: 0 };
    const finishGame = () => {
      if (game.current.score > bestRef.current) {
        bestRef.current = game.current.score;
        setBest(game.current.score);
        try {
          localStorage.setItem('safeboard-asteroids-best', String(game.current.score));
        } catch {
          /* Storage is optional. */
        }
      }
      setHud(snapshot(game.current));
      changeScreen('gameover');
    };
    const loop = (time: number) => {
      const dt = clock.lastTime === 0 ? 0 : Math.min((time - clock.lastTime) / 1000, 0.1);
      clock.lastTime = time;
      if (mode.current === 'playing') {
        clock.accumulator += dt;
        while (clock.accumulator >= 1 / 120 && mode.current === 'playing') {
          stepGame(game.current, input.current.read(), 1 / 120);
          game.current.events.forEach((event) => audio.current.play(event));
          clock.accumulator -= 1 / 120;
          if (game.current.status === 'gameover') finishGame();
        }
      } else clock.accumulator = 0;
      renderGame(ctx, game.current, mode.current === 'playing' ? input.current.read() : undefined);
      if (time - clock.lastHud > 80 && mode.current === 'playing') {
        setHud(snapshot(game.current));
        clock.lastHud = time;
      }
      clock.frame = requestAnimationFrame(loop);
    };
    clock.frame = requestAnimationFrame(loop);
    const clear = () => {
      input.current.reset();
      setPressed(input.current.read());
      if (mode.current === 'playing') changeScreen('paused');
      clock.lastTime = 0;
      clock.accumulator = 0;
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        event.preventDefault();
        if (!event.repeat) togglePause();
        return;
      }
      const { target } = event;
      // Keep native Enter/Space activation on menus and controls.
      if (target instanceof HTMLElement && target.closest('button, a, input, textarea')) return;
      const action = keyActions[event.code];
      if (action) {
        event.preventDefault();
        if (mode.current === 'playing') {
          input.current.set(event.code, action, true);
          setPressed(input.current.read());
        }
      }
      if (event.code === 'Enter' && !event.repeat) {
        if (mode.current === 'ready' || mode.current === 'gameover') start();
        else if (mode.current === 'paused') togglePause();
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      input.current.release(event.code);
      setPressed(input.current.read());
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    const fullChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      resize();
    };
    document.addEventListener('fullscreenchange', fullChange);
    return () => {
      cancelAnimationFrame(clock.frame);
      observer.disconnect();
      fitCanvas.current = null;
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('fullscreenchange', fullChange);
      input.current.reset();
      audio.current.dispose();
    };
  }, []);

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    audio.current.setEnabled(!next);
    if (!next) {
      try {
        audio.current.unlock();
      } catch {
        /* Optional audio. */
      }
    }
    if (mode.current === 'playing') canvas.current?.focus();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement)
      document.exitFullscreen().catch(() => {
        /* Fullscreen may be unavailable. */
      });
    else
      cabinet.current?.requestFullscreen?.().catch(() => {
        /* Fullscreen may be unavailable. */
      });
    if (mode.current === 'playing') canvas.current?.focus();
  }

  const hot = hud.heat > 70 || hud.locked;
  const copy = SCREEN_COPY[screen];
  return (
    <main className={style.page}>
      <div className={style.cabinet} ref={cabinet} id="game">
        <header className={style.topbar}>
          <h1>Asteroids</h1>
          <div className={style.tools}>
            <button
              type="button"
              onClick={togglePause}
              disabled={screen === 'ready' || screen === 'gameover'}
              aria-label={screen === 'paused' ? 'Продолжить' : 'Пауза'}
              title="Пауза · Esc"
            >
              {screen === 'paused' ? '▷' : 'Ⅱ'}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
              aria-pressed={!muted}
              title={muted ? 'Включить звук' : 'Выключить звук'}
            >
              {muted ? '♩' : '♫'}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
              title="Полный экран"
            >
              ⛶
            </button>
          </div>
        </header>
        <div className={style.consoleTop}>
          <div className={style.stats}>
            <div>
              <span>Счёт</span>
              <strong>{String(hud.score).padStart(6, '0')}</strong>
            </div>
            <div>
              <span>Волна</span>
              <strong>{String(hud.wave).padStart(2, '0')}</strong>
            </div>
          </div>
          <div className={style.lives} aria-label={`Жизни: ${hud.lives}`}>
            <span>Жизни</span>
            <strong>
              {Array.from({ length: CONFIG.lives }, (_, n) => (
                <b key={n} className={n >= hud.lives ? style.lost : ''}>
                  △
                </b>
              ))}
            </strong>
          </div>
          <div className={`${style.heat} ${hot ? style.hot : ''}`}>
            <div>
              <span>Оружие</span>
              <strong>{hud.locked ? 'Перегрев' : `${Math.round(hud.heat)}%`}</strong>
            </div>
            <div
              className={style.heatTrack}
              role="progressbar"
              aria-label="Температура оружия"
              aria-valuenow={Math.round(hud.heat)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div style={{ width: `${hud.heat}%` }} />
            </div>
          </div>
        </div>
        <div className={style.viewport}>
          <canvas ref={canvas} tabIndex={0} aria-label="Игровое поле Asteroids. Стрелки — движение, пробел — огонь." />
          {screen !== 'playing' && (
            <div className={style.overlay}>
              <div className={style.startPanel}>
                <h2>{copy.title}</h2>
                <p>
                  {screen === 'gameover'
                    ? `Счёт: ${hud.score} · Рекорд: ${Math.max(best, hud.score)} · Волна: ${hud.wave}`
                    : copy.description}
                </p>
                <button type="button" className={style.startButton} onClick={screen === 'paused' ? togglePause : start}>
                  {copy.button}
                </button>
                <small>{copy.hint}</small>
              </div>
            </div>
          )}
          {screen === 'playing' && hud.locked && <div className={style.overheatNotice}>Оружие остывает</div>}
        </div>
        <div className={style.controlDeck}>
          <div className={style.controlGroup}>
            {buttons.map((button) => (
              <button
                key={button.action}
                type="button"
                aria-label={button.label}
                aria-pressed={pressed[button.action]}
                disabled={screen !== 'playing'}
                className={`${style.control} ${button.action === 'fire' ? style.fire : ''} ${
                  pressed[button.action] ? style.pressed : ''
                }`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  if (mode.current !== 'playing') return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  input.current.set(`pointer-${event.pointerId}`, button.action, true);
                  setPressed(input.current.read());
                }}
                onPointerUp={(event) => {
                  input.current.release(`pointer-${event.pointerId}`);
                  setPressed(input.current.read());
                }}
                onPointerCancel={(event) => {
                  input.current.release(`pointer-${event.pointerId}`);
                  setPressed(input.current.read());
                }}
                onLostPointerCapture={(event) => {
                  input.current.release(`pointer-${event.pointerId}`);
                  setPressed(input.current.read());
                }}
                onKeyDown={(event) => {
                  if (event.code === 'Space' || event.code === 'Enter') {
                    event.preventDefault();
                    input.current.set(`button-${button.action}`, button.action, true);
                    setPressed(input.current.read());
                  }
                }}
                onKeyUp={() => {
                  input.current.release(`button-${button.action}`);
                  setPressed(input.current.read());
                }}
                onBlur={() => {
                  input.current.release(`button-${button.action}`);
                  setPressed(input.current.read());
                }}
              >
                <span>{button.symbol}</span>
                <small>{button.key}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
