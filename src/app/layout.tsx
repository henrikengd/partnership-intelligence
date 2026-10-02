import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Partnership Intelligence",
  description:
    "Find the next useful partnership through your needs and relationships.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
