import { useState, useEffect, useRef } from 'react'
import { Search, Upload, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PaginationBar } from '@/components/PaginationBar'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import {
  isSdkAvailable,
  querySupplementTableDetail,
  querySupplementData,
  importSupplementData,
  exportSupplementDataTemplate,
  type TableInfo,
  type User,
} from '@/lib/sdk'
import { useToast } from "@/hooks/use-toast"
import { UserSelector } from '@/components/UserSelector'

export interface DataSupplementListProps {
  supplementTables: TableInfo[]
  loading?: boolean
  onRefresh?: () => void
  /** 点击表行时的回调 */
  onTableClick?: (table: TableInfo) => void
  /** 如果为 true，隐藏顶部搜索栏和刷新/新增按钮（由外部控制） */
  hideToolbar?: boolean
}

export function DataSupplementList({
  supplementTables,
  loading = false,
  onRefresh,
  onTableClick,
  hideToolbar = false,
}: DataSupplementListProps) {
  const { toast } = useToast()
  const [supplementSaving, setSupplementSaving] = useState(false)

  // 导入对话框相关状态
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importDataDate, setImportDataDate] = useState<Date | undefined>(undefined)
  const [importFile, setImportFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importTableId, setImportTableId] = useState<string | number | null>(null)
  const [importCurrentPage, setImportCurrentPage] = useState(1)
  const [importPageSize, setImportPageSize] = useState(50)
  const [importTotalItems, setImportTotalItems] = useState(0)
  const [importOnlyMyself, setImportOnlyMyself] = useState(false)
  const [importSupplementTable, setImportSupplementTable] = useState<TableInfo | null>(null)
  const [importDataList, setImportDataList] = useState<any[]>([])
  const [loadingImportData, setLoadingImportData] = useState(false)

  // 上传数据对话框相关状态
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadDataDate, setUploadDataDate] = useState<Date | undefined>(undefined)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadOperator, setUploadOperator] = useState<User | null>(null)
  const [uploadIsSelf, setUploadIsSelf] = useState(false)
  const [isUserSelectorOpen, setIsUserSelectorOpen] = useState(false)
  const uploadFileInputRef = useRef<HTMLInputElement>(null)

  // 当导入对话框分页变化时重新加载数据
  useEffect(() => {
    if (isImportDialogOpen && importTableId) {
      loadSupplementData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importCurrentPage, importPageSize])

  // 当importSupplementTable加载完成后自动加载数据
  useEffect(() => {
    if (isImportDialogOpen && importSupplementTable && importTableId) {
      loadSupplementData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importSupplementTable])

  const formatDataDate = (date: Date, supplementTable: TableInfo | null): string => {
    const dataDateField = supplementTable?.fields.find(f => f.name === 'data_date')
    const dateFormat = dataDateField?.dateFormat || 'yyyy-MM-dd'

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    if (dateFormat === 'yyyyMMdd') {
      return `${year}${month}${day}`
    } else if (dateFormat === 'yyyy-MM-dd') {
      return `${year}-${month}-${day}`
    } else {
      return `${year}${month}${day}`
    }
  }

  const loadSupplementData = async () => {
    if (!importTableId || !isSdkAvailable()) return

    setLoadingImportData(true)
    try {
      const dataDateStr = importDataDate ? formatDataDate(importDataDate, importSupplementTable) : undefined

      const result = await querySupplementData({
        code: importTableId,
        pageNo: importCurrentPage,
        pageSize: importPageSize,
        dataDate: dataDateStr,
        onlyMyself: importOnlyMyself
      })

      if (result && result.data) {
        setImportDataList(result.data.list || [])
        setImportTotalItems(result.data.totalSize || 0)
      }
    } catch (error) {
      console.error('[DataSupplementList] 加载补录数据失败:', error)
      toast({
        variant: "destructive",
        title: "加载失败",
        description: (error as Error).message
      })
    } finally {
      setLoadingImportData(false)
    }
  }

  const handleOpenImportDialog = async (tableId: string | number) => {
    setImportTableId(tableId)
    setImportDataDate(undefined)
    setImportFile(null)
    setImportCurrentPage(1)
    setImportOnlyMyself(false)
    setImportDataList([])
    setImportTotalItems(0)

    setIsImportDialogOpen(true)

    if (isSdkAvailable()) {
      try {
        const detail = await querySupplementTableDetail(tableId)
        if (detail) {
          setImportSupplementTable(detail)
        }
      } catch (error) {
        console.error('[DataSupplementList] 加载补录表详情失败:', error)
        toast({
          variant: "destructive",
          title: "加载失败",
          description: (error as Error).message
        })
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  const handleUploadFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
    }
  }

  const handleOpenUploadDialog = () => {
    setUploadDataDate(undefined)
    setUploadFile(null)
    setUploadOperator(null)
    setUploadIsSelf(true)
    setIsUploadDialogOpen(true)
  }

  const handleQueryImportData = () => {
    setImportCurrentPage(1)
    loadSupplementData()
  }

  const handleUploadData = async () => {
    if (!uploadDataDate) {
      toast({
        variant: "destructive",
        title: "校验失败",
        description: "请选择数据日期"
      })
      return
    }

    if (!uploadFile) {
      toast({
        variant: "destructive",
        title: "校验失败",
        description: "请选择要上传的文件"
      })
      return
    }

    if (!uploadIsSelf && !uploadOperator) {
      toast({
        variant: "destructive",
        title: "校验失败",
        description: "请选择操作员或勾选'自己'"
      })
      return
    }

    const dataDateStr = formatDataDate(uploadDataDate, importSupplementTable)

    try {
      setSupplementSaving(true)
      const reader = new FileReader()
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer
        if (!arrayBuffer) {
          setSupplementSaving(false)
          toast({
            variant: "destructive",
            title: "处理失败",
            description: "无法读取文件内容"
          })
          return
        }

        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64String = btoa(binary)

        try {
          const result = await importSupplementData({
            code: importTableId!,
            content: base64String,
            dataDate: dataDateStr,
            isCurrUser: uploadIsSelf,
            opUser: uploadOperator?.userName
          })
          toast({
            title: "上传成功",
            description: "数据已成功上传"
          })
          setIsUploadDialogOpen(false)
          setUploadFile(null)
          if (uploadFileInputRef.current) {
            uploadFileInputRef.current.value = ''
          }
          loadSupplementData()
        } catch (error) {
          console.error('[DataSupplementList] 上传数据失败:', error)
          toast({
            variant: "destructive",
            title: "上传失败",
            description: (error as Error).message
          })
        } finally {
          setSupplementSaving(false)
        }
      }
      reader.onerror = () => {
        setSupplementSaving(false)
        setUploadFile(null)
        if (uploadFileInputRef.current) {
          uploadFileInputRef.current.value = ''
        }
        toast({
          variant: "destructive",
          title: "读取失败",
          description: "文件读取过程中发生错误"
        })
      }
      reader.readAsArrayBuffer(uploadFile)
    } catch (error) {
      console.error('[DataSupplementList] 处理文件失败:', error)
      toast({
        variant: "destructive",
        title: "处理失败",
        description: (error as Error).message
      })
      setSupplementSaving(false)
    }
  }

  const handleExportTableTemplate = async (tableId: string | number) => {
    try {
      setSupplementSaving(true)

      const table = supplementTables.find(t => t.id === tableId)
      const fileName = table?.chineseName || table?.tableName || `table_${tableId}`

      const result = await exportSupplementDataTemplate({
        code: tableId
      })

      if (result instanceof Blob) {
        const url = window.URL.createObjectURL(result)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileName}_数据模板.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast({
          title: "导出成功",
          description: "模板已下载"
        })
      } else {
        toast({
          variant: "destructive",
          title: "导出失败",
          description: (result as { message?: string })?.message || "导出失败"
        })
      }
    } catch (error) {
      console.error('[DataSupplementList] 导出模板失败:', error)
      toast({
        variant: "destructive",
        title: "导出失败",
        description: (error as Error).message
      })
    } finally {
      setSupplementSaving(false)
    }
  }

  return (
    <>
      {/* 数据补录表列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2">模式名</TableHead>
                <TableHead className="py-2">表名</TableHead>
                <TableHead className="py-2">中文名</TableHead>
                <TableHead className="py-2">描述</TableHead>
                <TableHead className="py-2 w-[120px] text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplementTables.map((table) => (
                <TableRow
                  key={table.id || table.tableName}
                  className="hover:bg-muted/50"
                >
                  <TableCell className="text-sm text-muted-foreground py-2 cursor-pointer" onClick={() => onTableClick?.(table)}>{table.schema}</TableCell>
                  <TableCell className="font-medium py-2 cursor-pointer" onClick={() => onTableClick?.(table)}>{table.tableName}</TableCell>
                  <TableCell className="py-2 cursor-pointer" onClick={() => onTableClick?.(table)}>{table.chineseName}</TableCell>
                  <TableCell className="text-muted-foreground py-2 cursor-pointer" onClick={() => onTableClick?.(table)}>{table.description}</TableCell>
                  <TableCell className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOpenImportDialog(table.id!)} disabled={supplementSaving} title="导入数据">
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleExportTableTemplate(table.id!)} disabled={supplementSaving} title="导出数据模板">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {supplementTables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    暂无数据补录表
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 导入数据对话框 */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-[1400px] h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>导入数据</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">数据日期</Label>
                  <DatePicker date={importDataDate} onDateChange={setImportDataDate} placeholder="选择数据日期" clearable />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="onlyMyself"
                    checked={importOnlyMyself}
                    onCheckedChange={(checked) => setImportOnlyMyself(checked as boolean)}
                  />
                  <Label htmlFor="onlyMyself" className="whitespace-nowrap cursor-pointer">只看自己</Label>
                </div>
                <Button variant="outline" size="sm" onClick={handleQueryImportData} disabled={loadingImportData}>
                  <Search className="h-4 w-4 mr-2" />查询
                </Button>
                <Button size="sm" onClick={handleOpenUploadDialog} disabled={supplementSaving}>
                  <Upload className="h-4 w-4 mr-2" />上传数据
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="h-full border border-t-0 border-b-0 overflow-y-auto">
                {loadingImportData ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">加载中...</div>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        {importSupplementTable?.fields?.map((field, index) => (
                          <TableHead key={index} className="p-2">{field.comment || field.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importDataList.length > 0 ? (
                        importDataList.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {Array.isArray(row) ? (
                              row.map((cellValue, colIndex) => (
                                <TableCell key={colIndex} className="p-2">{cellValue || ''}</TableCell>
                              ))
                            ) : (
                              importSupplementTable?.fields?.map((field, colIndex) => (
                                <TableCell key={colIndex} className="p-2">{row[field.name] || ''}</TableCell>
                              ))
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={importSupplementTable?.fields?.length || 1} className="text-center text-muted-foreground py-8">暂无数据</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <div className="border border-t-0">
              <PaginationBar totalSize={importTotalItems} currentPage={importCurrentPage} pageSize={importPageSize} onPageChange={setImportCurrentPage} onPageSizeChange={(size) => setImportPageSize(parseInt(size))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 上传数据对话框 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>上传数据</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Label className="w-20 text-right">数据日期</Label>
              <DatePicker date={uploadDataDate} onDateChange={setUploadDataDate} placeholder="选择数据日期" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20 text-right">操作员</Label>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="uploadIsSelf"
                    checked={uploadIsSelf}
                    onCheckedChange={(checked) => {
                      setUploadIsSelf(checked === true)
                      if (checked) {
                        setUploadOperator(null)
                      }
                    }}
                  />
                  <Label htmlFor="uploadIsSelf" className="cursor-pointer">自己</Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUserSelectorOpen(true)}
                  disabled={uploadIsSelf}
                  className="flex-1 justify-start"
                >
                  {uploadOperator ? `${uploadOperator.fullName} (${uploadOperator.userName})` : '选择操作员'}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20 text-right">选择文件</Label>
              <input
                ref={uploadFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleUploadFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => uploadFileInputRef.current?.click()}
                className="flex-1 justify-start"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadFile ? uploadFile.name : '选择文件'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>取消</Button>
            <Button onClick={handleUploadData} disabled={supplementSaving}>
              {supplementSaving ? '上传中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 用户选择对话框 */}
      <UserSelector
        open={isUserSelectorOpen}
        onOpenChange={setIsUserSelectorOpen}
        onSelectUser={(user) => setUploadOperator(user)}
      />
    </>
  )
}
