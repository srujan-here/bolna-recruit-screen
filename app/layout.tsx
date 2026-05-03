import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bolna Recruit Screen",
  description: "Voice AI candidate pre-screening for high-volume hiring.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-brand inline-block" />
              Recruit Screen
              <span className="text-muted text-xs font-normal">on Bolna</span>
            </a>
            <a
              href="https://www.bolna.ai/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted hover:text-text"
            >
              Bolna docs ↗
            </a>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
