<script lang="ts">
  import { tick } from 'svelte';
  import EntryName from '../components/EntryName.svelte';
  import PasswordCamera from '../components/PasswordCamera.svelte';
  import PasswordGrid from '../components/PasswordGrid.svelte';
  import PasswordPhoto from '../components/PasswordPhoto.svelte';
  import Portrait from '../components/Portrait.svelte';
  import SymbolKeypad from '../components/SymbolKeypad.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import {
    PASSWORD_LENGTH,
    SYMBOL_COUNT,
    glyphOf,
    suitOf,
    symbolOf,
    makeRevival,
    passwordToText,
    type PasswordSymbol,
  } from '../lib/rescue/dx-password.ts';
  import { formatFloors } from '../lib/obtain.ts';
  import { bestPassword, isUnsure, type SymbolReading } from '../lib/rescue/recognize.ts';
  import { readRescue } from '../lib/rescue/rescue.ts';
  import { paths } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';
  import { readValue, storageKeys, writeValue } from '../lib/storage.ts';

  let { session }: { session: GameSession } = $props();

  /** The team that "rescues" you, named in the A-OK password. */
  const RESCUER = 'Pokédex MD';
  /** Rescue requests expire in the game after this long. */
  const REQUEST_LIFETIME = 7 * 24 * 3600 * 1000;

  /** What's saved, so the A-OK password stays the same while it's typed into the game. */
  interface Saved {
    password: (PasswordSymbol | null)[];
    /** A-OK password, and the rescue password (as text) it was made for. */
    revival?: { for: string; password: PasswordSymbol[] };
  }

  const empty = () => new Array<PasswordSymbol | null>(PASSWORD_LENGTH).fill(null);

  /** Where the password came from: a picture file or the camera. Typed by hand (or nothing yet): null. */
  type Mode = 'file' | 'camera';
  let mode = $state<Mode | null>(null);
  let photo = $state<PasswordPhoto>();
  let cameraOpen = $state(false);

  function pick(event: Event, from: Mode) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    mode = from;
    // The viewer appears with the mode; open the file once it's there.
    void tick().then(() => photo?.open(file));
  }
  let symbols = $state(empty());
  let cursor = $state(0);
  /** The keyboard opens when a symbol is tapped, to fill or fix it. */
  let typing = $state(false);
  let suit = $state(0);
  let keypad = $state<HTMLElement>();
  let keypadHeight = $state(0);
  /** Symbols to double-check: hard to read in the picture, or swapped to make the password valid. */
  let marked = $state(new Set<number>());
  let revival = $state<Saved['revival']>(undefined);
  let loaded = $state(false);

  $effect(() => {
    const key = storageKeys.rescue(session.id);
    void readValue<Saved>(key).then((saved) => {
      if (saved?.password?.length === PASSWORD_LENGTH) {
        symbols = saved.password.map((s) => (typeof s === 'number' && s >= 0 && s < SYMBOL_COUNT ? s : null));
        revival = saved.revival;
        const next = symbols.indexOf(null);
        cursor = next < 0 ? PASSWORD_LENGTH - 1 : next;
      }
      loaded = true;
    });
  });

  function save() {
    if (!loaded) return;
    void writeValue(storageKeys.rescue(session.id), $state.snapshot({ password: symbols, revival }) satisfies Saved);
  }

  const complete = $derived(symbols.every((s) => s !== null));
  const table = $derived(session.data.rescue);
  const result = $derived(complete && table ? readRescue(symbols as PasswordSymbol[], table) : null);
  const info = $derived(result?.ok ? result.info : null);
  const text = $derived(complete ? passwordToText(symbols as PasswordSymbol[]) : '');

  // A new valid rescue password gets its A-OK password, made once and kept.
  $effect(() => {
    if (!info || revival?.for === text) return;
    revival = { for: text, password: makeRevival(info.request, RESCUER) };
    save();
  });

  const leader = $derived(info ? session.entryById.get(info.pokemon) : undefined);
  const expired = $derived(info ? Date.now() - info.date.getTime() > REQUEST_LIFETIME : false);
  const date = $derived(
    info ? new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(info.date) : '',
  );

  // Typing
  function set(index: number, value: PasswordSymbol | null) {
    symbols[index] = value;
    if (marked.has(index)) {
      const next = new Set(marked);
      next.delete(index);
      marked = next;
    }
    save();
  }
  function select(index: number) {
    cursor = index;
    typing = true;
    void reveal();
    const s = symbols[index];
    if (s !== null && s !== undefined) suit = suitOf(s);
  }
  function chooseSuit(s: number) {
    suit = s;
    // On a filled symbol, changing the shape fixes it in place.
    const current = symbols[cursor];
    if (current !== null && current !== undefined && symbolOf(s, glyphOf(current)) < SYMBOL_COUNT) {
      set(cursor, symbolOf(s, glyphOf(current)));
    }
  }
  function typeGlyph(g: number) {
    const symbol = symbolOf(suit, g);
    if (symbol >= SYMBOL_COUNT) return;
    set(cursor, symbol);
    // A complete, valid password needs no more typing.
    if (symbols.every((s) => s !== null) && table && readRescue(symbols as PasswordSymbol[], table).ok) {
      typing = false;
      return;
    }
    cursor = Math.min(cursor + 1, PASSWORD_LENGTH - 1);
    void reveal();
  }
  function backspace() {
    if (symbols[cursor] === null && cursor > 0) cursor--;
    set(cursor, null);
    void reveal();
  }
  /** Keeps the symbol being typed in view, above the keypad pinned to the bottom of the screen. */
  async function reveal() {
    await tick();
    const cell = document.querySelector<HTMLElement>('.entry .cell[aria-pressed="true"]');
    if (!cell || !keypad) return;
    const bottom = keypad.getBoundingClientRect().top - 12;
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 80;
    const rect = cell.getBoundingClientRect();
    if (rect.bottom > bottom) window.scrollBy({ top: rect.bottom - bottom });
    else if (rect.top < top + 12) window.scrollBy({ top: rect.top - top - 12 });
  }
  function clear() {
    symbols = empty();
    marked = new Set();
    revival = undefined;
    cursor = 0;
    typing = false;
    save();
  }

  function fromPicture(readings: SymbolReading[]) {
    const best = bestPassword(readings, (p) => (table ? readRescue(p, table).ok : false));
    symbols = best.password;
    // Once it's valid, only the swapped symbols and near toss-ups are worth a second look.
    marked = new Set([...readings.flatMap((r, i) => (r.visible && isUnsure(r, best.valid) ? [i] : [])), ...best.corrected]);
    cursor = PASSWORD_LENGTH - 1;
    typing = false;
    save();
  }
