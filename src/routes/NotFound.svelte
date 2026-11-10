<script lang="ts">
  import { t } from '../i18n/i18n.svelte.ts';
  import { paths } from '../lib/router.svelte.ts';

  let { gameId }: { gameId: string } = $props();
</script>

<h1>{t('app.notFound')}</h1>
<p><a href={paths.pokedex(gameId)}>{t('app.home')}</a></p>
