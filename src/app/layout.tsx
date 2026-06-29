import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NEXUS AI — Build Any App. Just Describe It.",
  description:
    "Multi-AI coding platform. GPT-4o clarifies your idea. Claude architects the plan. Gemini writes the code. You get a working project.",
  keywords: ["AI", "code generation", "app builder", "GPT-4o", "Claude", "Gemini"],
  openGraph: {
    title: "NEXUS AI — Build Any App",
    description: "Describe your app idea. NEXUS builds it with three AI models working together.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0A0A0F] text-[#F8F9FF]">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
