'use client';

/**
 * 侧边栏组件 - 极简风格
 * 
 * 优化点：
 * - 更细腻的背景色和边框
 * - 列表项悬浮态优化
 * - 底部配置区域美化
 */
import { useAtom, useSetAtom } from 'jotai';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, Settings2, User2, Settings, LogOut, Palette, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  conversationsAtom,
  currentConversationIdAtom,
  createConversationAtom,
  deleteConversationAtom,
  sidebarOpenAtom,
} from '@/lib/atoms';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { fetchUserProfile } from '@/lib/api';
import type { UserProfile } from '@/types/user';

export function Sidebar() {
  const pathname = usePathname();
  const isChatPage = pathname === '/';
  const isKnowledgePage = pathname.startsWith('/knowledge-base');
  const [conversations] = useAtom(conversationsAtom);
  const [currentId, setCurrentId] = useAtom(currentConversationIdAtom);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const createConversation = useSetAtom(createConversationAtom);
  const deleteConversation = useSetAtom(deleteConversationAtom);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // 加载用户信息
    fetchUserProfile().then(setUserProfile).catch(console.error);
  }, []);

  const handleNewChat = () => {
    createConversation();
  };

  const handleSelectConversation = (id: string) => {
    setCurrentId(id);
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  // 收起状态
  if (!sidebarOpen) {
    return (
      <div className="group w-14 h-full bg-background border-r border-border/40 flex flex-col items-center py-4 gap-4 transition-[width] duration-300 ease-in-out">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          aria-label="展开侧边栏"
          className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg h-9 w-9 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Link
          href="/"
          aria-label="前往聊天"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isChatPage
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
        </Link>
        <Link
          href="/knowledge-base"
          aria-label="前往知识库"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isKnowledgePage
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </Link>
        {isChatPage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            aria-label="新建对话"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-9 w-9 shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-5 w-5" />
          </Button>
        )}
        
        <div className="mt-auto mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="打开用户菜单" className="rounded-xl h-10 w-10 hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8 border border-border shadow-none">
                  <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.username} />
                  <AvatarFallback className="bg-muted text-muted-foreground"><User2 className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-50 ml-2 p-1.5 rounded-2xl border-border/40 shadow-2xl bg-popover text-popover-foreground" sideOffset={10}>
              <div className="px-3 py-2.5 mb-1 bg-muted/50 rounded-xl border border-border/30 flex items-center gap-3">
                <div className="flex flex-col space-y-0.5 overflow-hidden">
                  <p className="text-[13px] font-semibold leading-none truncate text-foreground">{userProfile?.username || 'User'}</p>
                </div>
              </div>
              
              <DropdownMenuSeparator className="bg-border/40 my-1" />
              
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer focus:bg-accent text-[13px] font-medium">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>设置</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-border/40 my-1" />
              <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer text-muted-foreground hover:text-destructive focus:text-destructive focus:bg-destructive/10 text-[13px] font-medium">
                <LogOut className="h-4 w-4" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-background border-r border-border/40 flex flex-col transition-[width] duration-300 ease-in-out">
      {/* 头部 */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-accent transition-colors cursor-default group">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <span className="font-bold text-primary-foreground text-[10px]">AI</span>
          </div>
          <h2 className="font-semibold text-[15px] tracking-tight text-foreground">HRY Chat</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          aria-label="收起侧边栏"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* 一级导航 */}
      <div className="px-4 pb-2 space-y-1">
        <Link
          href="/"
          className={cn(
            "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isChatPage
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          <span>聊天</span>
        </Link>
        <Link
          href="/knowledge-base"
          className={cn(
            "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isKnowledgePage
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span>知识库</span>
        </Link>
      </div>

      {/* 新建对话按钮 */}
      {isChatPage && (
        <div className="px-4 pb-2">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm py-5 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[14px] font-medium">新对话</span>
          </Button>
        </div>
      )}

      {isChatPage ? (
        <>
          {/* 会话列表标题 */}
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em]">最近对话</span>
          </div>

          {/* 会话列表 */}
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-0.5 pb-4">
              {conversations.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 px-4"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">暂无对话记录</p>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {conversations.map((conv) => (
                    <motion.div
                      key={conv.id}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                      transition={{ layout: { duration: 0.2 }, ease: "easeOut" }}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer duration-200 text-[13.5px] transition-colors',
                        currentId === conv.id
                          ? 'bg-accent text-accent-foreground font-medium shadow-none'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                      )}
                    >
                      <MessageSquare className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        currentId === conv.id ? "text-foreground" : "text-muted-foreground/70 group-hover:text-foreground/80"
                      )} />
                      <span className="flex-1 truncate pr-2">{conv.title}</span>

                      {/* 删除按钮 - 悬浮显示 */}
                      <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="删除对话"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </>
      ) : (
        <div className="flex-1 px-5 py-8">
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
              进入知识库后，你可以管理多个文档集合，后续将直接用于智能体检索。
            </p>
          </div>
        </div>
      )}

      {/* 底部用户菜单 */}
      <div className="p-2 mt-auto border-t border-border/20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              aria-label="打开底部用户菜单"
              className={cn(
                "w-full h-auto py-2 justify-start px-2 rounded-xl duration-200 transition-colors",
                "hover:bg-accent group"
              )}
            >
              <div className="flex items-center gap-3 w-full overflow-hidden">
                <Avatar className="h-8 w-8 border border-border shadow-none transition-transform duration-200">
                  <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.username} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left min-w-0 flex-1">
                  <span className="text-[13px] font-semibold leading-none truncate w-full text-foreground">
                    {userProfile?.username || '加载中...'}
                  </span>
                </div>
                <Settings2 className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="center" 
            className="w-(--radix-dropdown-menu-trigger-width) mb-2 p-1.5 rounded-2xl border-border/40 shadow-2xl bg-popover text-popover-foreground" 
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer focus:bg-accent text-[13px] font-medium">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>设置</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer focus:bg-accent text-[13px] font-medium">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span>外观</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator className="bg-border/40 my-1" />
            
            <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer text-muted-foreground hover:text-destructive focus:text-destructive focus:bg-destructive/10 text-[13px] font-medium">
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
