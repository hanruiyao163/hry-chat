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
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  conversationsAtom,
  currentConversationIdAtom,
  createConversationAtom,
  deleteConversationAtom,
  sidebarOpenAtom,
  modelConfigAtom,
} from '@/lib/atoms';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [conversations] = useAtom(conversationsAtom);
  const [currentId, setCurrentId] = useAtom(currentConversationIdAtom);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const [modelConfig] = useAtom(modelConfigAtom);
  const createConversation = useSetAtom(createConversationAtom);
  const deleteConversation = useSetAtom(deleteConversationAtom);

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
      <div className="group w-14 h-full bg-zinc-50/50 dark:bg-zinc-900/50 border-r flex flex-col items-center py-4 gap-4 transition-all duration-300 ease-in-out">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChat}
          className="bg-primary/5 hover:bg-primary/10 text-primary"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-zinc-50/80 dark:bg-zinc-900/50 border-r border-border/40 flex flex-col transition-all duration-300 ease-in-out backdrop-blur-xl">
      {/* 头部 */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors cursor-default">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
            <span className="font-bold text-primary text-xs">AI</span>
          </div>
          <h2 className="font-medium text-sm text-foreground/80">HRY Chat</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* 新建对话按钮 */}
      <div className="px-4 pb-2">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-3 bg-white dark:bg-zinc-800 border shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 text-foreground transition-all"
          variant="outline"
        >
          <Plus className="h-4 w-4 text-primary" />
          <span className="text-sm">新对话</span>
        </Button>
      </div>

      {/* 会话列表标题 */}
      <div className="px-6 py-3">
        <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">最近对话</span>
      </div>

      {/* 会话列表 */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 pb-4">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-xs text-muted-foreground">开始一个新的对话吧</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-sm',
                  currentId === conv.id
                    ? 'bg-muted shadow-sm text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <MessageSquare className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  currentId === conv.id ? "text-primary" : "text-muted-foreground/50"
                )} />
                <span className="flex-1 truncate pr-6">{conv.title}</span>
                
                {/* 删除按钮 - 悬浮显示 */}
                <div className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 底部配置信息 */}
      {modelConfig && process.env.NEXT_PUBLIC_SHOW_MODEL_CONFIG === 'true' && (
        <div className="p-4 border-t border-border/40 bg-muted/20">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Settings2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground/80">
                {modelConfig.model}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {modelConfig.mock_mode ? 'Mock Mode' : modelConfig.provider}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
