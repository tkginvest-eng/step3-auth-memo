import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Step 3 Auth Memo",
  description: "A login-based memo app powered by Supabase Auth and database.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
