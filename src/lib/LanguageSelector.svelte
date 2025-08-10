<script lang="ts">
  import { onMount } from 'svelte'
  import type { Language } from './types'

  export let currentLanguage: Language

  let languages: { code: Language, name: string, flag: string }[] = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ]

  const SERVER_URL = import.meta.env.PROD ? window.location.origin : 'http://localhost:3001'

  async function loadLanguages() {
    try {
      const response = await fetch(`${SERVER_URL}/api/languages`)
      if (response.ok) {
        const serverLanguages = await response.json()
        // Convert server format to component format
        languages = serverLanguages.map((lang: any) => ({
          code: lang.code as Language,
          name: lang.name,
          flag: lang.flag
        }))
        console.log('🌐 Languages loaded in selector:', languages.length)
      }
    } catch (error) {
      console.error('❌ Error loading languages for selector:', error)
      // Keep default languages as fallback
    }
  }

  onMount(() => {
    loadLanguages()
    
    // Listen for language updates from other components
    window.addEventListener('languages-updated', loadLanguages)
    
    return () => {
      window.removeEventListener('languages-updated', loadLanguages)
    }
  })

  function changeLanguage(lang: Language) {
    currentLanguage = lang
  }

  // Expose reload function for external updates
  export function reloadLanguages() {
    loadLanguages()
  }
</script>

<div class="language-selector">
  <label for="language">🌐</label>
  <select id="language" bind:value={currentLanguage} on:change={(e) => changeLanguage((e.currentTarget as HTMLSelectElement).value as Language)}>
    {#each languages as lang}
      <option value={lang.code}>
        {lang.flag} {lang.name}
      </option>
    {/each}
  </select>
</div>

<style>
  .language-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  label {
    font-size: 1.2rem;
  }

  select {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--radius-md);
    color: white;
    padding: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
  }

  select option {
    background: #2a5298;
    color: white;
  }

  select:focus {
    outline: none;
    border-color: #00d4ff;
  }
</style>