import basicSsl from '@vitejs/plugin-basic-ssl'

export default {
  plugins: [
    basicSsl()
  ],
  server: {
    proxy: {
      '/backend': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
        secure: false,
        ws: false,
        rewrite: (path) => path.replace(/^\/backend/, '')
      }
    }
  }
}
