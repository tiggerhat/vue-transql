import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import pg from 'pg';
import { Connection, Request } from 'tedious';
import fs from 'fs/promises';

const app = express();
const port = 3001;
const configFile = 'db-configs.json';
const workRecordsFile = 'work-records.json';

app.use(cors());
app.use(express.json());

async function loadConfigs() {
  try {
    const data = await fs.readFile(configFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveConfigs(configs) {
  await fs.writeFile(configFile, JSON.stringify(configs, null, 2), 'utf8');
}

async function loadWorkRecords() {
  try {
    const data = await fs.readFile(workRecordsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveWorkRecords(workRecords) {
  await fs.writeFile(workRecordsFile, JSON.stringify(workRecords, null, 2), 'utf8');
}

async function createMysqlConnection(config) {
  return await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database
  });
}

async function createPostgresConnection(config) {
  const client = new pg.Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database
  });
  await client.connect();
  return client;
}

function createSqlServerConnection(config) {
  return new Promise((resolve, reject) => {
    const connection = new Connection({
      server: config.host,
      authentication: {
        type: 'default',
        options: {
          userName: config.username,
          password: config.password
        }
      },
      options: {
        database: config.database,
        port: config.port,
        encrypt: false
      }
    });
    
    connection.on('connect', () => resolve(connection));
    connection.on('connectFailed', reject);
    connection.connect();
  });
}

app.post('/api/test-connection', async (req, res) => {
  const { type, host, port, database, username, password } = req.body;
  
  try {
    let connection;
    
    switch (type) {
      case 'mysql':
        connection = await createMysqlConnection({ host, port, username, password, database });
        await connection.end();
        break;
        
      case 'postgresql':
        connection = await createPostgresConnection({ host, port, username, password, database });
        await connection.end();
        break;
        
      case 'sqlserver':
        connection = await createSqlServerConnection({ host, port, username, password, database });
        connection.close();
        break;
        
      default:
        return res.status(400).json({ success: false, message: '不支持的数据库类型' });
    }
    
    res.json({ success: true, message: '数据库连接成功' });
  } catch (error) {
    console.error('数据库连接失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '数据库连接失败' 
    });
  }
});

app.post('/api/save-config', async (req, res) => {
  const { name, config } = req.body;
  
  try {
    const configs = await loadConfigs();
    configs[name] = config;
    await saveConfigs(configs);
    
    res.json({ success: true, message: '配置保存成功' });
  } catch (error) {
    console.error('保存配置失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '保存配置失败' 
    });
  }
});

app.post('/api/save-excel-config', async (req, res) => {
  const { name, excelData, columns, originalFileName, worksheet, mapping } = req.body;
  
  try {
    const configs = await loadConfigs();
    const configKey = `excel_${name}`;
    configs[configKey] = { 
      type: 'excel',
      excelData, 
      columns,
      originalFileName,
      worksheet,
      mapping,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await saveConfigs(configs);
    
    res.json({ success: true, message: 'Excel配置保存成功' });
  } catch (error) {
    console.error('保存Excel配置失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '保存Excel配置失败' 
    });
  }
});

// 保存工作记录 (包含Excel数据、字段映射和目标表信息)
app.post('/api/save-work-record', async (req, res) => {
  const { 
    name, 
    description,
    excelData, 
    columns, 
    originalFileName, 
    worksheet, 
    mapping,
    targetTable,
    operationType,
    dbConfigName  // 数据库配置名称
  } = req.body;
  
  try {
    const workRecords = await loadWorkRecords();
    const recordKey = `work_${name}_${Date.now()}`;
    
    workRecords[recordKey] = { 
      id: recordKey,
      name,
      description: description || '',
      excelData, 
      columns,
      originalFileName,
      worksheet,
      mapping,
      targetTable,
      operationType: operationType || 'insert',
      dbConfigName,  // 关联数据库配置名称
      recordCount: excelData?.length || 0,
      status: 'uploaded',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await saveWorkRecords(workRecords);
    
    res.json({ success: true, message: '工作记录保存成功', workRecord: workRecords[recordKey] });
  } catch (error) {
    console.error('保存工作记录失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '保存工作记录失败' 
    });
  }
});

// 获取工作记录列表
app.get('/api/get-work-records', async (_, res) => {
  try {
    const workRecords = await loadWorkRecords();
    
    // 转换为数组格式并按时间排序
    const workRecordsList = Object.values(workRecords)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, workRecords: workRecordsList });
  } catch (error) {
    console.error('获取工作记录失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '获取工作记录失败' 
    });
  }
});

