import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Settings, Search, ChevronRight, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PaginationBar } from '@/components/PaginationBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  isSdkAvailable,
  queryTableList,
  queryTableDetail,
  saveTable,
  deleteTable
} from '@/lib/sdk'

// 模拟数据库模式名列表
const mockSchemas = ['public', 'dbo', 'information_schema']

// 模拟数据库表列表（更多表用于分页）
const mockTables = [
  { name: 'users', comment: '用户表', schema: 'public' },
  { name: 'orders', comment: '订单表', schema: 'public' },
  { name: 'products', comment: '产品表', schema: 'public' },
  { name: 'categories', comment: '分类表', schema: 'public' },
  { name: 'bap_md_cellconfig', comment: 'DO基类', schema: 'public' },
  { name: 'bap_md_java_cjavavirtualcodedo', comment: '虚拟工程源码', schema: 'public' },
  { name: 'bap_md_yun_artifactdefine', comment: 'DO基类', schema: 'public' },
  { name: 'bap_md_yun_globaldepenssetting', comment: '全局依赖设置', schema: 'public' },
  { name: 'cdimension', comment: '维度基类', schema: 'public' },
  { name: 'cdo_attach', comment: '附件', schema: 'public' },
  { name: 'cdo_authorize', comment: '权限验免', schema: 'public' },
  { name: 'cdo_basic', comment: 'DO基类', schema: 'public' },
  { name: 'cdo_domain', comment: 'DO基类', schema: 'public' },
  { name: 'cdo_enum', comment: 'DO基类', schema: 'public' },
]

// 模拟表字段
const getDefaultFields = () => [
  { name: 'id', type: 'BIGINT', length: 20, precision: 0, comment: 'ID' },
  { name: 'name', type: 'VARCHAR', length: 100, precision: 0, comment: '名称' },
  { name: 'created_at', type: 'DATETIME', length: 0, precision: 0, comment: '创建时间' },
]

const mockTableFields = {
  users: [
    { name: 'id', type: 'BIGINT', length: 20, precision: 0, comment: '用户ID' },
    { name: 'username', type: 'VARCHAR', length: 50, precision: 0, comment: '用户名' },
    { name: 'email', type: 'VARCHAR', length: 100, precision: 0, comment: '邮箱' },
    { name: 'created_at', type: 'DATETIME', length: 0, precision: 0, comment: '创建时间' },
  ],
  orders: [
    { name: 'id', type: 'BIGINT', length: 20, precision: 0, comment: '订单ID' },
    { name: 'user_id', type: 'BIGINT', length: 20, precision: 0, comment: '用户ID' },
    { name: 'total_amount', type: 'DECIMAL', length: 10, precision: 2, comment: '总金额' },
    { name: 'status', type: 'VARCHAR', length: 20, precision: 0, comment: '订单状态' },
    { name: 'order_date', type: 'DATETIME', length: 0, precision: 0, comment: '订单日期' },
  ],
  products: [
    { name: 'id', type: 'BIGINT', length: 20, precision: 0, comment: '产品ID' },
    { name: 'name', type: 'VARCHAR', length: 100, precision: 0, comment: '产品名称' },
    { name: 'price', type: 'DECIMAL', length: 10, precision: 2, comment: '价格' },
    { name: 'stock', type: 'INT', length: 11, precision: 0, comment: '库存' },
  ],
  categories: [
    { name: 'id', type: 'BIGINT', length: 20, precision: 0, comment: '分类ID' },
    { name: 'name', type: 'VARCHAR', length: 50, precision: 0, comment: '分类名称' },
    { name: 'parent_id', type: 'BIGINT', length: 20, precision: 0, comment: '父分类ID' },
  ],
}

const TYPE_OPTIONS = [
  { value: '文本', label: '文本' },
  { value: '日期', label: '日期' },
  { value: '数值', label: '数值' }
]

const TYPE_MAP = {
  文本: ['CHAR', 'NCHAR', 'VARCHAR', 'VARCHAR2', 'NVARCHAR', 'NVARCHAR2', 'TEXT', 'CLOB', 'STRING', 'LONGTEXT', 'MEDIUMTEXT'],
  日期: ['DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR'],
  数值: ['NUMBER', 'NUMERIC', 'DECIMAL', 'BIGINT', 'INT', 'INTEGER', 'SMALLINT', 'TINYINT', 'DOUBLE', 'FLOAT', 'REAL', 'MONEY']
}

