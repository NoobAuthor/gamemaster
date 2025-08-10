<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let isOpen = false
  export let title = ''
  export let confirmText = 'Confirmar'
  export let cancelText = 'Cancelar'
  export let type: 'confirm' | 'prompt' | 'alert' = 'confirm'
  export let inputValue = ''
  export let inputPlaceholder = ''
  export let inputLabel = ''

  const dispatch = createEventDispatcher()

  function handleConfirm() {
    if (type === 'prompt') {
      dispatch('confirm', inputValue)
    } else {
      dispatch('confirm')
    }
    close()
  }

  function handleCancel() {
    dispatch('cancel')
    close()
  }

  function close() {
    isOpen = false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && type !== 'prompt') {
      handleConfirm()
    }
  }
</script>

{#if isOpen}
  <div class="modal-overlay" on:click={handleCancel} on:keydown={handleKeydown} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-content" on:click|stopPropagation role="document">
      <div class="modal-header">
        <h3>{title}</h3>
        <button class="close-btn" on:click={handleCancel}>
          <span class="btn-icon close-icon"></span>
        </button>
      </div>
      
      <div class="modal-body">
        <slot>
          {#if type === 'prompt' && inputLabel}
            <div class="form-group">
              <label for="modal-input">{inputLabel}</label>
              <input 
                id="modal-input"
                type="text" 
                bind:value={inputValue}
                placeholder={inputPlaceholder}
                on:keydown={(e) => e.key === 'Enter' && handleConfirm()}
                autofocus
              />
            </div>
          {/if}
        </slot>
      </div>

      <div class="modal-footer">
        {#if type !== 'alert'}
          <button class="cancel-btn" on:click={handleCancel}>
            <span class="btn-icon cancel-icon"></span>
            {cancelText}
          </button>
        {/if}
        <button class="confirm-btn" on:click={handleConfirm}>
          <span class="btn-icon confirm-icon"></span>
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 14, 39, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(12px);
  }

  .modal-content {
    background: var(--gradient-card);
    border-radius: var(--radius-xl);
    width: 90vw;
    max-width: 500px;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    border: 1px solid rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(20px);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-lg) var(--space-xl);
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }

  .modal-header h3 {
    margin: 0;
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .close-btn {
    background: var(--glass-bg);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-primary);
    cursor: pointer;
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    backdrop-filter: blur(10px);
  }

  .close-btn:hover {
    background: rgba(255, 87, 87, 0.1);
    border-color: var(--accent-red);
    transform: translateY(-1px);
  }

  .modal-body {
    padding: var(--space-xl);
  }

  .form-group {
    margin-bottom: var(--space-lg);
  }

  .form-group label {
    display: block;
    margin-bottom: var(--space-sm);
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .form-group input {
    width: 100%;
    background: var(--glass-bg);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius-md);
    padding: var(--space-sm) var(--space-md);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  .form-group input:focus {
    outline: none;
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(100, 217, 255, 0.1);
  }

  .modal-footer {
    display: flex;
    gap: var(--space-md);
    padding: var(--space-lg) var(--space-xl);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.2);
    justify-content: center;
  }

  .confirm-btn, .cancel-btn {
    background: var(--glass-bg);
    color: var(--text-primary);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    text-transform: uppercase;
    letter-spacing: 0.025em;
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
  }

  .confirm-btn {
    border-color: var(--accent-green);
  }

  .cancel-btn {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .confirm-btn::before, .cancel-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s ease;
  }

  .confirm-btn:hover::before, .cancel-btn:hover::before {
    left: 100%;
  }

  .confirm-btn:hover {
    background: rgba(74, 222, 128, 0.1);
    border-color: var(--accent-green);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  /* Icon styles */
  .btn-icon {
    width: 16px;
    height: 16px;
    display: inline-block;
    position: relative;
  }

  .close-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  }

  .confirm-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolyline points='20,6 9,17 4,12'%3E%3C/polyline%3E%3C/svg%3E") center/contain no-repeat;
  }

  .cancel-icon::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: currentColor;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='15' y1='9' x2='9' y2='15'%3E%3C/line%3E%3Cline x1='9' y1='9' x2='15' y2='15'%3E%3C/line%3E%3C/svg%3E") center/contain no-repeat;
  }
</style>
