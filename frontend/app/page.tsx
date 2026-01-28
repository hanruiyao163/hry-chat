'use client';

/**
 * 主页面 - 聊天界面
 */
import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Sidebar, ChatWindow } from '@/components/chat';
import { modelConfigAtom, conversationsAtom, currentConversationIdAtom } from '@/lib/atoms';
import { fetchModelConfig } from '@/lib/api';

export default function Home() {
  const setModelConfig = useSetAtom(modelConfigAtom);
  const [conversations] = useAtom(conversationsAtom);
  const [currentId, setCurrentId] = useAtom(currentConversationIdAtom);

  // 获取模型配置
  useEffect(() => {
    fetchModelConfig()
      .then(config => setModelConfig(config))
      .catch(err => console.error('Failed to fetch config:', err));
  }, [setModelConfig]);

  // 确保有当前会话
  useEffect(() => {
    if (conversations.length > 0 && !currentId) {
      setCurrentId(conversations[0].id);
    }
  }, [conversations, currentId, setCurrentId]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}
