import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/pncp': {
        target: 'https://pncp.gov.br',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req) => {
            if (!req.url?.startsWith('/pncp-api/')) return
            delete proxyRes.headers['x-frame-options']
            const disposition = String(proxyRes.headers['content-disposition'] || '')
            const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] || 'arquivo'
            const extension = filename.split('.').pop()?.toLowerCase() || ''
            const previewTypes: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', txt: 'text/plain' }
            proxyRes.headers['content-disposition'] = `inline; filename="${filename.replace(/["\r\n]/g, '')}"`
            proxyRes.headers['content-type'] = previewTypes[extension] || String(proxyRes.headers['content-type'] || 'application/octet-stream')
          })
        },
        rewrite: (path) => path.startsWith('/api/pncp/domain')
          ? path.replace(/^\/api\/pncp\/domain/, '/api/pncp')
          : path.startsWith('/api/pncp/file')
            ? path.replace(/^\/api\/pncp\/file/, '/pncp-api')
            : path.replace(/^\/api\/pncp/, '/api'),
      },
      '/api/compras-gov': {
        target: 'https://dadosabertos.compras.gov.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/compras-gov/, ''),
      },
      '/api/tce-ce': {
        target: 'https://api-dados-abertos.tce.ce.gov.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/tce-ce/, '/sim'),
      },
      '/api/portal-compras-publicas': {
        target: 'https://apipcp.portaldecompraspublicas.com.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/portal-compras-publicas/, ''),
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [],
    },
  },
})
