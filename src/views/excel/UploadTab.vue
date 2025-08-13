<template>
  <div class="excel-upload-tab">
    <a-card title="Excel 文件上传与预览" style="margin-bottom: 16px">
      <a-upload-dragger
        v-model:file-list="fileList"
        :multiple="false"
        :before-upload="beforeUpload"
        @change="handleFileChange"
        :accept="'.xlsx,.xls'"
        :show-upload-list="false"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">
          支持单个 Excel 文件上传，格式支持 .xlsx 和 .xls
        </p>
      </a-upload-dragger>

      <div v-if="currentFile" style="margin-top: 16px">
        <a-alert
          :message="`已选择文件: ${currentFile.name}`"
          type="success"
          show-icon
          closable
          @close="removeFile"
        />
      </div>
    </a-card>

    <!-- 多工作表选择和数据表映射 -->
    <a-card v-if="worksheets.length > 0" title="工作表与数据表映射" style="margin-bottom: 16px">
      <a-table
        :columns="worksheetColumns"
        :data-source="worksheets"
        :pagination="false"
        size="small"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'name'">
            {{ record.name }} ({{ record.rowCount }} 行)
          </template>
          <template v-else-if="column.dataIndex === 'targetTable'">
            <a-select
              v-model:value="record.targetTable"
              placeholder="选择目标数据表"
              style="width: 100%"
              allow-clear
              @change="(value) => onTableSelect(record, value)"
            >
              <a-select-option v-for="table in availableTables" :key="table.name" :value="table.name">
                {{ table.name }}
              </a-select-option>
            </a-select>
          </template>
        </template>
      </a-table>
      
      <div style="margin-top: 16px; text-align: center">
        <a-button 
          type="primary" 
          @click="proceedToMapping" 
          :disabled="!canProceedToMapping"
        >
          进入字段映射
        </a-button>
      </div>
    </a-card>

    <a-card v-if="excelData.length > 0 && selectedWorksheet" title="数据预览">
      <div style="margin-bottom: 16px">
        <a-space>
          <span>数据起始行:</span>
          <a-input-number
            v-model:value="startRow"
            :min="1"
            :max="excelData.length"
            @change="updatePreview"
          />
          <a-checkbox v-model:checked="hasHeader" @change="updatePreview">
            第一行为表头
          </a-checkbox>
          <a-button 
            type="default" 
            @click="showSaveModal = true"
            :disabled="!canProceed"
          >
            保存配置
          </a-button>
          <a-button 
            type="default" 
            @click="showLoadModal = true"
          >
            加载配置
          </a-button>
        </a-space>
      </div>

      <a-table
        :columns="previewColumns"
        :data-source="previewData"
        :scroll="{ x: 'max-content' }"
        size="small"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
      >
        <template #title>
          <div>
            <span>总计 {{ excelData.length }} 行数据，显示从第 {{ startRow }} 行开始的数据</span>
          </div>
        </template>
      </a-table>
    </a-card>
    
    <!-- 保存配置模态框 -->
    <a-modal
      v-model:visible="showSaveModal"
      title="保存当前配置"
      @ok="saveCurrentConfig"
      @cancel="showSaveModal = false"
    >
      <a-input
        v-model:value="configName"
        placeholder="请输入配置名称"
        style="margin-bottom: 16px"
      />
      <div v-if="currentFile">
        <p>文件: {{ currentFile.name }}</p>
        <p>工作表: {{ selectedWorksheet }}</p>
        <p>数据行数: {{ excelData.length }}</p>
      </div>
    </a-modal>

    <!-- 加载配置模态框 -->
    <a-modal
      v-model:visible="showLoadModal"
      title="加载已保存配置"
      width="800px"
      @ok="loadSelectedConfigs"
      @cancel="() => {
        showLoadModal = false
        selectedConfigs = []
      }"
    >
      <a-alert 
        message="注意：加载配置将合并选中的所有配置的数据" 
        type="info" 
        show-icon
        style="margin-bottom: 16px"
      />
      <a-list
        :data-source="savedConfigs"
        item-layout="horizontal"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <a-checkbox 
                  :checked="selectedConfigs.includes(item.name)"
                  @change="(checked) => {
                    if (checked) {
                      selectedConfigs.push(item.name)
                    } else {
                      const index = selectedConfigs.indexOf(item.name)
                      if (index > -1) {
                        selectedConfigs.splice(index, 1)
                      }
                    }
                  }"
                >
                  {{ item.name }}
                </a-checkbox>
              </template>
              <template #description>
                <div style="display: flex; justify-content: space-between">
                  <span>创建时间: {{ new Date(item.createdAt).toLocaleString() }}</span>
                  <span>更新时间: {{ new Date(item.updatedAt).toLocaleString() }}</span>
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { InboxOutlined } from '@ant-design/icons-vue'
import * as XLSX from 'xlsx'
import { apiRequest, API_CONFIG } from '@/config/api.js'
import { store } from '@/config/store.js'

