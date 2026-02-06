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
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, Settings2, User2, Settings, LogOut, HelpCircle, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  conversationsAtom,
  currentConversationIdAtom,
  createConversationAtom,
  deleteConversationAtom,
  sidebarOpenAtom,
  modelConfigAtom,
} from '@/lib/atoms';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { fetchUserProfile } from '@/lib/api';
import type { UserProfile } from '@/types/user';

export function Sidebar() {
  const [conversations] = useAtom(conversationsAtom);
  const [currentId, setCurrentId] = useAtom(currentConversationIdAtom);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const [modelConfig] = useAtom(modelConfigAtom);
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
      <div className="group w-14 h-full bg-white dark:bg-zinc-950 border-r border-border/40 flex flex-col items-center py-4 gap-4 transition-all duration-300 ease-in-out">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg h-9 w-9"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChat}
          className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg h-9 w-9 shadow-sm"
        >
          <Plus className="h-5 w-5" />
        </Button>
        
        <div className="mt-auto mb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-800 shadow-none">
                  <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.username} />
                  <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500"><User2 className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-[200px] ml-2 p-1.5 rounded-2xl border-border/40 shadow-2xl bg-white dark:bg-zinc-950" sideOffset={10}>
              <div className="px-3 py-2.5 mb-1 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-border/10 flex items-center gap-3">
                <div className="flex flex-col space-y-0.5 overflow-hidden">
                  <p className="text-[13px] font-semibold leading-none truncate text-zinc-900 dark:text-zinc-100">{userProfile?.username || 'User'}</p>
                </div>
              </div>
              
              <DropdownMenuSeparator className="bg-border/40 my-1" />
              
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-900 text-[13px] font-medium">
                  <Settings className="h-4 w-4 text-zinc-400" />
                  <span>设置</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-border/40 my-1" />
              <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer text-zinc-500 hover:text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/30 text-[13px] font-medium">
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
    <div className="w-72 h-full bg-white dark:bg-zinc-950 border-r border-border/40 flex flex-col transition-all duration-300 ease-in-out">
      {/* 头部 */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-default group">
          <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <span className="font-bold text-white dark:text-zinc-900 text-[10px]">AI</span>
          </div>
          <h2 className="font-semibold text-[15px] tracking-tight text-zinc-900 dark:text-zinc-100">HRY Chat</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* 新建对话按钮 */}
      <div className="px-4 pb-2">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-xl shadow-sm transition-all py-5"
        >
          <Plus className="h-4 w-4" />
          <span className="text-[14px] font-medium">新对话</span>
        </Button>
      </div>

      {/* 会话列表标题 */}
      <div className="px-6 py-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.05em]">最近对话</span>
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
              <div className="h-10 w-10 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-5 w-5 text-zinc-300" />
              </div>
              <p className="text-xs text-zinc-400 font-medium">暂无对话记录</p>
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
                    'group relative flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 text-[13.5px]',
                    currentId === conv.id
                      ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium shadow-none'
                      : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                  )}
                >
                  <MessageSquare className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    currentId === conv.id ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-400"
                  )} />
                  <span className="flex-1 truncate pr-2">{conv.title}</span>
                  
                  {/* 删除按钮 - 悬浮显示 */}
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
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

      {/* 底部用户菜单 */}
      <div className="p-2 mt-auto border-t border-border/20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={cn(
                "w-full h-auto py-2 justify-start px-2 rounded-xl transition-all duration-200",
                "hover:bg-zinc-100 dark:hover:bg-zinc-900 group"
              )}
            >
              <div className="flex items-center gap-3 w-full overflow-hidden">
                <Avatar className="h-8 w-8 border border-zinc-200 dark:border-zinc-800 shadow-none transition-transform duration-200">
                  <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.username} />
                  <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    <User2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left min-w-0 flex-1">
                  <span className="text-[13px] font-semibold leading-none truncate w-full text-zinc-900 dark:text-zinc-100">
                    {userProfile?.username || '加载中...'}
                  </span>
                </div>
                <Settings2 className="h-4 w-4 text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="center" 
            className="w-[var(--radix-dropdown-menu-trigger-width)] mb-2 p-1.5 rounded-2xl border-border/40 shadow-2xl bg-white dark:bg-zinc-950" 
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-900 text-[13px] font-medium">
                <Settings className="h-4 w-4 text-zinc-400" />
                <span>设置</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-900 text-[13px] font-medium">
                <Palette className="h-4 w-4 text-zinc-400" />
                <span>外观</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator className="bg-border/40 my-1" />
            
            <DropdownMenuItem className="gap-2.5 p-2.5 rounded-xl cursor-pointer text-zinc-500 hover:text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/30 text-[13px] font-medium">
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
