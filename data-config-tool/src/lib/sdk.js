/**
 * PanelX SDK 服务封装
 * 提供数据源和表管理的 CRUD 操作
 */

// 获取 SDK 实例
const getSdk = () => {
  if (window.panelxSdk) {
    return window.panelxSdk;
  }
  return null;
};

const getValidSdk = () => {
  var sdk = getSdk();
  if (!sdk) 
    throw new Error('SDK 不可用');
  return sdk;
};

// 类型标准化映射
const TYPE_MAP = {
  文本: ['CHAR', 'NCHAR', 'VARCHAR', 'VARCHAR2', 'NVARCHAR', 'NVARCHAR2', 'TEXT', 'CLOB', 'STRING', 'LONGTEXT', 'MEDIUMTEXT'],
  日期: ['DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR'],
  数值: ['NUMBER', 'NUMERIC', 'DECIMAL', 'BIGINT', 'INT', 'INTEGER', 'SMALLINT', 'TINYINT', 'DOUBLE', 'FLOAT', 'REAL', 'MONEY']
};

export const PANEL_CODES = {
  DATA_SOURCE: 'IML_00005',
  TABLE: 'IML_00003',
  SQL_TOOL: 'IML_00009',
  DICTIONARY: 'IML_00011',
  SUPPLEMENT_TABLE: 'IML_00028'
};

export const normalizeFieldCategory = (fieldType) => {
  if (fieldType === '维度' || fieldType === '度量' || fieldType === '属性') {
    return fieldType;
  }
  return '属性';
};

export const normalizeDbType = (dbType) => {
  const raw = String(dbType || '').toUpperCase();
  const base = raw.replace(/\(.*/, '');

  if (TYPE_MAP.日期.some(t => base.includes(t))) return '日期';
  if (TYPE_MAP.数值.some(t => base.includes(t))) return '数值';
  return '文本';
};

// 检查 SDK 是否可用
export const isSdkAvailable = () => {
  return !!getSdk() && !window.sdkLoadFailed;
};


// ==================== 数据源管理 API ====================

/**
 * 查询数据源列表
 */
export const queryDataSourceList = async () => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.DATA_SOURCE,
      buttonName: 'queryDataSourceList'
    };

    const result = await sdk.api.callButton(params);
    console.log('[SDK] 查询数据源列表结果:', result);

    if (result && result.data) {
      // 转换数据格式：后端字段 -> 前端字段
      const list = (result.data.list || []).map(item => ({
        id: item['编号'],
        name: item['数据源名称'] || '',
        type: item['数据库类型'] || '',
        driver: item['数据库驱动'] || '',
        url: item['数据源url'] || '',
        username: item['用户名'] || '',
        password: item['密码'] || ''
      }));
      return {
        list,
        totalSize: result.data.totalSize || 0
      };
    }
    return { list: [], totalSize: 0 };
  } catch (error) {
    console.error('[SDK] 查询数据源列表失败:', error);
    throw error;
  }
};

export const saveDataSource = async (dataSource) => {
  const sdk = getValidSdk();

  try {
    // 构建 formData，前端字段 -> 后端字段
    const formData = {
      '数据源名称': dataSource.name,
      '数据库类型': dataSource.type,
      '数据库驱动': dataSource.driver || '',
      '数据源url': dataSource.url || '',
      '用户名': dataSource.username,
      '密码': dataSource.password
    };

    // 如果有 id，说明是更新操作
    if (dataSource.id) {
      formData['编号'] = dataSource.id;
    }

    const params = {
      panelCode: PANEL_CODES.DATA_SOURCE,
      buttonName: '保存数据源',
      formData
    };

    console.log('[SDK] 保存数据源参数:', params);
    const result = await sdk.api.callButton(params);
    console.log('[SDK] 保存数据源结果:', result);
    return result;
  } catch (error) {
    console.error('[SDK] 保存数据源失败:', error);
    throw error;
  }
};

export const deleteDataSource = async (id) => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.DATA_SOURCE,
      buttonName: '删除数据源',
      buttonParam: {
        rowCodes: [id]
      }
    };

    console.log('[SDK] 删除数据源参数:', params);
    const result = await sdk.api.callButton(params);
    console.log('[SDK] 删除数据源结果:', result);
    return result;
  } catch (error) {
    console.error('[SDK] 删除数据源失败:', error);
    throw error;
  }
};

// ==================== 表管理 API ====================

