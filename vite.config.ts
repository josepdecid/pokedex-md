/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the site from /<repo>/; the deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/';
// Absolute URL of the deployed site, used for the canonical link and Open Graph tags
// (those need absolute URLs). Override with SITE_URL, e.g. for a custom domain.
const siteUrl = process.env.SITE_URL ?? 'https://josepdecid.github.io/pokedex-md/';
const description =
  'Recruitment checklist for Pokémon Mystery Dungeon: Rescue Team DX. Track all 418 Pokémon and see where to recruit each one, by dungeon and camp. Works offline.';

export default defineConfig({
  base,
  plugins: [
    svelte(),
    {
      name: 'site-meta',
      transformIndexHtml: (html) =>
        html.replaceAll('%SITE_URL%', siteUrl).replaceAll('%SITE_DESCRIPTION%', description),
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'Pokédex: Mystery Dungeon',
        short_name: 'Pokédex MD',
        description,
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1f6f5c',
        background_color: '#f6f4ef',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json,webmanifest}'],
        // Only link-preview crawlers fetch the share image; don't precache it.
        globIgnores: ['og-image.png'],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