const normalizeDbType = (dbType) => {
  const raw = String(dbType || '').toUpperCase()
  const base = raw.replace(/\(.*/, '')

  if (TYPE_MAP.日期.some(t => base.includes(t))) return '日期'
  if (TYPE_MAP.数值.some(t => base.includes(t))) return '数值'
  return '文本'
}

const normalizeFieldCategory = (fieldType) => {
  if (fieldType === '维度' || fieldType === '度量' || fieldType === '属性') {
    return fieldType
  }
  return '属性'
}

const withFieldDefaults = (field = {}) => {
  const normalizedType = TYPE_OPTIONS.some(opt => opt.value === field.type) ? field.type : normalizeDbType(field.type)
  const normalizedCategory = normalizeFieldCategory(field.fieldType)

  return {
    ...field,
    type: normalizedType,
    fieldType: normalizedCategory,
    category: normalizedCategory === '维度' ? (field.category || '') : '',
    dateFormat: normalizedType === '日期' ? (field.dateFormat || 'yyyyMMdd') : '',
    dateFormat: normalizedType === '日期' ? (field.dateFormat || 'yyyyMMdd') : '',
    selected: false // 默认为 false，用作 UI 交互选择（批量删除等）
  }
}

export function TableManagement({ selectedSource, tables, setTables, dataSources }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 表管理页面的筛选条件
  const [searchInput, setSearchInput] = useState('') // 搜索框输入值

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)

  // 左侧表列表状态
  const [selectedSchema, setSelectedSchema] = useState('public')
  const [tableSearchText, setTableSearchText] = useState('')
  const [selectedTableName, setSelectedTableName] = useState(null)

  // 从 SDK 获取的数据
  const [schemas, setSchemas] = useState([])
  const [tablesFromDb, setTablesFromDb] = useState([])
  const [loadingSchemas, setLoadingSchemas] = useState(false)
  const [loadingDbTables, setLoadingDbTables] = useState(false)

  // 右侧字段列表状态
  const [tableFields, setTableFields] = useState([])
  const [formData, setFormData] = useState({ chineseName: '', description: '' })
  const [editingTable, setEditingTable] = useState(null)
  const [categoryOptions, setCategoryOptions] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  // 用 useRef 记录当前数据源ID，防止重复加载
  const lastLoadedSourceIdRef = React.useRef(null)

  // 加载表列表
  // 加载表列表
  const loadTables = async () => {
    if (!selectedSource) return

    setLoading(true)
    try {
      if (isSdkAvailable()) {
        // 使用 dsCode 和 keyword 进行过滤查询
        const keyword = searchInput.trim()
        console.log('[TableManagement] 搜索关键词:', keyword, '是否为空:', !keyword)
        const result = await queryTableList(
          selectedSource.id,
          keyword || null,
          currentPage,
          pageSize
        )
        setTables(result.list || [])
        setTotalItems(result.totalSize || 0)
        console.log('[TableManagement] 从 SDK 加载表列表:', result.list)
      }
    } catch (error) {
      console.error('[TableManagement] 加载表列表失败:', error)
      alert('加载表列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadDictionaryCategories = useCallback(async () => {
    if (!isSdkAvailable()) {
      setCategoryOptions([])
      return
    }

    setLoadingCategories(true)
    try {
      const sdk = window.panelxSdk
      const params = {
        panelCode: 'IML_00011',
        buttonName: '查询码值类型',
        buttonParam: {
          configName: '数据字典类别表'
        }
      }

      const result = await sdk.api.callButton(params)
      console.log('[TableManagement] 查询数据字典类别结果:', result)

      if (result && result.data && result.data.right) {
        // right 是二维数组，每个元素是 [type_id, type_name]
        // 第一个字段作为 value，第二个字段作为 label
        const list = result.data.right.map(row => ({
          value: row[0] ? String(row[0]) : '',
          label: row[1] ? String(row[1]) : row[0]
        })).filter(item => item.value)

        setCategoryOptions(list)
      } else {
        setCategoryOptions([])
      }
    } catch (error) {
      console.error('[TableManagement] 加载数据字典类别失败:', error)
      setCategoryOptions([])
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  // 选择数据源变化或 SDK 登录成功后加载数据
  useEffect(() => {
    const handleSdkLoggedIn = () => {
      if (selectedSource && lastLoadedSourceIdRef.current !== selectedSource.id) {
        lastLoadedSourceIdRef.current = selectedSource.id
        loadTables()
      }
    }

    // 如果已经登录且数据源变化，加载
    if (window.sdkLoggedIn && selectedSource) {
      if (lastLoadedSourceIdRef.current !== selectedSource.id) {
        lastLoadedSourceIdRef.current = selectedSource.id
        loadTables()
      }
    }

    // 监听 SDK 登录成功事件
    window.addEventListener('sdkLoggedIn', handleSdkLoggedIn)
    return () => {
      window.removeEventListener('sdkLoggedIn', handleSdkLoggedIn)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource?.id])

  // 从 SDK 获取模式名列表
  const loadSchemas = async () => {
    if (!selectedSource || !isSdkAvailable()) return

    setLoadingSchemas(true)
    try {
      const sdk = window.panelxSdk
      const params = {
        panelCode: 'IML_00009',
        buttonName: '获取sql结果',
        buttonParam: {
          dstype: selectedSource.type || 'postgres',
          name: '模式sql',
          dsname: selectedSource.name,
          regexMap: {}
        }
      }

      const result = await sdk.api.callButton(params)
      console.log('[TableManagement] 获取schema列表:', result)

      if (result && result.data && result.data.right) {
        // right 是二维数组，每个元素是 [schema_name]
        const schemaList = result.data.right.map(row => row[0])
        setSchemas(schemaList)
        if (schemaList.length > 0 && !schemaList.includes(selectedSchema)) {
          setSelectedSchema(schemaList[0])
        }
      }
    } catch (error) {
      console.error('[TableManagement] 获取schema列表失败:', error)
    } finally {
      setLoadingSchemas(false)
    }
  }

  // 从 SDK 获取表名列表
  const loadTablesFromDb = async (schemaName) => {
    if (!selectedSource || !isSdkAvailable() || !schemaName) return

    setLoadingDbTables(true)
    try {
      const sdk = window.panelxSdk
      const params = {
        panelCode: 'IML_00009',
        buttonName: '获取sql结果',
        buttonParam: {
          dstype: selectedSource.type || 'postgres',
          name: '表sql',
          dsname: selectedSource.name,
          regexMap: { '$scheme_name$': schemaName }
        }
      }

      const result = await sdk.api.callButton(params)
      console.log('[TableManagement] 获取表列表:', result)

      if (result && result.data && result.data.right) {
        // right 是二维数组，每个元素是 [table_name]
        const tableList = result.data.right.map(row => ({
          name: row[0],
          comment: '',
          schema: schemaName
        }))
        setTablesFromDb(tableList)
      }
    } catch (error) {
      console.error('[TableManagement] 获取表列表失败:', error)
    } finally {
      setLoadingDbTables(false)
    }
  }

  const handleOpenAddDialog = async () => {
    if (!selectedSource) {
      alert('请先选择数据源')
      return
    }
    // 重置状态
    setSelectedSchema('public')
    setTableSearchText('')
    setCurrentPage(1)
    setSelectedTableName(null)
    setTableFields([])
    setFormData({ chineseName: '', description: '' })
    setSchemas([])
    setTablesFromDb([])
    // 延迟打开对话框
    setTimeout(() => setIsAddDialogOpen(true), 0)
    // 加载 schema 列表
    await loadSchemas()
  }

  // 当 selectedSchema 变化时，加载对应的表列表
  useEffect(() => {
    if (isAddDialogOpen && selectedSchema) {
      loadTablesFromDb(selectedSchema)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchema, isAddDialogOpen])

  useEffect(() => {
    if (isDetailDialogOpen) {
      loadDictionaryCategories()
    }
  }, [isDetailDialogOpen, loadDictionaryCategories])

  // 过滤和分页表列表
  const filteredTables = tablesFromDb.filter(table =>
    table.name.toLowerCase().includes(tableSearchText.toLowerCase()) ||
    table.comment.toLowerCase().includes(tableSearchText.toLowerCase())
  )

  const totalPages = Math.ceil(filteredTables.length / pageSize)
  const paginatedTables = filteredTables.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // 选择表时打开表结构对话框
  const handleSelectTableRow = async (tableName) => {
    const tableInfo = tablesFromDb.find(t => t.name === tableName)

    // 先设置基本信息并打开对话框
    setEditingTable({
      tableName: tableName,
      chineseName: tableInfo?.comment || '',
      description: '',
      schema: selectedSchema,
      fields: []
    })
    setLoadingDetail(true)
    setTimeout(() => setIsDetailDialogOpen(true), 0)

    // 调用SDK获取表结构
    if (isSdkAvailable()) {
      try {
        const sdk = window.panelxSdk
        const params = {
          panelCode: 'OctoCM_BDYTH_IML_00009',
          buttonName: '获取sql结果',
          buttonParam: {
            dstype: selectedSource.type || 'postgresql',
            name: '表结构sql',
            dsname: selectedSource.name,
            regexMap: {
              '$table_name$': tableName,
              '$schema_name$': selectedSchema
            }
          }
        }

        const result = await sdk.api.callButton(params)
        console.log('[TableManagement] 获取表结构:', result)

        if (result && result.data && result.data.left && result.data.right) {
          // 根据 left 中的字段名建立索引映射
          const fieldIndexMap = {}
          result.data.left.forEach((field, index) => {
            fieldIndexMap[field.name] = index
          })

          console.log('[TableManagement] 字段索引映射:', fieldIndexMap)

          // 解析表结构数据
          const fields = result.data.right.map(row => {
            // 根据 left 中的字段名获取对应的值
            const fieldName = fieldIndexMap['字段名'] !== undefined ? row[fieldIndexMap['字段名']] : ''
            const type = fieldIndexMap['类型'] !== undefined ? row[fieldIndexMap['类型']] : ''
            const length = fieldIndexMap['长度'] !== undefined ? row[fieldIndexMap['长度']] : ''
            const precision = fieldIndexMap['精度'] !== undefined ? row[fieldIndexMap['精度']] : ''
            const comment = fieldIndexMap['字段中文名'] !== undefined ? row[fieldIndexMap['字段中文名']] : ''

            const normalizedType = normalizeDbType(type)

            return {
              name: fieldName || '',
              type: normalizedType,
              // 如果值为 -1 或 '-1'，则设为空字符串
              length: (length === -1 || length === '-1') ? '' : (length || ''),
              precision: (precision === -1 || precision === '-1') ? '' : (precision || ''),
              comment: comment || '',
              fieldType: '属性',
              category: '',
              dateFormat: normalizedType === '日期' ? 'yyyyMMdd' : '',
              selected: true
            }
          })

          setEditingTable(prev => ({
            ...prev,
            fields: fields.map(withFieldDefaults)
          }))
        }
      } catch (error) {
        console.error('[TableManagement] 获取表结构失败:', error)
        alert('获取表结构失败: ' + error.message)
      } finally {
        setLoadingDetail(false)
      }
    } else {
      // SDK不可用时使用默认字段
      const fields = getDefaultFields()
      setEditingTable(prev => ({
        ...prev,
        fields: fields.map(f => ({
          ...f,
          type: normalizeDbType(f.type),
          fieldType: '属性',
          category: '',
          dateFormat: normalizeDbType(f.type) === '日期' ? 'yyyyMMdd' : '',
          selected: true
        }))
      }))
      setLoadingDetail(false)
    }
  }

  // 切换字段选择状态
  const toggleFieldSelection = (fieldName) => {
    setTableFields(prev =>
      prev.map(f => f.name === fieldName ? { ...f, selected: !f.selected } : f)
    )
  }

  // 更新字段类型
  const updateFieldType = (fieldName, fieldType) => {
    setTableFields(prev =>
      prev.map(f => f.name === fieldName ? { ...f, fieldType } : f)
    )
  }

  // 更新详情对话框中的字段选择状态
  const updateDetailFieldSelection = (fieldIndex) => {
    setEditingTable(prev => ({
      ...prev,
      fields: prev.fields.map((f, index) =>
        index === fieldIndex ? { ...f, selected: !f.selected } : f
      )
    }))
  }

  // 更新详情对话框中的字段分类
  const updateDetailFieldType = (fieldIndex, fieldType) => {
    setEditingTable(prev => ({
      ...prev,
      fields: prev.fields.map((f, index) => {
        if (index !== fieldIndex) return f
        const normalized = normalizeFieldCategory(fieldType)
        return {
          ...f,
          fieldType: normalized,
          category: normalized === '维度' ? f.category : ''
        }
      })
    }))
  }

  const updateDetailFieldDataType = (fieldIndex, type) => {
    setEditingTable(prev => ({
      ...prev,
      fields: prev.fields.map((f, index) => {
        if (index !== fieldIndex) return f
        const isDate = type === '日期'
        return {
          ...f,
          type,
          dateFormat: isDate ? (f.dateFormat || 'yyyyMMdd') : ''
        }
      })
    }))
  }

  const updateDetailFieldCategory = (fieldIndex, category) => {
    setEditingTable(prev => ({
      ...prev,
      fields: prev.fields.map((f, index) =>
        index === fieldIndex ? { ...f, category } : f
      )
    }))
  }

  // 切换详情对话框中所有字段的全选/取消全选
  const toggleSelectAllFields = () => {
    setEditingTable(prev => {
      if (!prev || !prev.fields) return prev
      const allSelected = prev.fields.length > 0 && prev.fields.every(f => f.selected)
      return {
        ...prev,
        fields: prev.fields.map(f => ({ ...f, selected: !allSelected }))
      }
    })
  }

  // 确定添加表
  const handleConfirmAddTable = () => {
    if (!selectedTableName) {
      alert('请选择一个表')
      return
    }

    const selectedFields = tableFields.filter(f => f.selected)
    if (selectedFields.length === 0) {
      alert('请至少选择一个字段')
      return
    }

    const tableInfo = mockTables.find(t => t.name === selectedTableName)
    const newTable = {
      id: Date.now(),
      tableName: selectedTableName,
      chineseName: formData.chineseName || tableInfo?.comment || '',
      description: formData.description || '',
      dsCode: selectedSource.id,
      schema: selectedSchema,
      fields: selectedFields
    }

    setTables([...tables, newTable])
    setIsAddDialogOpen(false)
  }

  // 加载状态用于详情对话框
  const [loadingDetail, setLoadingDetail] = useState(false)

  const handleOpenDetailDialog = async (table) => {
    // 先设置基本信息并打开对话框
    setEditingTable({
      ...table,
      fields: (table.fields || []).map(withFieldDefaults)
    })
    setLoadingDetail(true)
    setTimeout(() => setIsDetailDialogOpen(true), 0)

    // 使用 SDK 获取完整详情
    if (isSdkAvailable() && table.id) {
      try {
        const detail = await queryTableDetail(table.id)
        if (detail) {
          setEditingTable({
            ...detail,
            fields: (detail.fields || []).map(withFieldDefaults)
          })
          console.log('[TableManagement] 从 SDK 加载表详情:', detail)
        }
      } catch (error) {
        console.error('[TableManagement] 加载表详情失败:', error)
        // 失败时保持使用列表中的数据
      } finally {
        setLoadingDetail(false)
      }
    } else {
      setLoadingDetail(false)
    }
  }

  // 删除表
  const handleDeleteTable = async (tableId, e) => {
    e.stopPropagation()
    if (confirm('确定删除该表吗？')) {
      try {
        if (isSdkAvailable()) {
          await deleteTable(tableId)
          // 重新加载列表
          await loadTables()
        } else {
          setTables(tables.filter(t => t.id !== tableId))
        }
      } catch (error) {
        console.error('[TableManagement] 删除失败:', error)
        alert('删除失败: ' + error.message)
      }
    }
  }

  const handleSaveTableDetail = async () => {
    if (!editingTable) return

    const selectedFields = editingTable.fields
      .map(withFieldDefaults)
    if (selectedFields.length === 0) {
      alert('请至少选择一个字段')
      return
    }

    console.log('[TableManagement] 保存前的字段数据:', selectedFields)

    setSaving(true)
    try {
      // 构建保存数据
      const tableData = {
        schema: editingTable.schema,
        tableName: editingTable.tableName,
        chineseName: editingTable.chineseName,
        description: editingTable.description,
        dsCode: selectedSource.id,
        fields: selectedFields
      }

      console.log('[TableManagement] 准备保存的表数据:', tableData)

      // 如果有 id，说明是更新操作
      if (editingTable.id) {
        tableData.id = editingTable.id
      }

      // 调用 SDK 保存
      if (isSdkAvailable()) {
        await saveTable(tableData)
        // 重新加载列表
        await loadTables()
      } else {
        // SDK 不可用时使用本地状态
        if (editingTable.id) {
          setTables(tables.map(t =>
            t.id === editingTable.id
              ? { ...tableData, id: editingTable.id }
              : t
          ))
        } else {
          setTables([...tables, { ...tableData, id: Date.now() }])
        }
      }

      // 延迟关闭对话框
      setTimeout(() => {
        setIsDetailDialogOpen(false)
        setIsAddDialogOpen(false)
      }, 200)
    } catch (error) {
      console.error('[TableManagement] 保存失败:', error)
      alert('保存失败: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!selectedSource) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        请先选择左侧的数据源
      </div>
    )
  }

  // 处理搜索 - 只在按下 Enter 时触发
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      loadTables()
    }
  }

  const currentTables = tables.filter(t => t.dsCode === selectedSource.id)

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-end gap-2">
          {/* 表名搜索框 */}
          <div className="relative w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索表名（按Enter搜索）"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9"
            />
          </div>
          {/* 刷新按钮 */}
          <Button variant="outline" size="sm" onClick={loadTables} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          {/* 添加按钮 */}
          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && currentTables.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            加载中...
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模式名</TableHead>
              <TableHead>表名</TableHead>
              <TableHead>中文名</TableHead>
              <TableHead>描述</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTables.map((table) => (
              <TableRow
                key={table.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleOpenDetailDialog(table)}
              >
                <TableCell className="text-sm text-muted-foreground">{table.schema}</TableCell>
                <TableCell className="font-mono">{table.tableName}</TableCell>
                <TableCell>{table.chineseName}</TableCell>
                <TableCell>{table.description}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => handleDeleteTable(table.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {currentTables.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  暂无表数据,点击右上角添加表按钮
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页栏 */}
      <PaginationBar
        totalSize={totalItems}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(parseInt(newSize))
          setCurrentPage(1)
        }}
      />

      {/* 添加表对话框 - 单列表格布局 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[700px] h-[600px] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>选择表数据</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 px-6">
            {/* 筛选区域 */}
            <div className="pb-3 space-y-3 flex-shrink-0">
              {/* 模式名选择 */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">模式名</Label>
                <Select
                  value={selectedSchema}
                  onValueChange={(value) => {
                    setSelectedSchema(value)
                    setCurrentPage(1)
                  }}
                  disabled={loadingSchemas}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schemas.length > 0 ? (
                      schemas.map(schema => (
                        <SelectItem key={schema} value={schema}>
                          {schema}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="public">public</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索"
                  value={tableSearchText}
                  onChange={(e) => {
                    setTableSearchText(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* 表列表 - 固定高度可滚动 */}
            <div className="flex-1 overflow-auto border rounded-md min-h-0">
              {loadingDbTables ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <Table className="w-full">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>表名</TableHead>
                      <TableHead>中文名</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTables.map((table) => (
                      <TableRow
                        key={table.name}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectTableRow(table.name)}
                      >
                        <TableCell className="font-mono text-sm">{table.name}</TableCell>
                        <TableCell className="text-sm">{table.comment}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* 分页 */}
            <div className="py-3 flex items-center justify-between text-sm flex-shrink-0">
              <div className="text-muted-foreground">
                共{filteredTables.length}条
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>
                <span className="text-muted-foreground">
                  {currentPage} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  下一页
                </Button>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50条/页</SelectItem>
                    <SelectItem value="100">100条/页</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 表结构对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>字段信息数据网格</DialogTitle>
            <DialogDescription>
              配置表的基本信息和字段属性
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 px-4 overflow-hidden">
            {loadingDetail && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                加载中...
              </div>
            )}
            {editingTable && !loadingDetail && (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>模式名</Label>
                    <Input value={editingTable.schema} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>表名</Label>
                    <Input value={editingTable.tableName} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>中文名</Label>
                    <Input
                      value={editingTable.chineseName}
                      onChange={(e) => setEditingTable({ ...editingTable, chineseName: e.target.value })}
                      placeholder="输入表的中文名称"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>描述</Label>
                  <Input
                    value={editingTable.description}
                    onChange={(e) => setEditingTable({ ...editingTable, description: e.target.value })}
                    placeholder="输入表的描述信息"
                  />
                </div>

                <div className="flex-1 flex flex-col min-h-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>表结构</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (!editingTable || !editingTable.fields) return
                          const newFields = editingTable.fields.filter(f => !f.selected)
                          setEditingTable({ ...editingTable, fields: newFields })
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除选中
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          const newField = {
                            name: '',
                            type: '文本',
                            length: '',
                            precision: '',
                            comment: '',
                            fieldType: '属性',
                            category: '',
                            dateFormat: '',
                            selected: false,
                            isNew: true
                          }
                          setEditingTable({
                            ...editingTable,
                            fields: [...(editingTable.fields || []), newField]
                          })
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        添加字段
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 border rounded-md overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-[30px] p-2">
                            <Checkbox
                              checked={editingTable?.fields?.every(f => f.selected) || false}
                              onCheckedChange={toggleSelectAllFields}
                            />
                          </TableHead>
                          <TableHead className="p-2">字段名</TableHead>
                          <TableHead className="w-[110px] p-2">类型</TableHead>
                          <TableHead className="w-[140px] p-2">日期格式</TableHead>
                          <TableHead className="p-2">字段中文名</TableHead>
                          <TableHead className="w-[110px] p-2">字段分类</TableHead>
                          <TableHead className="w-[110px] p-2">类别</TableHead>

                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editingTable?.fields?.map((field, index) => (
                          <TableRow key={`${editingTable.tableName}-${field.name}-${index}`}>
                            <TableCell className="p-2">
                              <Checkbox
                                checked={field.selected || false}
                                onCheckedChange={() => updateDetailFieldSelection(index)}
                              />
                            </TableCell>
                            <TableCell className="font-mono p-2">
                              <Input
                                value={field.name}
                                onChange={(e) => {
                                  const newFields = [...editingTable.fields]
                                  newFields[index] = { ...newFields[index], name: e.target.value }
                                  setEditingTable({ ...editingTable, fields: newFields })
                                }}
                                className="h-8"
                                placeholder="字段名"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Select
                                value={field.type || '文本'}
                                onValueChange={(value) => updateDetailFieldDataType(index, value)}
                                disabled={!field.selected}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TYPE_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            <TableCell className="p-2">
                              <Input
                                value={field.dateFormat || ''}
                                onChange={(e) => {
                                  const newFields = [...editingTable.fields]
                                  newFields[index] = { ...newFields[index], dateFormat: e.target.value }
                                  setEditingTable({ ...editingTable, fields: newFields })
                                }}
                                className="h-8 w-32"
                                placeholder="yyyyMMdd"
                                disabled={!field.selected || field.type !== '日期'}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input
                                value={field.comment}
                                onChange={(e) => {
                                  const newFields = [...editingTable.fields]
                                  newFields[index] = { ...newFields[index], comment: e.target.value }
                                  setEditingTable({ ...editingTable, fields: newFields })
                                }}
                                className="h-8"
                                placeholder="字段中文名"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Select
                                value={field.fieldType || '属性'}
                                onValueChange={(value) => updateDetailFieldType(index, value)}
                                disabled={!field.selected}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="度量">度量</SelectItem>
                                  <SelectItem value="维度">维度</SelectItem>
                                  <SelectItem value="属性">属性</SelectItem>
                                  {/* <SelectItem value="指标编号">指标编号</SelectItem>
                                  <SelectItem value="指标名称">指标名称</SelectItem> */}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2">
                              <Select
                                value={field.category || ''}
                                onValueChange={(value) => updateDetailFieldCategory(index, value)}
                                disabled={!field.selected || field.fieldType !== '维度' || loadingCategories}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder={loadingCategories ? '加载中...' : '选择类别'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {loadingCategories && (
                                    <SelectItem value="__loading" disabled>
                                      加载中...
                                    </SelectItem>
                                  )}
                                  {!loadingCategories && categoryOptions.length === 0 && (
                                    <SelectItem value="__none" disabled>
                                      暂无类别数据
                                    </SelectItem>
                                  )}
                                  {!loadingCategories && categoryOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                          </TableRow>
                        )) || []}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t">
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)} disabled={saving || loadingDetail}>
              取消
            </Button>
            <Button onClick={handleSaveTableDetail} disabled={saving || loadingDetail}>
              {saving ? '保存中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
