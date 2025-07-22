// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  ENDPOINTS: {
    TEST_CONNECTION: '/api/test-connection',
    SAVE_CONFIG: '/api/save-config',
    GET_CONFIGS: '/api/get-configs',
    GET_CONFIG: '/api/get-config',
    DELETE_CONFIG: '/api/delete-config',
    GET_TABLES: '/api/get-tables',
    SAVE_EXCEL_CONFIG: '/api/save-excel-config',
    GENERATE_SQL_FROM_CONFIGS: '/api/generate-sql-from-configs',
    // 工作记录相关API
    SAVE_WORK_RECORD: '/api/save-work-record',
    GET_WORK_RECORDS: '/api/get-work-records',
    GET_WORK_RECORD: '/api/get-work-record',
    DELETE_WORK_RECORD: '/api/delete-work-record',
    GENERATE_SQL_FROM_WORK_RECORDS: '/api/generate-sql-from-work-records'
  }
}

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}

// API request helper
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint)
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  }
  
  const response = await fetch(url, { ...defaultOptions, ...options })
  const data = await response.json()
  
  if (!response.ok || !data.success) {
    throw new Error(data.message || `请求失败: ${response.status}`)
  }
  
  return data
}