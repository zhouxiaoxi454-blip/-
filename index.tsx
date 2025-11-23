import React from 'react';
import ReactDOM from 'react-dom/client';

// 这是最小化渲染测试代码。它绕过了 App.tsx 中的所有复杂逻辑。
const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <div style={{ 
        padding: '50px', 
        fontSize: '24px', 
        color: 'green', 
        backgroundColor: '#f0f0f0',
        height: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        textAlign: 'center'
      }}>
        🎉 部署测试成功！资源路径加载正确。🎉
      </div>
    </React.StrictMode>
  );
}
