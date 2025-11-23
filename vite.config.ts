import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
        // VITE 关键修复：设置仓库路径，解决白屏问题
        base: '/-/', // 确保这里是你的仓库名，即短横线

        plugins: [
            react(),
            // 如果你的文件里还有其他插件，请在这里添加它们，例如: [react(), myCustomPlugin()]
        ],
        
        // 如果你文件里有其他配置项，如 resolve, server, build 等，请保持它们不变
    }
});
