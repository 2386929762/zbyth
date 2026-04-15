import * as Icons from 'lucide-react'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Trash2, ArrowUp, ArrowDown, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PaginationBar } from '@/components/PaginationBar'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  isSdkAvailable,
  queryDataSourceList,
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
  type DataSource,
  type TableInfo,
  type TableField,
  type DbTableInfo,
  type CategoryOption,
} from '@/lib/sdk'
import { useToast } from "@/hooks/use-toast"
import { SourceTableSelector } from '@/components/SourceTableSelector'
import { DataSupplementList } from '@/components/DataSupplementList'

// Suppress unused import warnings for components used in JSX
void Tooltip
void TooltipContent
void TooltipProvider
void TooltipTrigger

const TYPE_OPTIONS = [
  { value: '文本', label: '文本' },
  { value: '日期', label: '日期' },
  { value: '数值', label: '数值' }
]

const withFieldDefaults = (field: Partial<TableField> = {}): TableField => {
  const normalizedType = TYPE_OPTIONS.some(opt => opt.value === field.type) ? field.type! : normalizeDbType(field.type)
  const normalizedCategory = normalizeFieldCategory(field.fieldType || '属性')

  return {
    name: field.name || '',
    type: normalizedType,
    length: field.length || '',
    precision: field.precision || '',
    comment: field.comment || '',
    fieldType: normalizedCategory,
    category: normalizedCategory === '维度' ? (field.category || '') : '',
    dateFormat: normalizedType === '日期' ? (field.dateFormat || 'yyyyMMdd') : '',
    selected: false,
    primaryKey: field.primaryKey || false,
    sortDirection: field.sortDirection || 'asc',
    isDefault: field.isDefault,
    isNew: field.isNew,
  }
}

interface TableManagementProps {
  selectedSource: DataSource
  tables: TableInfo[]
  setTables: (tables: TableInfo[]) => void
}