export const queryTableList = async (dsCode = null, keyword = null, pageNo = 1, pageSize = 100) => {
  const sdk = getValidSdk();

  try {
    const condition = {};
    if (dsCode) {
      condition['dsCode'] = dsCode;
    }

    const params = {
      panelCode: PANEL_CODES.TABLE,
      condition,
      pageNo,
      pageSize,
      options: {
        'excludeFields': ['表结构json']
      }
    };

    console.log('[SDK] keyword 参数:', keyword, '类型:', typeof keyword, '是否添加:', !!keyword)
    if (keyword) {
      params.keyword = keyword;
      console.log('[SDK] 已添加 keyword 到 params')
    }

    console.log('[SDK] 最终请求参数:', params)
    const result = await sdk.api.queryFormDataList(params);
    console.log('[SDK] 查询表列表结果:', result);

    if (result && result.data) {
      // 转换数据格式：后端字段 -> 前端字段
      const list = (result.data.list || []).map(item => ({
        id: item['编号'],
        schema: item['模式名'] || '',
        tableName: item['表名'] || '',
        chineseName: item['中文名'] || '',
        description: item['描述'] || '',
        dsCode: item['dsCode'] || '',
      }));
      return {
        list,
        totalSize: result.data.totalSize || 0
      };
    }
    return { list: [], totalSize: 0 };
  } catch (error) {
    console.error('[SDK] 查询表列表失败:', error);
    throw error;
  }
};

export const querySupplementTableList = async (dsCode = null, keyword = null, pageNo = 1, pageSize = 100) => {
  const sdk = getValidSdk();

  try {
    const condition = {};
    if (dsCode) {
      condition['dsCode'] = dsCode;
    }

    const params = {
      panelCode: PANEL_CODES.SUPPLEMENT_TABLE,
      condition,
      pageNo,
      pageSize,
      options: {
        'excludeFields': ['表结构json']
      }
    };

    console.log('[SDK] keyword 参数:', keyword, '类型:', typeof keyword, '是否添加:', !!keyword)
    if (keyword) {
      params.keyword = keyword;
      console.log('[SDK] 已添加 keyword 到 params')
    }

    console.log('[SDK] 最终请求参数:', params)
    const result = await sdk.api.queryFormDataList(params);
    console.log('[SDK] 查询数据补录表列表结果:', result);

    if (result && result.data) {
      // 转换数据格式：后端字段 -> 前端字段
      const list = (result.data.list || []).map(item => ({
        id: item['编号'],
        schema: item['模式名'] || '',
        tableName: item['表名'] || '',
        chineseName: item['中文名'] || '',
        description: item['描述'] || '',
        dsCode: item['dsCode'] || '',
      }));
      return {
        list,
        totalSize: result.data.totalSize || 0
      };
    }
    return { list: [], totalSize: 0 };
  } catch (error) {
    console.error('[SDK] 查询数据补录表列表失败:', error);
    throw error;
  }
};

/**
 * 解析表结构字段
 */
const parseTableStructure = (tableStructure) => {
  if (!tableStructure) return [];

  let fields = tableStructure;
  // 如果是字符串，尝试解析 JSON
  if (typeof tableStructure === 'string') {
    try {
      fields = JSON.parse(tableStructure);
    } catch (e) {
      console.error('[SDK] 解析表结构json失败:', e);
      return [];
    }
  }

  if (Array.isArray(fields)) {
    return fields.map(field => {
      // 后端返回的类型已经是标准化的（文本/日期/数值），直接使用
      const type = field['类型'] || '文本';
      const fieldType = normalizeFieldCategory(field['字段分类']);
      return {
        name: field['字段名'] || '',
        type,
        length: field['长度'] || '',
        precision: field['精度'] || '',
        comment: field['字段中文名'] || '',
        fieldType,
        category: fieldType === '维度' ? (field['类别'] || '') : '',
        dateFormat: field['日期格式'] || '',
        selected: false,
        primaryKey: field['是否主键'] === true,
        sortDirection: field['排序方向'] || 'asc'
      };
    });
  }
  return [];
};

/**
 * 解析 SQL 执行结果为字段列表
 * 用于 queryTableStructure 和 getSqlStruct
 */
