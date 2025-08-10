<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { config } from '../config'
  import { getLanguages, createLanguage, updateLanguage, deleteLanguage } from '../api'
  import { toast } from '../toast'

  const dispatch = createEventDispatcher()

  type LanguageItem = { code: string; name: string; flag?: string }
  let systemLanguages: LanguageItem[] = []
  let isLoading = false
  let isCreatingLanguage = false
  let editingLanguage: LanguageItem | null = null
  let newLanguage: LanguageItem = { code: '', name: '', flag: '' }

  // Flag selector state
  let showFlagSelector = false
  let flagSearchQuery = ''
  type FlagItem = { flag: string; name: string; code: string }
  const flagEmojis: FlagItem[] = [
    { flag: '🇪🇸', name: 'España', code: 'es' },
    { flag: '🇺🇸', name: 'Estados Unidos', code: 'us' },
    { flag: '🇬🇧', name: 'Reino Unido', code: 'gb' },
    { flag: '🇵🇹', name: 'Portugal', code: 'pt' },
    { flag: '🇧🇷', name: 'Brasil', code: 'br' },
    { flag: '🇫🇷', name: 'Francia', code: 'fr' },
    { flag: '🇩🇪', name: 'Alemania', code: 'de' },
    { flag: '🇮🇹', name: 'Italia', code: 'it' },
    { flag: '🇲🇽', name: 'México', code: 'mx' },
    { flag: '🇦🇷', name: 'Argentina', code: 'ar' },
    { flag: '🇨🇱', name: 'Chile', code: 'cl' },
    { flag: '🇵🇪', name: 'Perú', code: 'pe' },
    { flag: '🇨🇴', name: 'Colombia', code: 'co' },
    { flag: '🇯🇵', name: 'Japón', code: 'jp' },
    { flag: '🇰🇷', name: 'Corea del Sur', code: 'kr' },
    { flag: '🇨🇳', name: 'China', code: 'cn' },
  ]
  let filteredFlags: FlagItem[] = flagEmojis

  onMount(load)
  async function load() {
    try {
      systemLanguages = await getLanguages()
    } catch {
      toast.error('No se pudieron cargar los idiomas')
    }
  }

  function startCreatingLanguage() {
    isCreatingLanguage = true
    editingLanguage = null
    newLanguage = { code: '', name: '', flag: '' }
  }

  function startEditingLanguage(language: LanguageItem) {
    editingLanguage = language
    isCreatingLanguage = false
    newLanguage = { ...language }
  }

  function cancelLanguageEdit() {
    isCreatingLanguage = false
    editingLanguage = null
    newLanguage = { code: '', name: '', flag: '' }
    showFlagSelector = false
    flagSearchQuery = ''
    filteredFlags = flagEmojis
  }

  async function saveLanguage() {
    if (!newLanguage.code.trim() || !newLanguage.name.trim()) return
    try {
      isLoading = true
      if (editingLanguage) {
        await updateLanguage(editingLanguage.code, { name: newLanguage.name, flag: newLanguage.flag })
        toast.success('Idioma actualizado')
      } else {
        await createLanguage({ code: newLanguage.code, name: newLanguage.name, flag: newLanguage.flag })
        toast.success('Idioma agregado')
      }
      await load()
      cancelLanguageEdit()
      dispatch('languages-changed')
    } catch {
      toast.error('No se pudo guardar el idioma')
    } finally {
      isLoading = false
    }
  }

  async function removeLanguage(code: string) {
    if (!confirm('¿Eliminar este idioma? Se eliminarán pistas y mensajes asociados.')) return
    try {
      isLoading = true
      await deleteLanguage(code)
      await load()
      toast.success('Idioma eliminado')
      dispatch('languages-changed')
    } catch {
      toast.error('No se pudo eliminar el idioma')
    } finally {
      isLoading = false
    }
  }

  // Flag selector helpers
  function toggleFlagSelector() {
    showFlagSelector = !showFlagSelector
    if (showFlagSelector) {
      flagSearchQuery = ''
      filteredFlags = flagEmojis
    }
  }

  function selectFlag(flag: string) {
    newLanguage.flag = flag
    showFlagSelector = false
  }

  function filterFlags() {
    const q = flagSearchQuery.trim().toLowerCase()
    filteredFlags = q
      ? flagEmojis.filter(f => f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q))
      : flagEmojis
  }

  $: filterFlags()
