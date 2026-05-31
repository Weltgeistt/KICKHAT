import React from 'react';
import { useChatStore } from '../store/chatStore';

export default function ToastContainer() {
  const toasts = useChatStore((s) => s.toasts);

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          {toast.type === 'success' && <span style={{ color: 'var(--kick-green)' }}>✓</span>}
          {toast.type === 'error' && <span style={{ color: 'var(--mod-ban)' }}>✕</span>}
          {toast.type === 'warning' && <span style={{ color: 'var(--mod-timeout)' }}>⚠</span>}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
