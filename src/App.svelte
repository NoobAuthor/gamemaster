<script lang="ts">
  import GameMasterControl from './lib/GameMasterControl.svelte'
  import { onMount } from 'svelte'
  import ToastHost from './lib/ToastHost.svelte'

  onMount(() => {
    // Verificar si es una vista de Chrome Cast (modo TV)
    const urlParams = new URLSearchParams(window.location.search)
    const isTvView = urlParams.get('tv') === 'true'
    
    if (isTvView) {
      // Redirigir a componente de TV
      window.location.href = '/tv.html'
    }
  })
</script>

<main class="app-container">
  <GameMasterControl />
</main>

<ToastHost />

<style>
  .app-container {
    min-height: 100vh;
    width: 100%;
    position: relative;
    overflow-x: hidden;
  }
</style>