const parseSqlResultToFields = (result) => {
  if (result && result.data && result.data.left && result.data.right) {
    const fieldIndexMap = {};
    result.data.left.forEach((col, index) => {
      // 兼容对象({name: '...'})和字符串两种格式
      const colName = (typeof col === 'object' && col?.name) ? col.name : col;
      fieldIndexMap[colName] = index;
    });

    return result.data.right.map(row => {
      const fieldName = fieldIndexMap['字段名'] !== undefined ? row[fieldIndexMap['字段名']] : '';
      const type = fieldIndexMap['类型'] !== undefined ? row[fieldIndexMap['类型']] : '';
      const length = fieldIndexMap['长度'] !== undefined ? row[fieldIndexMap['长度']] : '';
      const precision = fieldIndexMap['精度'] !== undefined ? row[fieldIndexMap['精度']] : '';
      const comment = fieldIndexMap['字段中文名'] !== undefined ? row[fieldIndexMap['字段中文名']] : '';

      const normalizedType = normalizeDbType(type);

      return {
        name: fieldName || '',
        type: normalizedType,
        length: (length === -1 || length === '-1') ? '' : (length || ''),
        precision: (precision === -1 || precision === '-1') ? '' : (precision || ''),
        comment: comment || '',
        fieldType: '属性',
        category: '',
        dateFormat: normalizedType === '日期' ? 'yyyyMMdd' : '',
        selected: true,
        primaryKey: false,
        sortDirection: 'asc'
      };
    });
  }
  return [];
};

export const queryTableDetail = async (id) => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.TABLE,
      condition: {
        code: id
      }
    };

    console.log('[SDK] 查询表详情参数:', params);
    const result = await sdk.api.queryFormData(params);
    console.log('[SDK] 查询表详情结果:', result);

    if (result && result.data && result.data.list && result.data.list.length > 0) {
      const item = result.data.list[0];

      let finalSql = item['querySql'] || '';
      let finalParamMap = {};

      // 尝试解析 querySql，兼容旧格式（纯字符串）和新格式（JSON: {sql, paramMap}）
      try {
        if (finalSql && typeof finalSql === 'string') {
          const parsed = JSON.parse(finalSql);
          // 检查是否符合新格式结构
          if (parsed && typeof parsed === 'object' && 'sql' in parsed) {
            finalSql = parsed.sql || '';
            finalParamMap = parsed.paramMap || {};
          }
        }
      } catch {
        // 解析失败，说明是旧格式的纯 SQL 字符串，保持原值
        console.log('Legacy SQL format detected');
      }

      // 转换数据格式：后端字段 -> 前端字段
      return {
        id: item['编号'],
        schema: item['模式名'] || '',
        tableName: item['表名'] || '',
        chineseName: item['中文名'] || '',
        description: item['描述'] || '',
        dsCode: item['dsCode'] || '',
        type: item['tableType'] || 'table',
        querySql: finalSql,
        paramMap: finalParamMap,
        fields: parseTableStructure(item['表结构json'])
      };
    }
    return null;
  } catch (error) {
    console.error('[SDK] 查询表详情失败:', error);
    throw error;
  }
};

export const querySupplementTableDetail = async (id) => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.SUPPLEMENT_TABLE,
      condition: {
        code: id
      }
    };

    console.log('[SDK] 查询数据补录表详情参数:', params);
    const result = await sdk.api.queryFormData(params);
    console.log('[SDK] 查询数据补录表详情结果:', result);

    if (result && result.data && result.data.list && result.data.list.length > 0) {
      const item = result.data.list[0];

      // 转换数据格式：后端字段 -> 前端字段
      return {
        id: item['编号'],
        schema: item['模式名'] || '',
        tableName: item['表名'] || '',
        chineseName: item['中文名'] || '',
        description: item['描述'] || '',
        dsCode: item['dsCode'] || '',
        fields: parseTableStructure(item['表结构json'])
      };
    }
    return null;
  } catch (error) {
    console.error('[SDK] 查询数据补录表详情失败:', error);
    throw error;
  }
};

/**
 * 查询数据字典类别
 */
export const queryDictionaryCategories = async () => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.DICTIONARY,
      buttonName: '查询码值类型',
    };

    const result = await sdk.api.callButton(params);
    // console.log('[SDK] 查询数据字典类别结果:', result);

    if (result && result.data) {
      // right 是二维数组，每个元素是 [type_id, type_name]
      const list = result.data.map(row => ({
        value: row[0] ? String(row[0]) : '',
        label: row[1] ? String(row[1]) : row[0]
      })).filter(item => item.value);

      return list;
    }
    return [];
  } catch (error) {
    console.error('[SDK] 查询数据字典类别失败:', error);
    return [];
  }
};

