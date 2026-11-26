import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Nitro must precede tanstackStart(): it owns the build step that turns Start's
  // server/client environments into the .output/server + .output/public layout
  // Vercel's TanStack Start preset deploys.
  plugins: [tailwindcss(), nitro(), tanstackStart(), viteReact()],
})

export default config
