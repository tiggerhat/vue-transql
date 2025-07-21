<template>
  <div id="app">
    <a-layout style="min-height: 100vh">
      <a-layout-header>
        <h1 style="color: white; margin: 0; line-height: 64px;">Excel to SQL 数据导入工具</h1>
      </a-layout-header>
      
      <a-layout>
        <a-layout-sider width="200" style="background: #fff">
          <a-menu
            mode="inline"
            :style="{ height: '100%', borderRight: 0 }"
            :selected-keys="[currentRoute]"
            @click="handleMenuClick"
          >
            <a-menu-item key="DatabaseConfig">
              <template #icon>
                <DatabaseOutlined />
              </template>
              数据库配置
            </a-menu-item>
            <a-menu-item key="ExcelUpload">
              <template #icon>
                <FileExcelOutlined />
              </template>
              Excel 上传
            </a-menu-item>
            <a-menu-item key="ColumnMapping">
              <template #icon>
                <SwapOutlined />
              </template>
              字段映射
            </a-menu-item>
          </a-menu>
        </a-layout-sider>
        
        <a-layout-content :style="{ padding: '24px', minHeight: '280px' }">
          <router-view />
        </a-layout-content>
      </a-layout>
    </a-layout>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { DatabaseOutlined, FileExcelOutlined, SwapOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const route = useRoute()

const currentRoute = ref(route.name)

const handleMenuClick = ({ key }) => {
  router.push({ name: key })
}

watch(route, (newRoute) => {
  currentRoute.value = newRoute.name
})
</script>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
</style>
