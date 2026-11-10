<script lang="ts">
  import ProgressBar from '../components/ProgressBar.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { paths } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session }: { session: GameSession } = $props();
</script>

<h1>{t('nav.dungeons')}</h1>
<p class="muted intro">{t('dungeons.intro')}</p>

<ol class="cards">
  {#each session.data.dungeons as dungeon (dungeon.id)}
    {@const found = (session.encountersByDungeon.get(dungeon.id) ?? []).map((e) => e.entry)}
    {@const done = session.countRecruited(found)}
    <li>
      <a class="card-link" class:complete={found.length > 0 && done === found.length} href={paths.dungeon(session.id, dungeon.id)}>
        <span class="order">{dungeon.order}</span>
        <span class="body">
          <span class="title">{i18n.name('dungeon', dungeon.id)}</span>
          {#if found.length}
            <ProgressBar {done} total={found.length} label={t('progress.label', { done, total: found.length })} />
          {/if}
        </span>
      </a>
    </li>
  {/each}
</ol>
