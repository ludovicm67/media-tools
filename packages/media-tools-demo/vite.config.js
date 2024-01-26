import basicSsl from '@vitejs/plugin-basic-ssl'

export default {
  plugins: [
    basicSsl()
  ],
  server: {
    proxy: {
      '/backend': {
        target: 'http://localhost:3000',
        changeOrigin: false,
        secure: false,
        ws: false,
        rewrite: (path) => path.replace(/^\/backend/, '')
      }
    }
  }
}
