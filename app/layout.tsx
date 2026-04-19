import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AlertCountProvider } from "@/contexts/alert-count-context";
import RootShell from "@/components/layout/root-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SecureSight — AI Surveillance",
  description: "Smart Safety Surveillance System with Real-Time Alerting",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="sanitize-dom" strategy="beforeInteractive">{`
          (function(){
            try {
              var removeAttrs = function(root){
                (root||document).querySelectorAll('[bis_skin_checked]').forEach(function(el){ el.removeAttribute('bis_skin_checked'); });
              };
              removeAttrs();
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
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AlertCountProvider>
            <RootShell>{children}</RootShell>
          </AlertCountProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