/**
 * 获取模式名列表 (Source)
 */
export const querySchemaList = async (dataSource) => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.SQL_TOOL,
      buttonName: '获取sql结果',
      buttonParam: {
        dstype: dataSource.type,
        name: '模式sql',
        dsname: dataSource.name,
        regexMap: {}
      }
    };

    const result = await sdk.api.callButton(params);
    console.log('[SDK] 获取schema列表:', result);

    if (result && result.data && result.data.right) {
      return result.data.right.map(row => row[0]);
    }
    return [];
  } catch (error) {
    console.error('[SDK] 获取schema列表失败:', error);
    return [];
  }
};

/**
 * 获取数据库表列表 (Source)
 */
export const queryDbTableList = async (dataSource, schemaName) => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.SQL_TOOL,
      buttonName: '获取sql结果',
      buttonParam: {
        dstype: dataSource.type,
        name: '表sql',
        dsname: dataSource.name,
        regexMap: { '$scheme_name$': schemaName }
      }
    };

    const result = await sdk.api.callButton(params);
    console.log('[SDK] 获取表列表:', result);

    if (result && result.data && result.data.right) {
      return result.data.right.map(row => ({
        name: row[0],
        comment: '',
        schema: schemaName
      }));
    }
    return [];
  } catch (error) {
    console.error('[SDK] 获取表列表失败:', error);
    return [];
  }
};

/**
 * 获取表结构 (Source)
 */
export const queryTableStructure = async (dataSource, schemaName, tableName) => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.SQL_TOOL,
      buttonName: '获取sql结果',
      buttonParam: {
        dstype: dataSource.type,
        name: '表结构sql',
        dsname: dataSource.name,
        regexMap: {
          '$table_name$': tableName,
          '$schema_name$': schemaName
        }
      }
    };

    const result = await sdk.api.callButton(params);
    console.log('[SDK] 获取表结构:', result);

    if (result && result.data && result.data.left && result.data.right) {
      return parseSqlResultToFields(result);
    }
    return [];
  } catch (error) {
    console.error('[SDK] 获取表结构失败:', error);
    throw error;
  }
};

/**
 * 构建表结构数据
 */
const buildTableStructure = (fields) => {
  if (!fields || !Array.isArray(fields)) return [];
  return fields
    .map(field => ({
      '字段名': field.name || '',
      '类型': field.type || '文本',
      '长度': String(field.length || ''),
      '精度': String(field.precision || ''),
      '字段中文名': field.comment || '',
      '字段分类': normalizeFieldCategory(field.fieldType),
      '日期格式': field.type === '日期' ? (field.dateFormat || 'yyyyMMdd') : '',
      '类别': field.fieldType === '维度' ? (field.category || '') : '',
      '是否主键': field.primaryKey || false,
      '排序方向': field.sortDirection || 'asc'
    }));
};

/**
 * 保存表（新增或更新）
 * @param {Object} table - 表对象
 */
export const saveTable = async (table) => {
  const sdk = getValidSdk();

  try {
    // 构建表结构数据
    const tableStructureArray = buildTableStructure(table.fields);
    // console.log('[SDK] 表结构数据:', JSON.stringify(tableStructureArray, null, 2));

    // 构建 querySql 的 JSON 对象
    const querySqlObj = {
      sql: table.querySql || '',
      paramMap: table.paramMap || {}
    };

    // 构建 formData，前端字段 -> 后端字段
    const formData = {
      '模式名': table.schema,
      '表名': table.tableName,
      '中文名': table.chineseName,
      '描述': table.description,
      'dsCode': table.dsCode || '',
      'tableType': table.type || 'table',
      'querySql': JSON.stringify(querySqlObj),
      '表结构json': JSON.stringify(tableStructureArray)
    };

    // 如果有 id，说明是更新操作
    if (table.id) {
      formData['编号'] = table.id;
    }

    const params = {
      panelCode: PANEL_CODES.TABLE,
      buttonName: '保存',
      formData
    };

    // console.log('[SDK] 保存表参数:', params);
    // console.log('[SDK] 表结构数组:', tableStructureArray);
    // console.log('[SDK] 表结构json:', formData['表结构json']);
    const result = await sdk.api.callButton(params);
    // console.log('[SDK] 保存表结果:', result);
    return result;
  } catch (error) {
    console.error('[SDK] 保存表失败:', error);
    throw error;
  }
};

