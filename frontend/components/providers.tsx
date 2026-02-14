'use client';

/**
 * 全局 Providers
 * 包含 Jotai 和其他需要的 Provider
 */
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <JotaiProvider>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </JotaiProvider>
    </ThemeProvider>
  );
}
