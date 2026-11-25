// The world — 24 November 2026.
// A program that draws one newspaper front page summing up the day's world
// news, as a 1024x1024 PNG. Standard library only: node:fs, node:zlib.
// The picture is drawn from a tiny 5x7 bitmap font written out below, and a
// small PNG writer (CRC32 + zlib). No network, no clock, no randomness, so
// every run writes exactly the same bytes.
//
// Run:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The image lands at <output dir>/entry.png (or argv[2] when given).
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 bits, written as strings: "1" is ink, "0" is not.
type Glyph = string[];
const FONT: Record<string, Glyph> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01000", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01010", "00100"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
};
const BLANK: Glyph = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

// ------------------------------------------------------------------ canvas
const W = 1024;
const H = 1024;
const PAPER: [number, number, number] = [250, 247, 240];
const INK: [number, number, number] = [20, 20, 20];
const RED: [number, number, number] = [158, 32, 32];
const GREY: [number, number, number] = [96, 96, 92];

const px = new Uint8Array(W * H * 3);

function paint(r: number, g: number, b: number): void {
  for (let i = 0; i < px.length; i += 3) {
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  }
}

function rect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}

function glyphWidth(s: string, scale: number): number {
  return s.length * 6 * scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: [number, number, number]): void {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] ?? BLANK;
    for (let row = 0; row < 7; row++) {
      const bits = g[row];
      for (let col = 0; col < 5; col++) {
        if (bits[col] === "1") {
          rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawCentered(y: number, s: string, scale: number, c: [number, number, number]): void {
  drawText(Math.round((W - glyphWidth(s, scale)) / 2), y, s, scale, c);
}

function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur === "" ? w : cur + " " + w;
    if (glyphWidth(t, scale) <= maxW) {
      cur = t;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function rule(y: number, thick: number): void {
  rect(44, y, W - 88, thick, INK);
}

// --------------------------------------------------------------------- PNG
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcIn = new Uint8Array(4 + data.length);
  crcIn.set(out.subarray(4, 8), 0);
  crcIn.set(data, 4);
  dv.setUint32(8 + data.length, crc32(crcIn));
  return out;
}

function encodePng(): Uint8Array {
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W);
  dv.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

// ------------------------------------------------------------ the front page
type Story = { kicker: string; head: string; body: string; src: string };

const LEAD: Story = {
  kicker: "LEAD STORY - TECHNOLOGY",
  head: "HUANG IS BACK AS NVIDIA CHIEF",
  body: "Nvidia's board reinstated Jensen Huang as chief executive on Monday, 11 days after he resigned, following pressure from President Trump and Wall Street. Shares jumped 30% to $165, adding more than $900 billion in market value in a single day.",
  src: "WSJ",
};

const GRID: Story[] = [
  {
    kicker: "BUSINESS",
    head: "SANOFI BUYS INSMED FOR $41 BILLION",
    body: "Sanofi agreed to buy US drugmaker Insmed for $41 billion in cash at $175 a share, the biggest biotech deal in nearly three years.",
    src: "WSJ",
  },
  {
    kicker: "WORLD",
    head: "COURT: MYANMAR COMMITTED GENOCIDE",
    body: "The International Court of Justice ruled Myanmar committed genocide against the Rohingya. Fourteen countries backed the ruling.",
    src: "REUTERS",
  },
  {
    kicker: "DEFENCE",
    head: "NATO VOWS TO DEFEND SPACE",
    body: "NATO's chief said the alliance will defend against threats in space after reports Russia is preparing a nuclear-armed satellite.",
    src: "BBC",
  },
  {
    kicker: "ENERGY",
    head: "TANKERS HIT BY MINES IN HORMUZ",
    body: "Iran said three oil tankers hit mines in the Strait of Hormuz as Tehran refused talks until the US meets seven conditions.",
    src: "AP",
  },
];

const BOTTOM: Story = {
  kicker: "TECHNOLOGY",
  head: "STATES SUE MUSK OVER GROK IMAGES",
  body: "Virginia and Oregon sued Musk's companies, alleging the Grok chatbot produced non-consensual sexual images, including of children.",
  src: "REUTERS",
};

function drawStory(x: number, y: number, w: number, s: Story, headScale: number, bodyLines: number): number {
  drawText(x, y, s.kicker, 2, RED);
  let cy = y + 22;
  for (const ln of wrap(s.head, headScale, w)) {
    drawText(x, cy, ln, headScale, INK);
    cy += 7 * headScale + 6;
  }
  cy += 4;
  const body = wrap(s.body, 2, w).slice(0, bodyLines);
  for (const ln of body) {
    drawText(x, cy, ln, 2, INK);
    cy += 18;
  }
  cy += 6;
  drawText(x, cy, "Source: " + s.src, 2, GREY);
  return cy + 14;
}

function main(): void {
  paint(PAPER[0], PAPER[1], PAPER[2]);
  const M = 44;
  const contentW = W - M * 2;

  // Dateline.
  drawText(M, 34, "TUESDAY, 24 NOVEMBER 2026", 2, INK);
  const late = "LATE EDITION";
  drawText(W - M - glyphWidth(late, 2), 34, late, 2, INK);
  rule(62, 2);

  // Masthead.
  drawCentered(82, "THE WORLD", 11, INK);
  drawCentered(172, "Summing up the day's world news", 2, GREY);
  rule(198, 6);
  rule(208, 2);

  // Lead story, full width.
  let y = 228;
  y = drawStory(M, y, contentW, LEAD, 5, 4);
  rule(y + 8, 2);
  y += 20;

  // Four stories in a two-by-two grid.
  const colW = Math.floor((contentW - 32) / 2);
  const rowY = y;
  drawStory(M, rowY, colW, GRID[0], 3, 4);
  drawStory(M + colW + 32, rowY, colW, GRID[1], 3, 4);
  const row2Y = rowY + 186;
  drawStory(M, row2Y, colW, GRID[2], 3, 4);
  drawStory(M + colW + 32, row2Y, colW, GRID[3], 3, 4);
  y = row2Y + 186;

  // Bottom story, full width.
  rule(y + 4, 2);
  y += 22;
  drawText(M, y, BOTTOM.kicker, 2, RED);
  y += 22;
  for (const ln of wrap(BOTTOM.head, 4, contentW)) {
    drawText(M, y, ln, 4, INK);
    y += 7 * 4 + 6;
  }
  y += 4;
  for (const ln of wrap(BOTTOM.body, 2, contentW).slice(0, 2)) {
    drawText(M, y, ln, 2, INK);
    y += 18;
  }
  y += 8;
  drawText(M, y, "Source: " + BOTTOM.src, 2, GREY);
  y += 28;

  // Markets strip.
  rect(M, y, contentW, 40, INK);
  drawCentered(y + 12, "MARKETS   S&P 500 +4.7%   NASDAQ +6.5%   GOLD $3,620   BRENT $86.70", 2, PAPER);
  y += 50;

  // Footer.
  drawCentered(y, "SOURCES: WSJ, REUTERS, BBC, AP", 2, GREY);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? ".";
  const outFile = process.argv[2] ?? outDir + "/entry.png";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, encodePng());
}

main();
