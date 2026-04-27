import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // 与 work-flow/workflow_engine/api/server.py 中 start() 默认端口 8123 一致；
    // 若用 uvicorn 等在 8000 启动后端，可在 lumina/.env 设置 WORKFLOW_API_TARGET=http://localhost:8000
    const workflowApiTarget =
      env.WORKFLOW_API_TARGET?.trim() || 'http://localhost:8123';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: workflowApiTarget,
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
