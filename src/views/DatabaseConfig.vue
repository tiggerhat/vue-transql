<template>
  <div style="display: flex; gap: 16px; height: 100vh; overflow: hidden;">
    <!-- 左侧数据库配置 -->
    <div style="flex: 0 0 450px;">
      <a-card title="数据库连接配置">
        <div style="margin-bottom: 16px">
          <a-space>
            <a-select
              v-model:value="selectedConfigName"
              placeholder="选择已保存的配置"
              style="width: 200px"
              @change="loadSelectedConfig"
              allow-clear
            >
              <a-select-option v-for="name in savedConfigNames" :key="name" :value="name">
                {{ name }}
              </a-select-option>
            </a-select>
            <a-button @click="showSaveModal = true" type="dashed">保存当前配置</a-button>
            <a-button @click="deleteConfig" :disabled="!selectedConfigName" danger>删除配置</a-button>
          </a-space>
        </div>
        
        <a-form
          :model="dbConfig"
          :rules="rules"
          ref="formRef"
          layout="vertical"
          @finish="onFinish"
        >
          <a-form-item label="数据库类型" name="type">
            <a-select v-model:value="dbConfig.type" placeholder="选择数据库类型">
              <a-select-option value="mysql">MySQL</a-select-option>
              <a-select-option value="postgresql">PostgreSQL</a-select-option>
              <a-select-option value="sqlserver">SQL Server</a-select-option>
              <a-select-option value="oracle">Oracle</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="主机地址" name="host">
            <a-input v-model:value="dbConfig.host" placeholder="如: localhost" />
          </a-form-item>

          <a-form-item label="端口" name="port">
            <a-input-number v-model:value="dbConfig.port" :min="1" :max="65535" placeholder="如: 3306" style="width: 100%" />
          </a-form-item>

          <a-form-item label="数据库名" name="database">
            <a-input v-model:value="dbConfig.database" placeholder="数据库名称" />
          </a-form-item>

          <a-form-item label="用户名" name="username">
            <a-input v-model:value="dbConfig.username" placeholder="数据库用户名" />
          </a-form-item>

          <a-form-item label="密码" name="password">
            <a-input-password v-model:value="dbConfig.password" placeholder="数据库密码" />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit" :loading="testing">
                测试连接
              </a-button>
              <a-button @click="proceedToUpload" :disabled="!connectionValid" type="primary">
                进入数据导入
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>
    </div>

    <!-- 右侧表结构 -->
    <div style="flex: 1; overflow: hidden;">
      <a-card v-if="tables.length > 0" title="数据库表结构" style="height: 100%;">
        <template #extra>
          <a-space>
            <a-input
              v-model:value="searchText"
              placeholder="搜索表名"
              style="width: 200px"
              allow-clear
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </a-input>
            <a-select 
              v-model:value="pageSize" 
              style="width: 100px"
              @change="currentPage = 1"
            >
              <a-select-option :value="12">12个/页</a-select-option>
              <a-select-option :value="24">24个/页</a-select-option>
              <a-select-option :value="48">48个/页</a-select-option>
            </a-select>
          </a-space>
        </template>
        
        <div style="height: calc(100% - 120px); overflow: auto;">
          <a-row :gutter="[16, 16]">
            <a-col 
              v-for="table in paginatedTables" 
              :key="table.name" 
              :xs="24" 
              :sm="12" 
              :md="8" 
              :lg="6"
            >
              <a-card 
                size="small" 
                :title="table.name"
                hoverable
                @click="selectTable(table)"
                :class="{ 'selected-table': selectedTable?.name === table.name }"
                style="cursor: pointer; height: 140px;"
              >
                <div style="font-size: 12px; color: #666;">
                  {{ table.columns?.length || 0 }} 个字段
                </div>
                <div style="margin-top: 8px; max-height: 60px; overflow: hidden; word-wrap: break-word;">
                  <a-tag 
                    v-for="column in table.columns?.slice(0, 6)" 
                    :key="column.name"
                    size="small"
                    style="margin: 1px 2px; font-size: 10px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;"
                    :color="column.primary ? 'gold' : 'default'"
                    :title="column.name"
                  >
                    {{ column.name }}
                  </a-tag>
                  <span v-if="table.columns?.length > 6" style="font-size: 10px; color: #999;">
                    +{{ table.columns.length - 6 }}
                  </span>
                </div>
                <div style="margin-top: 8px; text-align: center;" v-if="selectedTable?.name === table.name">
                  <a-button 
                    type="link" 
                    size="small" 
                    @click.stop="() => { selectTable(table); router.push('/excel-upload'); }"
                  >
                    直接导入Excel
                  </a-button>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>
        
        <div style="text-align: center; margin-top: 16px; padding: 16px 0; border-top: 1px solid #f0f0f0;">
          <a-pagination
            v-model:current="currentPage"
            v-model:page-size="pageSize"
            :total="filteredTables.length"
            :show-size-changer="false"
            :show-quick-jumper="true"
            :show-total="(total, range) => `第 ${range[0]}-${range[1]} 项，共 ${total} 张表`"
            size="small"
          />
        </div>
      </a-card>
    </div>
    
    <a-modal
      v-model:open="showSaveModal"
      title="保存数据库配置"
      @ok="saveNamedConfig"
      @cancel="showSaveModal = false"
    >
      <a-form-item label="配置名称">
        <a-input
          v-model:value="configName"
          placeholder="请输入配置名称"
          @keyup.enter="saveNamedConfig"
        />
      </a-form-item>
    </a-modal>

    <!-- 表字段详情抽屉 -->
    <a-drawer
      v-model:open="showTableDetail"
      title="表字段详情"
      placement="right"
      :width="600"
    >
      <template #title>
        <span>{{ selectedTable?.name }} - 字段详情</span>
      </template>
      
      <a-table
        v-if="selectedTable"
        :columns="columnTableColumns"
        :data-source="selectedTable.columns"
        size="small"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
      />
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'
import { apiRequest, API_CONFIG } from '@/config/api.js'
import { store } from '@/config/store.js'

