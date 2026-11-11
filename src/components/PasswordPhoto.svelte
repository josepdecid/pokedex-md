<script lang="ts">
  import { onDestroy } from 'svelte';
  import { t } from '../i18n/i18n.svelte.ts';
  import { defaultCorners, symbolCentres, type Corners, type Point, type SymbolReading } from '../lib/rescue/recognize.ts';
  import type { WorkerMessage, WorkerResponse } from '../lib/rescue/worker.ts';

  // Reads a password from a picture (a photo of the screen or a Switch screenshot), given with
  // open(file). The picture is shown with a dot on every symbol where the reader thinks it is;
  // dragging the four corner dots fixes a bad guess and reads it again.
  let { onread }: { onread: (readings: SymbolReading[]) => void } = $props();

  // Bigger pictures only make reading slower; this is plenty for the glyphs.
  const MAX_SIDE = 2000;
  // Fewer glyphs than this where the corners put them: not found, place the corners by hand.
  const MIN_FOUND = 18;

  type Status = 'idle' | 'reading' | 'found' | 'not-found' | 'error';
  let status = $state<Status>('idle');
  let shown = $state(false);
  let url = $state<string | null>(null);
  let size = $state({ width: 0, height: 0 });
  let corners = $state<Corners | null>(null);
  let svg = $state<SVGSVGElement>();

  let worker: Worker | null = null;
  let lastId = 0;
  function send(request: WorkerMessage, transfer: Transferable[] = []): Promise<WorkerResponse> {
    worker ??= new Worker(new URL('../lib/rescue/worker.ts', import.meta.url), { type: 'module' });
    const id = ++lastId;
    const w = worker;
    return new Promise((resolve, reject) => {
      const done = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== id) return;
        w.removeEventListener('message', done);
        resolve(event.data);
      };
      w.addEventListener('message', done);
      w.addEventListener('error', reject, { once: true });
      w.postMessage({ ...request, id }, transfer);
    });
  }
  onDestroy(() => {
    worker?.terminate();
    if (url) URL.revokeObjectURL(url);
  });

  export async function open(file: File) {
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(file);
    shown = true;
    status = 'reading';
    corners = null;
    try {
      // An <img> applies the photo's EXIF rotation, and drawing it keeps it.
      const img = new Image();
      img.src = url;
      await img.decode();
      const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.round(img.naturalWidth * k);
      const height = Math.round(img.naturalHeight * k);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      // Transparent pixels would read as "not part of the picture" (see RgbaImage).
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, width, height);
      size = { width, height };
      const response = await send({ type: 'image', image: { width, height, data: pixels.data } }, [pixels.data.buffer]);
      const found = response.located && response.located.found >= MIN_FOUND;
      corners = response.located?.corners ?? defaultCorners(size);
      status = found ? 'found' : 'not-found';
      if (found && response.readings) onread(response.readings);
    } catch (err) {
      console.error(err);
      status = 'error';
    }
  }

  async function reread() {
    if (!corners) return;
    status = 'reading';
    try {
      const response = await send({ type: 'read', corners: $state.snapshot(corners) as Corners });
      status = 'found';
      if (response.readings) onread(response.readings);
    } catch (err) {
      console.error(err);
      status = 'error';
    }
  }

  // Dots on the symbols, sized from the distance between them.
  const centres = $derived(corners ? symbolCentres(corners) : []);
  const pitch = $derived(corners ? Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y) / 14.3 : 0);

  let dragging = $state<number | null>(null);
  function toImage(event: PointerEvent): Point {
    const rect = svg!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * size.width,
      y: ((event.clientY - rect.top) / rect.height) * size.height,
    };
  }
  function down(event: PointerEvent, corner: number) {
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    dragging = corner;
  }
  function move(event: PointerEvent) {
    if (dragging === null || !corners) return;
    corners[dragging] = toImage(event);
  }
  function up() {
    if (dragging === null) return;
    dragging = null;
    void reread();
  }
</script>

{#if shown && url}
  <div class="viewer">
    <div class="frame">
      <img src={url} alt={t('rescues.photoAlt')} width={size.width || undefined} height={size.height || undefined} />
      {#if corners && size.width}
        <svg
          bind:this={svg}
          viewBox="0 0 {size.width} {size.height}"
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
          role="presentation"
        >
          <polygon class="outline" points={corners.map((p) => `${p.x},${p.y}`).join(' ')} />
          {#each centres as c, i (i)}
            <circle class="dot" cx={c.x} cy={c.y} r={pitch * 0.12} />
          {/each}
          {#each corners as c, i (i)}
            <circle class="handle" cx={c.x} cy={c.y} r={pitch * 0.32} />
            <circle
              class="hit"
              cx={c.x}
              cy={c.y}
              r={Math.max(pitch * 0.8, size.width * 0.03)}
              onpointerdown={(e) => down(e, i)}
              role="presentation"
            />
          {/each}
        </svg>
      {/if}
    </div>
    <p class="small" role="status">
      {#if status === 'reading'}
        {t('rescues.reading')}
      {:else if status === 'found'}
        {t('rescues.photoFound')}
      {:else if status === 'not-found'}
        {t('rescues.photoNotFound')}
      {:else if status === 'error'}
        {t('rescues.photoError')}
      {/if}
    </p>
    <button type="button" class="button ghost" onclick={() => (shown = false)}>{t('rescues.photoClose')}</button>
  </div>
{/if}

<style>
  .viewer {
    display: grid;
    gap: 0.5rem;
    justify-items: start;
    width: 100%;
  }
  .frame {
    position: relative;
    width: 100%;
    line-height: 0;
  }
  img {
    width: 100%;
    height: auto;
    border-radius: 10px;
  }
  .frame svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .outline {
    fill: none;
    stroke: var(--focus);
    stroke-dasharray: 4 3;
    vector-effect: non-scaling-stroke;
    stroke-width: 1.5;
  }
  .dot {
    fill: var(--focus);
    stroke: #000;
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
  .handle {
    fill: color-mix(in srgb, var(--focus) 35%, transparent);
    stroke: var(--focus);
    stroke-width: 2.5;
    vector-effect: non-scaling-stroke;
  }
  .hit {
    fill: transparent;
    cursor: grab;
  }
  .small {
    margin: 0;
    font-size: 0.88rem;
  }
</style>
