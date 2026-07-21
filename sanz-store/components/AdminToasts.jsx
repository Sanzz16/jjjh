'use client';

import { useCallback, useRef, useState } from 'react';

const ICONS = {
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
  ),
};

// Mirrors admin.html showAdminToast/dismissAdminToast: a fixed top-right
// stack of toasts, each auto-dismissing after `duration` ms, with a manual
// close button. Returned `showToast` matches the original signature.
export function useAdminToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, out: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 350);
  }, []);

  const showToast = useCallback((title, desc, type = 'info', duration = 4200) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, title, desc, type, out: false }]);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const ToastContainer = () => (
    <div id="adminToastContainer">
      {toasts.map((t) => (
        <div key={t.id} className={`admin-toast${t.out ? ' out' : ''}`}>
          <div className={`admin-toast-icon ${t.type}`}>{ICONS[t.type] || ICONS.info}</div>
          <div className="admin-toast-content">
            <p className="admin-toast-title">{t.title}</p>
            {t.desc ? <p className="admin-toast-desc">{t.desc}</p> : null}
          </div>
          <button type="button" className="admin-toast-close" onClick={() => dismiss(t.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      ))}
    </div>
  );

  return { showToast, ToastContainer };
}
