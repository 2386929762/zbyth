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

const normalizeFieldCategory = (fieldType) => {
  if (fieldType === '维度' || fieldType === '度量' || fieldType === '属性') {
    return fieldType;
  }
  return '属性';
};

const normalizeDbType = (dbType) => {
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
        selected: false
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
export const queryDictionaryCategories = async (pageNo = 1, pageSize = 200) => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，无法查询数据字典类别');
    return [];
  }

  const config = getConfig();
  if (!config.dictionaryCategoryPanelCode) {
    console.warn('[SDK] 未配置 dictionaryCategoryPanelCode，无法查询数据字典类别');
    return [];
  }

  try {
    const params = {
      panelCode: config.dictionaryCategoryPanelCode,
      condition: {},
      pageNo,
      pageSize
    };

    const result = await sdk.api.queryFormDataList(params);
    console.log('[SDK] 查询数据字典类别结果:', result);

    const list = (result?.data?.list || []).map(item => {
      const value = item['类别编码'] || item['编码'] || item.code || item.id || item['编号'] || '';
      const label = item['类别名称'] || item['名称'] || item.name || item.label || value;
      return {
        value: value ? String(value) : '',
        label: label ? String(label) : ''
      };
    }).filter(item => item.value);

    return list;
  } catch (error) {
    console.error('[SDK] 查询数据字典类别失败:', error);
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
      '类别': field.fieldType === '维度' ? (field.category || '') : ''
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

    console.log('[SDK] 保存表参数:', params);
    console.log('[SDK] 表结构数组:', tableStructureArray);
    console.log('[SDK] 表结构json:', formData['表结构json']);
    const result = await sdk.api.callButton(params);
    console.log('[SDK] 保存表结果:', result);
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

export function isLocalDevelopment(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' // file:// 协议时 hostname 为空
}

export function tryLoadGpfLoginToken(sdk, currentUrl) {
  try {
    var parsedUrl = new URL(currentUrl)
    var hostname = parsedUrl.hostname

    // 如果是本地开发环境，不处理
    if (isLocalDevelopment(hostname)) {
      console.log('[PanelX SDK] 本地开发环境，跳过GPF token加载')
      return
    }

    // 从URL路径中提取应用名称
    var pathname = parsedUrl.pathname
    var pathParts = pathname.split('/').filter(function (part) {
      return part.length > 0
    })

    if (pathParts.length === 0) {
      console.log('[PanelX SDK] 无法从URL提取应用名称')
      return
    }

    // 取最后一个路径部分作为应用名称
    var appName = pathParts[pathParts.length - 1]
    var sessionKey = 'SessionKey_' + appName

    console.log('[PanelX SDK] 尝试从localStorage加载GPF token:', sessionKey)

    // 从localStorage读取
    var sessionData = localStorage.getItem(sessionKey)
    if (!sessionData) {
      console.log('[PanelX SDK] 未找到GPF session数据')
      return
    }

    // 解析JSON数据
    var sessionObj = JSON.parse(sessionData)
    if (!sessionObj || !sessionObj.token) {
      console.log('[PanelX SDK] GPF session数据格式错误')
      return
    }

    // 设置token
    console.log('[PanelX SDK] 成功加载GPF token')
    sdk.auth.setToken(sessionObj.token)

    // 如果有用户名，也保存用户信息
    if (sessionObj.userName) {
      var userInfo = {
        name: sessionObj.userName,
        userName: sessionObj.userName,
      }
      sdk.auth.setUserInfo(userInfo)
    }

    // 再次检查认证状态
    if (!sdk.auth.isAuthenticated()) {
      console.log('[PanelX SDK] 设置token后仍未认证，显示登录对话框')
    } else {
      console.log('[PanelX SDK] GPF token加载成功，用户已认证')
    }
  } catch (error) {
    console.error('[PanelX SDK] 加载GPF token失败:', error)
  }
}

export default {
  isSdkAvailable,
  queryDataSourceList,
  saveDataSource,
  deleteDataSource,
  queryTableList,
  saveTable,
  deleteTable,
  queryDictionaryCategories,
  tryLoadGpfLoginToken
};
