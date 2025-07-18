/**
 * Utility function to generate SQL statements (INSERT, UPDATE, DELETE) based on mapped Excel data and user-selected operations.
 * Includes input validation and bulk operation support.
 *
 * @param {Array} data - The mapped Excel data.
 * @param {string} operation - The SQL operation to perform (INSERT, UPDATE, DELETE).
 * @param {Object} options - Additional options for the SQL generation.
 * @param {string} options.tableName - The name of the table to perform the operation on.
 * @param {Array} options.primaryKeys - The primary keys for the table (used for UPDATE and DELETE).
 * @param {boolean} options.bulk - Whether to perform a bulk operation (default: false).
 * @returns {string|Array} The generated SQL statement(s).
 * @throws {Error} If the input data or operation is invalid.
 */
const generateSQL = (data, operation, options = {}) => {
  // Validate input data
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Data must be a non-empty array.');
  }

  // Validate operation
  const validOperations = ['INSERT', 'UPDATE', 'DELETE'];
  if (!validOperations.includes(operation.toUpperCase())) {
    throw new Error(`Invalid operation. Must be one of: ${validOperations.join(', ')}`);
  }

  // Validate options
  if (!options.tableName || typeof options.tableName !== 'string') {
    throw new Error('Table name must be provided as a string.');
  }

  if (['UPDATE', 'DELETE'].includes(operation.toUpperCase()) && (!options.primaryKeys || !Array.isArray(options.primaryKeys) || options.primaryKeys.length === 0)) {
    throw new Error('Primary keys must be provided for UPDATE and DELETE operations.');
  }

  const { tableName, primaryKeys = [], bulk = false } = options;

  // Generate SQL based on operation
  switch (operation.toUpperCase()) {
    case 'INSERT':
      return bulk ? generateBulkInsertSQL(data, tableName) : generateInsertSQL(data, tableName);
    case 'UPDATE':
      return bulk ? generateBulkUpdateSQL(data, tableName, primaryKeys) : generateUpdateSQL(data, tableName, primaryKeys);
    case 'DELETE':
      return bulk ? generateBulkDeleteSQL(data, tableName, primaryKeys) : generateDeleteSQL(data, tableName, primaryKeys);
    default:
      throw new Error('Invalid operation.');
  }
};

// Helper function to generate INSERT SQL
const generateInsertSQL = (data, tableName) => {
  const columns = Object.keys(data[0]).join(', ');
  const values = data.map(row => `(${Object.values(row).map(val => `'${val}'`).join(', ')})`).join(', ');
  return `INSERT INTO ${tableName} (${columns}) VALUES ${values};`;
};

// Helper function to generate bulk INSERT SQL
const generateBulkInsertSQL = (data, tableName) => {
  return data.map(row => generateInsertSQL([row], tableName));
};

// Helper function to generate UPDATE SQL
const generateUpdateSQL = (data, tableName, primaryKeys) => {
  const row = data[0];
  const setClause = Object.entries(row)
    .filter(([key]) => !primaryKeys.includes(key))
    .map(([key, val]) => `${key} = '${val}'`)
    .join(', ');
  
  const whereClause = primaryKeys.map(key => `${key} = '${row[key]}'`).join(' AND ');
  return `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause};`;
};

// Helper function to generate bulk UPDATE SQL
const generateBulkUpdateSQL = (data, tableName, primaryKeys) => {
  return data.map(row => generateUpdateSQL([row], tableName, primaryKeys));
};

// Helper function to generate DELETE SQL
const generateDeleteSQL = (data, tableName, primaryKeys) => {
  const row = data[0];
  const whereClause = primaryKeys.map(key => `${key} = '${row[key]}'`).join(' AND ');
  return `DELETE FROM ${tableName} WHERE ${whereClause};`;
};

// Helper function to generate bulk DELETE SQL
const generateBulkDeleteSQL = (data, tableName, primaryKeys) => {
  return data.map(row => generateDeleteSQL([row], tableName, primaryKeys));
};

export default generateSQL;