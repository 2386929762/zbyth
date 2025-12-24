import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination.jsx'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

export function PaginationBar({
    totalSize,
    currentPage,
    pageSize,
    onPageChange,
    onPageSizeChange
}) {
    const totalPages = Math.ceil(totalSize / pageSize)

    return (
        <div className="flex items-center justify-end gap-4 px-4 py-3 border-t bg-muted/20">
            <div className="text-sm text-muted-foreground whitespace-nowrap">
                共 {totalSize} 条
            </div>
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                    </PaginationItem>

                    {/* 页码 */}
                    {(() => {
                        const pages = []

                        if (totalPages <= 7) {
                            for (let i = 1; i <= totalPages; i++) {
                                pages.push(i)
                            }
                        } else {
                            if (currentPage <= 3) {
                                pages.push(1, 2, 3, 4, '...', totalPages)
                            } else if (currentPage >= totalPages - 2) {
                                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                            } else {
                                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
                            }
                        }

                        return pages.map((page, index) => (
                            <PaginationItem key={index}>
                                {page === '...' ? (
                                    <PaginationEllipsis />
                                ) : (
                                    <PaginationLink
                                        onClick={() => onPageChange(page)}
                                        isActive={currentPage === page}
                                        className="cursor-pointer"
                                    >
                                        {page}
                                    </PaginationLink>
                                )}
                            </PaginationItem>
                        ))
                    })()}

                    <PaginationItem>
                        <PaginationNext
                            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
            <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm text-muted-foreground">每页</span>
                <Select value={pageSize.toString()} onValueChange={onPageSizeChange}>
                    <SelectTrigger className="h-[35px] w-[70px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">条</span>
            </div>
        </div>
    )
}
