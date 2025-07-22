<template>
  <div class="work-records-tab">
    <a-card title="工作记录管理" style="margin-bottom: 16px">
      <template #extra>
        <a-space>
          <a-input
            v-model:value="searchText"
            placeholder="搜索工作记录..."
            style="width: 200px"
            allow-clear
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
          <a-button @click="refreshRecords" :loading="loading">
            <ReloadOutlined />
            刷新
          </a-button>
        </a-space>
      </template>
      
      <div v-if="filteredRecords.length === 0" style="text-align: center; padding: 40px 0; color: #999;">
        <FileTextOutlined style="font-size: 48px; margin-bottom: 16px;" />
        <p>暂无工作记录</p>
        <p>完成字段映射后保存工作记录，即可在此查看和管理</p>
      </div>
      
      <a-list
        v-else
        :data-source="filteredRecords"
        item-layout="vertical"
        :pagination="paginationConfig"
      >
        <template #renderItem="{ item }">
          <a-list-item
            :key="item.id"
            :class="{ 'selected-record': selectedRecords.includes(item.id) }"
            @click="toggleSelection(item.id)"
            style="cursor: pointer; border: 1px solid #f0f0f0; margin-bottom: 8px; border-radius: 8px; padding: 16px;"
          >
            <template #actions>
              <a-space>
                <a-button 
                  size="small" 
                  @click.stop="viewRecordDetail(item)"
                  type="link"
                >
                  查看详情
                </a-button>
                <a-button 
                  size="small" 
                  @click.stop="deleteRecord(item.id)"
                  type="link" 
                  danger
                >
                  删除
                </a-button>
              </a-space>
            </template>
            
            <a-list-item-meta>
              <template #title>
                <a-space>
                  <a-checkbox 
                    :checked="selectedRecords.includes(item.id)"
                    @click.stop
                    @change="(e) => toggleSelection(item.id, e.target.checked)"
                  />
                  <span style="font-weight: 600;">{{ item.name }}</span>
                  <a-tag :color="getOperationColor(item.operationType)">
                    {{ getOperationText(item.operationType) }}
                  </a-tag>
                </a-space>
              </template>
              
              <template #description>
                <div style="margin-top: 8px;">
                  <a-space direction="vertical" size="small" style="width: 100%;">
                    <div>
                      <a-space size="large">
                        <span>
                          <FileExcelOutlined style="color: #52c41a; margin-right: 4px;" />
                          源文件: {{ item.originalFileName }}
                        </span>
                        <span>
                          <TableOutlined style="color: #1890ff; margin-right: 4px;" />
                          目标表: {{ item.targetTable }}
                        </span>
                        <span>
                          <NumberOutlined style="color: #fa8c16; margin-right: 4px;" />
                          数据行数: {{ item.recordCount }}
                        </span>
                      </a-space>
                    </div>
                    
                    <div v-if="item.description" style="color: #666;">
                      {{ item.description }}
                    </div>
                    
                    <div style="color: #999; font-size: 12px;">
                      创建时间: {{ formatDateTime(item.createdAt) }}
                      <span v-if="item.worksheet"> • 工作表: {{ item.worksheet }}</span>
                    </div>
                  </a-space>
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
    
    <!-- 批量操作面板 -->
    <a-card v-if="selectedRecords.length > 0" title="批量操作" style="margin-bottom: 16px">
      <a-space>
        <span>已选择 {{ selectedRecords.length }} 个工作记录</span>
        <a-divider type="vertical" />
        <a-button @click="clearSelection">清空选择</a-button>
        <a-button @click="selectAll" v-if="selectedRecords.length < filteredRecords.length">
          全选
        </a-button>
        <a-divider type="vertical" />
        <a-radio-group v-model:value="mergeMode" size="small">
          <a-radio value="separate">分离模式</a-radio>
          <a-radio value="merge" :disabled="!canMerge">合并模式</a-radio>
        </a-radio-group>
        <a-button 
          type="primary" 
          @click="generateSQL"
          :loading="generatingSQL"
          :disabled="selectedRecords.length === 0"
        >
          生成SQL
        </a-button>
      </a-space>
      
      <div v-if="mergeMode === 'merge' && !canMerge" style="margin-top: 8px;">
        <a-alert
          message="合并模式要求所有选中的工作记录操作同一张表且使用相同的操作类型"
          type="warning"
          show-icon
          closable
        />
      </div>
    </a-card>
    
    <!-- 工作记录详情抽屉 -->
    <a-drawer
      v-model:open="detailDrawerVisible"
      title="工作记录详情"
      placement="right"
      :width="600"
    >
      <div v-if="currentRecord">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="记录名称">
            {{ currentRecord.name }}
          </a-descriptions-item>
          <a-descriptions-item label="描述" v-if="currentRecord.description">
            {{ currentRecord.description }}
          </a-descriptions-item>
          <a-descriptions-item label="源文件">
            {{ currentRecord.originalFileName }}
          </a-descriptions-item>
          <a-descriptions-item label="工作表">
            {{ currentRecord.worksheet }}
          </a-descriptions-item>
          <a-descriptions-item label="目标表">
            {{ currentRecord.targetTable }}
          </a-descriptions-item>
          <a-descriptions-item label="操作类型">
            <a-tag :color="getOperationColor(currentRecord.operationType)">
              {{ getOperationText(currentRecord.operationType) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="数据行数">
            {{ currentRecord.recordCount }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">
            {{ formatDateTime(currentRecord.createdAt) }}
          </a-descriptions-item>
        </a-descriptions>
        
        <a-divider />
        
        <h4>字段映射</h4>
        <a-table
          :columns="mappingColumns"
          :data-source="currentRecordMappings"
          size="small"
          :pagination="false"
          :scroll="{ y: 300 }"
        />
      </div>
    </a-drawer>
    
    <!-- SQL 生成结果模态框 -->
    <a-modal
      v-model:open="sqlModalVisible"
      title="SQL 生成结果"
      :width="800"
      :footer="null"
    >
      <div v-if="sqlResult">
        <a-space direction="vertical" style="width: 100%;">
          <div>
            <a-space>
              <span><strong>模式:</strong> {{ sqlResult.mode === 'merge' ? '合并模式' : '分离模式' }}</span>
              <span><strong>总记录数:</strong> {{ sqlResult.totalRecords }}</span>
              <a-button @click="copyAllSQL" type="link">复制全部SQL</a-button>
            </a-space>
          </div>
          
          <a-divider />
          
          <!-- 合并模式结果 -->
          <div v-if="sqlResult.mode === 'merge'">
            <h4>{{ sqlResult.targetTable }} - {{ getOperationText(sqlResult.operationType) }}</h4>
            <p><strong>源文件:</strong> {{ sqlResult.sourceFiles.join(', ') }}</p>
            <a-typography-paragraph>
              <pre class="sql-preview">{{ generateSQLPreview(sqlResult) }}</pre>
            </a-typography-paragraph>
          </div>
          
          <!-- 分离模式结果 -->
          <div v-else>
            <a-collapse>
              <a-collapse-panel 
                v-for="record in sqlResult.records" 
                :key="record.id"
                :header="`${record.name} (${record.recordCount} 行)`"
              >
                <p><strong>目标表:</strong> {{ record.targetTable }}</p>
                <p><strong>操作类型:</strong> {{ getOperationText(record.operationType) }}</p>
                <p><strong>源文件:</strong> {{ record.originalFileName }}</p>
                <a-typography-paragraph>
                  <pre class="sql-preview">{{ generateSQLPreview(record) }}</pre>
                </a-typography-paragraph>
              </a-collapse-panel>
            </a-collapse>
          </div>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from 'vue'
import { message } from 'ant-design-vue'
import { 
  SearchOutlined, 
  ReloadOutlined, 
  FileTextOutlined,
  FileExcelOutlined,
  TableOutlined,
  NumberOutlined
} from '@ant-design/icons-vue'
import { apiRequest, API_CONFIG } from '@/config/api.js'

// 注入全局刷新触发器
const workRecordRefreshTrigger = inject('workRecordRefreshTrigger', ref(0))

const loading = ref(false)
const generatingSQL = ref(false)
const workRecords = ref([])
const selectedRecords = ref([])
const searchText = ref('')
const mergeMode = ref('separate')
const detailDrawerVisible = ref(false)
const sqlModalVisible = ref(false)
const currentRecord = ref(null)
const sqlResult = ref(null)

// 分页配置
const paginationConfig = {
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 项，共 ${total} 个工作记录`
}

// 映射表格列配置
const mappingColumns = [
  { title: '数据库字段', dataIndex: 'dbColumn', key: 'dbColumn', width: 120 },
  { title: 'Excel列', dataIndex: 'excelColumn', key: 'excelColumn', width: 120 },
  { title: '是否必填', dataIndex: 'required', key: 'required', width: 80 },
  { title: '默认值', dataIndex: 'defaultValue', key: 'defaultValue', width: 100 },
  { title: '转换函数', dataIndex: 'transform', key: 'transform', width: 100 }
]

// 过滤后的记录
const filteredRecords = computed(() => {
  if (!searchText.value) return workRecords.value
  
  const search = searchText.value.toLowerCase()
  return workRecords.value.filter(record => 
    record.name.toLowerCase().includes(search) ||
    record.description?.toLowerCase().includes(search) ||
    record.originalFileName.toLowerCase().includes(search) ||
    record.targetTable.toLowerCase().includes(search)
  )
})

// 当前记录的映射数据
const currentRecordMappings = computed(() => {
  if (!currentRecord.value?.mapping) return []
  
  return currentRecord.value.mapping.filter(m => m.excelColumn).map(m => ({
    dbColumn: m.dbColumn,
    excelColumn: m.excelColumn,
    required: m.required ? '是' : '否',
    defaultValue: m.defaultValue || '-',
    transform: m.transform || '-'
  }))
})

// 检查是否可以合并
const canMerge = computed(() => {
  if (selectedRecords.value.length <= 1) return true
  
  const selectedItems = workRecords.value.filter(r => selectedRecords.value.includes(r.id))
  const firstRecord = selectedItems[0]
  
  return selectedItems.every(record => 
    record.targetTable === firstRecord.targetTable &&
    record.operationType === firstRecord.operationType
  )
})

onMounted(() => {
  loadWorkRecords()
})

// 监听刷新触发器
watch(workRecordRefreshTrigger, () => {
  loadWorkRecords()
})

// 加载工作记录
const loadWorkRecords = async () => {
  loading.value = true
  try {
    const data = await apiRequest(API_CONFIG.ENDPOINTS.GET_WORK_RECORDS)
    workRecords.value = data.workRecords
  } catch (error) {
    message.error('加载工作记录失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 刷新记录
const refreshRecords = () => {
  loadWorkRecords()
}

// 切换选择状态
const toggleSelection = (id, checked) => {
  if (checked === undefined) {
    // 点击行时切换
    const index = selectedRecords.value.indexOf(id)
    if (index > -1) {
      selectedRecords.value.splice(index, 1)
    } else {
      selectedRecords.value.push(id)
    }
  } else {
    // 复选框变化
    if (checked) {
      if (!selectedRecords.value.includes(id)) {
        selectedRecords.value.push(id)
      }
    } else {
      const index = selectedRecords.value.indexOf(id)
      if (index > -1) {
        selectedRecords.value.splice(index, 1)
      }
    }
  }
  
  // 合并模式检查
  if (mergeMode.value === 'merge' && !canMerge.value) {
    mergeMode.value = 'separate'
    message.warning('所选记录不支持合并模式，已切换为分离模式')
  }
}

// 清空选择
const clearSelection = () => {
  selectedRecords.value = []
}

// 全选
const selectAll = () => {
  selectedRecords.value = filteredRecords.value.map(r => r.id)
}

// 查看记录详情
const viewRecordDetail = async (record) => {
  try {
    const data = await apiRequest(`${API_CONFIG.ENDPOINTS.GET_WORK_RECORD}/${record.id}`)
    currentRecord.value = { ...record, ...data.workRecord }
    detailDrawerVisible.value = true
  } catch (error) {
    message.error('获取记录详情失败: ' + error.message)
  }
}

// 删除记录
const deleteRecord = async (id) => {
  try {
    await apiRequest(`${API_CONFIG.ENDPOINTS.DELETE_WORK_RECORD}/${id}`, {
      method: 'DELETE'
    })
    
    message.success('工作记录删除成功')
    
    // 从选择中移除
    const index = selectedRecords.value.indexOf(id)
    if (index > -1) {
      selectedRecords.value.splice(index, 1)
    }
    
    // 重新加载
    loadWorkRecords()
  } catch (error) {
    message.error('删除工作记录失败: ' + error.message)
  }
}

// 生成SQL
const generateSQL = async () => {
  generatingSQL.value = true
  try {
    const data = await apiRequest(API_CONFIG.ENDPOINTS.GENERATE_SQL_FROM_WORK_RECORDS, {
      method: 'POST',
      body: JSON.stringify({
        recordIds: selectedRecords.value,
        mergeMode: mergeMode.value
      })
    })
    
    sqlResult.value = data.result
    sqlModalVisible.value = true
    message.success('SQL生成成功')
  } catch (error) {
    message.error('生成SQL失败: ' + error.message)
  } finally {
    generatingSQL.value = false
  }
}

// 生成SQL预览 (简化版，实际应该调用SQL生成工具)
const generateSQLPreview = (data) => {
  const operation = data.operationType || 'insert'
  const table = data.targetTable
  const recordCount = data.recordCount || data.data?.length || 0
  
  if (operation === 'insert') {
    return `-- INSERT操作预览\nINSERT INTO ${table} (...) VALUES\n  (...),  -- ${recordCount} 行数据\n  (...);`
  } else if (operation === 'update') {
    return `-- UPDATE操作预览\nUPDATE ${table} SET\n  column1 = value1,\n  column2 = value2\nWHERE key_column = ?;\n-- ${recordCount} 行数据`
  } else {
    return `-- UPSERT操作预览\nINSERT INTO ${table} (...) VALUES (...)\nON DUPLICATE KEY UPDATE\n  column1 = VALUES(column1);\n-- ${recordCount} 行数据`
  }
}

// 复制全部SQL
const copyAllSQL = async () => {
  try {
    let allSQL = ''
    
    if (sqlResult.value.mode === 'merge') {
      allSQL = generateSQLPreview(sqlResult.value)
    } else {
      allSQL = sqlResult.value.records
        .map(record => `-- ${record.name}\n${generateSQLPreview(record)}`)
        .join('\n\n')
    }
    
    await navigator.clipboard.writeText(allSQL)
    message.success('SQL已复制到剪贴板')
  } catch (error) {
    message.error('复制失败，请手动复制')
  }
}

// 工具函数
const getOperationColor = (type) => {
  const colors = { insert: 'green', update: 'orange', upsert: 'blue' }
  return colors[type] || 'default'
}

const getOperationText = (type) => {
  const texts = { insert: '插入', update: '更新', upsert: '插入或更新' }
  return texts[type] || type
}

const formatDateTime = (dateStr) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 暴露方法给父组件
defineExpose({
  refreshRecords
})
</script>

<style scoped>
.work-records-tab {
  padding: 0;
}

.selected-record {
  background-color: #e6f7ff;
  border-color: #1890ff !important;
}

.sql-preview {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  max-height: 200px;
  overflow-y: auto;
}

.ant-list-item {
  transition: all 0.2s;
}

.ant-list-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>