export const deleteTable = async (id) => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.TABLE,
      buttonName: '删除',
      buttonParam: {
        rowCodes: [id]
      }
    };

    console.log('[SDK] 删除表参数:', params);
    const result = await sdk.api.callButton(params);
    console.log('[SDK] 删除表结果:', result);
    return result;
  } catch (error) {
    console.error('[SDK] 删除表失败:', error);
    throw error;
  }
};

/**
 * 保存数据补录表（新增或更新）
 * @param {Object} table - 表对象
 */
export const saveSupplementTable = async (table) => {
  const sdk = getValidSdk();

  try {
    // 构建表结构数据
    const tableStructureArray = buildTableStructure(table.fields);

    // 构建 formData，前端字段 -> 后端字段
    const formData = {
      '模式名': table.schema,
      '表名': table.tableName,
      '中文名': table.chineseName,
      '描述': table.description,
      'dsCode': table.dsCode || '',
      '表结构json': JSON.stringify(tableStructureArray)
    };

    // 如果有 id，说明是更新操作
    if (table.id) {
      formData['编号'] = table.id;
    }

    const params = {
      panelCode: PANEL_CODES.SUPPLEMENT_TABLE,
      buttonName: 'designer_save',
      formData
    };

    console.log('[SDK] 保存数据补录表参数:', params);
    const result = await sdk.api.callButton(params);
    console.log('[SDK] 保存数据补录表结果:', result);
    return result;
  } catch (error) {
    console.error('[SDK] 保存数据补录表失败:', error);
    throw error;
  }
};

/**
 * 获取 SQL 结构
 * @param {string} dstype - 数据库类型
 * @param {string} dsname - 数据源名称
 * @param {string} sql - SQL 语句
 */
export const getSqlStruct = async (dstype, dsname, sql) => {
  const sdk = getValidSdk();

  try {
    const params = {
      panelCode: PANEL_CODES.TABLE,
      buttonName: 'getSqlStruct',
      buttonParam: {
        dstype,
        dsname,
        sql
      }
    };

    console.log('[SDK] 获取SQL结构参数:', params);
    const result = await sdk.api.callButton(params);
    console.log('[SDK] 获取SQL结构结果:', result);

    if (result && result.data && result.data.left && result.data.right) {
      return parseSqlResultToFields(result);
    }
    return [];
  } catch (error) {
    console.error('[SDK] 获取SQL结构失败:', error);
    throw error;
  }
};

export const importTableData = async (params) => {
  const sdk = getValidSdk();

  try {
    const url = sdk.getSdkEndpoint('/wp-core/api/callButton2')
    const payload = {
      panelCode: PANEL_CODES.SUPPLEMENT_TABLE,
      buttonName: 'importTableData',
      buttonParam: params,
    }

    console.log('[SDK] 导入数据参数:', payload)
    const response = await sdk.request(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    console.log('[SDK] 导入数据结果:', result)
    return result
  } catch (error) {
    console.error('[SDK] 导入数据失败:', error.message)
    throw error
  }
};

export const exportTableTemplate = async (params) => {
  const sdk = getValidSdk();

  try {
    const url = sdk.getSdkEndpoint('/wp-core/api/callButton2')
    const payload = {
      panelCode: PANEL_CODES.SUPPLEMENT_TABLE,
      buttonName: 'exportTableTemplate',
      buttonParam: params,
    }

    console.log('[SDK] 导出模板参数:', payload)
    const response = await sdk.request(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const jsonData = await response.json()
      console.log('[SDK] 导出模板返回 JSON (错误):', jsonData)
      return jsonData
    }

    const blob = await response.blob()
    console.log('[SDK] 导出模板成功, size:', blob.size, 'type:', blob.type)
    return blob
  } catch (error) {
    console.error('[SDK] 导出模板失败:', error.message)
    throw error
  }
};

export default {
  isSdkAvailable,
  queryDataSourceList,
  saveDataSource,
  deleteDataSource,
  queryTableList,
  querySupplementTableList,
  saveTable,
  deleteTable,
  saveSupplementTable,
  queryTableDetail,
  querySupplementTableDetail,
  queryDictionaryCategories,
  querySchemaList,
  queryDbTableList,
  queryTableStructure,
  getSqlStruct,
  normalizeDbType,
  normalizeFieldCategory,
  importTableData,
  exportTableTemplate
};