</script>

{#snippet icon(path: string)}
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={path} /></svg>
{/snippet}

<section class="card entry">
  <h2>{t('rescues.request')}</h2>
  <div class="sources">
    <label class="button">
      {@render icon('M20.5 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9')}
      <span class="label">{t('rescues.import')}</span>
      <input class="visually-hidden" type="file" accept="image/*" onchange={(e) => pick(e, 'file')} />
    </label>
    <button type="button" class="button" onclick={() => (cameraOpen = true)}>
      {@render icon('M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7')}
      <span class="label">{t('rescues.camera')}</span>
    </button>
    <button
      type="button"
      class="button clear"
      onclick={clear}
      disabled={symbols.every((s) => s === null)}
      aria-label={t('rescues.clear')}
      title={t('rescues.clear')}
    >
      {@render icon('M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3')}
    </button>
  </div>

  {#if mode === 'file'}<PasswordPhoto bind:this={photo} onread={fromPicture} />{/if}
  {#if cameraOpen}
    <PasswordCamera
      isValid={(p) => (table ? readRescue(p, table).ok : false)}
      onread={(readings) => ((mode = 'camera'), fromPicture(readings))}
      onclose={() => (cameraOpen = false)}
    />
  {/if}
  <PasswordGrid
    {symbols}
    gameId={session.id}
    label={t('rescues.request')}
    selected={typing ? cursor : null}
    {marked}
    onselect={select}
  />
  {#if result && !result.ok}
    <p class="notice danger" role="alert">
      {result.error === 'revival' ? t('rescues.revival') : marked.size ? t('rescues.invalidMarked') : t('rescues.invalid')}
    </p>
  {:else if !complete && marked.size}
    <p class="muted small">{t('rescues.checkMarked')}</p>
  {/if}
  {#if typing}
    <!-- Room for the keyboard, so everything above it can still be scrolled into view. -->
    <div style:height="{keypadHeight}px" aria-hidden="true"></div>
    <div class="keypad-dock" bind:this={keypad} bind:offsetHeight={keypadHeight}>
      <div class="dock-inner">
        <div class="dock-bar">
          <button type="button" class="link-button" onclick={() => (typing = false)}>{t('rescues.keyboardDone')}</button>
        </div>
        <SymbolKeypad gameId={session.id} {suit} onsuit={chooseSuit} onglyph={typeGlyph} onbackspace={backspace} />
      </div>
    </div>
  {/if}
</section>

<svelte:window onkeydown={(e) => typing && e.key === 'Escape' && (typing = false)} />

{#if info && revival?.for === text}
  <section class="card">
    <h2>{t('rescues.requestInfo')}</h2>
    {#if marked.size}<p class="muted small">{t('rescues.checkMarked')}</p>{/if}
    <dl class="info">
      <dt>{t('rescues.team')}</dt>
      <dd>{info.team}</dd>
      <dt>{t('rescues.leader')}</dt>
      <dd>
        {#if leader}
          <a class="leader" href={paths.pokemon(session.id, leader.id)}>
            <Portrait entryId={leader.id} portrait={leader.portrait} size={32} />
            <EntryName entry={leader} />
          </a>
        {:else}
          {i18n.name('species', info.pokemon)}
        {/if}
      </dd>
      <dt>{t('rescues.where')}</dt>
      <dd>
        <a href={paths.dungeon(session.id, info.dungeon)}>{i18n.name('dungeon', info.dungeon)}</a>,
        {formatFloors(String(info.floor), session.dungeonById.get(info.dungeon))}
      </dd>
      <dt>{t('rescues.when')}</dt>
      <dd>{date}</dd>
    </dl>
    {#if expired}<p class="notice">{t('rescues.expired')}</p>{/if}
  </section>

  <section class="card">
    <h2>{t('rescues.aok')}</h2>
    <p class="small">{t('rescues.aokHint', { team: RESCUER })}</p>
    <PasswordGrid symbols={revival.password} gameId={session.id} label={t('rescues.aok')} />
  </section>
{/if}

<style>
  /* Import and Photo share the row equally; Clear is a round icon button at the end. */
  .sources {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 0.5rem;
    width: 100%;
    max-width: 26rem;
    margin: 0 auto;
  }
  .sources .button {
    gap: 0.4rem;
    min-width: 0;
    padding-inline: 0.6rem;
    white-space: nowrap;
  }
  .sources svg {
    flex: none;
  }
  .sources .label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sources .clear {
    width: 44px;
    padding: 0;
  }
  .sources svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .entry h2,
  .entry p {
    margin: 0;
  }
  .small {
    font-size: 0.88rem;
  }
  /* Pinned above the tab bar, like a phone keyboard. */
  .keypad-dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
    z-index: 9;
    padding: 0.6rem 16px;
    background: var(--bg);
    border-top: 1px solid var(--border);
    box-shadow: 0 -4px 12px rgb(0 0 0 / 0.06);
  }
  .dock-inner {
    max-width: 24rem;
    margin: 0 auto;
  }
  .dock-bar {
    display: flex;
    justify-content: flex-end;
    margin: -0.3rem 0 0.3rem;
  }
  .notice {
    margin: 0;
    padding: 0.75rem;
    border-radius: 10px;
    background: var(--surface-2);
    font-size: 0.92rem;
  }
  .notice.danger {
    background: var(--danger-soft);
  }
  .info {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.4rem 1rem;
    align-items: center;
    margin: 0;
  }
  dt {
    color: var(--muted);
    font-size: 0.88rem;
  }
  dd {
    margin: 0;
    min-width: 0;
  }
  .leader {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
