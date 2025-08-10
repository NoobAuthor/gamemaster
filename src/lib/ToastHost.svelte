<script lang="ts">
  import { toasts, type Toast } from './toast'
  import { fly, fade } from 'svelte/transition'
</script>

<div class="toast-container" aria-live="polite" aria-atomic="true">
  {#each $toasts as t (t.id)}
    <div class="toast {t.type}" in:fly={{ y: 12, duration: 180 }} out:fade={{ duration: 150 }}>
      <div class="indicator"></div>
      <div class="message">{t.message}</div>
    </div>
  {/each}
  {#if $toasts.length === 0}
    <div class="screen-reader-only">No notifications</div>
  {/if}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 16px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 9999;
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    min-width: 240px;
    max-width: 360px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(18, 24, 38, 0.9);
    color: white;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 6px 24px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
  }
  .toast.success { border-color: rgba(16, 185, 129, 0.5); }
  .toast.error { border-color: rgba(239, 68, 68, 0.5); }
  .toast.info { border-color: rgba(59, 130, 246, 0.5); }
  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: 0 0 auto;
    background: #60a5fa;
  }
  .toast.success .indicator { background: #34d399; }
  .toast.error .indicator { background: #f87171; }
  .message {
    font-size: 0.9rem;
    line-height: 1.2rem;
  }
  .screen-reader-only {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
</style>


