/**
 * SQL生成器 - 根据Excel数据和字段映射生成SQL语句
 */

/**
 * 主SQL生成函数
 * @param {Object} config - 配置对象
 * @param {string} config.tableName - 目标表名
 * @param {string} config.operationType - 操作类型 (insert, update, upsert)
 * @param {Array} config.mapping - 字段映射配置
 * @param {Array} config.data - Excel数据
 * @returns {string} 生成的SQL语句
 */
export const generateSQL = (config) => {
  const { tableName, operationType, mapping, data } = config
  
  if (!tableName || !operationType || !mapping || !data) {
    throw new Error('缺少必要的配置参数')
  }
  
  if (data.length === 0) {
    throw new Error('数据不能为空')
  }

  switch (operationType) {
    case 'insert':
      return generateInsertSQL(tableName, mapping, data)
    case 'update':
      return generateUpdateSQL(tableName, mapping, data)
    case 'upsert':
      return generateUpsertSQL(tableName, mapping, data)
    default:
      throw new Error('不支持的操作类型: ' + operationType)
  }
}

/**
 * 生成INSERT语句
 */
const generateInsertSQL = (tableName, mapping, data) => {
  const validMappings = mapping.filter(m => m.excelColumn || m.defaultValue)
  
  if (validMappings.length === 0) {
    throw new Error('没有有效的字段映射')
  }
  
  const columns = validMappings.map(m => m.dbColumn)
  const columnList = columns.join(', ')
  
  const valuesList = data.map(row => {
    const values = validMappings.map(mapping => {
      let value = null
      
      if (mapping.excelColumn && row[mapping.excelColumn] !== undefined) {
        value = row[mapping.excelColumn]
      } else if (mapping.defaultValue) {
        value = mapping.defaultValue
      }
      
      return formatValue(value, mapping)
    })
    
    return `(${values.join(', ')})`
  })
  
  return `INSERT INTO ${tableName} (${columnList})
VALUES ${valuesList.join(',\n       ')};`
}

/**
 * 生成UPDATE语句
 */
const generateUpdateSQL = (tableName, mapping, data) => {
  const keyMappings = mapping.filter(m => m.isKey && (m.excelColumn || m.defaultValue))
  const updateMappings = mapping.filter(m => !m.isKey && (m.excelColumn || m.defaultValue))
  
  if (keyMappings.length === 0) {
    throw new Error('UPDATE操作需要至少一个主键字段')
  }
  
  if (updateMappings.length === 0) {
    throw new Error('UPDATE操作需要至少一个更新字段')
  }
  
  const sqlStatements = data.map(row => {
    const setClause = updateMappings.map(mapping => {
      let value = null
      
      if (mapping.excelColumn && row[mapping.excelColumn] !== undefined) {
        value = row[mapping.excelColumn]
      } else if (mapping.defaultValue) {
        value = mapping.defaultValue
      }
      
      return `${mapping.dbColumn} = ${formatValue(value, mapping)}`
    }).join(', ')
    
    const whereClause = keyMappings.map(mapping => {
      let value = null
      
      if (mapping.excelColumn && row[mapping.excelColumn] !== undefined) {
        value = row[mapping.excelColumn]
      } else if (mapping.defaultValue) {
        value = mapping.defaultValue
      }
      
      return `${mapping.dbColumn} = ${formatValue(value, mapping)}`
    }).join(' AND ')
    
    return `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`
  })
  
  return sqlStatements.join('\n\n')
}

/**
 * 生成UPSERT语句 (MySQL ON DUPLICATE KEY UPDATE)
 */
const generateUpsertSQL = (tableName, mapping, data) => {
  const validMappings = mapping.filter(m => m.excelColumn || m.defaultValue)
  const updateMappings = mapping.filter(m => !m.isKey && (m.excelColumn || m.defaultValue))
  
  if (validMappings.length === 0) {
    throw new Error('没有有效的字段映射')
  }
  
  const columns = validMappings.map(m => m.dbColumn)
  const columnList = columns.join(', ')
  
  const valuesList = data.map(row => {
    const values = validMappings.map(mapping => {
      let value = null
      
      if (mapping.excelColumn && row[mapping.excelColumn] !== undefined) {
        value = row[mapping.excelColumn]
      } else if (mapping.defaultValue) {
        value = mapping.defaultValue
      }
      
      return formatValue(value, mapping)
    })
    
    return `(${values.join(', ')})`
  })
  
  let sql = `INSERT INTO ${tableName} (${columnList})
VALUES ${valuesList.join(',\n       ')}`
  
  if (updateMappings.length > 0) {
    const updateClause = updateMappings.map(mapping => 
      `${mapping.dbColumn} = VALUES(${mapping.dbColumn})`
    ).join(', ')
    
    sql += `\nON DUPLICATE KEY UPDATE ${updateClause}`
  }
  
  return sql + ';'
}

/**
 * 格式化值
 */
const formatValue = (value, mapping) => {
  if (value === null || value === undefined || value === '') {
    return 'NULL'
  }
  
  let formattedValue = value
  
  if (mapping.transform) {
    formattedValue = applyTransform(formattedValue, mapping.transform)
  }
  
  if (mapping.type && mapping.type.toLowerCase().includes('int')) {
    const numValue = parseInt(formattedValue)
    return isNaN(numValue) ? 'NULL' : numValue
  }
  
  if (mapping.type && (mapping.type.toLowerCase().includes('decimal') || mapping.type.toLowerCase().includes('float'))) {
    const numValue = parseFloat(formattedValue)
    return isNaN(numValue) ? 'NULL' : numValue
  }
  
  if (mapping.type && mapping.type.toLowerCase().includes('date')) {
    const dateValue = new Date(formattedValue)
    if (isNaN(dateValue.getTime())) {
      return 'NULL'
    }
    return `'${dateValue.toISOString().slice(0, 19).replace('T', ' ')}'`
  }
  
  return `'${String(formattedValue).replace(/'/g, "''")}'`
}

/**
 * 应用数据转换
 */
const applyTransform = (value, transform) => {
  switch (transform) {
    case 'upper':
      return String(value).toUpperCase()
    case 'lower':
      return String(value).toLowerCase()
    case 'trim':
      return String(value).trim()
    case 'date':
      const date = new Date(value)
      return isNaN(date.getTime()) ? value : date
    case 'number':
      const num = parseFloat(value)
      return isNaN(num) ? value : num
    default:
      return value
  }
}