const router = useRouter()
const fileList = ref([])
const currentFile = ref(null)
const worksheets = ref([])
const selectedWorksheet = ref('')
const excelData = ref([])
const startRow = ref(1)
const hasHeader = ref(true)
const showSaveModal = ref(false)
const showLoadModal = ref(false)
const configName = ref('')
const savedConfigs = ref([])
const selectedConfigs = ref([])
const availableTables = ref([])

// 从父组件注入共享数据
const refreshWorkRecords = inject('refreshWorkRecords')

const canProceed = computed(() => {
  return excelData.value.length > 0 && selectedWorksheet.value
})

// 新增：检查是否可以进入字段映射（至少一个工作表选择了目标表）
const canProceedToMapping = computed(() => {
  return worksheets.value.some(sheet => sheet.targetTable)
})

// 工作表表格列配置
const worksheetColumns = [
  { title: '工作表名称', dataIndex: 'name', key: 'name' },
  { title: '目标数据表', dataIndex: 'targetTable', key: 'targetTable' }
]

const previewColumns = computed(() => {
  if (excelData.value.length === 0) return []
  
  const firstRow = excelData.value[0]
  if (!firstRow) return []
  
  return Object.keys(firstRow).map((key, index) => ({
    title: hasHeader.value && startRow.value === 1 ? key : `列${index + 1}`,
    dataIndex: key,
    key: key,
    width: 150,
    ellipsis: true
  }))
})

const previewData = computed(() => {
  if (excelData.value.length === 0) return []
  
  let data = excelData.value.slice(startRow.value - 1)
  
  if (hasHeader.value && startRow.value === 1) {
    data = data.slice(1)
  }
  
  return data.map((row, index) => ({
    ...row,
    key: index
  }))
})

const beforeUpload = (file) => {
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  file.type === 'application/vnd.ms-excel'
  
  if (!isExcel) {
    message.error('只能上传 Excel 文件!')
    return false
  }
  
  const isLt50M = file.size / 1024 / 1024 < 50
  if (!isLt50M) {
    message.error('文件大小不能超过 50MB!')
    return false
  }
  
  return false
}

const handleFileChange = async (info) => {
  if (info.file.status === 'removed') {
    removeFile()
    return
  }
  
  currentFile.value = info.file
  await parseExcelFile(info.file)
}

const parseExcelFile = async (file) => {
  try {
    const data = await readFileAsArrayBuffer(file)
    const workbook = XLSX.read(data, { type: 'array' })
    
    const sheets = workbook.SheetNames.map(name => {
      const worksheet = workbook.Sheets[name]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      return {
        name,
        rowCount: jsonData.length,
        data: XLSX.utils.sheet_to_json(worksheet),
        targetTable: null // 新增：目标数据表字段
      }
    })
    
    worksheets.value = sheets
    if (sheets.length > 0) {
      selectedWorksheet.value = sheets[0].name
      loadWorksheetData(sheets[0].name)
    }
    
    // 加载可用的数据表列表
    await loadAvailableTables()
    
    message.success('Excel 文件解析成功!')
  } catch (error) {
    message.error('Excel 文件解析失败: ' + error.message)
    console.error(error)
  }
}

const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

const onWorksheetChange = (e) => {
  loadWorksheetData(e.target.value)
}

const loadWorksheetData = (sheetName) => {
  const sheet = worksheets.value.find(s => s.name === sheetName)
  if (sheet) {
    excelData.value = sheet.data
    startRow.value = 1
    updatePreview()
  }
}