// 获取工作记录详情
app.get('/api/get-work-record/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const workRecords = await loadWorkRecords();
    const configs = await loadConfigs();
    
    if (!workRecords[id]) {
      return res.status(404).json({
        success: false,
        message: '工作记录不存在'
      });
    }
    
    // 如果工作记录关联了数据库配置，获取数据库配置详情
    let dbConfig = null;
    if (workRecords[id].dbConfigName) {
      const dbConfigEntry = configs[workRecords[id].dbConfigName];
      if (dbConfigEntry) {
        dbConfig = dbConfigEntry;
      }
    }
    
    res.json({ 
      success: true, 
      workRecord: {
        ...workRecords[id],
        dbConfig  // 添加数据库配置详情
      }
    });
  } catch (error) {
    console.error('获取工作记录详情失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '获取工作记录详情失败' 
    });
  }
});

// 更新工作记录
app.put('/api/update-work-record/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  try {
    const workRecords = await loadWorkRecords();
    
    if (!workRecords[id]) {
      return res.status(404).json({
        success: false,
        message: '工作记录不存在'
      });
    }
    
    // 更新记录，保留原有数据但覆盖新数据
    workRecords[id] = {
      ...workRecords[id],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await saveWorkRecords(workRecords);
    
    res.json({ success: true, message: '工作记录更新成功', workRecord: workRecords[id] });
  } catch (error) {
    console.error('更新工作记录失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '更新工作记录失败' 
    });
  }
});

// 从多个工作记录生成SQL
app.post('/api/generate-sql-from-work-records', async (req, res) => {
  const { recordIds } = req.body;
  
  try {
    const workRecords = await loadWorkRecords();
    
    // 获取所有指定的工作记录
    const selectedRecords = recordIds.map(id => workRecords[id]).filter(record => record);
    
    if (selectedRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: '未找到指定的工作记录'
      });
    }
    
    // 合并数据 - 如果选择了多个记录
    let combinedData = [];
    let targetTable = null;
    let operationType = 'insert';
    let mapping = null;
    
    selectedRecords.forEach(record => {
      if (record.excelData && Array.isArray(record.excelData)) {
        combinedData = combinedData.concat(record.excelData);
      }
      
      // 使用第一个记录的映射和目标表
      if (!targetTable && record.targetTable) {
        targetTable = record.targetTable;
        mapping = record.mapping;
        operationType = record.operationType || 'insert';
      }
    });
    
    if (!targetTable || !mapping) {
      return res.status(400).json({
        success: false,
        message: '所选工作记录缺少必要的映射信息'
      });
    }
    
    // 生成SQL
    const sqlStatements = generateSQLFromMapping(combinedData, mapping, targetTable, operationType);
    
    res.json({ 
      success: true, 
      data: {
        sqlStatements,
        recordCount: combinedData.length,
        targetTable,
        operationType
      }
    });
  } catch (error) {
    console.error('从工作记录生成SQL失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '从工作记录生成SQL失败' 
    });
  }
});

app.get('/api/get-configs', async (_, res) => {
  try {
    const configs = await loadConfigs();
    res.json({ success: true, configs });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '获取配置失败' 
    });
  }
});

app.get('/api/get-config/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    const configs = await loadConfigs();
    if (!configs[name]) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }
    
    res.json({ success: true, config: configs[name] });
  } catch (error) {
    console.error('获取配置详情失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '获取配置详情失败' 
    });
  }
});

app.post('/api/generate-sql-from-configs', async (req, res) => {
  const { configNames } = req.body;
  
  try {
    const configs = await loadConfigs();
    const selectedConfigs = configNames.map(name => configs[name]).filter(Boolean);
    
    if (selectedConfigs.length === 0) {
      return res.status(400).json({
        success: false,
        message: '未找到指定的配置'
      });
    }
    
    // 合并多个配置的映射关系
    const combinedMapping = {};
    const combinedExcelData = [];
    
    selectedConfigs.forEach(config => {
      Object.assign(combinedMapping, config.mapping);
      combinedExcelData.push(...config.excelData);
    });
    
    // 这里应该调用项目的SQL生成逻辑
    // 暂时返回合并后的数据
    res.json({ 
      success: true, 
      data: {
        excelData: combinedExcelData,
        mapping: combinedMapping
      }
    });
  } catch (error) {
    console.error('从配置生成SQL失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '从配置生成SQL失败' 
    });
  }
});

// 删除工作记录
app.delete('/api/delete-work-record/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const workRecords = await loadWorkRecords();
    
    if (!workRecords[id]) {
      return res.status(404).json({
        success: false,
        message: '工作记录不存在'
      });
    }
    
    delete workRecords[id];
    await saveWorkRecords(workRecords);
    
    res.json({ success: true, message: '工作记录删除成功' });
  } catch (error) {
    console.error('删除工作记录失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '删除工作记录失败' 
    });
  }
});

