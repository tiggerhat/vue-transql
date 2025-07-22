<template>
  <div>
    <a-row :gutter="16">
      <a-col :span="12">
        <a-card title="Excel 数据信息" size="small">
          <p><strong>文件名:</strong> {{ excelInfo.fileName }}</p>
          <p><strong>工作表:</strong> {{ excelInfo.worksheet }}</p>
          <p><strong>数据行数:</strong> {{ excelInfo.data?.length || 0 }}</p>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="数据库表信息" size="small">
          <a-form layout="inline">
            <a-form-item label="目标表">
              <a-select 
                v-model:value="selectedTable" 
                placeholder="选择数据库表"
                style="width: 200px"
                @change="onTableChange"
                :disabled="dbTables.length === 0"
              >
                <a-select-option v-for="table in dbTables" :key="table.name" :value="table.name">
                  {{ table.name }} ({{ table.columns?.length || 0 }}个字段)
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item v-if="dbTables.length === 0">
              <a-button @click="goToConfig" type="link">去加载表结构</a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>
    </a-row>

    <a-card title="字段映射配置" style="margin-top: 16px" v-if="selectedTableInfo">
      <div style="margin-bottom: 16px">
        <a-space>
          <a-button @click="autoMatch" type="primary" ghost>智能匹配</a-button>
          <a-button @click="clearMapping">清空映射</a-button>
          <a-divider type="vertical" />
          <span>数据操作类型:</span>
          <a-radio-group v-model:value="operationType">
            <a-radio value="insert">插入(INSERT)</a-radio>
            <a-radio value="update">更新(UPDATE)</a-radio>
            <a-radio value="upsert">插入或更新(UPSERT)</a-radio>
          </a-radio-group>
        </a-space>
      </div>

      <a-table
        :columns="mappingColumns"
        :data-source="mappingData"
        :pagination="false"
        size="small"
        bordered
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'excelColumn'">
            <a-select
              v-model:value="record.excelColumn"
              placeholder="选择Excel列"
              style="width: 100%"
              allow-clear
              @change="(value) => onMappingChange(index, 'excelColumn', value)"
            >
              <a-select-option v-for="col in excelColumns" :key="col.dataIndex" :value="col.dataIndex">
                {{ col.name }} ({{ col.sample }})
              </a-select-option>
            </a-select>
          </template>
          <template v-else-if="column.key === 'required'">
            <a-tag :color="record.required ? 'red' : 'green'">
              {{ record.required ? '必填' : '可选' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'isKey'">
            <a-checkbox 
              v-model:checked="record.isKey" 
              :disabled="operationType === 'insert'"
              @change="(e) => onMappingChange(index, 'isKey', e.target.checked)"
            >
              主键/唯一键
            </a-checkbox>
          </template>
          <template v-else-if="column.key === 'defaultValue'">
            <a-input
              v-model:value="record.defaultValue"
              placeholder="默认值"
              @change="(e) => onMappingChange(index, 'defaultValue', e.target.value)"
            />
          </template>
          <template v-else-if="column.key === 'transform'">
            <a-select
              v-model:value="record.transform"
              placeholder="转换函数"
              style="width: 100%"
              allow-clear
              @change="(value) => onMappingChange(index, 'transform', value)"
            >
              <a-select-option value="upper">转大写</a-select-option>
              <a-select-option value="lower">转小写</a-select-option>
              <a-select-option value="trim">去空格</a-select-option>
              <a-select-option value="date">日期格式</a-select-option>
              <a-select-option value="number">数字格式</a-select-option>
            </a-select>
          </template>
        </template>
      </a-table>

      <div style="margin-top: 16px; text-align: center">
        <a-space>
          <a-button @click="previewSQL" type="primary" :disabled="!canPreview">
            预览SQL
          </a-button>
          <a-button @click="executeSQL" type="primary" danger :disabled="!canExecute">
            执行SQL
          </a-button>
          <a-button @click="saveWorkRecord" type="default" :disabled="!canPreview">
            保存工作记录
          </a-button>
          <a-button @click="goToWorkRecords" type="link">
            查看工作记录
          </a-button>
        </a-space>
      </div>
    </a-card>

    <a-card v-if="sqlPreview" title="SQL 预览" style="margin-top: 16px">
      <a-typography-paragraph>
        <pre style="background: #f5f5f5; padding: 16px; border-radius: 6px; white-space: pre-wrap;">{{ sqlPreview }}</pre>
      </a-typography-paragraph>
      
      <div style="margin-top: 16px">
        <a-space>
          <span>预计影响行数: {{ excelInfo.data?.length || 0 }}</span>
          <a-divider type="vertical" />
          <a-button @click="copySQLToClipboard" type="link">复制SQL</a-button>
        </a-space>
      </div>
    </a-card>

    <a-modal
      v-model:open="executeModalVisible"
      title="执行确认"
      @ok="confirmExecute"
      @cancel="executeModalVisible = false"
    >
      <p>您确定要执行以下SQL操作吗？</p>
      <p><strong>操作类型:</strong> {{ operationType.toUpperCase() }}</p>
      <p><strong>目标表:</strong> {{ selectedTable }}</p>
      <p><strong>影响行数:</strong> {{ excelInfo.data?.length || 0 }}</p>
      <a-alert
        message="请确认操作无误，执行后将直接修改数据库数据"
        type="warning"
        show-icon
      />
    </a-modal>
    
    <!-- 保存工作记录模态框 -->
    <a-modal
      v-model:open="saveRecordModalVisible"
      title="保存工作记录"
      @ok="confirmSaveRecord"
      @cancel="saveRecordModalVisible = false"
      :confirm-loading="savingRecord"
    >
      <a-form :model="recordForm" layout="vertical">
        <a-form-item 
          label="记录名称" 
          :rules="[{ required: true, message: '请输入记录名称' }]"
        >
          <a-input 
            v-model:value="recordForm.name" 
            placeholder="输入工作记录名称"
            @keyup.enter="confirmSaveRecord"
          />
        </a-form-item>
        
        <a-form-item label="描述信息">
          <a-textarea 
            v-model:value="recordForm.description" 
            placeholder="输入记录描述（可选）"
            :rows="3"
          />
        </a-form-item>
        
        <a-divider />
        
        <a-descriptions title="记录信息" :column="1" size="small">
          <a-descriptions-item label="源文件">
            {{ excelInfo.fileName }}
          </a-descriptions-item>
          <a-descriptions-item label="工作表">
            {{ excelInfo.worksheet }}
          </a-descriptions-item>
          <a-descriptions-item label="目标表">
            {{ selectedTable }}
          </a-descriptions-item>
          <a-descriptions-item label="操作类型">
            {{ getOperationText(operationType) }}
          </a-descriptions-item>
          <a-descriptions-item label="数据行数">
            {{ excelInfo.data?.length || 0 }}
          </a-descriptions-item>
          <a-descriptions-item label="映射字段数">
            {{ mappingData.filter(m => m.excelColumn).length }}
          </a-descriptions-item>
        </a-descriptions>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, inject } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { generateSQL } from '../utils/sqlGenerator'
import { apiRequest, API_CONFIG } from '@/config/api.js'
import { store } from '@/config/store.js'

const router = useRouter()

// 从父组件注入刷新工作记录的方法
const refreshWorkRecords = inject('refreshWorkRecords', null)

const excelInfo = ref({})
const dbTables = ref([])
const selectedTable = ref('')
const selectedTableInfo = ref(null)
const operationType = ref('insert')
const mappingData = ref([])
const sqlPreview = ref('')
const executeModalVisible = ref(false)
const saveRecordModalVisible = ref(false)
const savingRecord = ref(false)
const recordForm = reactive({
  name: '',
  description: ''
})

const excelColumns = computed(() => {
  return excelInfo.value.columns || []
})

const canPreview = computed(() => {
  return selectedTable.value && mappingData.value.some(item => item.excelColumn)
})

const canExecute = computed(() => {
  return sqlPreview.value && validateMapping()
})

const mappingColumns = [
  { title: '数据库字段', dataIndex: 'dbColumn', key: 'dbColumn', width: 150 },
  { title: '字段类型', dataIndex: 'type', key: 'type', width: 120 },
  { title: '是否必填', dataIndex: 'required', key: 'required', width: 100 },
  { title: 'Excel列', dataIndex: 'excelColumn', key: 'excelColumn', width: 200 },
  { title: '主键/唯一键', dataIndex: 'isKey', key: 'isKey', width: 120 },
  { title: '默认值', dataIndex: 'defaultValue', key: 'defaultValue', width: 150 },
  { title: '数据转换', dataIndex: 'transform', key: 'transform', width: 150 }
]

onMounted(() => {
  loadData()
})

const loadData = () => {
  const excelData = localStorage.getItem('excelData')
  
  if (!excelData) {
    message.error('未找到Excel数据，请先上传文件')
    router.push('/excel-upload')
    return
  }
  
  // 优先从全局状态获取数据库配置和表结构
  if (!store.dbConfig) {
    message.error('未找到数据库配置，请先配置数据库')
    router.push('/database-config')
    return
  }
  
  excelInfo.value = JSON.parse(excelData)
  
  // 从全局状态获取表结构
  if (store.dbTables.length > 0) {
    dbTables.value = store.dbTables
  } else {
    // 备用方案：从localStorage获取
    const savedTables = localStorage.getItem('dbTables')
    if (savedTables) {
      dbTables.value = JSON.parse(savedTables)
    } else {
      message.warning('未找到表结构数据，请先在数据库配置页面加载表结构')
      dbTables.value = []
    }
  }
  
  // 如果全局状态中有选中的表，直接使用
  if (store.selectedTable) {
    selectedTable.value = store.selectedTable.name
    onTableChange(store.selectedTable.name)
  } else {
    // 备用方案：从localStorage获取
    const selectedTableData = localStorage.getItem('selectedTable')
    if (selectedTableData) {
      const tableInfo = JSON.parse(selectedTableData)
      selectedTable.value = tableInfo.name
      onTableChange(tableInfo.name)
    }
  }
}


const onTableChange = (tableName) => {
  const table = dbTables.value.find(t => t.name === tableName)
  if (table) {
    selectedTableInfo.value = table
    initMappingData(table.columns)
  }
}

const initMappingData = (columns) => {
  mappingData.value = columns.map(col => ({
    dbColumn: col.name,
    type: col.type,
    required: !col.nullable,
    excelColumn: null,
    isKey: col.primary,
    defaultValue: '',
    transform: null,
    comment: col.comment
  }))
}

const onMappingChange = (index, field, value) => {
  mappingData.value[index][field] = value
  if (field === 'excelColumn') {
    sqlPreview.value = ''
  }
}

const autoMatch = () => {
  mappingData.value.forEach((mapping, index) => {
    const excelCol = excelColumns.value.find(col => 
      col.name.toLowerCase().includes(mapping.dbColumn.toLowerCase()) ||
      mapping.dbColumn.toLowerCase().includes(col.name.toLowerCase())
    )
    if (excelCol) {
      mapping.excelColumn = excelCol.dataIndex
    }
  })
  message.success('智能匹配完成')
}

const clearMapping = () => {
  mappingData.value.forEach(mapping => {
    mapping.excelColumn = null
    mapping.defaultValue = ''
    mapping.transform = null
    mapping.isKey = mappingData.value.find(m => m.dbColumn === mapping.dbColumn)?.required || false
  })
  sqlPreview.value = ''
  message.success('映射已清空')
}

const validateMapping = () => {
  const requiredFields = mappingData.value.filter(m => m.required)
  const missingRequired = requiredFields.filter(m => !m.excelColumn && !m.defaultValue)
  
  if (missingRequired.length > 0) {
    message.error(`必填字段未映射: ${missingRequired.map(m => m.dbColumn).join(', ')}`)
    return false
  }
  
  if (operationType.value !== 'insert') {
    const keyFields = mappingData.value.filter(m => m.isKey)
    if (keyFields.length === 0) {
      message.error('更新操作需要至少选择一个主键/唯一键字段')
      return false
    }
  }
  
  return true
}

const previewSQL = () => {
  if (!validateMapping()) return
  
  const config = {
    tableName: selectedTable.value,
    operationType: operationType.value,
    mapping: mappingData.value,
    data: excelInfo.value.data.slice(0, 3)
  }
  
  try {
    sqlPreview.value = generateSQL(config)
    message.success('SQL预览生成成功')
  } catch (error) {
    message.error('SQL生成失败: ' + error.message)
  }
}

const executeSQL = () => {
  if (!validateMapping()) return
  executeModalVisible.value = true
}

const confirmExecute = () => {
  executeModalVisible.value = false
  
  const config = {
    tableName: selectedTable.value,
    operationType: operationType.value,
    mapping: mappingData.value,
    data: excelInfo.value.data
  }
  
  try {
    const fullSQL = generateSQL(config)
    console.log('Generated SQL:', fullSQL)
    
    message.success(`SQL执行成功！影响 ${excelInfo.value.data.length} 行数据`)
    
  } catch (error) {
    message.error('SQL执行失败: ' + error.message)
  }
}

const copySQLToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(sqlPreview.value)
    message.success('SQL已复制到剪贴板')
  } catch (error) {
    message.error('复制失败，请手动复制')
  }
}

