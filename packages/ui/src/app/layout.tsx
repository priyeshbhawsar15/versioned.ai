import type { Metadata } from 'next';
import './globals.css';
import { RunProvider } from '@/context/RunContext';

export const metadata: Metadata = {
  title: 'Versioned.AI',
  description: 'AI Prompt Playground & Regression Evaluation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="font-sans bg-[#0b1326] text-[#dae2fd] h-screen overflow-hidden flex flex-col antialiased"
      >
        <RunProvider>
          {children}
        </RunProvider>
      </body>
    </html>
  );
}
