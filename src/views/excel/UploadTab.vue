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

    <a-card v-if="worksheets.length > 0" title="工作表选择" style="margin-bottom: 16px">
      <a-radio-group v-model:value="selectedWorksheet" @change="onWorksheetChange">
        <a-radio v-for="sheet in worksheets" :key="sheet.name" :value="sheet.name">
          {{ sheet.name }} ({{ sheet.rowCount }} 行)
        </a-radio>
      </a-radio-group>
    </a-card>

    <a-card v-if="excelData.length > 0" title="数据预览">
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
          <a-button type="primary" @click="proceedToMapping" :disabled="!canProceed">
            进入字段映射
          </a-button>
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

// 从父组件注入共享数据
const refreshWorkRecords = inject('refreshWorkRecords')

const canProceed = computed(() => {
  return excelData.value.length > 0 && selectedWorksheet.value
})

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
        data: XLSX.utils.sheet_to_json(worksheet)
      }
    })
    
    worksheets.value = sheets
    if (sheets.length > 0) {
      selectedWorksheet.value = sheets[0].name
      loadWorksheetData(sheets[0].name)
    }
    
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

const proceedToMapping = () => {
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
    data: previewData.value
  }
  
  localStorage.setItem('excelData', JSON.stringify(processedData))
  message.success('数据准备完成，进入字段映射')
  router.push('/column-mapping')
}

const fetchSavedConfigs = async () => {
  try {
    const data = await apiRequest(API_CONFIG.ENDPOINTS.GET_CONFIGS)
    // 过滤出Excel配置并转换为数组格式
    const excelConfigs = Object.entries(data.configs)
      .filter(([key, config]) => key.startsWith('excel_'))
      .map(([key, config]) => ({
        name: key.replace('excel_', ''),
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      }))
    savedConfigs.value = excelConfigs
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
    // Get saved mapping from localStorage if exists
    const savedMapping = JSON.parse(localStorage.getItem('excelMapping') || '{}')
    
    const processedData = {
      fileName: currentFile.value?.name || '',
      worksheet: selectedWorksheet.value,
      startRow: startRow.value,
      hasHeader: hasHeader.value,
      columns: previewColumns.value.map(col => ({
        name: col.title,
        dataIndex: col.dataIndex,
        sample: previewData.value[0]?.[col.dataIndex] || '',
        // Include mapping if exists
        mappedTo: savedMapping[col.dataIndex]?.targetField || null,
        mappingType: savedMapping[col.dataIndex]?.mappingType || null
      })),
      data: previewData.value
    }
    
    await apiRequest(API_CONFIG.ENDPOINTS.SAVE_EXCEL_CONFIG, {
      method: 'POST',
      body: JSON.stringify({
        name: configName.value,
        excelData: processedData.data,
        columns: processedData.columns,
        originalFileName: processedData.fileName,
        worksheet: processedData.worksheet,
        mapping: processedData.columns.reduce((acc, col) => {
          acc[col.dataIndex] = {
            ...col,
            mappedTo: col.mappedTo,
            mappingType: col.mappingType
          }
          return acc
        }, {})
      })
    })
    
    message.success('配置保存成功')
    showSaveModal.value = false
    configName.value = ''
    fetchSavedConfigs()
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
    const data = await apiRequest(API_CONFIG.ENDPOINTS.GENERATE_SQL_FROM_CONFIGS, {
      method: 'POST',
      body: JSON.stringify({
        configNames: selectedConfigs.value
      })
    })
    
    excelData.value = data.data.excelData
    // 这里可以根据需要处理映射关系
    showLoadModal.value = false
    message.success('配置加载成功')
  } catch (error) {
    message.error('加载配置失败: ' + error.message)
    console.error(error)
  }
}

const checkDbConfig = () => {
  // 从全局状态检查数据库配置
  if (!store.dbConfig) {
    message.warning('请先配置数据库连接')
    router.push('/database-config')
    return false
  }
  return true
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
  
  // 检查数据库配置
  if (checkDbConfig()) {
    // 检查是否有选中的表
    checkSelectedTable()
  }
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