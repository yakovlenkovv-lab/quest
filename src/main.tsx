import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

const pathname = window.location.pathname;
if (pathname === '/qr' || pathname === '/qr/') {
  root.innerHTML = `
    <div style="width:100vw;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d0a1e;box-sizing:border-box;overflow:hidden;padding:16px">
      <img src="/qr.png" alt="QR" style="max-width:100%;max-height:calc(100vh - 32px);width:auto;height:auto;object-fit:contain;display:block" />
    </div>
  `;
  const a = document.createElement('a');
  a.href = '/qr.png';
  a.download = 'qr.png';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
