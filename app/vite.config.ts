import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Mesmo endereço do app antigo (lucaswmguimaraes.github.io/financial/) = mesmo localStorage.
export default defineConfig({
  base: '/financial/',
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom' },
})