app.delete('/api/delete-config/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    const configs = await loadConfigs();
    delete configs[name];
    await saveConfigs(configs);
    
    res.json({ success: true, message: '配置删除成功' });
  } catch (error) {
    console.error('删除配置失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '删除配置失败' 
    });
  }
});

app.post('/api/get-tables', async (req, res) => {
  const { type, host, port, database, username, password } = req.body;
  
  try {
    let tables = [];
    
    switch (type) {
      case 'mysql':
        tables = await getMysqlTables({ host, port, username, password, database });
        break;
        
      case 'postgresql':
        tables = await getPostgresTables({ host, port, username, password, database });
        break;
        
      case 'sqlserver':
        tables = await getSqlServerTables({ host, port, username, password, database });
        break;
        
      default:
        return res.status(400).json({ success: false, message: '不支持的数据库类型' });
    }
    
    res.json({ success: true, tables });
  } catch (error) {
    console.error('获取表结构失败:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || '获取表结构失败' 
    });
  }
});

async function getMysqlTables(config) {
  const connection = await createMysqlConnection(config);
  
  const [tables] = await connection.execute(
    'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
    [config.database]
  );
  
  const result = [];
  
  for (const table of tables) {
    const tableName = table.TABLE_NAME;
    const [columns] = await connection.execute(`
      SELECT 
        COLUMN_NAME as name,
        DATA_TYPE as type,
        CHARACTER_MAXIMUM_LENGTH as length,
        IS_NULLABLE as nullable,
        COLUMN_KEY as key_type,
        COLUMN_COMMENT as comment
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `, [config.database, tableName]);
    
    result.push({
      name: tableName,
      columns: columns.map(col => ({
        name: col.name,
        type: col.type,
        length: col.length,
        nullable: col.nullable === 'YES',
        primary: col.key_type === 'PRI',
        comment: col.comment || ''
      }))
    });
  }
  
  await connection.end();
  return result;
}

async function getPostgresTables(config) {
  const client = await createPostgresConnection(config);
  
  const tablesResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  
  const result = [];
  
  for (const table of tablesResult.rows) {
    const tableName = table.table_name;
    const columnsResult = await client.query(`
      SELECT 
        c.column_name as name,
        c.data_type as type,
        c.character_maximum_length as length,
        c.is_nullable as nullable,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as primary,
        COALESCE(pgd.description, '') as comment
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
      LEFT JOIN pg_description pgd ON pgd.objoid = pgc.oid 
        AND pgd.objsubid = c.ordinal_position
      WHERE c.table_name = $1
      ORDER BY c.ordinal_position
    `, [tableName]);
    
    result.push({
      name: tableName,
      columns: columnsResult.rows.map(col => ({
        name: col.name,
        type: col.type,
        length: col.length,
        nullable: col.nullable === 'YES',
        primary: col.primary,
        comment: col.comment || ''
      }))
    });
  }
  
  await client.end();
  return result;
}

async function getSqlServerTables(config) {
  const connection = await createSqlServerConnection(config);
  
  return new Promise((resolve, reject) => {
    const result = [];
    let currentTable = null;
    
    const request = new Request(`
      SELECT 
        t.TABLE_NAME,
        c.COLUMN_NAME as name,
        c.DATA_TYPE as type,
        c.CHARACTER_MAXIMUM_LENGTH as length,
        c.IS_NULLABLE as nullable,
        CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as primary_key,
        ISNULL(ep.value, '') as comment
      FROM INFORMATION_SCHEMA.TABLES t
      LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
      LEFT JOIN (
        SELECT ku.COLUMN_NAME, ku.TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku 
        ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME AND c.TABLE_NAME = pk.TABLE_NAME
      LEFT JOIN sys.extended_properties ep ON ep.major_id = OBJECT_ID(t.TABLE_SCHEMA + '.' + t.TABLE_NAME)
        AND ep.minor_id = c.ORDINAL_POSITION
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
    `, (err) => {
      if (err) {
        connection.close();
        reject(err);
        return;
      }
      
      if (currentTable) {
        result.push(currentTable);
      }
      
      connection.close();
      resolve(result);
    });
    
    request.on('row', (columns) => {
      const tableName = columns[0].value;
      const columnData = {
        name: columns[1].value,
        type: columns[2].value,
        length: columns[3].value,
        nullable: columns[4].value === 'YES',
        primary: columns[5].value === 1,
        comment: columns[6].value || ''
      };
      
      if (!currentTable || currentTable.name !== tableName) {
        if (currentTable) {
          result.push(currentTable);
        }
        currentTable = {
          name: tableName,
          columns: []
        };
      }
      
      if (columnData.name) {
        currentTable.columns.push(columnData);
      }
    });
    
    connection.execSql(request);
  });
}

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});