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

// 获取配置
const getConfig = () => {
  return window.SDK_CONFIG || {
    dataSourcePanelCode: 'OctoCM_BDYTH_IML_00005',
    tablePanelCode: 'OctoCM_BDYTH_IML_00003'
  };
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
export const queryDataSourceList = async (pageNo = 1, pageSize = 100) => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，返回空列表');
    return { list: [], totalSize: 0 };
  }

  try {
    const config = getConfig();
    const params = {
      panelCode: config.dataSourcePanelCode,
      condition: {},
      pageNo,
      pageSize
    };

    const result = await sdk.api.queryFormDataList(params);
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
// 属性：模式名, 表名, 中文名, 描述, 表结构
// 表结构属性：字段名, 类型, 长度, 精度, 字段中文名, 字段分类

/**
 * 查询表列表
 * @param {string} dataSourceId - 数据源ID（可选，用于筛选）
 * @param {string} dataSourceName - 数据源名称（可选，用于筛选）
 */
export const queryTableList = async (dataSourceId = null, dataSourceName = null, pageNo = 1, pageSize = 100) => {
  const sdk = getSdk();
  if (!sdk) {
    console.warn('[SDK] SDK 不可用，返回空列表');
    return { list: [], totalSize: 0 };
  }

  try {
    const config = getConfig();
    const condition = {};
    // 如果有数据源名称，加入筛选条件
    if (dataSourceName) {
      condition['数据源名称'] = dataSourceName;
    }

    const params = {
      panelCode: config.tablePanelCode,
      condition,
      pageNo,
      pageSize
    };

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
        dataSourceId: item['数据源编号'] || dataSourceId,
        dataSourceName: item['数据源名称'] || '',
        fields: parseTableStructure(item['表结构'])
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
  if (Array.isArray(tableStructure)) {
    return tableStructure.map(field => ({
      name: field['字段名'] || '',
      type: field['类型'] || '',
      length: field['长度'] || '',
      precision: field['精度'] || '',
      comment: field['字段中文名'] || '',
      fieldType: field['字段分类'] || '普通',
      selected: true
    }));
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
        dataSourceId: item['数据源编号'] || '',
        dataSourceName: item['数据源名称'] || '',
        fields: parseTableStructure(item['表结构'])
      };
    }
    return null;
  } catch (error) {
    console.error('[SDK] 查询表详情失败:', error);
    throw error;
  }
};

/**
 * 构建表结构数据
 */
const buildTableStructure = (fields) => {
  if (!fields || !Array.isArray(fields)) return [];
  return fields
    .filter(f => f.selected !== false)
    .map(field => ({
      '字段名': field.name || '',
      '类型': field.type || '',
      '长度': String(field.length || ''),
      '精度': String(field.precision || ''),
      '字段中文名': field.comment || '',
      '字段分类': field.fieldType || '普通'
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
      '数据源名称': table.dataSourceName || '',
      '表结构': tableStructureArray,
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
  deleteTable
};
