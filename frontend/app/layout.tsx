import "./globals.css";
import type { ReactNode } from "react";
import ThemeProvider from "@/components/layout/ThemeProvider";

export const metadata = {
  title: "Enterprise KB",
  description: "Enterprise document summarizer and RAG assistant"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
