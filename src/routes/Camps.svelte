<script lang="ts">
  import ProgressBar from '../components/ProgressBar.svelte';
  import { i18n, t } from '../i18n/i18n.svelte.ts';
  import { paths } from '../lib/router.svelte.ts';
  import type { GameSession } from '../lib/session.svelte.ts';

  let { session }: { session: GameSession } = $props();

  const camps = $derived(
    [...session.data.camps].sort((a, b) => i18n.collator.compare(i18n.name('camp', a.id), i18n.name('camp', b.id))),
  );
</script>

<h1>{t('nav.camps')}</h1>
<p class="muted intro">{t('camps.intro')}</p>

<ul class="cards">
  {#each camps as camp (camp.id)}
    {@const residents = session.entriesByCamp.get(camp.id) ?? []}
    {@const done = session.countRecruited(residents)}
    <li>
      <a class="card-link" class:complete={residents.length > 0 && done === residents.length} href={paths.camp(session.id, camp.id)}>
        <span class="body">
          <span class="title">{i18n.name('camp', camp.id)}</span>
          <ProgressBar {done} total={residents.length} label={t('progress.label', { done, total: residents.length })} />
        </span>
      </a>
    </li>
  {/each}
</ul>