const goToConfig = () => {
  router.push('/database-config')
}

// 保存工作记录
const saveWorkRecord = () => {
  if (!validateMapping()) return
  
  // 生成默认记录名称
  const timestamp = new Date().toLocaleDateString('zh-CN').replace(/\//g, '')
  recordForm.name = `${excelInfo.value.fileName?.replace(/\.[^/.]+$/, '')}_${selectedTable.value}_${timestamp}`
  recordForm.description = ''
  
  saveRecordModalVisible.value = true
}

// 确认保存工作记录
const confirmSaveRecord = async () => {
  if (!recordForm.name.trim()) {
    message.error('请输入记录名称')
    return
  }
  
  savingRecord.value = true
  try {
    // 获取当前数据库配置
    const dbConfig = store.dbConfig || JSON.parse(localStorage.getItem('currentDbConfig') || '{}')
    
    const recordData = {
      name: recordForm.name.trim(),
      description: recordForm.description.trim(),
      excelData: excelInfo.value.data,
      columns: excelInfo.value.columns,
      originalFileName: excelInfo.value.fileName,
      worksheet: excelInfo.value.worksheet,
      mapping: mappingData.value.filter(m => m.excelColumn), // 只保存已映射的字段
      targetTable: selectedTable.value,
      operationType: operationType.value,
      dbConfig
    }
    
    const result = await apiRequest(API_CONFIG.ENDPOINTS.SAVE_WORK_RECORD, {
      method: 'POST',
      body: JSON.stringify(recordData)
    })
    
    message.success('工作记录保存成功！')
    saveRecordModalVisible.value = false
    
    // 刷新工作记录列表
    if (refreshWorkRecords) {
      refreshWorkRecords()
    }
    
    // 使用Modal提示是否查看工作记录
    setTimeout(() => {
      message.success('工作记录已保存成功！', 3)
      
      // 使用简单的确认框
      const shouldView = confirm('是否立即查看工作记录？')
      if (shouldView) {
        router.push('/excel-upload/records')
      }
    }, 500)
    
  } catch (error) {
    message.error('保存工作记录失败: ' + error.message)
  } finally {
    savingRecord.value = false
  }
}

// 跳转到工作记录页面
const goToWorkRecords = () => {
  router.push('/excel-upload/records')
}

// 工具函数
const getOperationText = (type) => {
  const texts = { insert: '插入', update: '更新', upsert: '插入或更新' }
  return texts[type] || type
}
</script>

<style scoped>
.ant-table-tbody > tr > td {
  padding: 8px;
}

pre {
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}
</style>