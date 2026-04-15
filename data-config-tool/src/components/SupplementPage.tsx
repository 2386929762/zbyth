import { useState, useEffect } from 'react'
import { DataSupplementList } from '@/components/DataSupplementList'
import { PaginationBar } from '@/components/PaginationBar'
import {
  isSdkAvailable,
  queryDataSupplementTablesOfReport,
  type TableInfo,
} from '@/lib/sdk'
import { useToast } from "@/hooks/use-toast"

export function SupplementPage() {
  const { toast } = useToast()
  const [supplementTables, setSupplementTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(null)

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)

  // 页面加载后从 URL 提取 code 参数
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codeParam = params.get('code')
    if (!codeParam) {
      toast({
        variant: "destructive",
        title: "参数错误",
        description: "URL 中缺少 code 参数"
      })
      return
    }
    setCode(codeParam)
  }, [toast])

  // 加载数据补录表列表
  const loadSupplementTables = async () => {
    if (!code) return

    setLoading(true)
    try {
      if (isSdkAvailable()) {
        const result = await queryDataSupplementTablesOfReport(code)
        setSupplementTables(result.list || [])
        setTotalItems(result.totalSize || 0)
      }
    } catch (error) {
      console.error('[SupplementPage] 加载数据补录表列表失败:', error)
      toast({
        variant: "destructive",
        title: "加载失败",
        description: (error as Error).message
      })
    } finally {
      setLoading(false)
    }
  }

  // SDK 就绪后加载数据
  useEffect(() => {
    if (!code) return

    const handleSdkLoggedIn = () => {
      loadSupplementTables()
    }

    if (window.sdkLoggedIn) {
      loadSupplementTables()
    }

    window.addEventListener('sdkLoggedIn', handleSdkLoggedIn)
    return () => {
      window.removeEventListener('sdkLoggedIn', handleSdkLoggedIn)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Title Bar */}
      <div className="h-14 border-b flex items-center px-6 bg-background flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow">
            <span className="text-sm font-bold text-primary-foreground">补</span>
          </div>
          <span className="text-lg font-bold text-foreground">数据补录</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        {loading && supplementTables.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            加载中...
          </div>
        )}
        <DataSupplementList
          supplementTables={supplementTables}
          loading={loading}
          onRefresh={loadSupplementTables}
        />
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
    </div>
  )
}
