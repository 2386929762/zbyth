import React, { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import {
  isSdkAvailable,
  querySchemaList,
  queryDbTableList,
  type DataSource,
  type DbTableInfo,
} from '@/lib/sdk'

interface SourceTableSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedSource: DataSource
  /** Whether to show the SQL mode radio option. Default true. */
  showSqlMode?: boolean
  /** Called when user selects a table row (table mode) */
  onSelectTable: (schema: string, tableName: string, tableComment: string) => void
  /** Called when user clicks "下一步" in SQL mode */
  onConfirmSql?: (schema: string) => void
}

export function SourceTableSelector({
  open,
  onOpenChange,
  selectedSource,
  showSqlMode = true,
  onSelectTable,
  onConfirmSql,
}: SourceTableSelectorProps) {
  const [selectedSchema, setSelectedSchema] = useState('')
  const [tableSearchText, setTableSearchText] = useState('')
  const [schemas, setSchemas] = useState<string[]>([])
  const [tablesFromDb, setTablesFromDb] = useState<DbTableInfo[]>([])
  const [loadingSchemas, setLoadingSchemas] = useState(false)
  const [loadingDbTables, setLoadingDbTables] = useState(false)
  const [addTableMode, setAddTableMode] = useState('table')
  const [dialogPage, setDialogPage] = useState(1)
  const [dialogPageSize, setDialogPageSize] = useState(50)

  const lastLoadedDialogSchemaRef = useRef<string | null>(null)

  // Load schemas when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSchema('')
      setTableSearchText('')
      setDialogPage(1)
      setSchemas([])
      setTablesFromDb([])
      setAddTableMode('table')
      lastLoadedDialogSchemaRef.current = null
      loadSchemas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Load tables when schema changes
  useEffect(() => {
    if (open && addTableMode === 'table' && selectedSchema) {
      if (lastLoadedDialogSchemaRef.current !== selectedSchema) {
        lastLoadedDialogSchemaRef.current = selectedSchema
        loadTablesFromDb(selectedSchema)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchema, open, addTableMode])

  const loadSchemas = async () => {
    if (!selectedSource || !isSdkAvailable()) return
    setLoadingSchemas(true)
    try {
      const schemaList = await querySchemaList(selectedSource)
      setSchemas(schemaList)
    } catch (error) {
      console.error('[SourceTableSelector] 获取schema列表失败:', error)
    } finally {
      setLoadingSchemas(false)
    }
  }

  const loadTablesFromDb = async (schemaName: string) => {
    if (!selectedSource || !isSdkAvailable() || !schemaName) return
    setLoadingDbTables(true)
    try {
      const tableList = await queryDbTableList(selectedSource, schemaName)
      setTablesFromDb(tableList)
    } catch (error) {
      console.error('[SourceTableSelector] 获取表列表失败:', error)
    } finally {
      setLoadingDbTables(false)
    }
  }

  const filteredTables = tablesFromDb.filter(table =>
    table.name.toLowerCase().includes(tableSearchText.toLowerCase()) ||
    table.comment.toLowerCase().includes(tableSearchText.toLowerCase())
  )

  const dialogTotalPages = Math.ceil(filteredTables.length / dialogPageSize)
  const paginatedTables = filteredTables.slice(
    (dialogPage - 1) * dialogPageSize,
    dialogPage * dialogPageSize
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] h-[600px] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>选择源表</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-6">
          <div className="pb-3 space-y-3 flex-shrink-0">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="w-14 text-right">模式名</Label>
                <Select value={selectedSchema} onValueChange={(value) => { setSelectedSchema(value); setDialogPage(1) }} disabled={loadingSchemas}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schemas.map(schema => (
                      <SelectItem key={schema} value={schema}>{schema}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showSqlMode && (
                <RadioGroup value={addTableMode} onValueChange={(value) => { setAddTableMode(value); if (value === 'table' && schemas.length === 0) { loadSchemas() } }} className="flex items-center gap-4 pl-[4rem]">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="table" id="r-table" />
                    <Label htmlFor="r-table">源表</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sql" id="r-sql" />
                    <Label htmlFor="r-sql">SQL</Label>
                  </div>
                </RadioGroup>
              )}
            </div>

            {addTableMode === 'table' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索" value={tableSearchText} onChange={(e) => { setTableSearchText(e.target.value); setDialogPage(1) }} className="pl-9 h-9" />
              </div>
            )}
          </div>

          {addTableMode === 'table' ? (
            <>
              <div className="flex-1 overflow-auto border rounded-md min-h-0">
                {loadingDbTables ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">加载中...</div>
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
                        <TableRow key={table.name} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectTable(selectedSchema, table.name, table.comment || '')}>
                          <TableCell className="font-mono text-sm">{table.name}</TableCell>
                          <TableCell className="text-sm">{table.comment}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="py-3 flex items-center justify-between text-sm flex-shrink-0">
                <div className="text-muted-foreground">共{filteredTables.length}条</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDialogPage(p => Math.max(1, p - 1))} disabled={dialogPage === 1}>上一页</Button>
                  <span className="text-muted-foreground">{dialogPage} / {dialogTotalPages || 1}</span>
                  <Button variant="outline" size="sm" onClick={() => setDialogPage(p => Math.min(dialogTotalPages, p + 1))} disabled={dialogPage >= dialogTotalPages}>下一页</Button>
                  <Select value={dialogPageSize.toString()} onValueChange={(value) => { setDialogPageSize(Number(value)); setDialogPage(1) }}>
                    <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50条/页</SelectItem>
                      <SelectItem value="100">100条/页</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1"></div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>关 闭</Button>
          {showSqlMode && addTableMode === 'sql' && (
            <Button onClick={() => onConfirmSql?.(selectedSchema)} disabled={!selectedSchema}>下一步</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
