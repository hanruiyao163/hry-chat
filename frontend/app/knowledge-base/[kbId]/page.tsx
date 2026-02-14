'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import throttle from 'lodash/throttle';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  batchKnowledgeDocuments,
  deleteKnowledgeDocument,
  downloadKnowledgeDocument,
  fetchKnowledgeBases,
  fetchKnowledgeDocuments,
  previewKnowledgeDocument,
  updateKnowledgeDocument,
  updateKnowledgeDocumentTags,
  uploadKnowledgeDocuments,
} from '@/lib/api';
import type { KnowledgeBase, KnowledgeDocument } from '@/types/knowledge-base';

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function formatContentType(contentType: string, filename: string): string {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith('.docx')) return 'DOCX';
  if (lowerName.endsWith('.pdf')) return 'PDF';
  if (lowerName.endsWith('.md')) return 'Markdown';
  if (lowerName.endsWith('.txt')) return 'TXT';
  if (!contentType) return '-';
  const [, subtype = contentType] = contentType.split('/');
  return subtype.toUpperCase();
}

interface PageProps {
  params: Promise<{ kbId: string }>;
}

export default function KnowledgeDocumentPage({ params }: PageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [kbId, setKbId] = useState<string>('');
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'filename' | 'created_at' | 'size_bytes' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState<'rename' | 'replace' | 'cancel'>('rename');

  const [refreshAt, setRefreshAt] = useState<Date | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [previewFilename, setPreviewFilename] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDocument | null>(null);
  const [renameTarget, setRenameTarget] = useState<KnowledgeDocument | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [tagTarget, setTagTarget] = useState<KnowledgeDocument | null>(null);
  const [tagValue, setTagValue] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const togglePendingRef = useRef<Record<string, boolean>>({});
  const toggleInFlightRef = useRef<Record<string, boolean>>({});
  const toggleConfirmedRef = useRef<Record<string, boolean>>({});
  const toggleThrottlesRef = useRef<Record<string, ReturnType<typeof throttle>>>({});

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const TOGGLE_THROTTLE_MS = 800;

  const loadDocuments = useCallback(async () => {
    if (!kbId) return;
    setIsLoading(true);
    try {
      const result = await fetchKnowledgeDocuments(kbId, {
        keyword: keyword || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        status: statusFilter === 'all' ? undefined : statusFilter,
        file_type: typeFilter || undefined,
        page,
        page_size: pageSize,
      });
      setDocuments(result.items);
      toggleConfirmedRef.current = Object.fromEntries(result.items.map((item) => [item.id, item.is_enabled]));
      setTotal(result.total);
      setRefreshAt(new Date());
    } catch {
      toast.error('加载文档失败');
    } finally {
      setIsLoading(false);
    }
  }, [kbId, keyword, sortBy, sortOrder, statusFilter, typeFilter, page, pageSize]);

  useEffect(() => {
    params.then((p) => setKbId(p.kbId));
  }, [params]);

  useEffect(() => {
    if (!kbId) return;
    fetchKnowledgeBases()
      .then((list) => setKnowledgeBase(list.find((x) => x.id === kbId) ?? null)
      )
      .catch(() => toast.error('加载知识库信息失败'));
  }, [kbId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDocuments();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadDocuments]);

  useEffect(() => {
    setSelectedIds([]);
  }, [documents]);

  const flushToggleUpdate = useCallback(async (documentId: string) => {
    if (!kbId || toggleInFlightRef.current[documentId]) return;
    const desiredEnabled = togglePendingRef.current[documentId];
    if (typeof desiredEnabled !== 'boolean') return;
    const confirmedEnabled = toggleConfirmedRef.current[documentId];
    if (typeof confirmedEnabled === 'boolean' && desiredEnabled === confirmedEnabled) {
      delete togglePendingRef.current[documentId];
      return;
    }

    toggleInFlightRef.current[documentId] = true;
    try {
      await updateKnowledgeDocument(kbId, documentId, { is_enabled: desiredEnabled });
      toggleConfirmedRef.current[documentId] = desiredEnabled;
      if (togglePendingRef.current[documentId] === desiredEnabled) {
        delete togglePendingRef.current[documentId];
      }
    } catch {
      const rollbackEnabled = toggleConfirmedRef.current[documentId];
      if (typeof rollbackEnabled === 'boolean') {
        setDocuments((prev) =>
          prev.map((doc) => (doc.id === documentId ? { ...doc, is_enabled: rollbackEnabled } : doc))
        );
      }
      delete togglePendingRef.current[documentId];
      toast.error('更新状态失败');
    } finally {
      toggleInFlightRef.current[documentId] = false;
      const latestPending = togglePendingRef.current[documentId];
      const latestConfirmed = toggleConfirmedRef.current[documentId];
      if (typeof latestPending === 'boolean' && latestPending !== latestConfirmed) {
        const throttled = toggleThrottlesRef.current[documentId];
        throttled?.();
      }
    }
  }, [kbId]);

  const getToggleThrottled = useCallback((documentId: string) => {
    if (!toggleThrottlesRef.current[documentId]) {
      toggleThrottlesRef.current[documentId] = throttle(
        () => {
          void flushToggleUpdate(documentId);
        },
        TOGGLE_THROTTLE_MS,
        { leading: false, trailing: true }
      );
    }
    return toggleThrottlesRef.current[documentId];
  }, [TOGGLE_THROTTLE_MS, flushToggleUpdate]);

  const scheduleToggleUpdate = useCallback((documentId: string, nextEnabled: boolean) => {
    togglePendingRef.current[documentId] = nextEnabled;
    getToggleThrottled(documentId)();
  }, [getToggleThrottled]);

  useEffect(() => {
    return () => {
      Object.values(toggleThrottlesRef.current).forEach((throttled) => {
        throttled.cancel();
      });
    };
  }, []);

  async function handleUpload(files: FileList | null) {
    if (!kbId || !files || files.length === 0) return;
    setIsUploading(true);
    try {
      await uploadKnowledgeDocuments(kbId, Array.from(files), conflictStrategy);
      toast.success('上传成功');
      await loadDocuments();
    } catch {
      toast.error('上传失败，请检查冲突策略或文件格式');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleToggleEnabled(doc: KnowledgeDocument, nextEnabled: boolean) {
    setDocuments((prev) =>
      prev.map((item) => (item.id === doc.id ? { ...item, is_enabled: nextEnabled } : item))
    );
    scheduleToggleUpdate(doc.id, nextEnabled);
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await updateKnowledgeDocument(kbId, renameTarget.id, { filename: renameValue.trim() });
      toast.success('重命名成功');
      setRenameTarget(null);
      setRenameValue('');
      await loadDocuments();
    } catch {
      toast.error('重命名失败，可能名称重复');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteKnowledgeDocument(kbId, deleteTarget.id);
      toast.success('删除成功');
      setDeleteTarget(null);
      await loadDocuments();
    } catch {
      toast.error('删除失败');
    }
  }

  async function handleBatch(operation: 'delete' | 'enable' | 'disable') {
    if (selectedIds.length === 0) return;
    try {
      await batchKnowledgeDocuments(kbId, { operation, document_ids: selectedIds });
      toast.success('批量操作已完成');
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      await loadDocuments();
    } catch {
      toast.error('批量操作失败');
    }
  }

  async function handleDownload(docId: string) {
    try {
      await downloadKnowledgeDocument(kbId, docId);
      toast.info('下载已开始');
    } catch {
      toast.error('下载失败');
    }
  }

  async function handlePreview(doc: KnowledgeDocument) {
    setPreviewFilename(doc.filename);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const result = await previewKnowledgeDocument(kbId, doc.id);
      setPreviewText(result.content);
    } catch {
      setPreviewText('预览失败，当前文件可能不支持预览。');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSaveTags() {
    if (!tagTarget) return;
    const tags = tagValue
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    try {
      await updateKnowledgeDocumentTags(kbId, tagTarget.id, { tags });
      toast.success('标签已更新');
      setTagTarget(null);
      setTagValue('');
      await loadDocuments();
    } catch {
      toast.error('标签更新失败');
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const allChecked = useMemo(
    () => documents.length > 0 && documents.every((doc) => selectedIds.includes(doc.id)),
    [documents, selectedIds]
  );

  function toggleSelectAll() {
    if (allChecked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(documents.map((x) => x.id));
  }

  function handleSortChange(column: 'filename' | 'created_at' | 'size_bytes' | 'status') {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortOrder(column === 'filename' ? 'asc' : 'desc');
  }

  function SortButton({ column, label }: { column: 'filename' | 'created_at' | 'size_bytes' | 'status'; label: string }) {
    const active = sortBy === column;
    return (
      <button
        type="button"
        onClick={() => handleSortChange(column)}
        className="group mx-auto inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
      >
        <span>{label}</span>
        {active ? (
          sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-80 transition-opacity" />
        )}
      </button>
    );
  }

  return (
    <main className="min-h-screen bg-background px-2 md:px-4 py-6">
      <div className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Link href="/knowledge-base" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              返回知识库
            </Link>
            <h1 className="text-xl font-semibold truncate">{knowledgeBase?.name || '知识库文档'}</h1>
          </div>
          <div className="text-xs text-muted-foreground">
            上次刷新：{refreshAt ? formatTime(refreshAt.toISOString()) : '未刷新'}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-56 max-w-96">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <Input
                name="keyword"
                aria-label="关键字搜索"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索文件名/标签…"
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value: 'all' | 'enabled' | 'disabled') => {
                setStatusFilter(value as 'all' | 'enabled' | 'disabled');
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="状态筛选" className="w-32">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent position="popper" className="min-w-0 w-32">
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="enabled">已启用</SelectItem>
                <SelectItem value="disabled">已禁用</SelectItem>
              </SelectContent>
            </Select>
            <Input
              name="fileType"
              aria-label="类型筛选"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              placeholder="类型筛选"
              className="w-32"
            />
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={loadDocuments}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              刷新
            </Button>

            <div className="h-5 w-px bg-border/70 mx-1" />

            <input
              ref={fileInputRef}
              id="doc-upload-input"
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Select
              value={conflictStrategy}
              onValueChange={(value: 'rename' | 'replace' | 'cancel') => setConflictStrategy(value)}
            >
              <SelectTrigger aria-label="上传冲突策略" className="w-32">
                <SelectValue placeholder="自动重命名" />
              </SelectTrigger>
              <SelectContent position="popper" className="min-w-0 w-32">
                <SelectItem value="rename">自动重命名</SelectItem>
                <SelectItem value="replace">同名覆盖</SelectItem>
                <SelectItem value="cancel">取消上传</SelectItem>
              </SelectContent>
            </Select>
            {selectedIds.length > 0 && (
              <>
                <div className="h-5 w-px bg-border/70 mx-1" />
                <span className="text-sm text-muted-foreground">已选 {selectedIds.length} 项</span>
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>批量删除</Button>
              </>
            )}
            <Button type="button" size="sm" className="ml-auto gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
              上传文档
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">
                  <div className="flex justify-center">
                    <Checkbox aria-label="全选文档" checked={allChecked} onCheckedChange={toggleSelectAll} />
                  </div>
                </TableHead>
                <TableHead className="text-center"><SortButton column="filename" label="文件名" /></TableHead>
                <TableHead className="text-center">类型</TableHead>
                <TableHead className="text-center"><SortButton column="size_bytes" label="大小" /></TableHead>
                <TableHead className="text-center"><SortButton column="created_at" label="上传时间" /></TableHead>
                <TableHead className="text-center"><SortButton column="status" label="状态" /></TableHead>
                <TableHead className="text-center">上传人</TableHead>
                <TableHead className="text-center">来源</TableHead>
                <TableHead className="text-center">标签</TableHead>
                <TableHead className="w-14 text-center">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <div className="py-2 text-center text-sm text-muted-foreground">加载中…</div>
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <div className="py-2 text-center text-sm text-muted-foreground">暂无文档</div>
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          aria-label={`选择文档 ${doc.filename}`}
                          checked={selectedIds.includes(doc.id)}
                          onCheckedChange={() => toggleSelect(doc.id)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-55 truncate text-center">{doc.filename}</TableCell>
                    <TableCell className="text-center">{formatContentType(doc.content_type, doc.filename)}</TableCell>
                    <TableCell className="text-center">{formatBytes(doc.size_bytes)}</TableCell>
                    <TableCell className="text-center">{formatTime(doc.created_at)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-x-2">
                        <Switch
                          checked={doc.is_enabled}
                          onCheckedChange={(checked) => handleToggleEnabled(doc, checked)}
                          className="data-[state=checked]:bg-green-600/80"
                          aria-label={`${doc.filename} 启用状态开关`}
                        />
                        <span className="text-xs text-muted-foreground">{doc.is_enabled ? '已启用' : '已禁用'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{doc.uploaded_by}</TableCell>
                    <TableCell className="text-center">{doc.source}</TableCell>
                    <TableCell className="max-w-45 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {doc.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag}</span>
                        ))}
                        {doc.tags.length > 2 && <span className="text-xs text-muted-foreground">+{doc.tags.length - 2}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="打开文档操作">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameTarget(doc);
                              setRenameValue(doc.filename);
                            }}
                          >
                            重命名
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(doc.id)}>
                            <Download className="h-4 w-4" />
                            下载
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setTagTarget(doc);
                              setTagValue(doc.tags.join(', '));
                            }}
                          >
                            <Tag className="h-4 w-4" />
                            编辑标签
                          </DropdownMenuItem>
                          {doc.filename.endsWith('.md') || doc.filename.endsWith('.txt') ? (
                            <DropdownMenuItem onClick={() => handlePreview(doc)}>
                              <Eye className="h-4 w-4" />
                              预览
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={() => setDeleteTarget(doc)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">共 {total} 条</div>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="每页条数" className="w-28" size="sm">
                <SelectValue placeholder="10 / 页" />
              </SelectTrigger>
              <SelectContent position="popper" className="min-w-0 w-28">
                <SelectItem value="10">10 / 页</SelectItem>
                <SelectItem value="20">20 / 页</SelectItem>
                <SelectItem value="50">50 / 页</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              下一页
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除文档</DialogTitle>
            <DialogDescription>删除后会同时移除对象存储中的文件，无法恢复。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名文档</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} aria-label="新文件名" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>取消</Button>
            <Button onClick={handleRename}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(tagTarget)} onOpenChange={(open) => !open && setTagTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
            <DialogDescription>使用英文逗号分隔多个标签。</DialogDescription>
          </DialogHeader>
          <Input value={tagValue} onChange={(e) => setTagValue(e.target.value)} aria-label="标签输入" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagTarget(null)}>取消</Button>
            <Button onClick={handleSaveTags}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量删除文档</DialogTitle>
            <DialogDescription>将删除 {selectedIds.length} 个文档，操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={() => handleBatch('delete')}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="top-0 right-0 left-auto translate-x-0 translate-y-0 h-screen max-w-2xl w-[96vw] rounded-none border-l overflow-hidden">
          <DialogHeader>
            <DialogTitle className="truncate">{previewFilename}</DialogTitle>
          </DialogHeader>
          <div className="h-full overflow-auto rounded-md border border-border/70 bg-muted/30 p-3">
            {previewLoading ? (
              <div className="text-sm text-muted-foreground">加载预览…</div>
            ) : (
              <pre className="text-xs whitespace-pre-wrap wrap-break-word">{previewText}</pre>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </main>
  );
}
