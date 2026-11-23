// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Every
// element is drawn with canvas 2D shapes and gradients — no images, no web fonts. Elements are
// told apart by colour AND a drawn shape, so the game stays readable at thumbnail size.
import { CARD, CARD_DECK, ELEMENTS, FIELD, FONT, MINI_CARD, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

const HAND_Y = 508;
const HAND_CARD_W = 140;
const HAND_CARD_H = 196;
const HAND_GAP = 10;
const TABLE_Y = 197;
const END_TURN = { x: 1060, y: 600, width: 180, height: 56 };

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function roundRectPath(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

/** A heart shape centred on (x, y), size s. */
function drawHeart(context, x, y, s, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x, y + s * 0.9);
  context.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s, x, y - s * 0.3);
  context.bezierCurveTo(x + s * 0.7, y - s, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  context.closePath();
  context.fill();
}

/** A flame / triangle mark centred on (x, y), size s. */
function drawFlame(context, x, y, s, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x, y - s);
  context.bezierCurveTo(x + s * 0.75, y - s * 0.2, x + s * 0.55, y + s * 0.55, x, y + s * 0.7);
  context.bezierCurveTo(x - s * 0.55, y + s * 0.55, x - s * 0.75, y - s * 0.2, x, y - s);
  context.closePath();
  context.fill();
}

/** A snowflake / asterisk mark centred on (x, y), size s: three crossing strokes. */
function drawFrost(context, x, y, s, color) {
  context.strokeStyle = color;
  context.lineWidth = Math.max(2, s * 0.18);
  context.lineCap = 'round';
  for (let index = 0; index < 3; index += 1) {
    const angle = (index * Math.PI) / 3;
    context.beginPath();
    context.moveTo(x - Math.cos(angle) * s, y - Math.sin(angle) * s);
    context.lineTo(x + Math.cos(angle) * s, y + Math.sin(angle) * s);
    context.stroke();
  }
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, Math.max(2, s * 0.16), 0, Math.PI * 2);
  context.fill();
}

/** A leaf / ellipse mark centred on (x, y), size s, with a vein. */
function drawLeaf(context, x, y, s, color) {
  context.save();
  context.translate(x, y);
  context.rotate(-Math.PI / 4);
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'rgba(0,0,0,0.25)';
  context.lineWidth = Math.max(1.5, s * 0.1);
  context.beginPath();
  context.moveTo(-s * 0.8, 0);
  context.lineTo(s * 0.8, 0);
  context.stroke();
  context.restore();
}

/** A lightning zigzag centred on (x, y), size s. */
function drawBolt(context, x, y, s, color) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x + s * 0.15, y - s);
  context.lineTo(x - s * 0.55, y + s * 0.15);
  context.lineTo(x - s * 0.05, y + s * 0.15);
  context.lineTo(x - s * 0.15, y + s);
  context.lineTo(x + s * 0.55, y - s * 0.15);
  context.lineTo(x + s * 0.05, y - s * 0.15);
  context.closePath();
  context.fill();
}

/** The element's shape icon: flame, frost, leaf or bolt. */
function drawElementIcon(context, icon, x, y, size, color) {
  if (icon === 'flame') drawFlame(context, x, y, size, color);
  else if (icon === 'frost') drawFrost(context, x, y, size, color);
  else if (icon === 'leaf') drawLeaf(context, x, y, size, color);
  else drawBolt(context, x, y, size, color);
}

/** The hand's card rectangles (unrotated, for hit testing and for the slide animation). */
export function handRects(state) {
  const count = state.player.hand.length;
  const total = count * HAND_CARD_W + (count - 1) * HAND_GAP;
  const startX = (FIELD.width - total) / 2;
  const centre = (count - 1) / 2;
  return state.player.hand.map((card, index) => ({
    x: startX + index * (HAND_CARD_W + HAND_GAP),
    y: HAND_Y + Math.abs(index - centre) * 8,
    width: HAND_CARD_W,
    height: HAND_CARD_H,
    angle: (index - centre) * 0.055,
    card,
  }));
}

export function endTurnRect() {
  return { ...END_TURN };
}