// 选择目标数据表
const onTableSelect = (sheet, tableName) => {
  sheet.targetTable = tableName
}

// 加载可用的数据表列表
const loadAvailableTables = async () => {
  try {
    // 从全局状态获取表结构
    if (store.dbTables.length > 0) {
      availableTables.value = store.dbTables
      return
    }
    
    // 如果全局状态中没有，从localStorage获取
    const savedTables = localStorage.getItem('dbTables')
    if (savedTables) {
      availableTables.value = JSON.parse(savedTables)
      return
    }
    
    // 如果都没有，尝试从服务器获取
    const currentDbConfigName = localStorage.getItem('currentDbConfigName')
    if (currentDbConfigName) {
      const result = await apiRequest(`${API_CONFIG.ENDPOINTS.GET_TABLES}?config=${currentDbConfigName}`)
      availableTables.value = result.tables || []
    }
  } catch (error) {
    console.error('加载数据表列表失败:', error)
    availableTables.value = []
  }
}

// 创建工作记录（每个工作表对应一条记录）
const createWorkRecords = async (file) => {
  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '').replace(/-/g, '').replace('T', '')
    
    // 为每个选择了目标表的工作表创建一条工作记录
    for (const sheet of worksheets.value) {
      if (sheet.targetTable) {
        // 生成记录名称：文件名+sheet名称+数据表名+上传时间
        const recordName = `${file.name.replace(/\.[^/.]+$/, '')}_${sheet.name}_${sheet.targetTable}_${timestamp}`
        
        // 获取当前数据库配置名称（如果存在）
        const currentDbConfigName = localStorage.getItem('currentDbConfigName') || ''
        
        const recordData = {
          name: recordName,
          description: `从 ${file.name} 的 ${sheet.name} 工作表上传到 ${sheet.targetTable}`,
          originalFileName: file.name,
          worksheet: sheet.name,
          excelData: sheet.data,
          columns: [], // 将在字段映射时填充
          recordCount: sheet.data.length,
          status: 'uploaded', // 新增状态字段：uploaded（已上传）, mapped（已映射）, completed（已完成）
          mapping: null,
          targetTable: sheet.targetTable,
          operationType: 'insert',
          dbConfigName: currentDbConfigName // 关联数据库配置名称
        }
        
        const result = await apiRequest(API_CONFIG.ENDPOINTS.SAVE_WORK_RECORD, {
          method: 'POST',
          body: JSON.stringify(recordData)
        })
        
        // 保存记录ID到localStorage，供后续更新使用
        localStorage.setItem(`workRecordId_${sheet.name}`, result.workRecord.id)
        
        message.success(`工作表 ${sheet.name} 的记录已创建`)
      }
    }
    
    // 刷新工作记录列表
    if (refreshWorkRecords) {
      refreshWorkRecords()
    }
  } catch (error) {
    console.error('创建工作记录失败:', error)
    message.error('创建工作记录失败: ' + error.message)
  }
}

const updatePreview = () => {
  // 预览数据更新逻辑
}

const removeFile = () => {
  currentFile.value = null
  fileList.value = []
  worksheets.value = []
  selectedWorksheet.value = ''
  excelData.value = []
}

const proceedToMapping = async () => {
  // 为每个选择了目标表的工作表创建一条工作记录
  await createWorkRecords(currentFile.value)
  
  // 传递当前选中的工作表数据到字段映射页面
  const selectedSheet = worksheets.value.find(sheet => sheet.name === selectedWorksheet.value)
  if (selectedSheet) {
    const processedData = {
      fileName: currentFile.value.name,
      worksheet: selectedWorksheet.value,
      startRow: startRow.value,
      hasHeader: hasHeader.value,
      columns: previewColumns.value.map(col => ({
        name: col.title,
        dataIndex: col.dataIndex,
        sample: previewData.value[0]?.[col.dataIndex] || ''
      })),
      data: previewData.value,
      targetTable: selectedSheet.targetTable // 传递目标表信息
    }
    
    localStorage.setItem('excelData', JSON.stringify(processedData))
    message.success('数据准备完成，进入字段映射')
    router.push('/column-mapping')
  }
}