export function TableManagement({ selectedSource, tables, setTables }: TableManagementProps) {
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 表管理页面的筛选条件
  const [searchInput, setSearchInput] = useState('')

  // 分页状态（主列表）
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)

  // 切换按钮状态：'dataset' 或 'supplement'
  const [contentTab, setContentTab] = useState('dataset')

  // 数据补录表相关状态
  const [supplementTables, setSupplementTables] = useState<TableInfo[]>([])
  const [supplementSearchInput, setSupplementSearchInput] = useState('')
  const [supplementCurrentPage, setSupplementCurrentPage] = useState(1)
  const [supplementPageSize, setSupplementPageSize] = useState(50)
  const [isAddSupplementDialogOpen, setIsAddSupplementDialogOpen] = useState(false)
  const [editingSupplementTable, setEditingSupplementTable] = useState<TableInfo | null>(null)
  const [supplementSaving, setSupplementSaving] = useState(false)
  const [supplementTableReadOnly, setSupplementTableReadOnly] = useState(false)
  const [isSupplementSourceSelectorOpen, setIsSupplementSourceSelectorOpen] = useState(false)
  const [supplementFromSource, setSupplementFromSource] = useState(false)
  const [loadingSupplementFields, setLoadingSupplementFields] = useState(false)

  // 左侧表列表状态
  const [selectedSchema, setSelectedSchema] = useState('')

  // 从 SDK 获取的数据
  const [schemas, setSchemas] = useState<string[]>([])
  const [loadingSchemas, setLoadingSchemas] = useState(false)

  // 右侧字段列表状态
  const [editingTable, setEditingTable] = useState<TableInfo | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])

  const [loadingCategories, setLoadingCategories] = useState(false)
  const [activeTab, setActiveTab] = useState('structure')
  const [sqlContent, setSqlContent] = useState('')
  const [finalSqlContent, setFinalSqlContent] = useState('')

  // 参数提取相关状态
  const [isParamDialogOpen, setIsParamDialogOpen] = useState(false)
  const [detectedParams, setDetectedParams] = useState<string[]>([])
  const [paramValues, setParamValues] = useState<Record<string, string>>({})
  const [cachedParamValues, setCachedParamValues] = useState<Record<string, string>>({})

  // 用 useRef 记录当前数据源ID，防止重复加载
  const lastLoadedSourceIdRef = React.useRef<string | number | null>(null)

  // 加载表列表
  const loadTables = async () => {
    if (!selectedSource) return

    setLoading(true)
    try {
      if (isSdkAvailable()) {
        const keyword = searchInput.trim()
        // console.log('[TableManagement] 搜索关键词:', keyword, '是否为空:', !keyword)
        const result = await queryTableList(
          selectedSource.id!,
          keyword || null,
          currentPage,
          pageSize
        )
        setTables(result.list || [])
        setTotalItems(result.totalSize || 0)
        // console.log('[TableManagement] 从 SDK 加载表列表:', result.list)
      }
    } catch (error) {
      console.error('[TableManagement] 加载表列表失败:', error)
      toast({
        variant: "destructive",
        title: "加载失败",
        description: (error as Error).message
      })
    } finally {
      setLoading(false)
    }
  }

  // 加载数据补录表列表
  const loadSupplementTables = async () => {
    if (!selectedSource) return

    setLoading(true)
    try {
      if (isSdkAvailable()) {
        const keyword = supplementSearchInput.trim()
        // console.log('[TableManagement] 补录表搜索关键词:', keyword, '是否为空:', !keyword)
        const result = await querySupplementTableList(
          selectedSource.id!,
          keyword || null,
          supplementCurrentPage,
          supplementPageSize
        )
        setSupplementTables(result.list || [])
        // console.log('[TableManagement] 从 SDK 加载数据补录表列表:', result.list)
      }
    } catch (error) {
      console.error('[TableManagement] 加载数据补录表列表失败:', error)
      toast({
        variant: "destructive",
        title: "加载失败",
        description: (error as Error).message
      })
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
      const list = await queryDictionaryCategories()
      setCategoryOptions(list)
    } catch (error) {
      console.error('[TableManagement] 加载数据字典类别失败:', error)
      setCategoryOptions([])
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  // 用于跳过数据源切换时由分页 effect 触发的重复加载
  const skipPaginationEffectRef = useRef(false)

  // 选择数据源变化或 SDK 登录成功后加载数据
  useEffect(() => {
    const handleSdkLoggedIn = () => {
      if (selectedSource && lastLoadedSourceIdRef.current !== selectedSource.id) {
        lastLoadedSourceIdRef.current = selectedSource.id!
        skipPaginationEffectRef.current = true
        loadTables()
      }
    }

    if (window.sdkLoggedIn && selectedSource) {
      if (lastLoadedSourceIdRef.current !== selectedSource.id) {
        lastLoadedSourceIdRef.current = selectedSource.id!
        skipPaginationEffectRef.current = true
        loadTables()
      }
    }

    window.addEventListener('sdkLoggedIn', handleSdkLoggedIn)
    return () => {
      window.removeEventListener('sdkLoggedIn', handleSdkLoggedIn)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource?.id])

  // 当分页状态变化时重新加载数据
  useEffect(() => {
    if (skipPaginationEffectRef.current) {
      skipPaginationEffectRef.current = false
      return
    }
    if (selectedSource && window.sdkLoggedIn) {
      loadTables()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize])

  // 用于跳过数据源切换时由分页 effect 触发的重复加载（补录表）
  const skipSupplementPaginationEffectRef = useRef(false)

  // 当补录表分页状态变化时重新加载数据
  useEffect(() => {
    if (skipSupplementPaginationEffectRef.current) {
      skipSupplementPaginationEffectRef.current = false
      return
    }
    if (selectedSource && window.sdkLoggedIn && contentTab === 'supplement') {
      loadSupplementTables()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplementCurrentPage, supplementPageSize, contentTab])

  const handleOpenAddDialog = async () => {
    if (!selectedSource) {
      toast({ variant: "destructive", title: "提示", description: "请先选择数据源" })
      return
    }
    setSelectedSchema('')
    setTimeout(() => setIsAddDialogOpen(true), 0)
  }

  useEffect(() => {
    if (isDetailDialogOpen) {
      loadDictionaryCategories()
    }
  }, [isDetailDialogOpen, loadDictionaryCategories])

  // 加载状态用于详情对话框
  const [loadingDetail, setLoadingDetail] = useState(false)

  // 选择表时打开表结构对话框
  const handleSelectTableRow = async (tableName: string, schemaOverride?: string, tableCommentOverride?: string) => {
    const schema = schemaOverride || selectedSchema
    if (!schema) {
      toast({ variant: "destructive", title: "提示", description: "请先选择模式名" })
      return
    }
    setEditingTable({
      tableName: tableName,
      chineseName: tableCommentOverride || '',
      description: '',
      schema: schema,
      dsCode: selectedSource.id as string,
      fields: []
    })
    setLoadingDetail(true)
    setTimeout(() => setIsDetailDialogOpen(true), 0)

    if (isSdkAvailable()) {
      try {
        const fields = await queryTableStructure(selectedSource, schema, tableName)
        if (fields) {
          setEditingTable(prev => prev ? ({
            ...prev,
            fields: fields.map(withFieldDefaults)
          }) : null)
        }
      } catch (error) {
        console.error('[TableManagement] 获取表结构失败:', error)
        toast({
          variant: "destructive",
          title: "获取表结构失败",
          description: (error as Error).message
        })
      } finally {
        setLoadingDetail(false)
      }
    } else {
      setLoadingDetail(false)
    }
  }

  const updateDetailFieldSelection = (fieldIndex: number) => {
    setEditingTable(prev => prev ? ({
      ...prev,
      fields: prev.fields.map((f, index) =>
        ({ ...f, selected: index === fieldIndex })
      )
    }) : null)
  }

  const updateDetailFieldPrimaryKey = (fieldIndex: number) => {
    setEditingTable(prev => prev ? ({
      ...prev,
      fields: prev.fields.map((f, index) =>
        index === fieldIndex ? { ...f, primaryKey: !f.primaryKey } : f
      )
    }) : null)
  }

  const updateDetailFieldSortDirection = (fieldIndex: number, sortDirection: string) => {
    setEditingTable(prev => prev ? ({
      ...prev,
      fields: prev.fields.map((f, index) =>
        index === fieldIndex ? { ...f, sortDirection } : f
      )
    }) : null)
  }

  const updateDetailFieldType = (fieldIndex: number, fieldType: string) => {
    setEditingTable(prev => prev ? ({
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
    }) : null)
  }

  const updateDetailFieldDataType = (fieldIndex: number, type: string) => {
    setEditingTable(prev => prev ? ({
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
    }) : null)
  }

  const updateDetailFieldCategory = (fieldIndex: number, category: string) => {
    setEditingTable(prev => prev ? ({
      ...prev,
      fields: prev.fields.map((f, index) =>
        index === fieldIndex ? { ...f, category } : f
      )
    }) : null)
  }

  const handleDeleteField = (index: number) => {
    setEditingTable(prev => {
      if (!prev) return null
      const newFields = [...prev.fields]
      newFields.splice(index, 1)
      return { ...prev, fields: newFields }
    })
  }

  const moveFieldsUp = () => {
    if (!editingTable || !editingTable.fields) return
    const newFields = [...editingTable.fields]
    let changed = false
    for (let i = 1; i < newFields.length; i++) {
      if (newFields[i].selected && !newFields[i - 1].selected) {
        [newFields[i], newFields[i - 1]] = [newFields[i - 1], newFields[i]]
        changed = true
      }
    }
    if (changed) {
      setEditingTable({ ...editingTable, fields: newFields })
    }
  }

  const moveFieldsDown = () => {
    if (!editingTable || !editingTable.fields) return
    const newFields = [...editingTable.fields]
    let changed = false
    for (let i = newFields.length - 2; i >= 0; i--) {
      if (newFields[i].selected && !newFields[i + 1].selected) {
        [newFields[i], newFields[i + 1]] = [newFields[i + 1], newFields[i]]
        changed = true
      }
    }
    if (changed) {
      setEditingTable({ ...editingTable, fields: newFields })
    }
  }

  // SQL 执行逻辑
  const executeSql = async (sqlToExecute: string) => {
    if (!sqlToExecute.trim()) {
      toast({ variant: "destructive", title: "提示", description: "SQL 内容为空" })
      return
    }

    if (!isSdkAvailable()) {
      toast({ variant: "destructive", title: "错误", description: "SDK 不可用" })
      return
    }

    try {
      const fields = await getSqlStruct(
        selectedSource.type,
        selectedSource.name,
        sqlToExecute
      )

      if (fields) {
        const currentFields = editingTable?.fields || []
        const currentFieldNames = new Set(currentFields.map(f => f.name))

        const newUniqueFields = fields
          .filter(f => !currentFieldNames.has(f.name))
          .map(withFieldDefaults)

        if (newUniqueFields.length === 0) {
          toast({ title: "提示", description: "没有检测到新增字段" })
        } else {
          toast({ title: "解析成功", description: `已添加 ${newUniqueFields.length} 个新字段` })
          setEditingTable(prev => prev ? ({
            ...prev,
            fields: [...(prev.fields || []), ...newUniqueFields]
          }) : null)
        }
        setActiveTab('structure')
      }
    } catch (error) {
      console.error('[TableManagement] SQL 运行失败:', error)
      toast({
        variant: "destructive",
        title: "运行失败",
        description: (error as Error).message
      })
    }
  }

  const handleRunClick = async () => {
    if (!sqlContent.trim()) {
      toast({ variant: "destructive", title: "提示", description: "请输入 SQL 语句" })
      return
    }

    const paramRegex = /\$([a-zA-Z0-9_\u4e00-\u9fa5]+)\$/g
    const matches = Array.from(sqlContent.matchAll(paramRegex))

    if (matches.length > 0) {
      const uniqueParams = [...new Set(matches.map(m => m[1]))]
      const initialValues: Record<string, string> = {}
      uniqueParams.forEach(p => {
        initialValues[p] = cachedParamValues[p] !== undefined ? cachedParamValues[p] : "0"
      })

      setDetectedParams(uniqueParams)
      setParamValues(initialValues)
      setIsParamDialogOpen(true)
    } else {
      setFinalSqlContent(sqlContent)
      executeSql(sqlContent)
    }
  }

  const handleConfirmParams = () => {
    let finalSql = sqlContent
    detectedParams.forEach(param => {
      const val = paramValues[param] !== undefined ? paramValues[param] : "0"
      finalSql = finalSql.replaceAll(`$${param}$`, val)
    })

    setFinalSqlContent(finalSql)

    setCachedParamValues(prev => ({
      ...prev,
      ...paramValues
    }))

    executeSql(finalSql)
    setIsParamDialogOpen(false)
  }

  const handleConfirmAddTable = (schemaOverride?: string) => {
    const schema = schemaOverride || selectedSchema
    const newTable: TableInfo = {
      tableName: '',
      description: '',
      dsCode: selectedSource.id as string,
      schema: schema,
      chineseName: '',
      fields: [],
      type: 'sql'
    }

    handleOpenDetailDialog(newTable, 'sql')
  }

  const handleOpenDetailDialog = async (table: TableInfo, initialTab = 'structure') => {
    setActiveTab(initialTab)
    setSqlContent('')
    setFinalSqlContent('')
    setCachedParamValues(table.paramMap || {})
    setEditingTable({
      ...table,
      fields: (table.fields || []).map(withFieldDefaults)
    })
    setLoadingDetail(true)
    setTimeout(() => setIsDetailDialogOpen(true), 0)

    if (isSdkAvailable() && table.id) {
      try {
        const detail = await queryTableDetail(table.id)
        if (detail) {
          const detailFields = (detail.fields || []).map(withFieldDefaults);

          setEditingTable({
            ...detail,
            fields: detailFields
          })

          if (detail.type === 'sql') {
            setSqlContent(detail.querySql || '')
            if (detail.paramMap) {
              setCachedParamValues(detail.paramMap)
            }
          }
        }
      } catch (error) {
        console.error('[TableManagement] 加载表详情失败:', error)
      } finally {
        setLoadingDetail(false)
      }
    } else {
      setLoadingDetail(false)
    }
  }

  const handleDeleteTable = async (tableId: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定删除该表吗？')) {
      try {
        if (isSdkAvailable()) {
          await deleteTable(tableId)
          await loadTables()
          toast({ title: "删除成功", description: "表已删除" })
        } else {
          setTables(tables.filter(t => t.id !== tableId))
        }
      } catch (error) {
        console.error('[TableManagement] 删除失败:', error)
        toast({
          variant: "destructive",
          title: "删除失败",
          description: (error as Error).message
        })
      }
    }
  }

  const handleSaveTableDetail = async () => {
    if (!editingTable) return

    if (!editingTable.tableName || !editingTable.tableName.trim()) {
      toast({ variant: "destructive", title: "校验失败", description: "请输入表名" })
      return
    }

    const selectedFields = editingTable.fields.map(withFieldDefaults)
    if (selectedFields.length === 0) {
      toast({ variant: "destructive", title: "校验失败", description: "请至少添加一个字段" })
      return
    }

    const hasPrimaryKey = selectedFields.some(f => f.primaryKey)
    if (!hasPrimaryKey) {
      toast({ variant: "destructive", title: "校验失败", description: "请选择一个字段作为主键" })
      return
    }

    const emptyFieldName = selectedFields.find(f => !f.name || !f.name.trim())
    if (emptyFieldName) {
      toast({ variant: "destructive", title: "校验失败", description: "存在字段名为空的字段，请填写完整后再保存" })
      return
    }

    const invalidDimensionField = selectedFields.find(f => f.fieldType === '维度' && !f.category)
    if (invalidDimensionField) {
      toast({ variant: "destructive", title: "校验失败", description: `字段 "${invalidDimensionField.name}" 分类为"维度"，请选择类别` })
      return
    }

    // console.log('[TableManagement] 保存前的字段数据:', selectedFields)

    setSaving(true)
    try {
      const tableData: TableInfo = {
        schema: editingTable.schema,
        tableName: editingTable.tableName,
        chineseName: editingTable.chineseName,
        description: editingTable.description,
        dsCode: selectedSource.id as string,
        fields: selectedFields,
        type: editingTable.type || 'table',
        querySql: editingTable.type === 'sql' ? sqlContent : '',
        paramMap: cachedParamValues
      }

      // console.log('[TableManagement] 准备保存的表数据:', tableData)

      if (editingTable.id) {
        tableData.id = editingTable.id
      }

      if (isSdkAvailable()) {
        await saveTable(tableData)
        await loadTables()
        toast({ title: "保存成功", description: "表结构已保存" })
      } else {
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

      setTimeout(() => {
        setIsDetailDialogOpen(false)
        setIsAddDialogOpen(false)
      }, 200)
    } catch (error) {
      console.error('[TableManagement] 保存失败:', error)
      toast({
        variant: "destructive",
        title: "保存失败",
        description: (error as Error).message
      })
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

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (contentTab === 'dataset') {
        loadTables()
      } else {
        loadSupplementTables()
      }
    }
  }

  const handleOpenAddSupplementDialog = async () => {
    if (!selectedSource) {
      toast({ variant: "destructive", title: "提示", description: "请先选择数据源" })
      return
    }
    setIsSupplementSourceSelectorOpen(true)
  }

  const handleSupplementSourceTableSelect = async (schema: string, tableName: string, tableComment: string) => {
    if (!schema) {
      toast({ variant: "destructive", title: "提示", description: "请先选择模式名" })
      return
    }
    setIsSupplementSourceSelectorOpen(false)

    const defaultFields: TableField[] = [
      {
        name: 'id',
        type: '文本',
        comment: '主键',
        fieldType: '属性',
        category: '',
        dateFormat: '',
        primaryKey: true,
        sortDirection: 'asc',
        selected: false,
        isDefault: true,
        length: '',
        precision: '',
      },
      {
        name: 'operator',
        type: '文本',
        comment: '操作员',
        fieldType: '属性',
        category: '',
        dateFormat: '',
        primaryKey: false,
        sortDirection: 'asc',
        selected: false,
        isDefault: true,
        length: '',
        precision: '',
      },
      {
        name: 'data_date',
        type: '日期',
        comment: '数据日期',
        fieldType: '属性',
        category: '',
        dateFormat: 'yyyy-MM-dd',
        primaryKey: false,
        sortDirection: 'asc',
        selected: false,
        isDefault: true,
        length: '',
        precision: '',
      }
    ]

    setSupplementFromSource(true)
    setEditingSupplementTable({
      tableName: tableName,
      chineseName: tableComment || '',
      description: '',
      schema: schema,
      fields: defaultFields,
      dsCode: selectedSource.id as string,
    })
    setLoadingSupplementFields(true)
    setTimeout(() => setIsAddSupplementDialogOpen(true), 0)

    // Auto-query table structure and populate fields
    if (isSdkAvailable()) {
      try {
        const fields = await queryTableStructure(selectedSource, schema, tableName)
        if (fields && fields.length > 0) {
          const sourceFields: TableField[] = fields
            .filter(f => f.name !== 'id' && f.name !== 'operator' && f.name !== 'data_date')
            .map(f => {
              const normalized = withFieldDefaults(f)
              return {
                ...normalized,
                dateFormat: normalized.type === '日期' ? 'yyyy-MM-dd' : normalized.dateFormat,
              }
            })
          setEditingSupplementTable(prev => prev ? ({
            ...prev,
            fields: [...defaultFields, ...sourceFields]
          }) : null)
        }
      } catch (error) {
        console.error('[TableManagement] 获取表结构失败:', error)
        toast({
          variant: "destructive",
          title: "获取表结构失败",
          description: (error as Error).message
        })
      } finally {
        setLoadingSupplementFields(false)
      }
    } else {
      setLoadingSupplementFields(false)
    }
  }

  const handleSaveSupplementTable = async () => {
    if (!editingSupplementTable) return

    if (!editingSupplementTable.tableName || !editingSupplementTable.tableName.trim()) {
      toast({ variant: "destructive", title: "校验失败", description: "请输入表名" })
      return
    }

    if (!editingSupplementTable.schema) {
      toast({ variant: "destructive", title: "校验失败", description: "请选择模式名" })
      return
    }

    const selectedFields = editingSupplementTable.fields || []
    if (selectedFields.length === 0) {
      toast({ variant: "destructive", title: "校验失败", description: "请至少添加一个字段" })
      return
    }

    const nonDefaultFields = selectedFields.filter(f => !f.isDefault)
    if (nonDefaultFields.length === 0) {
      toast({ variant: "destructive", title: "校验失败", description: "除了固定的'id'、'operator'和'data_date'外，必须要有其他字段" })
      return
    }

    const emptyFieldName = selectedFields.find(f => !f.name || !f.name.trim())
    if (emptyFieldName) {
      toast({ variant: "destructive", title: "校验失败", description: "存在字段名为空的字段，请填写完整后再保存" })
      return
    }

    const invalidDateField = selectedFields.find(f => f.type === '日期' && (!f.dateFormat || !f.dateFormat.trim()))
    if (invalidDateField) {
      toast({ variant: "destructive", title: "校验失败", description: `字段"${invalidDateField.name}"类型为"日期"，必须填写日期格式` })
      return
    }

    const fieldNames = selectedFields.map(f => f.name.trim())
    const duplicateNames = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index)
    if (duplicateNames.length > 0) {
      toast({ variant: "destructive", title: "校验失败", description: `字段名"${duplicateNames[0]}"重复，请确保所有字段名唯一` })
      return
    }

    setSupplementSaving(true)
    try {
      const newTable: TableInfo = {
        tableName: editingSupplementTable.tableName,
        chineseName: editingSupplementTable.chineseName,
        description: editingSupplementTable.description,
        schema: editingSupplementTable.schema,
        dsCode: selectedSource.id as string,
        fields: selectedFields
      }

      if (editingSupplementTable.id) {
        newTable.id = editingSupplementTable.id
      }

      if (isSdkAvailable()) {
        await saveSupplementTable(newTable)
        await loadSupplementTables()
        toast({ title: "保存成功", description: "数据补录表已保存" })
      } else {
        if (editingSupplementTable.id) {
          setSupplementTables(supplementTables.map(t =>
            t.id === editingSupplementTable.id ? { ...newTable, id: editingSupplementTable.id } : t
          ))
        } else {
          setSupplementTables([...supplementTables, { ...newTable, id: Date.now() }])
        }
        toast({ title: "保存成功", description: "数据补录表已保存" })
      }

      setTimeout(() => {
        setIsAddSupplementDialogOpen(false)
      }, 200)
    } catch (error) {
      console.error('[TableManagement] 保存数据补录表失败:', error)
      toast({
        variant: "destructive",
        title: "保存失败",
        description: (error as Error).message
      })
    } finally {
      setSupplementSaving(false)
    }
  }

  const handleOpenSupplementDetail = async (table: TableInfo) => {
    setSupplementTableReadOnly(true)
    setSupplementFromSource(false)
    if (isSdkAvailable() && table.id) {
      try {
        const detail = await querySupplementTableDetail(table.id)
        if (detail) {
          setEditingSupplementTable({
            ...detail,
            fields: (detail.fields || []).map(field => ({
              ...withFieldDefaults(field),
              isDefault: field.name === 'operator' || field.name === 'data_date'
            }))
          })
        }
      } catch (error) {
        console.error('[TableManagement] 加载数据补录表详情失败:', error)
        toast({
          variant: "destructive",
          title: "加载失败",
          description: (error as Error).message
        })
        return
      }
    } else {
      setEditingSupplementTable(table)
    }
    setTimeout(() => setIsAddSupplementDialogOpen(true), 0)
  }

  const currentTables = tables.filter(t => t.dsCode === selectedSource.id)
  const currentSupplementTables = supplementTables.filter(t => t.dsCode === selectedSource.id)

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-4">
        {/* 切换按钮 */}
        <div className="flex gap-2">
          <Button
            variant={contentTab === 'dataset' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContentTab('dataset')}
          >
            数据集
          </Button>
          <Button
            variant={contentTab === 'supplement' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContentTab('supplement')}
          >
            数据补录
          </Button>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">{selectedSource.name}</h2>
          
          <div className="flex items-center gap-2">
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索（按Enter搜索）"
                value={contentTab === 'dataset' ? searchInput : supplementSearchInput}
                onChange={(e) => contentTab === 'dataset' ? setSearchInput(e.target.value) : setSupplementSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={contentTab === 'dataset' ? loadTables : loadSupplementTables} disabled={loading}>
              <Icons.RotateCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button onClick={contentTab === 'dataset' ? handleOpenAddDialog : handleOpenAddSupplementDialog} size="sm">
              <Icons.Plus className="w-4 h-4 mr-2" />
              新增
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {contentTab === 'dataset' ? (
          <>
            {loading && currentTables.length === 0 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                加载中...
              </div>
            )}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2">模式名</TableHead>
                    <TableHead className="py-2">表名</TableHead>
                    <TableHead className="py-2">中文名</TableHead>
                    <TableHead className="py-2">描述</TableHead>
                    <TableHead className="w-[100px] py-2">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTables.map((table) => (
                    <TableRow
                      key={table.id || table.tableName}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDetailDialog(table)}
                    >
                      <TableCell className="text-sm text-muted-foreground py-2">{table.schema}</TableCell>
                      <TableCell className="font-medium py-2">{table.tableName}</TableCell>
                      <TableCell className="py-2">{table.chineseName}</TableCell>
                      <TableCell className="text-muted-foreground py-2">{table.description}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => handleDeleteTable(table.id!, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
          </>
        ) : (
          <DataSupplementList
            supplementTables={currentSupplementTables}
            loading={loading}
            onRefresh={loadSupplementTables}
            onTableClick={handleOpenSupplementDetail}
          />
        )}
      </div>

      {/* 分页栏 */}
      {contentTab === 'dataset' ? (
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
      ) : (
        <PaginationBar
          totalSize={supplementTables.length}
          currentPage={supplementCurrentPage}
          pageSize={supplementPageSize}
          onPageChange={setSupplementCurrentPage}
          onPageSizeChange={(newSize) => {
            setSupplementPageSize(parseInt(newSize))
            setSupplementCurrentPage(1)
          }}
        />
      )}

      {/* 添加数据集 - 选择源表对话框 */}
      <SourceTableSelector
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        selectedSource={selectedSource}
        showSqlMode={true}
        onSelectTable={(schema, tableName, tableComment) => {
          handleSelectTableRow(tableName, schema, tableComment)
        }}
        onConfirmSql={(schema) => {
          setSelectedSchema(schema)
          handleConfirmAddTable(schema)
        }}
      />

      {/* 新增数据补录 - 选择源表对话框 */}
      <SourceTableSelector
        open={isSupplementSourceSelectorOpen}
        onOpenChange={setIsSupplementSourceSelectorOpen}
        selectedSource={selectedSource}
        showSqlMode={false}
        onSelectTable={handleSupplementSourceTableSelect}
      />

      {/* 表结构对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-[1400px] h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>表配置</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 px-4 overflow-hidden">
            {loadingDetail && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">加载中...</div>
            )}
            {editingTable && !loadingDetail && (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="w-14 text-right">模式名</Label>
                    <Input value={editingTable.schema} disabled className="bg-muted flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-14 text-right">表名</Label>
                    <Input value={editingTable.tableName} onChange={(e) => setEditingTable({ ...editingTable, tableName: e.target.value })} className="flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-14 text-right">中文名</Label>
                    <Input value={editingTable.chineseName} onChange={(e) => setEditingTable({ ...editingTable, chineseName: e.target.value })} placeholder="输入表的中文名称" className="flex-1" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-14 text-right">描述</Label>
                  <Input value={editingTable.description} onChange={(e) => setEditingTable({ ...editingTable, description: e.target.value })} />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <Tabs value={editingTable.type === 'sql' ? activeTab : 'structure'} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2">
                      {editingTable.type === 'sql' ? (
                        <TabsList>
                          <TabsTrigger value="structure">表结构</TabsTrigger>
                          <TabsTrigger value="sql">SQL</TabsTrigger>
                        </TabsList>
                      ) : (
                        <Label className="text-sm font-medium">表结构</Label>
                      )}
                      <div className="flex items-center gap-2">
                        {(activeTab === 'structure' || editingTable.type !== 'sql') ? (
                          <>
                            <Button size="sm" variant="outline" onClick={moveFieldsUp}><ArrowUp className="h-4 w-4 mr-1" />上移</Button>
                            <Button size="sm" variant="outline" onClick={moveFieldsDown}><ArrowDown className="h-4 w-4 mr-1" />下移</Button>
                            <Button size="sm" onClick={() => {
                              const newField: TableField = { name: '', type: '文本', length: '', precision: '', comment: '', fieldType: '属性', category: '', dateFormat: '', selected: false, primaryKey: false, sortDirection: 'asc', isNew: true }
                              setEditingTable({ ...editingTable, fields: [...(editingTable.fields || []), newField] })
                            }}><Plus className="h-4 w-4 mr-1" />添加字段</Button>
                            <Button size="sm" variant="destructive" onClick={() => { if (confirm('确定要清空所有字段吗？')) { setEditingTable({ ...editingTable, fields: [] }) } }}><Trash2 className="h-4 w-4 mr-1" />清空列表</Button>
                          </>
                        ) : (
                          <Button size="sm" onClick={handleRunClick}><Play className="h-4 w-4 mr-1" />运行</Button>
                        )}
                      </div>
                    </div>

                    <TabsContent value="structure" forceMount={true} className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
                      <div className="flex-1 border rounded-md overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                              <TableHead className="w-[60px] p-2 text-center">主键</TableHead>
                              <TableHead className="w-[100px] p-2">排序</TableHead>
                              <TableHead className="p-2">字段名</TableHead>
                              <TableHead className="w-[110px] p-2">类型</TableHead>
                              <TableHead className="w-[140px] p-2">日期格式</TableHead>
                              <TableHead className="p-2">字段中文名</TableHead>
                              <TableHead className="w-[110px] p-2">字段分类</TableHead>
                              <TableHead className="w-[110px] p-2">类别</TableHead>
                              <TableHead className="w-[60px] p-2 text-center">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {editingTable?.fields?.map((field, index) => (
                              <TableRow key={index} onClick={() => updateDetailFieldSelection(index)} className={`cursor-pointer hover:bg-muted/50 ${field.selected ? 'bg-muted' : ''}`}>
                                <TableCell className="p-2 text-center">
                                  <Checkbox checked={field.primaryKey || false} onCheckedChange={() => updateDetailFieldPrimaryKey(index)} onClick={(e) => e.stopPropagation()} />
                                </TableCell>
                                <TableCell className="p-2">
                                  <Select value={field.sortDirection || 'asc'} onValueChange={(value) => updateDetailFieldSortDirection(index, value)} disabled={!field.primaryKey}>
                                    <SelectTrigger className="h-8"><SelectValue placeholder="无" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="asc">正序</SelectItem>
                                      <SelectItem value="desc">倒序</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="font-mono p-2">
                                  <Input value={field.name} onChange={(e) => { const newFields = [...editingTable.fields]; newFields[index] = { ...newFields[index], name: e.target.value }; setEditingTable({ ...editingTable, fields: newFields }) }} className="h-8" placeholder="字段名" />
                                </TableCell>
                                <TableCell className="p-2">
                                  <Select value={field.type || '文本'} onValueChange={(value) => updateDetailFieldDataType(index, value)}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {TYPE_OPTIONS.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="p-2">
                                  <Input value={field.dateFormat || ''} onChange={(e) => { const newFields = [...editingTable.fields]; newFields[index] = { ...newFields[index], dateFormat: e.target.value }; setEditingTable({ ...editingTable, fields: newFields }) }} className="h-8 w-32" disabled={field.type !== '日期'} />
                                </TableCell>
                                <TableCell className="p-2">
                                  <Input value={field.comment} onChange={(e) => { const newFields = [...editingTable.fields]; newFields[index] = { ...newFields[index], comment: e.target.value }; setEditingTable({ ...editingTable, fields: newFields }) }} className="h-8" placeholder="字段中文名" />
                                </TableCell>
                                <TableCell className="p-2">
                                  <Select value={field.fieldType || '属性'} onValueChange={(value) => updateDetailFieldType(index, value)}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="度量">度量</SelectItem>
                                      <SelectItem value="维度">维度</SelectItem>
                                      <SelectItem value="属性">属性</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="p-2">
                                  <Select value={field.category || ''} onValueChange={(value) => updateDetailFieldCategory(index, value)} disabled={field.fieldType !== '维度' || loadingCategories}>
                                    <SelectTrigger className="h-8"><SelectValue placeholder={loadingCategories ? '加载中...' : '选择类别'} /></SelectTrigger>
                                    <SelectContent>
                                      {loadingCategories && (<SelectItem value="__loading" disabled>加载中...</SelectItem>)}
                                      {!loadingCategories && (<SelectItem value="$ORG$">机构</SelectItem>)}
                                      {!loadingCategories && categoryOptions.length === 0 && (<SelectItem value="__none" disabled>暂无类别数据</SelectItem>)}
                                      {!loadingCategories && categoryOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="p-2 text-center">
                                  <Button size="sm" variant="ghost" className="h-8 w-8 text-destructive p-0" onClick={(e) => { e.stopPropagation(); handleDeleteField(index) }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )) || []}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {editingTable.type === 'sql' && (
                      <TabsContent value="sql" forceMount={true} className="flex-1 flex gap-4 min-h-0 mt-0 data-[state=inactive]:hidden p-1">
                        <div className="flex-1 flex flex-col gap-2">
                          <Label className="text-muted-foreground text-xs">SQL 输入</Label>
                          <textarea className="flex-1 w-full p-4 font-mono text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-muted/30" placeholder="在此输入 SQL 语句..." value={sqlContent} onChange={(e) => setSqlContent(e.target.value)} />
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                          <Label className="text-muted-foreground text-xs">最终执行的 SQL</Label>
                          <textarea className="flex-1 w-full p-4 font-mono text-sm border rounded-md resize-none bg-muted text-muted-foreground cursor-not-allowed" placeholder="点击运行后生成..." value={finalSqlContent} readOnly />
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t">
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)} disabled={saving || loadingDetail}>取消</Button>
            <Button onClick={handleSaveTableDetail} disabled={saving || loadingDetail}>{saving ? '保存中...' : '确定'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 参数输入对话框 */}
      <Dialog open={isParamDialogOpen} onOpenChange={setIsParamDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>输入参数值</DialogTitle>
            <DialogDescription>检测到 SQL 中包含参数，请为每个参数设置值。默认值为 0。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {detectedParams.map(param => (
              <div key={param} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={`param-${param}`} className="text-right">{param}</Label>
                <Input id={`param-${param}`} value={paramValues[param] || ''} onChange={(e) => setParamValues({ ...paramValues, [param]: e.target.value })} className="col-span-3" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsParamDialogOpen(false)}>取消</Button>
            <Button onClick={handleConfirmParams}>确定并运行</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加/编辑数据补录表对话框 */}
      <Dialog open={isAddSupplementDialogOpen} onOpenChange={setIsAddSupplementDialogOpen}>
        <DialogContent className="max-w-[1400px] h-[85vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle>{editingSupplementTable?.id ? '编辑数据补录表' : '新增数据补录表'}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 px-4 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Label className="w-14 text-right">模式名</Label>
                  {(supplementTableReadOnly || supplementFromSource) ? (
                    <div className="flex-1 h-9 flex items-center px-3 bg-muted rounded-md text-sm">{editingSupplementTable?.schema || ''}</div>
                  ) : (
                    <Select value={editingSupplementTable?.schema || ''} onValueChange={(value) => { setEditingSupplementTable(prev => prev ? ({ ...prev, schema: value }) : null) }} disabled={loadingSchemas}>
                      <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="选择模式名" /></SelectTrigger>
                      <SelectContent>
                        {schemas.map(schema => (<SelectItem key={schema} value={schema}>{schema}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-14 text-right">表名</Label>
                  <Input value={editingSupplementTable?.tableName || ''} onChange={(e) => { setEditingSupplementTable(prev => prev ? ({ ...prev, tableName: e.target.value }) : null) }} placeholder="输入表名" className="flex-1" readOnly={supplementTableReadOnly || supplementFromSource} />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-14 text-right">中文名</Label>
                  <Input value={editingSupplementTable?.chineseName || ''} onChange={(e) => { setEditingSupplementTable(prev => prev ? ({ ...prev, chineseName: e.target.value }) : null) }} placeholder="输入中文名" className="flex-1" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label className="w-14 text-right">描述</Label>
                <Input value={editingSupplementTable?.description || ''} onChange={(e) => { setEditingSupplementTable(prev => prev ? ({ ...prev, description: e.target.value }) : null) }} placeholder="输入描述" className="flex-1" />
              </div>

              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <div className="flex items-center justify-between flex-shrink-0">
                  <Label className="text-sm font-medium">表结构</Label>
                  {!supplementTableReadOnly && !supplementFromSource && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        if (!editingSupplementTable?.fields) return
                        const newFields = [...editingSupplementTable.fields]
                        let changed = false
                        for (let i = 1; i < newFields.length; i++) {
                          if (newFields[i].selected && !newFields[i - 1].selected) {
                            [newFields[i], newFields[i - 1]] = [newFields[i - 1], newFields[i]]
                            changed = true
                          }
                        }
                        if (changed) { setEditingSupplementTable({ ...editingSupplementTable, fields: newFields }) }
                      }}><ArrowUp className="h-4 w-4 mr-1" />上移</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        if (!editingSupplementTable?.fields) return
                        const newFields = [...editingSupplementTable.fields]
                        let changed = false
                        for (let i = newFields.length - 2; i >= 0; i--) {
                          if (newFields[i].selected && !newFields[i + 1].selected) {
                            [newFields[i], newFields[i + 1]] = [newFields[i + 1], newFields[i]]
                            changed = true
                          }
                        }
                        if (changed) { setEditingSupplementTable({ ...editingSupplementTable, fields: newFields }) }
                      }}><ArrowDown className="h-4 w-4 mr-1" />下移</Button>
                    </div>
                  )}
                </div>

                <div className="flex-1 border rounded-md overflow-auto min-h-0">
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-muted">
                      <TableRow>
                        <TableHead className="w-[60px] p-2 text-center">主键</TableHead>
                        <TableHead className="w-[300px] p-2">字段名</TableHead>
                        <TableHead className="w-[110px] p-2">类型</TableHead>
                        <TableHead className="w-[200px] p-2">日期格式</TableHead>
                        <TableHead className="p-2">字段中文名</TableHead>
                        {!supplementTableReadOnly && <TableHead className="w-[60px] p-2 text-center">操作</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(editingSupplementTable?.fields || []).map((field, index) => (
                        <TableRow key={index} onClick={() => {
                          const newFields = [...(editingSupplementTable?.fields || [])]
                          newFields.forEach((f, i) => { f.selected = i === index })
                          setEditingSupplementTable(editingSupplementTable ? { ...editingSupplementTable, fields: newFields } : null)
                        }} className={`cursor-pointer hover:bg-muted/50 ${field.selected ? 'bg-muted' : ''}`}>
                          <TableCell className="p-2 text-center">
                            {field.name === 'id' && (
                              <Checkbox checked={true} disabled onClick={(e) => e.stopPropagation()} />
                            )}
                          </TableCell>
                          <TableCell className="font-mono p-2">
                            <Input value={field.name || ''} onChange={(e) => {
                              const newFields = [...(editingSupplementTable?.fields || [])]
                              newFields[index] = { ...newFields[index], name: e.target.value }
                              setEditingSupplementTable(editingSupplementTable ? { ...editingSupplementTable, fields: newFields } : null)
                            }} className="h-8" placeholder="字段名" readOnly={field.isDefault || supplementTableReadOnly || supplementFromSource} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Select value={field.type || '文本'} onValueChange={(value) => {
                              const newFields = [...(editingSupplementTable?.fields || [])]
                              newFields[index] = { ...newFields[index], type: value, dateFormat: value === '日期' ? (field.dateFormat || 'yyyy-MM-dd') : '' }
                              setEditingSupplementTable(editingSupplementTable ? { ...editingSupplementTable, fields: newFields } : null)
                            }} disabled={field.isDefault || supplementTableReadOnly}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TYPE_OPTIONS.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-2">
                            <Input value={field.dateFormat || ''} onChange={(e) => {
                              const newFields = [...(editingSupplementTable?.fields || [])]
                              newFields[index] = { ...newFields[index], dateFormat: e.target.value }
                              setEditingSupplementTable(editingSupplementTable ? { ...editingSupplementTable, fields: newFields } : null)
                            }} className="h-8" disabled={field.type !== '日期' || field.isDefault} readOnly={field.isDefault || field.name === 'data_date'} />
                          </TableCell>
                          <TableCell className="p-2">
                            <Input value={field.comment || ''} onChange={(e) => {
                              const newFields = [...(editingSupplementTable?.fields || [])]
                              newFields[index] = { ...newFields[index], comment: e.target.value }
                              setEditingSupplementTable(editingSupplementTable ? { ...editingSupplementTable, fields: newFields } : null)
                            }} className="h-8" placeholder="字段中文名" readOnly={field.isDefault || field.name === 'data_date' || field.name === 'operator'} />
                          </TableCell>
                          {!supplementTableReadOnly && (
                            <TableCell className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                              {!field.isDefault && (
                                <Button size="sm" variant="ghost" className="h-8 w-8 text-destructive p-0" onClick={(e) => {
                                  e.stopPropagation()
                                  const newFields = [...(editingSupplementTable?.fields || [])]
                                  newFields.splice(index, 1)
                                  setEditingSupplementTable(editingSupplementTable ? { ...editingSupplementTable, fields: newFields } : null)
                                }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {loadingSupplementFields && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-4">正在加载表结构...</TableCell>
                        </TableRow>
                      )}
                      {!loadingSupplementFields && (!editingSupplementTable?.fields || editingSupplementTable.fields.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-4">暂无字段</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => { setIsAddSupplementDialogOpen(false); setSupplementTableReadOnly(false); setSupplementFromSource(false) }} disabled={supplementSaving}>{supplementTableReadOnly ? '关闭' : '取消'}</Button>
            <Button onClick={handleSaveSupplementTable} disabled={supplementSaving || loadingSupplementFields}>{supplementSaving ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