/** Where a table card sits: one, two or three across the centre of the table. */
function tableSlot(index, count) {
  const starts = { 1: [565], 2: [480, 650], 3: [395, 565, 735] };
  return { x: starts[count][index], y: TABLE_Y };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawCardFace(card, x, y, width, height, dimmed) {
    const element = ELEMENTS[card.element];
    const scale = width / CARD.width;
    context.save();
    roundRectPath(context, x, y, width, height, 12 * scale);
    context.fillStyle = PALETTE.cream;
    context.fill();
    context.lineWidth = 6 * scale;
    context.strokeStyle = element.color;
    context.stroke();
    context.lineWidth = 1.5 * scale;
    context.strokeStyle = 'rgba(36,29,18,0.35)';
    roundRectPath(context, x + 5 * scale, y + 5 * scale, width - 10 * scale, height - 10 * scale, 9 * scale);
    context.stroke();
    // Cost ember, top left.
    drawFlame(context, x + 20 * scale, y + 22 * scale, 13 * scale, PALETTE.mana);
    text(String(card.cost), x + 20 * scale, y + 27 * scale, 16 * scale, '#ffffff', 'center', 'bold');
    // Element icon, top right.
    drawElementIcon(context, element.icon, x + width - 22 * scale, y + 22 * scale, 11 * scale, element.dark);
    // Name.
    text(card.name, x + width / 2, y + 62 * scale, 15 * scale, PALETTE.ink, 'center', 'bold');
    // Big power number.
    text(String(card.power), x + width / 2, y + 138 * scale, 62 * scale, element.dark, 'center', 'bold');
    // Type word and element label.
    text(card.type.toUpperCase(), x + width / 2, y + 168 * scale, 13 * scale, element.color, 'center', 'bold');
    text(element.label.toUpperCase(), x + width / 2, y + 190 * scale, 11 * scale, PALETTE.muted, 'center');
    if (dimmed) {
      roundRectPath(context, x, y, width, height, 12 * scale);
      context.fillStyle = 'rgba(10,10,10,0.45)';
      context.fill();
    }
    context.restore();
  }

  function drawCardBack(x, y, width, height) {
    const scale = width / CARD.width;
    context.save();
    roundRectPath(context, x, y, width, height, 12 * scale);
    context.fillStyle = '#3a2a1a';
    context.fill();
    context.lineWidth = 4 * scale;
    context.strokeStyle = PALETTE.rim;
    context.stroke();
    context.lineWidth = 1.5 * scale;
    context.strokeStyle = 'rgba(201,162,39,0.5)';
    roundRectPath(context, x + 6 * scale, y + 6 * scale, width - 12 * scale, height - 12 * scale, 8 * scale);
    context.stroke();
    drawFlame(context, x + width / 2, y + height / 2, 16 * scale, PALETTE.rim);
    context.restore();
  }

  function drawHearts(hp, maxHp, x, y, size, gap) {
    const perRow = 10;
    for (let index = 0; index < maxHp; index += 1) {
      const row = Math.floor(index / perRow);
      const col = index % perRow;
      drawHeart(
        context,
        x + col * gap,
        y + row * (size * 2.4),
        size,
        index < hp ? PALETTE.hp : PALETTE.hpEmpty,
      );
    }
  }

  function drawManaPips(mana, x, y) {
    for (let index = 0; index < 7; index += 1) {
      drawFlame(context, x + index * 22, y, 9, index < mana ? PALETTE.mana : PALETTE.manaEmpty);
    }
  }

  function drawSidePanel(state, isPlayer) {
    const side = isPlayer ? state.player : state.ai;
    const baseX = 40;
    const baseY = isPlayer ? 528 : 24;
    text(isPlayer ? 'YOU' : 'THE ASHEN WARDEN', baseX, baseY + 16, 15, PALETTE.muted, 'left', 'bold');
    text(String(side.hp), baseX, baseY + 62, 48, PALETTE.text, 'left', 'bold');
    drawHeart(context, baseX + 78, baseY + 48, 13, PALETTE.hp);
    if (side.shield > 0) {
      text(`SHIELD ${side.shield}`, baseX + 104, baseY + 54, 16, PALETTE.shield, 'left', 'bold');
    }
    drawHearts(side.hp, side.maxHp, baseX, baseY + 78, 7, 13);
    drawManaPips(side.mana, baseX + 4, baseY + 128);
    text('MANA', baseX + 158, baseY + 133, 12, PALETTE.muted, 'left', 'bold');
  }

  function drawTable(state) {
    // Deep green felt with a radial glow, a gold rim, and a faint centre emblem.
    const glow = context.createRadialGradient(640, 320, 60, 640, 360, 720);
    glow.addColorStop(0, PALETTE.feltLight);
    glow.addColorStop(0.55, PALETTE.felt);
    glow.addColorStop(1, PALETTE.feltDark);
    context.fillStyle = glow;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.lineWidth = 6;
    context.strokeStyle = PALETTE.rim;
    roundRectPath(context, 14, 14, FIELD.width - 28, FIELD.height - 28, 26);
    context.stroke();
    context.save();
    context.globalAlpha = 0.1;
    context.strokeStyle = PALETTE.rim;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(640, 300, 92, 0, Math.PI * 2);
    context.stroke();
    drawFlame(context, 640, 300, 46, PALETTE.rim);
    context.restore();

    // The log, down the left side of the table.
    text('BATTLE LOG', 40, 210, 13, PALETTE.muted, 'left', 'bold');
    state.log.forEach((line, index) => {
      text(line, 40, 236 + index * 22, 14, PALETTE.log, 'left');
    });

    // The round, top right.
    text(`ROUND ${state.round}`, FIELD.width - 40, 44, 18, PALETTE.text, 'right', 'bold');
  }

  function drawAiHand(state) {
    const count = state.ai.hand.length;
    const total = count * MINI_CARD.width + (count - 1) * 8;
    const startX = (FIELD.width - total) / 2;
    for (let index = 0; index < count; index += 1) {
      drawCardBack(startX + index * (MINI_CARD.width + 8), 16, MINI_CARD.width, MINI_CARD.height);
    }
  }

  function drawPlayedCards(state) {
    const count = state.table.length;
    state.table.forEach((shown, index) => {
      const slot = tableSlot(index, count);
      const from = shown.owner === 'player' ? { x: 565, y: 640 } : { x: 609, y: 40 };
      const t = easeOut(shown.t);
      const scale = 0.85 + 0.15 * t;
      const width = CARD.width * scale;
      const height = CARD.height * scale;
      const x = lerp(from.x, slot.x, t) + (CARD.width - width) / 2;
      const y = lerp(from.y, slot.y, t) + (CARD.height - height) / 2;
      drawCardFace(shown.card, x, y, width, height, false);
    });
  }

  function drawPlayerHand(state) {
    const rects = handRects(state);
    rects.forEach((rect) => {
      const affordable = rect.card.cost <= state.player.mana;
      context.save();
      context.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
      context.rotate(rect.angle);
      context.translate(-rect.width / 2, -rect.height / 2);
      drawCardFace(rect.card, 0, 0, rect.width, rect.height, state.phase === 'play' && !affordable);
      context.restore();
    });
  }

  function drawEndTurn(state) {
    const enabled = state.phase === 'play';
    context.save();
    roundRectPath(context, END_TURN.x, END_TURN.y, END_TURN.width, END_TURN.height, 12);
    context.fillStyle = enabled ? PALETTE.button : '#5a5344';
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = PALETTE.rimDark;
    context.stroke();
    text('END TURN', END_TURN.x + END_TURN.width / 2, END_TURN.y + 35, 19, enabled ? PALETTE.buttonText : '#cfc8b4', 'center', 'bold');
    context.restore();
  }

  function drawFloaters(state) {
    for (const floater of state.floaters) {
      const base = floater.anchor === 'player' ? { x: 130, y: 520 } : { x: 130, y: 96 };
      const alpha = Math.max(0, 1 - floater.t / 0.9);
      context.save();
      context.globalAlpha = alpha;
      text(floater.text, base.x, base.y - floater.t * 56, 28, floater.color, 'left', 'bold');
      context.restore();
    }
  }

  function drawEmbers(state) {
    context.save();
    for (const ember of state.embers) {
      context.globalAlpha = 0.35 + 0.3 * Math.sin(ember.drift * 2);
      context.fillStyle = '#ff9a3c';
      context.beginPath();
      context.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawTitle(state, best) {
    const backdrop = context.createLinearGradient(0, 0, 0, FIELD.height);
    backdrop.addColorStop(0, '#0d1512');
    backdrop.addColorStop(1, '#1d2b1a');
    context.fillStyle = backdrop;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    drawEmbers(state);
    // A fan of decorative cards behind the title.
    const fan = CARD_DECK.slice(0, 5);
    fan.forEach((card, index) => {
      const centre = (fan.length - 1) / 2;
      context.save();
      context.translate(640, 470);
      context.rotate((index - centre) * 0.14);
      context.translate(-CARD.width / 2, -CARD.height / 2);
      drawCardFace(card, 0, 0, CARD.width, CARD.height, false);
      context.restore();
    });
    context.save();
    context.shadowColor = 'rgba(242,201,76,0.55)';
    context.shadowBlur = 34;
    text('EMBER DUEL', FIELD.width / 2, 168, 96, PALETTE.gold, 'center', 'bold');
    context.restore();
    text('A duel of fire, frost, leaf and lightning — first to zero falls.', FIELD.width / 2, 214, 22, PALETTE.text, 'center');
    text(
      best > 0 ? `Best victory: ${best} HP left` : 'No victories yet — the Warden waits.',
      FIELD.width / 2, 252, 18, PALETTE.muted, 'center',
    );
    const blink = 0.55 + 0.45 * Math.sin(state.elapsed * 4);
    context.save();
    context.globalAlpha = blink;
    text('Click or press Enter to start', FIELD.width / 2, 664, 22, PALETTE.text, 'center', 'bold');
    context.restore();
    text('1-5 play a card  ·  Space ends your turn  ·  P pauses', FIELD.width / 2, 696, 14, PALETTE.muted, 'center');
  }

  function drawRays(state) {
    context.save();
    context.translate(640, 330);
    context.rotate(state.elapsed * 0.15);
    for (let index = 0; index < 12; index += 1) {
      context.rotate(Math.PI / 6);
      context.fillStyle = 'rgba(242,201,76,0.10)';
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(560, -46);
      context.lineTo(560, 46);
      context.closePath();
      context.fill();
    }
    context.restore();
  }

  function drawEndScreen(state, won) {
    context.save();
    context.fillStyle = 'rgba(8,12,9,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.restore();
    if (won) drawRays(state);
    drawEmbers(state);
    text(
      won ? 'VICTORY' : 'DEFEAT',
      FIELD.width / 2, 300, 100,
      won ? PALETTE.gold : '#7d8aa0',
      'center', 'bold',
    );
    text(
      won
        ? `You finish with ${state.player.hp} HP after ${state.round} rounds.`
        : `The Warden stands with ${state.ai.hp} HP after ${state.round} rounds.`,
      FIELD.width / 2, 360, 24, PALETTE.text, 'center',
    );
    const blink = 0.55 + 0.45 * Math.sin(state.elapsed * 4);
    context.save();
    context.globalAlpha = blink;
    text(
      won ? 'Press Enter to play again' : 'Press Enter to try again',
      FIELD.width / 2, 430, 22, PALETTE.text, 'center', 'bold',
    );
    context.restore();
  }

  function drawPaused() {
    context.save();
    context.fillStyle = 'rgba(8,12,9,0.65)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    text('PAUSED', FIELD.width / 2, 350, 64, PALETTE.text, 'center', 'bold');
    text('Press P or Enter to resume', FIELD.width / 2, 400, 20, PALETTE.muted, 'center');
    context.restore();
  }

  /** Click mapping: an end-turn press, a hand card, or nothing. */
  function hit(state, x, y) {
    if (x >= END_TURN.x && x <= END_TURN.x + END_TURN.width && y >= END_TURN.y && y <= END_TURN.y + END_TURN.height) {
      return { kind: 'end' };
    }
    const rects = handRects(state);
    for (let index = rects.length - 1; index >= 0; index -= 1) {
      const rect = rects[index];
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        return { kind: 'card', index };
      }
    }
    return null;
  }

  function draw(state, screen, best) {
    resize();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    context.save();
    if (state.shake > 0) {
      context.translate(Math.sin(state.elapsed * 47) * state.shake, Math.cos(state.elapsed * 39) * state.shake);
    }
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
    } else {
      drawTable(state);
      drawAiHand(state);
      drawSidePanel(state, false);
      drawSidePanel(state, true);
      drawPlayedCards(state);
      drawPlayerHand(state);
      drawEndTurn(state);
      drawFloaters(state);
      if (screen === SCREEN_WIN) drawEndScreen(state, true);
      else if (screen === SCREEN_LOSE) drawEndScreen(state, false);
      else if (screen === SCREEN_PAUSED) drawPaused();
    }
    context.restore();
  }

  return { draw, hit };
}
