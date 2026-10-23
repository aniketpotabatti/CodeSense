import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AuthProvider } from "@/lib/auth/provider";
import appCss from "../styles.css?url";

const APP_NAME = "CodeSense";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "CodeSense explains, reviews, and completes code as you write — a live GenAI editor.",
      },
      { name: "theme-color", content: "#0c0d10" },
      // Content-Security-Policy. Keeps the grok.com branding injector working
      // while restricting other sources. Snippets/keys are never logged.
      {
        httpEquiv: "Content-Security-Policy",
        content:
          "default-src 'self'; " +
          // 'unsafe-inline' required by TanStack Start inline bootstrap scripts.
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://grok.com https://cdn.jsdelivr.net; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "connect-src 'self' https://api.x.ai https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://grok.com; " +
          "img-src 'self' data:; " +
          "worker-src 'self' blob:;",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              className: "bg-surface-2 text-foreground shadow-border",
            }}
          />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
