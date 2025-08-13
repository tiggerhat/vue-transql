// API 配置和请求封装
const API_BASE_URL = 'http://localhost:3001/api'

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // 数据库相关
    TEST_CONNECTION: `${API_BASE_URL}/test-connection`,
    SAVE_CONFIG: `${API_BASE_URL}/save-config`,
    GET_CONFIGS: `${API_BASE_URL}/get-configs`,
    GET_CONFIG: `${API_BASE_URL}/get-config`,
    DELETE_CONFIG: `${API_BASE_URL}/delete-config`,
    GET_TABLES: `${API_BASE_URL}/get-tables`,
    
    // Excel配置相关
    SAVE_EXCEL_CONFIG: `${API_BASE_URL}/save-excel-config`,
    GENERATE_SQL_FROM_CONFIGS: `${API_BASE_URL}/generate-sql-from-configs`,
    
    // 工作记录相关
    SAVE_WORK_RECORD: `${API_BASE_URL}/save-work-record`,
    UPDATE_WORK_RECORD: `${API_BASE_URL}/update-work-record`,  // 添加更新工作记录接口
    GET_WORK_RECORDS: `${API_BASE_URL}/get-work-records`,
    GET_WORK_RECORD: `${API_BASE_URL}/get-work-record`,
    DELETE_WORK_RECORD: `${API_BASE_URL}/delete-work-record`,
    GENERATE_SQL_FROM_WORK_RECORDS: `${API_BASE_URL}/generate-sql-from-work-records`
  }
}

// 通用API请求函数
export async function apiRequest(endpoint, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json'
    }
  }
  
  const response = await fetch(endpoint, {
    ...defaultOptions,
    ...options
  })
  
  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.message || '请求失败')
  }
  
  return data
}