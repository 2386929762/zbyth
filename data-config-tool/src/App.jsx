import { useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { DataSourceList } from '@/components/DataSourceList'
import { TableManagement } from '@/components/TableManagement'
import { Toaster } from '@/components/ui/toaster'
import ErrorBoundary from '@/components/ErrorBoundary'
import './App.css'

function App() {
  const [dataSources, setDataSources] = useState([])
  const [tables, setTables] = useState([])
  const [selectedSource, setSelectedSource] = useState(null)

  // 检查是否为 compact 模式
  const isCompact = new URLSearchParams(window.location.search).get('compact') === '1'

  // 当数据源更新时,同步更新selectedSource
  const handleSetDataSources = (newDataSources) => {
    setDataSources(newDataSources)

    // 如果当前选中的数据源被更新，同步更新
    if (selectedSource) {
      const updatedSource = newDataSources.find(ds => ds.id === selectedSource.id)
      if (updatedSource) {
        setSelectedSource(updatedSource)
      }
    }
  }

  const handleSelectSource = (source) => {
    setSelectedSource(source)
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部导航栏（支持 compact 模式隐藏）*/}
      {!isCompact && (
        <header className="border-b bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-base font-bold text-primary-foreground">数</span>
              </div>
              <span className="text-lg font-bold text-foreground">数据源管理</span>
            </div>
            <ThemeToggle />
          </div>
        </header>
      )}

      {/* 主内容区 */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧数据源列表 */}
        <aside className="w-64 border-r bg-card">
          <ErrorBoundary>
            <DataSourceList
              dataSources={dataSources}
              setDataSources={handleSetDataSources}
              selectedSource={selectedSource}
              onSelectSource={handleSelectSource}
            />
          </ErrorBoundary>
        </aside>

        {/* 右侧内容区域 */}
        <section className="flex-1 bg-background flex flex-col">
          {!selectedSource ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              请从左侧选择数据源
            </div>
          ) : (
            <ErrorBoundary>
              <TableManagement
                selectedSource={selectedSource}
                tables={tables}
                setTables={setTables}
                dataSources={dataSources}
              />
            </ErrorBoundary>
          )}
        </section>
      </main>
      <Toaster />
    </div>
  )
}

export default App
