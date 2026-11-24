import { createHash } from 'node:crypto'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function desktopStyles() {
  return {
    name: 'bookshelf-desktop-fonts',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return {
          html: html.replace(/<link\b[^>]*https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\s*/g, ''),
          tags: [{ tag: 'link', attrs: { rel: 'stylesheet', href: '/src/desktop-fonts.css' } }],
        }
      },
    },
  }
}

function securityPolicy(env, desktop) {
  return {
    name: 'bookshelf-content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
      const themeHash = script ? ` 'sha256-${createHash('sha256').update(script).digest('base64')}'` : ''
      const appUrl = env.VITE_SUPABASE_URL?.trim()
      const authOrigin = /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?\/?$/i.test(appUrl ?? '')
        ? ` ${new URL(appUrl).origin}`
        : ''
      const captcha = env.VITE_TURNSTILE_SITE_KEY?.trim() ? ' https://challenges.cloudflare.com' : ''
      const policy = [
        "default-src 'self'",
        `script-src 'self'${themeHash}${captcha}`,
        `style-src 'self' 'unsafe-inline'${desktop ? '' : ' https://fonts.googleapis.com'}`,
        `font-src 'self'${desktop ? '' : ' https://fonts.gstatic.com'}`,
        "img-src 'self' data: blob: https://covers.openlibrary.org https://archive.org https://*.archive.org",
        `connect-src 'self' https://openlibrary.org${authOrigin}`,
        `frame-src${captcha || " 'none'"}`,
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
      ].join('; ')
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }]
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  const exposesSecret = Object.entries(env).some(([name, value]) =>
    /SERVICE_ROLE|CLIENT_SECRET|SUPABASE_SECRET|TURNSTILE_SECRET/.test(name) || value.trim().startsWith('sb_secret_'),
  )
  if (exposesSecret || (key && !key.startsWith('sb_publishable_'))) {
    throw new Error('Only public credentials can be configured in VITE_ variables. Use a Supabase publishable key.')
  }
  const desktop = mode === 'mac'
  return { plugins: [react(), tailwindcss(), desktop && desktopStyles(), securityPolicy(env, desktop)] }
})
