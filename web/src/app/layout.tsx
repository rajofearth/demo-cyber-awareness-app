import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ReactDOM from "react-dom";
import { ConvexClientProvider } from "@/components/convex-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const convexBase = (process.env.NEXT_PUBLIC_CONVEX_URL ?? "").replace(/https:\/\//, "");
const convexCloud = convexBase ? `https://${convexBase.replace(".site", ".cloud")}` : "";
const convexSite = convexBase ? `https://${convexBase.replace(".cloud", ".site")}` : "";
if (convexCloud) {
  ReactDOM.preconnect(convexCloud);
  ReactDOM.preconnect(convexSite);
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#141312",
};

export const metadata: Metadata = {
  title: "Permission Harvest — Cyber Awareness Demo",
  description:
    "Live dashboard for the calculator awareness demo: what phones give away when you tap Allow without reading.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#141312] text-[#f8f8f4]">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
