<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'glass' = 'glass'
  export let size: 'sm' | 'md' | 'lg' = 'md'
  export let fullWidth = false
  export let disabled = false
  export let type: 'button' | 'submit' | 'reset' = 'button'
  export let title: string | undefined
  // Additional classes can be passed via class attribute

  $: variantClass = variant === 'glass' ? '' : variant
  $: sizeClass = size
</script>

<button
  {type}
  {title}
  class={variantClass + ' ' + sizeClass}
  class:full-width={fullWidth}
  {disabled}
  on:click
  on:keydown
>
  <slot />
</button>

<style>
  button {
    /* Base button styling is defined globally in app.css */
  }
  .full-width {
    width: 100%;
  }
  .sm {
    padding: var(--space-sm) var(--space-md);
    font-size: 0.75rem;
  }
  .md {
    padding: var(--space-sm) var(--space-lg);
    font-size: 0.875rem;
  }
  .lg {
    padding: var(--space-md) var(--space-xl);
    font-size: 1rem;
  }
</style>