const router = useRouter()
const formRef = ref()
const testing = ref(false)
const loadingTables = ref(false)
const connectionValid = ref(false)
const tables = ref([])
const selectedTable = ref(null)
const showSaveModal = ref(false)
const showTableDetail = ref(false)
const configName = ref('')
const selectedConfigName = ref('')
const savedConfigNames = ref([])
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(12)

const dbConfig = reactive({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: '',
  username: '',
  password: ''
})

const rules = {
  type: [{ required: true, message: '请选择数据库类型', trigger: 'change' }],
  host: [{ required: true, message: '请输入主机地址', trigger: 'blur' }],
  port: [{ required: true, message: '请输入端口号', trigger: 'blur' }],
  database: [{ required: true, message: '请输入数据库名', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const columnTableColumns = [
  { title: '字段名', dataIndex: 'name', key: 'name' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '长度', dataIndex: 'length', key: 'length' },
  { title: '允许空值', dataIndex: 'nullable', key: 'nullable', customRender: ({ text }) => text ? '是' : '否' },
  { title: '主键', dataIndex: 'primary', key: 'primary', customRender: ({ text }) => text ? '是' : '否' },
  { title: '注释', dataIndex: 'comment', key: 'comment' }
]

watch(() => dbConfig.type, (newType) => {
  const defaultPorts = {
    mysql: 3306,
    postgresql: 5432,
    sqlserver: 1433,
    oracle: 1521
  }
  dbConfig.port = defaultPorts[newType]
})

watch(() => searchText.value, () => {
  currentPage.value = 1
})

const onFinish = async () => {
  testing.value = true
  try {
    await testConnection()
    message.success('数据库连接成功！')
    connectionValid.value = true
    await loadTables()
  } catch (error) {
    message.error('数据库连接失败: ' + error.message)
    connectionValid.value = false
  } finally {
    testing.value = false
  }
}

const testConnection = async () => {
  try {
    await apiRequest(API_CONFIG.ENDPOINTS.TEST_CONNECTION, {
      method: 'POST',
      body: JSON.stringify(dbConfig)
    })
    return true
  } catch (error) {
    throw new Error('连接失败: ' + error.message)
  }
}

const saveNamedConfig = async () => {
  if (!configName.value.trim()) {
    message.error('请输入配置名称')
    return
  }
  
  if (!connectionValid.value) {
    message.error('请先测试连接成功后再保存')
    return
  }
  
  try {
    await apiRequest(API_CONFIG.ENDPOINTS.SAVE_CONFIG, {
      method: 'POST',
      body: JSON.stringify({
        name: configName.value,
        config: dbConfig
      })
    })
    
    localStorage.setItem('currentDbConfig', JSON.stringify(dbConfig))
    
    await loadSavedConfigNames()
    selectedConfigName.value = configName.value
    
    message.success(`配置 "${configName.value}" 已保存`)
    showSaveModal.value = false
    configName.value = ''
  } catch (error) {
    message.error('保存配置失败: ' + error.message)
  }
}

const loadSelectedConfig = async (name) => {
  if (!name) return
  
  try {
    const result = await apiRequest(API_CONFIG.ENDPOINTS.GET_CONFIGS)
    
    if (result.configs[name]) {
      Object.assign(dbConfig, result.configs[name])
      connectionValid.value = false
      tables.value = []
      selectedTable.value = null
      message.success(`已加载配置 "${name}"`)
    }
  } catch (error) {
    message.error('加载配置失败: ' + error.message)
  }
}

const deleteConfig = async () => {
  if (!selectedConfigName.value) return
  
  try {
    await apiRequest(`${API_CONFIG.ENDPOINTS.DELETE_CONFIG}/${selectedConfigName.value}`, {
      method: 'DELETE'
    })
    
    await loadSavedConfigNames()
    
    message.success(`配置 "${selectedConfigName.value}" 已删除`)
    selectedConfigName.value = ''
  } catch (error) {
    message.error('删除配置失败: ' + error.message)
  }
}

const loadSavedConfigNames = async () => {
  try {
    const result = await apiRequest(API_CONFIG.ENDPOINTS.GET_CONFIGS)
    savedConfigNames.value = Object.keys(result.configs)
  } catch (error) {
    console.error('获取配置名称失败:', error)
    savedConfigNames.value = []
  }
}

const proceedToUpload = () => {
  // 保存到全局状态
  store.setDbConfig(dbConfig)
  router.push('/excel-upload')
}

const loadTables = async () => {
  // 如果全局状态中已有表结构数据且使用的是相同的数据库配置，则直接使用缓存
  if (store.dbTables.length > 0 && 
      store.dbConfig && 
      store.dbConfig.host === dbConfig.host && 
      store.dbConfig.port === dbConfig.port && 
      store.dbConfig.database === dbConfig.database && 
      store.dbConfig.username === dbConfig.username) {
    tables.value = store.dbTables
    message.success(`从缓存加载表结构成功，共 ${store.dbTables.length} 张表`)
    return
  }
  
  loadingTables.value = true
  try {
    const tableStructure = await fetchTablesFromDatabase()
    tables.value = tableStructure
    
    // 保存到全局状态和localStorage
    store.setDbTables(tableStructure)
    store.setDbConfig(dbConfig)
    
    message.success(`表结构加载成功，共找到 ${tableStructure.length} 张表`)
  } catch (error) {
    message.error('表结构加载失败: ' + error.message)
  } finally {
    loadingTables.value = false
  }
}

const fetchTablesFromDatabase = async () => {
  try {
    const result = await apiRequest(API_CONFIG.ENDPOINTS.GET_TABLES, {
      method: 'POST',
      body: JSON.stringify(dbConfig)
    })
    
    return result.tables
  } catch (error) {
    throw new Error('获取表结构失败: ' + error.message)
  }
}

const selectTable = (table) => {
  selectedTable.value = table
  showTableDetail.value = true
  
  // 保存到全局状态
  store.setSelectedTable(table)
  
  // 显示"直接导入"按钮
  setTimeout(() => {
    message.info(
      '已选择表 ' + table.name + '，可以直接进入Excel导入页面',
      3,
      () => {},
      true
    )
  }, 500)
}

const filteredTables = computed(() => {
  if (!searchText.value) {
    return tables.value
  }
  return tables.value.filter(table => 
    table.name.toLowerCase().includes(searchText.value.toLowerCase())
  )
})

const paginatedTables = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTables.value.slice(start, end)
})

const loadSavedConfig = async () => {
  // 优先从全局状态加载
  if (store.dbConfig) {
    Object.assign(dbConfig, store.dbConfig)
    connectionValid.value = true
    
    // 如果全局状态中有表结构，也加载
    if (store.dbTables.length > 0) {
      tables.value = store.dbTables
    }
    
    // 如果有选中的表，也加载
    if (store.selectedTable) {
      selectedTable.value = store.selectedTable
    }
  }
  await loadSavedConfigNames()
}

onMounted(() => {
  loadSavedConfig()
})
</script>

<style scoped>
.selected-table {
  border: 2px solid #1890ff;
}

.selected-table .ant-card-head {
  background-color: #e6f7ff;
}
</style>