const fetchSavedConfigs = async () => {
  try {
    // 从工作记录中获取已保存的配置
    const data = await apiRequest(API_CONFIG.ENDPOINTS.GET_WORK_RECORDS)
    
    // 过滤出状态为uploaded的工作记录作为可加载的配置
    const workRecordConfigs = data.workRecords
      .filter(record => record.status === 'uploaded')
      .map(record => ({
        name: record.name,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }))
    
    savedConfigs.value = workRecordConfigs
  } catch (error) {
    message.error('获取配置列表失败: ' + error.message)
    console.error(error)
  }
}

const saveCurrentConfig = async () => {
  if (!configName.value) {
    message.error('请输入配置名称')
    return
  }
  
  try {
    const processedData = {
      fileName: currentFile.value?.name || '',
      worksheet: selectedWorksheet.value,
      startRow: startRow.value,
      hasHeader: hasHeader.value,
      columns: previewColumns.value.map(col => ({
        name: col.title,
        dataIndex: col.dataIndex,
        sample: previewData.value[0]?.[col.dataIndex] || ''
      })),
      data: previewData.value
    }
    
    // 获取当前数据库配置名称
    const currentDbConfigName = localStorage.getItem('currentDbConfigName') || ''
    
    // 直接保存为工作记录，而不是Excel配置
    const recordData = {
      name: configName.value,
      description: `Excel配置保存：从 ${processedData.fileName} 的 ${processedData.worksheet} 工作表`,
      originalFileName: processedData.fileName,
      worksheet: processedData.worksheet,
      excelData: processedData.data,
      columns: processedData.columns,
      recordCount: processedData.data.length,
      status: 'uploaded',
      mapping: null,
      targetTable: null,
      operationType: 'insert',
      dbConfigName: currentDbConfigName // 关联当前数据库配置
    }
    
    await apiRequest(API_CONFIG.ENDPOINTS.SAVE_WORK_RECORD, {
      method: 'POST',
      body: JSON.stringify(recordData)
    })
    
    message.success('配置保存成功')
    showSaveModal.value = false
    configName.value = ''
    fetchSavedConfigs() // 刷新配置列表
  } catch (error) {
    message.error('保存配置失败: ' + error.message)
    console.error(error)
  }
}

const loadSelectedConfigs = async () => {
  if (selectedConfigs.value.length === 0) {
    message.error('请选择至少一个配置')
    return
  }
  
  try {
    // 从工作记录中加载选中的配置
    const data = await apiRequest(API_CONFIG.ENDPOINTS.GET_WORK_RECORDS)
    
    // 找到选中的工作记录
    const selectedRecords = data.workRecords.filter(record => 
      selectedConfigs.value.includes(record.name)
    )
    
    if (selectedRecords.length === 0) {
      message.error('未找到选中的配置')
      return
    }
    
    // 合并所有选中记录的数据
    let mergedData = []
    selectedRecords.forEach(record => {
      if (record.excelData && Array.isArray(record.excelData)) {
        mergedData = mergedData.concat(record.excelData)
      }
    })
    
    if (mergedData.length > 0) {
      excelData.value = mergedData
      // 设置工作表名称为第一个记录的工作表
      selectedWorksheet.value = selectedRecords[0].worksheet || '合并数据'
      updatePreview()
      
      showLoadModal.value = false
      message.success(`成功加载 ${selectedConfigs.value.length} 个配置，共 ${mergedData.length} 行数据`)
    } else {
      message.error('所选配置中没有有效数据')
    }
  } catch (error) {
    message.error('加载配置失败: ' + error.message)
    console.error(error)
  }
}

// 检查是否有选中的表，如果有，显示提示
const checkSelectedTable = () => {
  if (store.selectedTable) {
    message.info(
      `已选择表 ${store.selectedTable.name}，上传Excel后可直接进行字段映射`,
      3
    )
  }
}

onMounted(() => {
  // 初始化时获取已保存的配置
  fetchSavedConfigs()
  
  // 检查是否有选中的表
  checkSelectedTable()
})
</script>

<style scoped>
.ant-upload-drag {
  background-color: #fafafa;
}

.ant-table {
  background: white;
}
</style>