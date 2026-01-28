'use client';

/**
 * 全局 Providers
 * 包含 Jotai 和其他需要的 Provider
 */
import { Provider as JotaiProvider } from 'jotai';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <JotaiProvider>
      {children}
    </JotaiProvider>
  );
}
