<template>
  <div id="app">
    <AppLayout>
      <router-view />
    </AppLayout>
  </div>
</template>

<script setup>
import { provide, ref } from 'vue'
import AppLayout from './components/AppLayout.vue'
import { apiRequest, API_CONFIG } from '@/config/api.js'

// 全局工作记录刷新方法
const workRecordRefreshTrigger = ref(0)

const refreshWorkRecords = async () => {
  // 触发刷新
  workRecordRefreshTrigger.value++
  
  // 通知AppLayout更新工作记录计数
  if (window.appLayoutInstance && window.appLayoutInstance.loadWorkRecordCount) {
    window.appLayoutInstance.loadWorkRecordCount()
  }
}

// 提供给所有子组件
provide('refreshWorkRecords', refreshWorkRecords)
provide('workRecordRefreshTrigger', workRecordRefreshTrigger)
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
</style>
