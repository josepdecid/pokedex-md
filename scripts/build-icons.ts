// Generates the favicon and app icons in public/ from one SVG design.
// The icon echoes the share image: a mosaic of tiles (like its wall of portraits) behind a
// handheld dex showing a recruited check. Run `npm run icons` after changing it, and commit the output.
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const SIZE = 512;
const color = {
  bgCenter: '#25785f',
  bgEdge: '#0f3b31',
  tile: '#f6f4ef',
  body: '#f6f4ef',
  bodyShade: '#e3ded2',
  screen: '#155a48',
  lens: '#8fdcc4',
  ink: '#1d2422',
  red: '#e0662b',
  yellow: '#f0a020',
  green: '#3fae8e',
};

// Tile opacities for a 5×5 mosaic, read row by row. Uneven on purpose, like portraits of different colours.
const TILE_OPACITY = [
  0.1, 0.05, 0.13, 0.07, 0.11,
  0.06, 0.12, 0.04, 0.1, 0.06,
  0.13, 0.08, 0.1, 0.05, 0.12,
  0.05, 0.11, 0.07, 0.13, 0.07,
  0.09, 0.06, 0.12, 0.05, 0.1,
];

interface Variant {
  /** Rounded corners with transparency around them. Off for icons the OS masks itself. */
  rounded: boolean;
  /** Scale of the dex, so it stays inside the maskable safe zone (a centred circle, 80% wide). */
  scale: number;
}

function tiles(): string {
  const cell = SIZE / 5;
  const gap = 7;
  return TILE_OPACITY.map((opacity, i) => {
    const x = (i % 5) * cell + gap / 2;
    const y = Math.floor(i / 5) * cell + gap / 2;
    const s = cell - gap;
    return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="16" fill="${color.tile}" fill-opacity="${opacity}"/>`;
  }).join('');
}

// The dex, drawn around the centre (256, 256): a 248×312 body, lens and lights on top, a screen with a check.
function dex(): string {
  return `
  <rect x="132" y="112" width="248" height="312" rx="40" fill="#000" fill-opacity=".28" filter="url(#blur)"/>
  <rect x="132" y="100" width="248" height="312" rx="40" fill="${color.body}"/>
  <path d="M132 186h248" stroke="${color.bodyShade}" stroke-width="6"/>
  <circle cx="182" cy="143" r="29" fill="${color.lens}" stroke="${color.screen}" stroke-width="9"/>
  <circle cx="173" cy="134" r="9" fill="#fff" fill-opacity=".75"/>
  <circle cx="240" cy="128" r="10" fill="${color.red}"/>
  <circle cx="270" cy="128" r="10" fill="${color.yellow}"/>
  <circle cx="300" cy="128" r="10" fill="${color.green}"/>
  <rect x="160" y="208" width="192" height="148" rx="20" fill="${color.screen}"/>
  <path d="M218 268l28 28 52-56" fill="none" stroke="${color.body}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="186" y="324" width="140" height="12" rx="6" fill="${color.body}" fill-opacity=".22"/>
  <rect x="186" y="324" width="92" height="12" rx="6" fill="${color.lens}"/>
  <rect x="196" y="378" width="48" height="14" rx="7" fill="${color.bodyShade}"/>
  <rect x="268" y="378" width="48" height="14" rx="7" fill="${color.bodyShade}"/>`;
}

function svg({ rounded, scale }: Variant): string {
  const radius = rounded ? 112 : 0;
  const transform = scale === 1 ? '' : ` transform="translate(256 256) scale(${scale}) translate(-256 -256)"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="72%">
      <stop offset="0" stop-color="${color.bgCenter}"/>
      <stop offset="1" stop-color="${color.bgEdge}"/>
    </radialGradient>
    <clipPath id="shape"><rect width="${SIZE}" height="${SIZE}" rx="${radius}"/></clipPath>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  <g clip-path="url(#shape)">
    <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
    ${tiles()}
  </g>
  <g${transform}>${dex()}
  </g>
</svg>
`;
}

function png(source: string, size: number): Buffer {
  return new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

const out = (name: string) => new URL(`../public/${name}`, import.meta.url);

const standard = svg({ rounded: true, scale: 1 });
const fullBleed = svg({ rounded: false, scale: 1 });
const maskable = svg({ rounded: false, scale: 0.82 });

writeFileSync(out('icon.svg'), standard);
writeFileSync(out('icon-192.png'), png(standard, 192));
writeFileSync(out('icon-512.png'), png(standard, 512));
writeFileSync(out('icon-512-maskable.png'), png(maskable, 512));
// iOS rounds the corners itself and shows transparency as black, so this one is square.
writeFileSync(out('apple-touch-icon.png'), png(fullBleed, 180));
console.log('Icons written to public/');
