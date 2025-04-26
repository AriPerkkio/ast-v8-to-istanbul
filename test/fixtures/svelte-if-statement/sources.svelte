<script>
  const condition = false;
</script>

<div>
  {#if condition === true}
    <h1>Hello world</h1>
  {:else}
    <h1>No message available</h1>
  {/if}
</div>
