import { drawStarfield } from './starfield';
import type { GameState, InputState } from './types';

function path(ctx: CanvasRenderingContext2D, points: number[][], close = true) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (close) ctx.closePath();
  ctx.stroke();
}

// eslint-disable-next-line max-statements -- Canvas commands are kept in their explicit back-to-front draw order.
export function renderGame(ctx: CanvasRenderingContext2D, state: GameState, input?: InputState) {
  const { width, height } = state.config;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#020309';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const canvasScale = Math.min(ctx.canvas.width / width, ctx.canvas.height / height);
  ctx.save();
  ctx.translate((ctx.canvas.width - width * canvasScale) / 2, (ctx.canvas.height - height * canvasScale) / 2);
  ctx.scale(canvasScale, canvasScale);
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  drawStarfield(ctx, width, height);
  // Draw adjacent copies so objects cross the toroidal boundaries smoothly.
  for (let ox = -width; ox <= width; ox += width) {
    for (let oy = -height; oy <= height; oy += height) {
      ctx.save();
      ctx.translate(ox, oy);
      state.asteroids.forEach((rock) => {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.angle);
        ctx.strokeStyle = '#a4bdc4';
        ctx.lineWidth = 1.4;
        path(
          ctx,
          rock.shape.map((scale, n) => {
            const angle = (n / rock.shape.length) * Math.PI * 2;
            return [Math.cos(angle) * rock.radius * scale, Math.sin(angle) * rock.radius * scale];
          }),
        );
        ctx.strokeStyle = '#344851';
        ctx.lineWidth = 1;
        path(
          ctx,
          [
            [-rock.radius * 0.35, -rock.radius * 0.2],
            [0, rock.radius * 0.15],
            [rock.radius * 0.4, -rock.radius * 0.1],
          ],
          false,
        );
        ctx.restore();
      });
      state.ufos.forEach((ufo) => {
        ctx.save();
        ctx.translate(ufo.x, ufo.y);
        const r = ufo.radius;
        ctx.strokeStyle = '#f4968a';
        ctx.lineWidth = 1.7;
        path(ctx, [
          [-r, 0],
          [-r * 0.5, -r * 0.35],
          [r * 0.5, -r * 0.35],
          [r, 0],
          [r * 0.5, r * 0.4],
          [-r * 0.5, r * 0.4],
        ]);
        path(
          ctx,
          [
            [-r * 0.4, -r * 0.35],
            [-r * 0.2, -r * 0.8],
            [r * 0.2, -r * 0.8],
            [r * 0.4, -r * 0.35],
          ],
          false,
        );
        path(
          ctx,
          [
            [-r, 0],
            [r, 0],
          ],
          false,
        );
        ctx.restore();
      });
      state.bullets.forEach((bullet) => {
        if (ox !== 0 || oy !== 0) return;
        ctx.fillStyle = bullet.enemy ? '#ff8e81' : '#e6fff7';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fillRect(bullet.x - 2, bullet.y - 2, bullet.enemy ? 4 : 3, bullet.enemy ? 4 : 3);
        ctx.shadowBlur = 0;
      });
      state.particles.forEach((particle) => {
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, 2, 2);
      });
      ctx.globalAlpha = 1;
      if (state.status === 'playing' && (state.ship.invulnerable === 0 || Math.floor(state.time * 10) % 2 === 0)) {
        ctx.save();
        ctx.translate(state.ship.x, state.ship.y);
        ctx.rotate(state.ship.angle);
        ctx.strokeStyle = '#e6fff7';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#a5ffe4';
        ctx.shadowBlur = 7;
        path(ctx, [
          [17, 0],
          [-12, -11],
          [-7, 0],
          [-12, 11],
        ]);
        ctx.shadowBlur = 0;
        if (input?.thrust) {
          ctx.strokeStyle = '#ffbc77';
          path(
            ctx,
            [
              [-12, -5],
              [-24 - Math.sin(state.time * 70) * 5, 0],
              [-12, 5],
            ],
            false,
          );
        }
        if (state.ship.invulnerable > 0) {
          ctx.strokeStyle = '#4e807e';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  }
  if (state.asteroids.length === 0 && state.status === 'playing') {
    ctx.fillStyle = '#8aadb9';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Волна ${state.wave + 1} через ${Math.max(1, Math.ceil(state.waveTimer))}`, width / 2, 45);
  }
  ctx.restore();
}