</script>

<svelte:window on:click={(e) => { if (showFlagSelector && !(e.target as Element)?.closest('.flag-selector-container') && !(e.target as Element)?.closest('#language-flag') && !(e.target as Element)?.closest('#open-flag-selector')) showFlagSelector = false }} />

<div class="languages-tab">
  <div class="languages-header">
    <h3>Gestión de Idiomas del Sistema</h3>
    <button class="create-btn" on:click={startCreatingLanguage}>
      <span class="btn-icon plus-icon"></span>
      Agregar Idioma
    </button>
  </div>

  {#if isCreatingLanguage || editingLanguage}
    <div class="language-form">
      <h4>{editingLanguage ? 'Editar Idioma' : 'Agregar Nuevo Idioma'}</h4>
      <div class="form-row">
        <div class="form-group">
          <label for="language-code">Código del idioma:</label>
          <input id="language-code" type="text" bind:value={newLanguage.code} placeholder="es, en, fr..." maxlength="5" disabled={!!editingLanguage} />
        </div>
        <div class="form-group">
          <label for="language-name">Nombre del idioma:</label>
          <input id="language-name" type="text" bind:value={newLanguage.name} placeholder="Español, English, Français..." />
        </div>
        <div class="form-group">
          <label for="language-flag">Bandera (emoji):</label>
          <div class="flag-input">
            <input id="language-flag" type="text" bind:value={newLanguage.flag} placeholder="🇪🇸" maxlength="10" on:focus={toggleFlagSelector} />
            <button id="open-flag-selector" type="button" class="edit-btn small" aria-label="Elegir bandera" on:click={toggleFlagSelector}>
              <span class="btn-icon edit-icon"></span>
            </button>
            {#if showFlagSelector}
              <div class="flag-selector-container">
                <input class="flag-search" type="text" bind:value={flagSearchQuery} placeholder="Buscar país o código..." />
                <div class="flag-list">
                  {#each filteredFlags as f}
                    <button type="button" class="flag-item" on:click={() => selectFlag(f.flag)}>
                      <span class="flag-emoji">{f.flag}</span>
                      <span class="flag-name">{f.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
      <div class="form-actions">
        <button class="save-btn" on:click={saveLanguage} disabled={isLoading || !newLanguage.code.trim() || !newLanguage.name.trim()}>
          <span class="btn-icon save-icon"></span>
          {editingLanguage ? 'Actualizar' : 'Agregar'} Idioma
        </button>
        <button class="cancel-btn" on:click={cancelLanguageEdit}>
          <span class="btn-icon cancel-icon"></span>
          Cancelar
        </button>
      </div>
    </div>
  {/if}

  <div class="languages-list">
    <div class="languages-grid">
      {#each systemLanguages as language}
        <div class="language-card">
          <div class="language-info">
            <div class="language-flag">{language.flag}</div>
            <div class="language-details">
              <div class="language-name">{language.name}</div>
              <div class="language-code">{language.code}</div>
            </div>
          </div>
          <div class="language-actions">
            <button class="edit-btn" on:click={() => startEditingLanguage(language)}>
              <span class="btn-icon edit-icon"></span>
              Editar
            </button>
            <button class="delete-btn" on:click={() => removeLanguage(language.code)} disabled={$config.obligatoryLanguages.includes(language.code)}>
              <span class="btn-icon delete-icon"></span>
              Eliminar
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .languages-tab { padding: var(--space-xl); }
  .languages-header { display:flex; align-items:center; justify-content: space-between; margin-bottom: var(--space-xl); }
  .languages-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-lg); }
  .language-card { background: var(--surface-bg); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-lg); padding: var(--space-lg); }
  .language-info { display:flex; align-items:center; gap: var(--space-lg); margin-bottom: var(--space-lg); }
  .language-flag { width: 50px; height: 50px; display:flex; align-items:center; justify-content:center; background: var(--glass-bg); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-md); font-size: 2rem; }
  .language-name { color: var(--text-primary); font-weight: 600; }
  .language-code { color: var(--text-muted); font-family: Monaco, monospace; background: var(--glass-bg); border-radius: 6px; padding: 2px 6px; display:inline-block; }
  .language-actions { display:flex; gap: .5rem; }

  /* Form styling to match other tabs */
  .language-form { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
  .form-row { display:grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  @media (max-width: 900px) { .form-row { grid-template-columns: 1fr; } }
  .form-group { margin-bottom: 1rem; }
  .form-group label { display:block; margin-bottom: .5rem; font-weight: 700; color: #00d4ff; }
  .form-group input { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; padding: .75rem; color: white; font-family: inherit; }
  .form-actions { display:flex; gap: 1rem; margin-top: 1.5rem; }
  .flag-input { display:flex; gap:.5rem; align-items:center; position: relative; }
  .flag-selector-container { position:absolute; top: 100%; right: 0; z-index: 10; width: 320px; background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: .75rem; box-shadow: var(--shadow-lg); backdrop-filter: blur(10px); }
  .flag-search { width: 100%; margin-bottom: .5rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: .5rem .75rem; color: white; }
  .flag-list { max-height: 220px; overflow: auto; display:flex; flex-direction: column; gap: .25rem; }
  .flag-item { display:flex; align-items:center; gap:.5rem; padding: .5rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: var(--text-primary); cursor: pointer; }
  .flag-item:hover { background: rgba(255,255,255,0.08); }
  .flag-emoji { font-size: 1.1rem; }
  .flag-name { color: var(--text-secondary); font-size: .85rem; }

  /* Buttons + icons (shared look) */
  .create-btn, .save-btn, .edit-btn, .delete-btn, .cancel-btn { background: var(--glass-bg); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.2); padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-md); cursor: pointer; font-weight: 600; font-size: .875rem; display:inline-flex; align-items:center; gap: var(--space-sm); text-transform: uppercase; letter-spacing: .025em; backdrop-filter: blur(10px); box-shadow: var(--shadow-sm); position: relative; overflow: hidden; }
  .save-btn, .create-btn { border-color: var(--accent-green); }
  .edit-btn { border-color: var(--accent-blue); padding: var(--space-xs) var(--space-sm); font-size:.8rem; }
  .delete-btn { border-color: var(--accent-red); padding: var(--space-xs) var(--space-sm); font-size:.8rem; }
  .cancel-btn { color: var(--text-secondary); }
  .create-btn::before, .save-btn::before, .edit-btn::before, .delete-btn::before, .cancel-btn::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); transition:left .5s ease; }
  .create-btn:hover::before, .save-btn:hover::before, .edit-btn:hover::before, .delete-btn:hover::before, .cancel-btn:hover::before { left:100%; }
  .create-btn:hover, .save-btn:hover { background: rgba(74,222,128,0.1); border-color: var(--accent-green); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .edit-btn:hover { background: rgba(100,217,255,0.1); border-color: var(--accent-blue); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .delete-btn:hover { background: rgba(255,87,87,0.1); border-color: var(--accent-red); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .cancel-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); border-color: rgba(255,255,255,0.4); transform: translateY(-1px); box-shadow: var(--shadow-md); }

  .btn-icon { width: 16px; height: 16px; display:inline-block; position: relative; }
  .plus-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cline x1='12' y1='5' x2='12' y2='19'/%3E%3Cline x1='5' y1='12' x2='19' y2='12'/%3E%3C/svg%3E") center/contain no-repeat; }
  .edit-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E") center/contain no-repeat; }
  .delete-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolyline points='3,6 5,6 21,6'/%3E%3Cpath d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/%3E%3Cline x1='10' y1='11' x2='10' y2='17'/%3E%3Cline x1='14' y1='11' x2='14' y2='17'/%3E%3C/svg%3E") center/contain no-repeat; }
  .save-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'/%3E%3Cpolyline points='17,21 17,13 7,13 7,21'/%3E%3Cpolyline points='7,3 7,8 15,8'/%3E%3C/svg%3E") center/contain no-repeat; }
  .cancel-icon::before { content:''; position:absolute; inset:0; background: currentColor; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='15' y1='9' x2='9' y2='15'/%3E%3Cline x1='9' y1='9' x2='15' y2='15'/%3E%3C/svg%3E") center/contain no-repeat; }

  @media (max-width: 768px) {
    .form-actions { flex-direction: column; }
  }
</style>


