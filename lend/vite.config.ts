import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Upload source maps to Sentry only when both keys are present.
      // In dev / when Sentry is not configured this plugin is a no-op.
      ...(env.SENTRY_AUTH_TOKEN && env.VITE_SENTRY_DSN
        ? [sentryVitePlugin({
            org:     env.SENTRY_ORG,
            project: env.SENTRY_PROJECT,
            authToken: env.SENTRY_AUTH_TOKEN,
            sourcemaps: { assets: './dist/**' },
            release: { name: env.VITE_RELEASE },
            telemetry: false,
          })]
        : []),
    ],
    // Emit source maps in production so Sentry can show real stack traces.
    // The plugin strips them from the public bundle after uploading.
    build: { sourcemap: true },
    define: {
      // Expose git commit SHA as VITE_RELEASE if provided by CI/Vercel.
      'import.meta.env.VITE_RELEASE': JSON.stringify(env.VITE_RELEASE ?? ''),
    },
  }
})
