'use client';

/**
 * 引用气泡组件
 * 鼠标悬浮时显示引用原文
 */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExternalLink } from 'lucide-react';
import type { Citation } from '@/types/chat';

interface CitationTooltipProps {
  citation: Citation;
  children: React.ReactNode;
}

export function CitationTooltip({ citation, children }: CitationTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-sm p-0 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={8}
        >
          <div className="bg-popover text-popover-foreground overflow-hidden rounded-2xl">
            {/* 标题 */}
            <div className="px-3 py-1 bg-muted/10 border-b">
              <h4 className="font-medium text-sm truncate">
                {citation.title}
              </h4>
            </div>
            
            {/* 内容 */}
            <div className="px-3 py-2">
              <p className="text-sm text-muted-foreground line-clamp-4">
                {citation.content}
              </p>
            </div>
            
            {/* 来源 */}
            {citation.source && (
              <div className="px-3 py-1 border-t bg-muted/30">
                <a 
                  href={`https://${citation.source}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  {citation.source}
                </a>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
