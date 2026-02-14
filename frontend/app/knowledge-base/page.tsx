'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, BookOpen, Clock, FileText, Loader2, MoreVertical, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { createKnowledgeBase, deleteKnowledgeBase, fetchKnowledgeBases, updateKnowledgeBase } from '@/lib/api';
import type { KnowledgeBase } from '@/types/knowledge-base';

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(iso));
}

// 生成一个基于名称的确定性颜色，用于图标背景
function getIconColor(name: string) {
  const colors = [
    'bg-primary/10 text-primary',
    'bg-secondary text-secondary-foreground',
    'bg-accent text-accent-foreground',
    'bg-muted text-muted-foreground',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function KnowledgeBasePage() {
  const prefersReducedMotion = useReducedMotion();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  // Create/Edit Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingKbId, setEditingKbId] = useState<string | null>(null);
  const [kbName, setKbName] = useState('');
  const [kbDescription, setKbDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetchKnowledgeBases()
      .then((list) => {
        if (!mounted) return;
        setKnowledgeBases(list);
      })
      .catch(() => {
        if (!mounted) return;
        toast.error('加载知识库失败，请检查后端服务是否可用。');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredKbs = knowledgeBases.filter(kb => 
    kb.name.toLowerCase().includes(keyword.toLowerCase()) || 
    kb.description.toLowerCase().includes(keyword.toLowerCase())
  );

  function openCreateDialog() {
    setDialogMode('create');
    setEditingKbId(null);
    setKbName('');
    setKbDescription('');
    setErrorMessage(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(kb: KnowledgeBase) {
    setDialogMode('edit');
    setEditingKbId(kb.id);
    setKbName(kb.name);
    setKbDescription(kb.description);
    setErrorMessage(null);
    setIsDialogOpen(true);
  }

  async function handleSubmit() {
    const name = kbName.trim();
    if (!name) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      if (dialogMode === 'create') {
        const created = await createKnowledgeBase({
          name,
          description: kbDescription.trim() || undefined,
        });
        setKnowledgeBases((prev) => [created, ...prev]);
        toast.success('知识库创建成功');
      } else if (dialogMode === 'edit' && editingKbId) {
        const updated = await updateKnowledgeBase(editingKbId, {
          name,
          description: kbDescription.trim() || undefined,
        });
        setKnowledgeBases((prev) => prev.map(kb => kb.id === editingKbId ? updated : kb));
        toast.success('知识库更新成功');
      }
      setIsDialogOpen(false);
    } catch {
      setErrorMessage(dialogMode === 'create' ? '创建失败，可能名称已存在' : '更新失败，可能名称已存在');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteKnowledgeBase(deleteTarget.id);
      setKnowledgeBases((prev) => prev.filter(kb => kb.id !== deleteTarget.id));
      toast.success('知识库已删除');
      setDeleteTarget(null);
    } catch {
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 py-6">
      <div className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:border-ring/40 transition-colors shadow-sm"
              aria-label="返回聊天"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">知识库管理</h1>
              <p className="text-sm text-muted-foreground">管理您的文档集合，用于 AI 问答上下文。</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索知识库..."
                className="pl-9 bg-card"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <Button onClick={openCreateDialog} className="gap-2 shadow-sm shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">新建知识库</span>
              <span className="sm:hidden">新建</span>
            </Button>
          </div>
        </div>

        <section>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 rounded-xl border border-border bg-card animate-pulse" />
              ))}
            </div>
          ) : filteredKbs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-border bg-muted/20">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">
                {keyword ? '未找到匹配的知识库' : '暂无知识库'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm">
                {keyword ? '请尝试更换搜索关键词。' : '创建一个知识库来开始上传和管理您的文档。'}
              </p>
              {!keyword && (
                <Button onClick={openCreateDialog} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  立即创建
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredKbs.map((kb) => (
                  <motion.div
                    key={kb.id}
                    layout
                    initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
                    animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 group relative bg-card">
                      <Link href={`/knowledge-base/${kb.id}`} className="absolute inset-0 z-0" aria-label={`进入 ${kb.name}`} />
                      
                      <CardHeader className="pb-3 relative z-10 flex flex-row items-start justify-between space-y-0 gap-2">
                        <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center shadow-sm ${getIconColor(kb.name)}`}>
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">更多操作</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(kb)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              编辑信息
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteTarget(kb)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除知识库
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      
                      <CardContent className="pb-3 min-h-18 relative z-0 pointer-events-none">
                        <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors mb-2">
                          {kb.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-sm">
                          {kb.description || '暂无描述'}
                        </CardDescription>
                      </CardContent>
                      
                      <CardFooter className="mt-auto pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground relative z-0 pointer-events-none">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{kb.document_count} 文档</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatTime(kb.updated_at)}</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? '新建知识库' : '编辑知识库'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' 
                ? '创建一个新的知识库来管理您的文档集合。' 
                : '修改知识库的名称和描述信息。'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-left">
                名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={kbName}
                onChange={(e) => setKbName(e.target.value)}
                placeholder="例如：产品文档、技术规范..."
                className="col-span-3"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-left">
                描述
              </Label>
              <Input
                id="description"
                value={kbDescription}
                onChange={(e) => setKbDescription(e.target.value)}
                placeholder="简要描述知识库的用途..."
                className="col-span-3"
                autoComplete="off"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-destructive font-medium">{errorMessage}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !kbName.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogMode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除知识库</DialogTitle>
            <DialogDescription>
              确定要删除知识库 <span className="font-medium text-foreground">{deleteTarget?.name}</span> 吗？
              <br />
              此操作将永久删除该知识库及其包含的所有文档，无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
