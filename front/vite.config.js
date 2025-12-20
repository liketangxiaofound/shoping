import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve:{
    alias:{
      '@':path.resolve(__dirname,'./src')
    }
  },
  server:{
    port:3001,
    proxy: {
          '/api': {  // 将所有以 /api 开头的请求
            target: 'http://localhost:3000',  // 代理到 3000 端口
            changeOrigin: true,
            secure: false
          }
        }
    }
})
