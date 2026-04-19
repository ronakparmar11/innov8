import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ParticleBackground from "@/components/layout/particle-background";
import { AlertCountProvider } from "@/contexts/alert-count-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SecureSight Technologies",
  description: "Smart Safety Surveillance System with Real-Time Alerting",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Early script to remove intrusive extension-injected attributes like bis_skin_checked before React hydrates */}
        <Script id="sanitize-dom" strategy="beforeInteractive">{`
          (function(){
            try {
              var removeAttrs = function(root){
                (root||document).querySelectorAll('[bis_skin_checked]').forEach(function(el){ el.removeAttribute('bis_skin_checked'); });
              };
              removeAttrs();
              // Observe future mutations in case the extension re-injects.
              var mo = new MutationObserver(function(mutations){
                var rerun=false;
                for (var i=0;i<mutations.length;i++) {
                  var m=mutations[i];
                  if (m.type==='attributes' && m.attributeName==='bis_skin_checked') { m.target.removeAttribute('bis_skin_checked'); }
                  if (m.addedNodes) {
                    for (var j=0;j<m.addedNodes.length;j++) {
                      var n=m.addedNodes[j];
                      if (n.nodeType===1 && n.hasAttribute && n.hasAttribute('bis_skin_checked')) { rerun=true; }
                    }
                  }
                }
                if (rerun) removeAttrs();
              });
              mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['bis_skin_checked']});
            } catch(e) { /* silent */ }
          })();
        `}</Script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AlertCountProvider>
            <ParticleBackground />
            <div className="flex flex-col min-h-screen relative">
              <Header />
              <main className="flex-grow relative z-10 surface-gradient">
                {children}
              </main>
              <Footer />
            </div>
          </AlertCountProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
