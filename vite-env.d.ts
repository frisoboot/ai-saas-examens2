/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ADMIN_EMAILS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Facebook Pixel
declare function fbq(...args: unknown[]): void
