<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { Menu } from 'ant-design-vue';
</script>

<template>
  <a-menu mode="horizontal" theme="dark">
    <a-menu-item key="home">
      <router-link to="/">Home</router-link>
    </a-menu-item>
    <a-menu-item key="about">
      <router-link to="/about">About</router-link>
    </a-menu-item>
  </a-menu>

  <router-view />
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
