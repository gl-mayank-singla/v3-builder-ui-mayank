import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves the app at /<repo-name>/ (see .github/workflows/deploy-pages.yml)
const repoBase = '/v3-builder-ui-mayank/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? repoBase : '/',
  plugins: [react()],
})) 
