<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { t } from '../i18n/i18n.svelte.ts';
  import type { PasswordSymbol } from '../lib/rescue/dx-password.ts';
  import { bestPassword, PANEL, panelCorners, panelSymbols, type Corners, type SymbolReading } from '../lib/rescue/recognize.ts';
  import type { WorkerMessage, WorkerResponse } from '../lib/rescue/worker.ts';

  // Reads a password live from the camera (getUserMedia, so it also works with a laptop's webcam).
  // A guide frame shaped like the game's password panel shows where to hold it. Frames are read
  // over and over; the password is taken once two reads in a row give the same valid one. Capture
  // takes the current reading as it is, to fix by hand.
  let {
    isValid,
    onread,
    onclose,
  }: {
    isValid: (password: PasswordSymbol[]) => boolean;
    /** The readings of the frame that was taken. */
    onread: (readings: SymbolReading[]) => void;
    onclose: () => void;
  } = $props();

  // Pixels per panel unit of the frames read: the panel is read at 1.25 × 967 px wide.
  const SCALE = 1.25;
  // Also read this much around the guide (in panel units), so a password sticking out of it a little
  // still reads: about two symbols to each side, one above and below.
  const MARGIN = { x: 120, y: 70 };
  const GUIDE = panelCorners(SCALE).map((p) => ({ x: p.x + MARGIN.x * SCALE, y: p.y + MARGIN.y * SCALE })) as Corners;
  // Pause between reads, so a phone stays responsive.
  const PAUSE = 150;

  let video = $state<HTMLVideoElement>();
  let guide = $state<HTMLDivElement>();
  let error = $state(false);
  let stream: MediaStream | null = null;
  let worker: Worker | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let lastId = 0;
  let last: { readings: SymbolReading[]; text: string | null } | null = null;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round((PANEL.width + 2 * MARGIN.x) * SCALE);
  canvas.height = Math.round((PANEL.height + 2 * MARGIN.y) * SCALE);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  function send(message: WorkerMessage, transfer: Transferable[]): Promise<WorkerResponse> {
    worker ??= new Worker(new URL('../lib/rescue/worker.ts', import.meta.url), { type: 'module' });
    const id = ++lastId;
    const w = worker;
    return new Promise((resolve) => {
      const done = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== id) return;
        w.removeEventListener('message', done);
        resolve(event.data);
      };
      w.addEventListener('message', done);
      w.postMessage({ ...message, id }, transfer);
    });
  }

  /** The part of the video under the guide frame, and a margin around it. */
  function grab(): ImageData | null {
    if (!video || !guide || !video.videoWidth) return null;
    // The video fills the screen (object-fit: cover), scaled and centred.
    const v = video.getBoundingClientRect();
    const g = guide.getBoundingClientRect();
    const scale = Math.max(v.width / video.videoWidth, v.height / video.videoHeight);
    const offsetX = (v.width - video.videoWidth * scale) / 2;
    const offsetY = (v.height - video.videoHeight * scale) / 2;
    // Screen pixels per panel unit, for the margin.
    const unit = g.width / PANEL.width;
    const sx = (g.left - MARGIN.x * unit - v.left - offsetX) / scale;
    const sy = (g.top - MARGIN.y * unit - v.top - offsetY) / scale;
    const sw = (g.width + 2 * MARGIN.x * unit) / scale;
    const sh = (g.height + 2 * MARGIN.y * unit) / scale;
    // Where the margin runs past the edge of the video, nothing is drawn: those pixels stay
    // transparent, and the reader knows they aren't part of the picture.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  async function read(): Promise<SymbolReading[] | null> {
    const frame = grab();
    if (!frame) return null;
    const image = { width: frame.width, height: frame.height, data: frame.data };
    const response = await send({ type: 'frame', image, guide: GUIDE }, [frame.data.buffer]);
    return response.readings;
  }

  async function loop() {
    const readings = await read();
    if (closed) return;
    if (readings) {
      const best = bestPassword(readings, isValid);
      const text = best.valid ? best.password.join(',') : null;
      // Two identical valid reads in a row: a misread that happens to be valid won't repeat.
      if (text && last?.text === text) return finish(readings);
      last = { readings, text };
    }
    timer = setTimeout(loop, PAUSE);
  }

  async function capture() {
    const readings = (await read()) ?? last?.readings;
    if (readings) finish(readings);
  }

  function finish(readings: SymbolReading[]) {
    stop();
    onread(readings);
    onclose();
  }

  function stop() {
    closed = true;
    clearTimeout(timer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    worker?.terminate();
    worker = null;
  }

  function cancel() {
    stop();
    onclose();
  }

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (closed) return stop();
      await tick();
      video!.srcObject = stream;
      await video!.play();
      timer = setTimeout(loop, PAUSE);
    } catch (err) {
      console.error(err);
      error = true;
    }
  }

  void start();
  onDestroy(stop);
  const slots = panelSymbols();
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && cancel()} />

<div class="camera" role="dialog" aria-modal="true" aria-label={t('rescues.camera')}>
  <!-- svelte-ignore a11y_media_has_caption -->
  <video bind:this={video} playsinline muted></video>
  <div class="guide" bind:this={guide}>
    <svg viewBox="0 0 {PANEL.width} {PANEL.height}" aria-hidden="true">
      {#each slots as s, i (i)}
        <rect x={s.x} y={s.y} width={PANEL.symbol} height={PANEL.symbol} rx="10" />
      {/each}
    </svg>
  </div>
  <p class="hint" role="status">{error ? t('rescues.cameraError') : t('rescues.cameraHint')}</p>
  <div class="controls">
    <button type="button" class="button" onclick={cancel}>{t('rescues.cameraCancel')}</button>
    <button type="button" class="button primary" onclick={capture} disabled={error}>{t('rescues.cameraCapture')}</button>
  </div>
</div>

<style>
  .camera {
    position: fixed;
    inset: 0;
    z-index: 100;
    overflow: hidden;
    background: #000;
  }
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .guide {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(94vw, 70vh * 967 / 254);
    aspect-ratio: 967 / 254;
    /* An outline, not a border, so the box is exactly the area that's read. */
    outline: 2px solid rgb(255 255 255 / 0.85);
    border-radius: 6px;
    /* Darkens everything outside the frame. */
    box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.55);
  }
  .guide svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .guide rect {
    fill: none;
    stroke: rgb(255 255 255 / 0.45);
    stroke-width: 2;
    stroke-dasharray: 6 5;
  }
  .hint {
    position: absolute;
    top: calc(1rem + env(safe-area-inset-top));
    left: 1rem;
    right: 1rem;
    margin: 0;
    color: #fff;
    text-align: center;
    text-shadow: 0 1px 3px #000;
  }
  .controls {
    position: absolute;
    bottom: calc(1.5rem + env(safe-area-inset-bottom));
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 1rem;
  }
</style>
