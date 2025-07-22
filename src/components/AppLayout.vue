<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header style="padding: 0; background: #fff; box-shadow: 0 1px 4px rgba(0,21,41,.08);">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 24px;">
        <div style="display: flex; align-items: center;">
          <h2 style="margin: 0; color: #1890ff;">Vue-TransQL</h2>
          <a-divider type="vertical" />
          <a-menu 
            mode="horizontal" 
            :selected-keys="[currentRoute]"
            style="border: none; background: transparent;"
            @click="handleMenuClick"
          >
            <a-menu-item key="/database-config">
              <DatabaseOutlined />
              数据库配置
            </a-menu-item>
            <a-menu-item key="/excel-upload">
              <FileExcelOutlined />
              Excel数据导入
            </a-menu-item>
          </a-menu>
        </div>
        
        <div>
          <a-space>
            <span style="color: #666;">当前步骤: {{ getCurrentStepName() }}</span>
            <a-badge :count="workRecordCount" :offset="[10, 0]">
              <a-button type="text" @click="$router.push('/excel-upload/records')">
                <FolderOutlined />
              </a-button>
            </a-badge>
          </a-space>
        </div>
      </div>
    </a-layout-header>
    
    <a-layout-content style="padding: 24px; background: #f0f2f5;">
      <slot />
    </a-layout-content>
  </a-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  DatabaseOutlined, 
  FileExcelOutlined, 
  FolderOutlined 
} from '@ant-design/icons-vue'
import { apiRequest, API_CONFIG } from '@/config/api.js'

const router = useRouter()
const route = useRoute()
const workRecordCount = ref(0)

const currentRoute = computed(() => route.path)

const handleMenuClick = ({ key }) => {
  router.push(key)
}

const getCurrentStepName = () => {
  const stepNames = {
    '/database-config': '数据库配置',
    '/excel-upload': 'Excel数据导入',
    '/excel-upload/records': '工作记录管理',
    '/column-mapping': '字段映射'
  }
  
  // 检查当前路径是否匹配某个步骤
  for (const path in stepNames) {
    if (currentRoute.value.startsWith(path)) {
      return stepNames[path]
    }
  }
  
  return '未知步骤'
}

const loadWorkRecordCount = async () => {
  try {
    const data = await apiRequest(API_CONFIG.ENDPOINTS.GET_WORK_RECORDS)
    workRecordCount.value = data.workRecords.length
  } catch (error) {
    console.error('获取工作记录数量失败:', error)
  }
}

onMounted(() => {
  loadWorkRecordCount()
  // 将实例暴露到全局以供其他组件调用
  window.appLayoutInstance = { loadWorkRecordCount }
})
</script>

<style scoped>
.ant-layout-header {
  position: sticky;
  top: 0;
  z-index: 1000;
}
</style>