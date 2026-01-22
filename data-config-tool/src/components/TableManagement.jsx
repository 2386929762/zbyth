import * as Icons from 'lucide-react'
import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Settings, Search, ChevronRight, Trash2, RefreshCw, ArrowUp, ArrowDown, Play } from 'lucide-react'
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  isSdkAvailable,
  queryTableList,
  queryTableDetail,
  saveTable,
  deleteTable,
  queryDictionaryCategories,
  querySchemaList,
  queryDbTableList,
  queryTableStructure,
  getSqlStruct,
  normalizeDbType,
  normalizeFieldCategory
} from '@/lib/sdk'
import { useToast } from "@/hooks/use-toast"



const TYPE_OPTIONS = [
  { value: '文本', label: '文本' },
  { value: '日期', label: '日期' },
  { value: '数值', label: '数值' }
]



const withFieldDefaults = (field = {}) => {
  const normalizedType = TYPE_OPTIONS.some(opt => opt.value === field.type) ? field.type : normalizeDbType(field.type)
  const normalizedCategory = normalizeFieldCategory(field.fieldType)

  return {
    ...field,
    type: normalizedType,
    fieldType: normalizedCategory,
    category: normalizedCategory === '维度' ? (field.category || '') : '',
    dateFormat: normalizedType === '日期' ? (field.dateFormat || 'yyyyMMdd') : '',
    selected: false, // 默认为 false，用作 UI 交互选择（批量删除等）
    primaryKey: field.primaryKey || false, // 默认为 false
    sortDirection: field.sortDirection || 'asc'
  }
}

