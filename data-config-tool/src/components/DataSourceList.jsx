import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Database, Pencil, Trash2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  queryDataSourceList,
  saveDataSource,
  deleteDataSource
} from '@/lib/sdk'

const DATABASE_TYPES = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'sqlserver', label: 'SQL Server' },
  { value: 'other', label: 'Other' },
]

export function DataSourceList({ dataSources, setDataSources, selectedSource, onSelectSource }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: '',
    type: 'mysql',
    driver: ''
  })

  const waitForSdk = useCallback(async (timeout = 6000, interval = 200) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (isSdkAvailable()) return true
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    throw new Error('SDK 未就绪，请稍后重试')
  }, [])

  // 加载数据源列表
  const loadDataSources = useCallback(async () => {
    setLoading(true)
    try {
      await waitForSdk()
      const result = await queryDataSourceList()
      setDataSources(result.list || [])
      hasLoadedRef.current = true
      console.log('[DataSourceList] 从 SDK 加载数据源:', result.list)
    } catch (error) {
      console.error('[DataSourceList] 加载数据源失败:', error)
      alert('加载数据源失败: ' + error.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setDataSources, waitForSdk])

  // 用 useRef 防止重复加载
  const hasLoadedRef = React.useRef(false)

  // SDK 登录成功后加载数据
  useEffect(() => {
    const handleSdkLoggedIn = () => {
      if (hasLoadedRef.current) return
      console.log('[DataSourceList] SDK 已登录，开始加载数据')
      loadDataSources()
    }

    // 如果已经登录，直接加载
    if (window.sdkLoggedIn && !hasLoadedRef.current) {
      loadDataSources()
    }

    // 监听 SDK 登录成功事件
    window.addEventListener('sdkLoggedIn', handleSdkLoggedIn)
    return () => {
      window.removeEventListener('sdkLoggedIn', handleSdkLoggedIn)
    }
  }, [loadDataSources])

  const handleOpenDialog = (source = null) => {
    if (source) {
      setEditingSource(source)
      setFormData({ ...source })
    } else {
      setEditingSource(null)
      setFormData({
        name: '',
        url: '',
        username: '',
        password: '',
        type: 'mysql',
        driver: ''
      })
    }
    // 使用 setTimeout 确保状态已更新
    setTimeout(() => setIsDialogOpen(true), 0)
  }

  const handleSave = async () => {
    // 空值校验
    if (!formData.name?.trim()) {
      alert('请输入数据源名称')
      return
    }
    if (!formData.type) {
      alert('请选择数据库类型')
      return
    }
    if (!formData.url?.trim()) {
      alert('请输入数据源url')
      return
    }
    if (!formData.username?.trim()) {
      alert('请输入用户名')
      return
    }

    setSaving(true)
    try {
      // 构建保存数据
      const dataToSave = {
        name: formData.name,
        type: formData.type,
        driver: formData.driver,
        url: formData.url,
        username: formData.username,
        password: formData.password
      };

      // 如果是编辑模式，添加 id
      if (editingSource?.id) {
        dataToSave.id = editingSource.id
      }

      // 调用 SDK 保存
      if (isSdkAvailable()) {
        await saveDataSource(dataToSave)
        // 重新加载列表，刷新节点信息
        await loadDataSources()
        console.log('[DataSourceList] 数据源保存成功，已刷新列表')
      } else {
        // SDK 不可用时使用本地状态
        if (editingSource) {
          setDataSources(dataSources.map(ds =>
            ds.id === editingSource.id ? { ...dataToSave, id: editingSource.id } : ds
          ))
        } else {
          setDataSources([...dataSources, { ...dataToSave, id: Date.now() }])
        }
      }

      // 关闭对话框
      setTimeout(() => {
        setIsDialogOpen(false)
      }, 200)
    } catch (error) {
      console.error('[DataSourceList] 保存失败:', error)
      alert('保存失败: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      if (isSdkAvailable()) {
        await deleteDataSource(id)
        // 重新加载列表
        await loadDataSources()
      } else {
        setDataSources(dataSources.filter(ds => ds.id !== id))
      }
    } catch (error) {
      console.error('[DataSourceList] 删除失败:', error)
      alert('删除失败: ' + error.message)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">数据源列表</h2>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={loadDataSources} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && dataSources.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            加载中...
          </div>
        )}
        {dataSources.map((source) => (
          <div
            key={source.id}
            className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors hover:bg-accent group ${selectedSource?.id === source.id ? 'bg-accent border-l-2 border-primary' : ''
              }`}
            onClick={() => onSelectSource(source)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Database className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{source.name}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenDialog(source)
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {dataSources.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            暂无数据源，点击上方添加按钮创建
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSource ? '编辑数据源' : '添加数据源'}</DialogTitle>
            <DialogDescription>
              配置 JDBC 连接信息
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">数据源名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 生产环境数据库"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">数据库类型</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择数据库类型" />
                </SelectTrigger>
                <SelectContent>
                  {DATABASE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver">数据库驱动</Label>
              <Input
                id="driver"
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                placeholder="例如: com.mysql.cj.jdbc.Driver"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">数据源url</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="例如: jdbc:mysql://localhost:3306/mydb"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="root"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="******"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
