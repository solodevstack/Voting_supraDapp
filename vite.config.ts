import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// No need for @tailwindcss/vite here
export default defineConfig({
  plugins: [react()],
})
