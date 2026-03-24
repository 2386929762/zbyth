import { useState } from 'react'
import { Banner } from '@/components/Banner'
import { DataSourceList } from '@/components/DataSourceList'
import { TableManagement } from '@/components/TableManagement'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Toaster } from '@/components/ui/toaster'
import type { DataSource, TableInfo } from '@/lib/sdk'
import './App.css'

function App() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Banner */}
      <Banner />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Data Sources */}
        <div className="w-64 border-r bg-card flex-shrink-0">
          <ErrorBoundary>
            <DataSourceList
              dataSources={dataSources}
              setDataSources={setDataSources}
              selectedSource={selectedSource}
              onSelectSource={setSelectedSource}
            />
          </ErrorBoundary>
        </div>

        {/* Right Panel - Table Management */}
        <div className="flex-1 overflow-hidden">
          <ErrorBoundary>
            {selectedSource ? (
              <TableManagement
                selectedSource={selectedSource}
                tables={tables}
                setTables={setTables}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                请先选择左侧的数据源
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>

      <Toaster />
    </div>
  )
}

export default App