export function TableManagement({ selectedSource, tables, setTables, dataSources }) {
  const { toast } = useToast()
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
  const [activeTab, setActiveTab] = useState('structure')
  const [sqlContent, setSqlContent] = useState('')
  const [addTableMode, setAddTableMode] = useState('table') // 'table' | 'sql'

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
      toast({
        variant: "destructive",
        title: "加载失败",
        description: error.message
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
      const schemaList = await querySchemaList(selectedSource)
      setSchemas(schemaList)
      if (schemaList.length > 0 && !schemaList.includes(selectedSchema)) {
        setSelectedSchema(schemaList[0])
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
      const tableList = await queryDbTableList(selectedSource, schemaName)
      setTablesFromDb(tableList)
    } catch (error) {
      console.error('[TableManagement] 获取表列表失败:', error)
    } finally {
      setLoadingDbTables(false)
    }
  }

  const handleOpenAddDialog = async () => {
    if (!selectedSource) {
      toast({ variant: "destructive", title: "提示", description: "请先选择数据源" })
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
        const fields = await queryTableStructure(selectedSource, selectedSchema, tableName)
        if (fields) {
          setEditingTable(prev => ({
            ...prev,
            fields: fields.map(withFieldDefaults)
          }))
        }
      } catch (error) {
        console.error('[TableManagement] 获取表结构失败:', error)
        toast({
          variant: "destructive",
          title: "获取表结构失败",
          description: error.message
        })
      } finally {
        setLoadingDetail(false)
      }
    } else {
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

  const updateDetailFieldSelection = (fieldIndex) => {
    setEditingTable(prev => ({
      ...prev,
      fields: prev.fields.map((f, index) =>
        ({ ...f, selected: index === fieldIndex })
      )
    }))
  }

  // 更新详情对话框中的字段主键状态
  const updateDetailFieldPrimaryKey = (fieldIndex) => {
    setEditingTable(prev => ({
      ...prev,
      fields: prev.fields.map((f, index) =>
        index === fieldIndex ? { ...f, primaryKey: !f.primaryKey } : f
      )
    }))
  }

  // 更新详情对话框中的字段排序方向
  const updateDetailFieldSortDirection = (fieldIndex, sortDirection) => {
    setEditingTable(prev => ({
      ...prev,
      fields: prev.fields.map((f, index) =>
        index === fieldIndex ? { ...f, sortDirection } : f
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

  // 删除单个字段
  const handleDeleteField = (index) => {
    setEditingTable(prev => {
      const newFields = [...prev.fields]
      newFields.splice(index, 1)
      return { ...prev, fields: newFields }
    })
  }

  // 向上移动选中字段
  const moveFieldsUp = () => {
    if (!editingTable || !editingTable.fields) return
    const newFields = [...editingTable.fields]
    let changed = false
    // 从第二个元素开始遍历，如果当前元素选中且前一个未选中，则交换
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

  // 向下移动选中字段
  const moveFieldsDown = () => {
    if (!editingTable || !editingTable.fields) return
    const newFields = [...editingTable.fields]
    let changed = false
    // 从倒数第二个元素开始遍历，如果当前元素选中且后一个未选中，则交换
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

  // 确定添加表
  const handleConfirmAddTable = () => {
    // SQL 模式直接进入配置
    if (addTableMode === 'sql') {
      const newTable = {
        tableName: '',
        description: '',
        dsCode: selectedSource.id,
        schema: selectedSchema,
        fields: [],
        type: 'sql' // 标记为 SQL 表
      }

      handleOpenDetailDialog(newTable, 'sql') // 传入 'sql' tab
      return
    }

    if (!selectedTableName) {
      toast({ variant: "destructive", title: "提示", description: "请选择一个表" })
      return
    }


    const tableInfo = tablesFromDb.find(t => t.name === selectedTableName)
    const newTable = {
      tableName: selectedTableName,
      chineseName: formData.chineseName || tableInfo?.comment || '',
      description: formData.description || '',
      dsCode: selectedSource.id,
      schema: selectedSchema,
      fields: []
    }

    setTables([...tables, newTable])
    setIsAddDialogOpen(false)
  }

  // 加载状态用于详情对话框
  const [loadingDetail, setLoadingDetail] = useState(false)

  const handleOpenDetailDialog = async (table, initialTab = 'structure') => {
    // 先设置基本信息并打开对话框
    setActiveTab(initialTab) // 设置初始 Tab
    setSqlContent('')
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
          const detailFields = (detail.fields || []).map(withFieldDefaults);

          setEditingTable({
            ...detail,
            fields: detailFields
          })

          if (detail.type === 'sql') {
            setSqlContent(detail.querySql || '')
          }
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
          toast({ title: "删除成功", description: "表已删除" })
        } else {
          setTables(tables.filter(t => t.id !== tableId))
        }
      } catch (error) {
        console.error('[TableManagement] 删除失败:', error)
        toast({
          variant: "destructive",
          title: "删除失败",
          description: error.message
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

    const selectedFields = editingTable.fields
      .map(withFieldDefaults)
    if (selectedFields.length === 0) {
      toast({ variant: "destructive", title: "校验失败", description: "请至少添加一个字段" })
      return
    }

    // 校验必须选择主键
    const hasPrimaryKey = selectedFields.some(f => f.primaryKey)
    if (!hasPrimaryKey) {
      toast({ variant: "destructive", title: "校验失败", description: "请选择一个字段作为主键" })
      return
    }

    // 校验字段名不能为空
    const emptyFieldName = selectedFields.find(f => !f.name || !f.name.trim())
    if (emptyFieldName) {
      toast({ variant: "destructive", title: "校验失败", description: "存在字段名为空的字段，请填写完整后再保存" })
      return
    }

    // 校验维度字段必须选择类别
    const invalidDimensionField = selectedFields.find(f => f.fieldType === '维度' && !f.category)
    if (invalidDimensionField) {
      toast({ variant: "destructive", title: "校验失败", description: `字段 "${invalidDimensionField.name}" 分类为“维度”，请选择类别` })
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
        fields: selectedFields,
        type: editingTable.type || 'table',
        querySql: editingTable.type === 'sql' ? sqlContent : ''
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
        toast({ title: "保存成功", description: "表结构已保存" })
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
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error.message
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
              placeholder="搜索（按Enter搜索）"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9"
            />
          </div>
          {/* 刷新按钮 */}
          <Button variant="outline" size="sm" onClick={loadTables} disabled={loading}>
            <Icons.RotateCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          {/* 添加按钮 */}
          <Button onClick={handleOpenAddDialog} size="sm">
            <Icons.Plus className="w-4 h-4 mr-2" />
            新增
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
                      onClick={(e) => handleDeleteTable(table.id, e)}
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
            <DialogTitle>选择源表</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0 px-6">
            <div className="pb-3 space-y-3 flex-shrink-0">
              {/* 模式名和 SQL 模式选择 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="w-14 text-right">模式名</Label>
                  <Select
                    value={selectedSchema}
                    onValueChange={(value) => {
                      setSelectedSchema(value)
                      setCurrentPage(1)
                    }}
                    disabled={loadingSchemas}
                  >
                    <SelectTrigger className="h-9 flex-1">
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

                <RadioGroup
                  value={addTableMode}
                  onValueChange={setAddTableMode}
                  className="flex items-center gap-4 pl-[4rem]"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="table" id="r-table" />
                    <Label htmlFor="r-table">源表</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sql" id="r-sql" />
                    <Label htmlFor="r-sql">SQL</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 搜索框 - 仅在 table 模式下显示 */}
              {addTableMode === 'table' && (
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
              )}
            </div>

            {addTableMode === 'table' ? (
              <>
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
                            className={`cursor-pointer ${selectedTableName === table.name ? 'bg-muted' : 'hover:bg-muted/50'}`}
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
              </>
            ) : (
              // SQL 模式下占位，保持高度不变
              <div className="flex-1"></div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              关 闭
            </Button>
            {addTableMode === 'sql' && (
              <Button onClick={handleConfirmAddTable}>
                下一步
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 表结构对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-[1400px] h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>表配置</DialogTitle>
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
                  <div className="flex items-center gap-2">
                    <Label className="w-14 text-right">模式名</Label>
                    <Input value={editingTable.schema} disabled className="bg-muted flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-14 text-right">表名</Label>
                    <Input
                      value={editingTable.tableName}
                      disabled={editingTable.type !== 'sql'}
                      onChange={(e) => setEditingTable({ ...editingTable, tableName: e.target.value })}
                      className={editingTable.type !== 'sql' ? "bg-muted flex-1" : "flex-1"}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-14 text-right">中文名</Label>
                    <Input
                      value={editingTable.chineseName}
                      onChange={(e) => setEditingTable({ ...editingTable, chineseName: e.target.value })}
                      placeholder="输入表的中文名称"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="w-14 text-right">描述</Label>
                  <Input
                    value={editingTable.description}
                    onChange={(e) => setEditingTable({ ...editingTable, description: e.target.value })}
                  />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <Tabs
                    value={editingTable.type === 'sql' ? activeTab : 'structure'}
                    onValueChange={setActiveTab}
                    className="flex-1 flex flex-col min-h-0"
                  >
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={moveFieldsUp}
                            >
                              <ArrowUp className="h-4 w-4 mr-1" />
                              上移
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={moveFieldsDown}
                            >
                              <ArrowDown className="h-4 w-4 mr-1" />
                              下移
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
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm('确定要清空所有字段吗？')) {
                                  setEditingTable({
                                    ...editingTable,
                                    fields: []
                                  })
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              清空列表
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"

                            onClick={async () => {
                              if (!sqlContent.trim()) {
                                toast({ variant: "destructive", title: "提示", description: "请输入 SQL 语句" })
                                return
                              }

                              if (!isSdkAvailable()) {
                                toast({ variant: "destructive", title: "错误", description: "SDK 不可用" })
                                return
                              }

                              try {
                                const fields = await getSqlStruct(
                                  selectedSource.type || 'postgresql',
                                  selectedSource.name,
                                  sqlContent
                                )

                                if (fields) {
                                  const currentFields = editingTable.fields || []
                                  const currentFieldNames = new Set(currentFields.map(f => f.name))

                                  // 仅添加不存在的新字段
                                  const newUniqueFields = fields
                                    .filter(f => !currentFieldNames.has(f.name))
                                    .map(withFieldDefaults)

                                  if (newUniqueFields.length === 0) {
                                    toast({ title: "提示", description: "没有检测到新增字段" })
                                  } else {
                                    toast({ title: "解析成功", description: `已添加 ${newUniqueFields.length} 个新字段` })
                                    setEditingTable(prev => ({
                                      ...prev,
                                      fields: [...(prev.fields || []), ...newUniqueFields]
                                    }))
                                  }
                                  setActiveTab('structure')
                                }
                              } catch (error) {
                                console.error('[TableManagement] SQL 运行失败:', error)
                                toast({
                                  variant: "destructive",
                                  title: "运行失败",
                                  description: error.message
                                })
                              }
                            }}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            运行
                          </Button>
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
                              <TableRow
                                key={index}
                                onClick={() => updateDetailFieldSelection(index)}
                                className={`cursor-pointer hover:bg-muted/50 ${field.selected ? 'bg-muted' : ''}`}
                              >
                                <TableCell className="p-2 text-center">
                                  <Checkbox
                                    checked={field.primaryKey || false}
                                    onCheckedChange={() => updateDetailFieldPrimaryKey(index)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </TableCell>
                                <TableCell className="p-2">
                                  <Select
                                    value={field.sortDirection || 'asc'}
                                    onValueChange={(value) => updateDetailFieldSortDirection(index, value)}
                                    disabled={!field.primaryKey}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="无" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="asc">正序</SelectItem>
                                      <SelectItem value="desc">倒序</SelectItem>
                                    </SelectContent>
                                  </Select>
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
                                    disabled={field.type !== '日期'}
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
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="度量">度量</SelectItem>
                                      <SelectItem value="维度">维度</SelectItem>
                                      <SelectItem value="属性">属性</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="p-2">
                                  <Select
                                    value={field.category || ''}
                                    onValueChange={(value) => updateDetailFieldCategory(index, value)}
                                    disabled={field.fieldType !== '维度' || loadingCategories}
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
                                <TableCell className="p-2 text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteField(index)
                                    }}
                                  >
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
                      <TabsContent value="sql" forceMount={true} className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden p-1">
                        <textarea
                          className="flex-1 w-full p-4 font-mono text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-muted/30"
                          placeholder="在此输入 SQL 语句..."
                          value={sqlContent}
                          onChange={(e) => setSqlContent(e.target.value)}
                        />
                      </TabsContent>
                    )}
                  </Tabs>
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
