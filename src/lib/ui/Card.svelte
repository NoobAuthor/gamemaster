<script lang="ts">
  export let as: 'div' | 'section' | 'article' = 'div'
  export let padding: 'sm' | 'md' | 'lg' = 'lg'
  export let borderTopColor: 'blue' | 'green' | 'purple' | 'orange' | undefined
</script>

<svelte:element this={as} class={`card-shell ${padding}`} data-border={borderTopColor}>
  <slot />
</svelte:element>

<style>
  .card-shell {
    background: var(--gradient-card);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(20px);
    position: relative;
    overflow: hidden;
  }
  .card-shell::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--gradient-accent);
    opacity: 0.5;
  }
  .card-shell[data-border='green'] { border-top: 3px solid var(--accent-green); }
  .card-shell[data-border='blue'] { border-top: 3px solid var(--accent-blue); }
  .card-shell[data-border='purple'] { border-top: 3px solid var(--accent-purple); }
  .card-shell[data-border='orange'] { border-top: 3px solid var(--accent-orange); }
  .sm { padding: var(--space-lg); }
  .md { padding: var(--space-xl); }
  .lg { padding: var(--space-xl); }
</style>


