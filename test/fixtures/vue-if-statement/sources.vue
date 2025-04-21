<script setup lang="ts">
const condition = false;
</script>

<template>
  <div>
    <h1 v-if="condition">Hello world</h1>
    <h1 v-else>No message available</h1>
  </div>
</template>
