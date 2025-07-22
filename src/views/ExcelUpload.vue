<template>
  <div class="excel-upload-container">
    <a-card>
      <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <a-tab-pane key="upload" tab="Excel上传">
          <upload-tab ref="uploadTabRef" />
        </a-tab-pane>
        <a-tab-pane key="records" tab="工作记录">
          <records-tab ref="recordsTabRef" />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { ref, provide, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UploadTab from './excel/UploadTab.vue'
import RecordsTab from './excel/RecordsTab.vue'

const route = useRoute()
const router = useRouter()
const activeTab = ref('upload')
const uploadTabRef = ref(null)
const recordsTabRef = ref(null)

// 根据路由参数设置当前标签页
const setTabFromRoute = () => {
  if (route.path.includes('/excel-upload/records')) {
    activeTab.value = 'records'
  } else {
    activeTab.value = 'upload'
  }
}

// 标签页切换处理
const handleTabChange = (key) => {
  if (key === 'records') {
    router.push('/excel-upload/records')
  } else {
    router.push('/excel-upload')
  }
}

// 提供刷新工作记录的方法给子组件
const refreshWorkRecords = () => {
  if (recordsTabRef.value) {
    recordsTabRef.value.refreshRecords()
  }
}
provide('refreshWorkRecords', refreshWorkRecords)

// 监听路由变化
watch(() => route.path, setTabFromRoute)

onMounted(() => {
  setTabFromRoute()
})
</script>

<style scoped>
.excel-upload-container {
  padding: 0;
}
</style>