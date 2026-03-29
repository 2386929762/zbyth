import React, { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  isSdkAvailable,
  queryUserList,
  type User,
} from '@/lib/sdk'

interface UserSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectUser: (user: User) => void
}

export function UserSelector({
  open,
  onOpenChange,
  onSelectUser,
}: UserSelectorProps) {
  const [searchText, setSearchText] = useState('')
  const [keyword, setKeyword] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [totalSize, setTotalSize] = useState(0)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Load users when dialog opens or when pagination/keyword changes
  useEffect(() => {
    if (open) {
      loadUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentPage, pageSize, keyword])

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSearchText('')
      setKeyword('')
      setCurrentPage(1)
      setUsers([])
      setTotalSize(0)
      setSelectedUser(null)
    }
  }, [open])

  const handleConfirm = () => {
    if (selectedUser) {
      onSelectUser(selectedUser)
      onOpenChange(false)
    }
  }

  const loadUsers = async () => {
    if (!isSdkAvailable()) return
    setLoadingUsers(true)
    try {
      const result = await queryUserList(keyword || null, currentPage, pageSize)
      setUsers(result.list)
      setTotalSize(result.totalSize)
    } catch (error) {
      console.error('[UserSelector] 获取用户列表失败:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSearch = () => {
    setKeyword(searchText)
    setCurrentPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] h-[600px] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>选择用户</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-6">
          <div className="pb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="搜索用户名、姓名或编号（按Enter搜索）" 
                  value={searchText} 
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 h-9" 
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSearch} disabled={loadingUsers}>
                <Search className="h-4 w-4 mr-2" />搜索
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto border rounded-md min-h-0">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">加载中...</div>
            ) : (
              <Table className="w-full">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>用户名</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>编号</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow 
                        key={user.code} 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => setSelectedUser(user)}
                        data-state={selectedUser?.code === user.code ? "selected" : undefined}
                      >
                        <TableCell className="text-sm">{user.userName}</TableCell>
                        <TableCell className="text-sm">{user.fullName}</TableCell>
                        <TableCell className="font-mono text-sm">{user.code}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">暂无数据</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          <PaginationBar 
            totalSize={totalSize} 
            currentPage={currentPage} 
            pageSize={pageSize} 
            onPageChange={setCurrentPage} 
            onPageSizeChange={(size) => {
              setPageSize(parseInt(size))
              setCurrentPage(1)
            }}
            showPageNumbers={false}
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleConfirm} disabled={!selectedUser}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
