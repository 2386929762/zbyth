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

// 类型标准化映射
const TYPE_MAP = {
  文本: ['CHAR', 'NCHAR', 'VARCHAR', 'VARCHAR2', 'NVARCHAR', 'NVARCHAR2', 'TEXT', 'CLOB', 'STRING', 'LONGTEXT', 'MEDIUMTEXT'],
  日期: ['DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR'],
  数值: ['NUMBER', 'NUMERIC', 'DECIMAL', 'BIGINT', 'INT', 'INTEGER', 'SMALLINT', 'TINYINT', 'DOUBLE', 'FLOAT', 'REAL', 'MONEY']
};

const defaultConfig = {
  dataSourcePanelCode: 'OctoCM_BDYTH_IML_00005',
  tablePanelCode: 'OctoCM_BDYTH_IML_00003',
  dictionaryCategoryPanelCode: null
};

// 获取配置
const getConfig = () => {
  const globalConfig = window.SDK_CONFIG || {};
  return { ...defaultConfig, ...globalConfig };
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
// panelCode: OctoCM_BDYTH_IML_00005
// 属性：数据源名称, 数据库类型, 主机地址, 端口, 数据库名, 用户名, 密码

/**
 * 查询数据源列表
 */
export const queryDataSourceList = async () => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，返回空列表');
    return { list: [], totalSize: 0 };
  }

  try {
    const config = getConfig();
    const params = {
      panelCode: config.dataSourcePanelCode,
      buttonName: 'queryDataSourceList'
    };

    const result = await sdk.api.callButton(params);
    console.log('[SDK] 查询数据源列表结果:', result);

    if (result && result.data) {
      // 转换数据格式：后端字段 -> 前端字段
      const list = (result.data.list || []).map(item => ({
        id: item['编号'],
        name: item['数据源名称'] || '',
        type: item['数据库类型'] || 'mysql',
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

/**
 * 保存数据源（新增或更新）
 * @param {Object} dataSource - 数据源对象
 * @param {string} dataSource.id - 编号（更新时必传）
 * @param {string} dataSource.name - 数据源名称
 * @param {string} dataSource.type - 数据库类型
 * @param {string} dataSource.host - 主机地址
 * @param {string} dataSource.port - 端口
 * @param {string} dataSource.database - 数据库名
 * @param {string} dataSource.username - 用户名
 * @param {string} dataSource.password - 密码
 */
export const saveDataSource = async (dataSource) => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，无法保存');
    throw new Error('SDK 不可用');
  }

  try {
    const config = getConfig();

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
      panelCode: config.dataSourcePanelCode,
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

/**
 * 删除数据源
 * @param {string} id - 数据源编号
 */
export const deleteDataSource = async (id) => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，无法删除');
    throw new Error('SDK 不可用');
  }

  try {
    const config = getConfig();
    const params = {
      panelCode: config.dataSourcePanelCode,
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
// panelCode: OctoCM_BDYTH_IML_00003
// 属性：模式名, 表名, 中文名, 描述, 数据源编号(dsCode), 表结构
// 表结构属性：字段名, 类型, 长度, 精度, 字段中文名, 字段分类

/**
 * 查询表列表
 * @param {string} dsCode - 数据源编号（可选，用于筛选）
 * @param {string} keyword - 搜索关键词（可选，用于搜索）
 */
export const queryTableList = async (dsCode = null, keyword = null, pageNo = 1, pageSize = 100) => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，返回空列表');
    return { list: [], totalSize: 0 };
  }

  try {
    const config = getConfig();
    const condition = {};
    // 如果有数据源编号，加入筛选条件
    if (dsCode) {
      condition['dsCode'] = dsCode;
    }

    const params = {
      panelCode: config.tablePanelCode,
      condition,
      pageNo,
      pageSize
    };

    // 如果有搜索关键词，添加到 params
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
        fields: parseTableStructure(item['表结构json'])
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
 * 查询单个表详情
 * @param {string} id - 表编号
 */
export const queryTableDetail = async (id) => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，无法查询详情');
    throw new Error('SDK 不可用');
  }

  try {
    const config = getConfig();
    const params = {
      panelCode: config.tablePanelCode,
      condition: {
        code: id
      }
    };

    console.log('[SDK] 查询表详情参数:', params);
    const result = await sdk.api.queryFormData(params);
    console.log('[SDK] 查询表详情结果:', result);

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
    console.error('[SDK] 查询表详情失败:', error);
    throw error;
  }
};

/**
 * 查询数据字典类别
 */
export const queryDictionaryCategories = async () => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，无法查询数据字典类别');
    return [];
  }

  try {
    const params = {
      panelCode: 'IML_00011',
      buttonName: '查询码值类型',
      buttonParam: {
        configName: '数据字典类别表'
      }
    };

    const result = await sdk.api.callButton(params);
    console.log('[SDK] 查询数据字典类别结果:', result);

    if (result && result.data && result.data.right) {
      // right 是二维数组，每个元素是 [type_id, type_name]
      const list = result.data.right.map(row => ({
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
  const sdk = getSdk();
  if (!sdk) return [];

  try {
    const params = {
      panelCode: 'IML_00009',
      buttonName: '获取sql结果',
      buttonParam: {
        dstype: dataSource.type || 'postgres',
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
  const sdk = getSdk();
  if (!sdk) return [];

  try {
    const params = {
      panelCode: 'IML_00009',
      buttonName: '获取sql结果',
      buttonParam: {
        dstype: dataSource.type || 'postgres',
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
  const sdk = getSdk();
  if (!sdk) return null;

  try {
    const params = {
      panelCode: 'OctoCM_BDYTH_IML_00009',
      buttonName: '获取sql结果',
      buttonParam: {
        dstype: dataSource.type || 'postgresql',
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
      const fieldIndexMap = {};
      result.data.left.forEach((field, index) => {
        fieldIndexMap[field.name] = index;
      });

      const fields = result.data.right.map(row => {
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
      return fields;
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
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，无法保存');
    throw new Error('SDK 不可用');
  }

  try {
    const config = getConfig();

    // 构建表结构数据
    const tableStructureArray = buildTableStructure(table.fields);
    console.log('[SDK] 表结构数据:', JSON.stringify(tableStructureArray, null, 2));

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
      panelCode: config.tablePanelCode,
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

/**
 * 删除表
 * @param {string} id - 表编号
 */
export const deleteTable = async (id) => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，无法删除');
    throw new Error('SDK 不可用');
  }

  try {
    const config = getConfig();
    const params = {
      panelCode: config.tablePanelCode,
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

export default {
  isSdkAvailable,
  queryDataSourceList,
  saveDataSource,
  deleteDataSource,
  queryTableList,
  saveTable,
  deleteTable,
  queryDictionaryCategories,
  querySchemaList,
  queryDbTableList,
  queryTableStructure,
  normalizeDbType,
  normalizeFieldCategory
};
