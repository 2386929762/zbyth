import { useState } from 'react'
import { X } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { DataSourceList } from '@/components/DataSourceList'
import { TableManagement } from '@/components/TableManagement'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ErrorBoundary from '@/components/ErrorBoundary'
import './App.css'

function App() {
  const [dataSources, setDataSources] = useState([])
  const [tables, setTables] = useState([])
  const [openTabs, setOpenTabs] = useState([])
  const [activeTab, setActiveTab] = useState(null)

  // 检查是否为 compact 模式
  const isCompact = new URLSearchParams(window.location.search).get('compact') === '1'

  // 当数据源更新时,同步更新openTabs中的数据
  const handleSetDataSources = (newDataSources) => {
    setDataSources(newDataSources)

    // 更新openTabs中的数据源信息
    if (openTabs.length > 0) {
      const updatedTabs = openTabs.map(tab => {
        const updatedSource = newDataSources.find(ds => ds.id === tab.id)
        return updatedSource || tab
      })
      setOpenTabs(updatedTabs)
    }
  }

  const handleSelectSource = (source) => {
    // 如果该数据源tab未打开，则打开
    if (!openTabs.find(tab => tab.id === source.id)) {
      setOpenTabs([...openTabs, source])
    }
    // 切换到该tab
    setActiveTab(source.id.toString())
  }

  const handleCloseTab = (tabId, e) => {
    e.stopPropagation()
    const newTabs = openTabs.filter(tab => tab.id !== tabId)
    setOpenTabs(newTabs)

    // 如果关闭的是当前激活的tab，切换到下一个tab
    if (activeTab === tabId.toString()) {
      if (newTabs.length > 0) {
        setActiveTab(newTabs[newTabs.length - 1].id.toString())
      } else {
        setActiveTab(null)
      }
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部导航栏（支持 compact 模式隐藏）*/}
      {!isCompact && (
        <header className="border-b bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold">数据表管理工具</h1>
              <p className="text-sm text-muted-foreground">管理数据源和数据表配置</p>
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
              selectedSource={openTabs.find(tab => tab.id.toString() === activeTab)}
              onSelectSource={handleSelectSource}
            />
          </ErrorBoundary>
        </aside>

        {/* 右侧Tab页区域 */}
        <section className="flex-1 bg-background flex flex-col">
          {openTabs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              请从左侧选择数据源
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b bg-background h-auto p-0 gap-0">
                {openTabs.map((tab) => (
                  <div key={tab.id} className="relative group inline-flex items-center">
                    <TabsTrigger
                      value={tab.id.toString()}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2 pr-8"
                    >
                      {tab.name}
                    </TabsTrigger>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 inline-flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-sm transition-opacity"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      type="button"
                      aria-label="关闭标签页"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </TabsList>
              {openTabs.map((tab) => (
                <TabsContent
                  key={tab.id}
                  value={tab.id.toString()}
                  className="flex-1 mt-0 overflow-hidden"
                >
                  <ErrorBoundary>
                    <TableManagement
                      selectedSource={tab}
                      tables={tables}
                      setTables={setTables}
                    />
                  </ErrorBoundary>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
