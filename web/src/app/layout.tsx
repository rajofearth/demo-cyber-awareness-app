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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
  ],
};

// Runs before the browser paints so the stored theme is applied with no flash.
const themeScript = `(function(){try{var t=localStorage.getItem("ph-theme");if(t!=="light"){t="dark"}var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.classList.toggle("light",t==="light");r.dataset.theme=t}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Permission Harvest — Cyber Awareness Demo",
  description:
    "Live dashboard for the calculator awareness demo: what phones give away when you tap Allow without reading.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-bezel text-ink">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
