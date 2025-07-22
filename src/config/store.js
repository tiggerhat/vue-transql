// 全局状态管理
import { reactive } from 'vue'

// 创建一个全局状态对象
export const store = reactive({
  // 数据库连接配置
  dbConfig: null,
  // 数据库表结构缓存
  dbTables: [],
  // 当前选中的表
  selectedTable: null,
  
  // 设置数据库配置
  setDbConfig(config) {
    this.dbConfig = config
    // 保存到localStorage作为备份
    localStorage.setItem('currentDbConfig', JSON.stringify(config))
  },
  
  // 设置数据库表结构
  setDbTables(tables) {
    this.dbTables = tables
    // 保存到localStorage作为备份
    localStorage.setItem('dbTables', JSON.stringify(tables))
  },
  
  // 设置当前选中的表
  setSelectedTable(table) {
    this.selectedTable = table
    // 保存到localStorage作为备份
    localStorage.setItem('selectedTable', JSON.stringify(table))
  },
  
  // 从localStorage加载数据
  loadFromStorage() {
    try {
      const dbConfig = localStorage.getItem('currentDbConfig')
      if (dbConfig) {
        this.dbConfig = JSON.parse(dbConfig)
      }
      
      const dbTables = localStorage.getItem('dbTables')
      if (dbTables) {
        this.dbTables = JSON.parse(dbTables)
      }
      
      const selectedTable = localStorage.getItem('selectedTable')
      if (selectedTable) {
        this.selectedTable = JSON.parse(selectedTable)
      }
    } catch (error) {
      console.error('从本地存储加载数据失败:', error)
    }
  },
  
  // 清除数据
  clear() {
    this.dbConfig = null
    this.dbTables = []
    this.selectedTable = null
    localStorage.removeItem('currentDbConfig')
    localStorage.removeItem('dbTables')
    localStorage.removeItem('selectedTable')
  }
})

// 初始化时从localStorage加载数据
store.loadFromStorage()