import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // 导入你的主应用组件

const rootElement = document.getElementById('root');

// 渲染 App 组件
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
