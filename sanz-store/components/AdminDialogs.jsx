'use client';

import { useCallback, useRef, useState } from 'react';

const CONFIRM_ICONS = {
  danger: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
  ),
  question: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  ),
};

// Mirrors admin.html showConfirmDialog(opts): Promise<boolean>
export function useAdminConfirm() {
  const [state, setState] = useState(null); // { title, desc, type, okLabel }
  const resolverRef = useRef(null);

  const showConfirmDialog = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: opts.title || 'Konfirmasi',
        desc: opts.desc || 'Apakah kamu yakin?',
        type: opts.type || 'question',
        okLabel: opts.okLabel || 'YA, LANJUTKAN',
      });
    });
  }, []);

  const finish = (result) => {
    setState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  const ConfirmDialog = () => (
    <div id="confirmDialogOverlay" className={state ? 'open' : ''}>
      {state && (
        <div className="confirm-dialog-box">
          <div className={`confirm-dialog-icon ${state.type}`}>{CONFIRM_ICONS[state.type] || CONFIRM_ICONS.question}</div>
          <h3 className="confirm-dialog-title">{state.title}</h3>
          <p className="confirm-dialog-desc">{state.desc}</p>
          <div className="confirm-dialog-actions">
            <button type="button" className="btn-secondary" style={{ background: '#f3f4f6' }} onClick={() => finish(false)}>BATAL</button>
            <button
              type="button"
              className="btn-primary justify-center"
              style={state.type === 'danger' ? { background: '#dc2626' } : undefined}
              onClick={() => finish(true)}
            >
              {state.okLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return { showConfirmDialog, ConfirmDialog };
}

// Mirrors admin.html showPromptDialog(opts): Promise<string|null>
export function useAdminPrompt() {
  const [state, setState] = useState(null); // { title, desc, placeholder, okLabel, defaultValue, required }
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const resolverRef = useRef(null);

  const showPromptDialog = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setValue(opts.defaultValue || '');
      setShowError(false);
      setState({
        title: opts.title || 'Masukkan Teks',
        desc: opts.desc || 'Silakan isi kolom di bawah.',
        placeholder: opts.placeholder || 'Ketik di sini...',
        okLabel: opts.okLabel || 'KIRIM',
        required: opts.required !== false,
      });
    });
  }, []);

  const finish = (result) => {
    setState(null);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  const onOk = () => {
    const val = value.trim();
    if (state.required && !val) {
      setShowError(true);
      return;
    }
    finish(val);
  };

  const PromptDialog = () => (
    <div id="promptDialogOverlay" className={state ? 'open' : ''}>
      {state && (
        <div className="prompt-dialog-box">
          <div className="prompt-dialog-icon" id="promptDialogIcon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 6.5l4 4L7 21H3v-4L13.5 6.5z" /><path d="M17.5 2.5a2.121 2.121 0 0 1 3 3l-1.5 1.5-3-3 1.5-1.5z" /></svg>
          </div>
          <h3 className="prompt-dialog-title">{state.title}</h3>
          <p className="prompt-dialog-desc">{state.desc}</p>
          <div className="prompt-dialog-input-wrap">
            <textarea
              className="prompt-dialog-textarea"
              placeholder={state.placeholder}
              value={value}
              autoFocus
              style={showError ? { borderColor: '#dc2626' } : undefined}
              onChange={(e) => { setValue(e.target.value); if (showError) setShowError(false); }}
              onKeyDown={(e) => { if (e.key === 'Escape') finish(null); }}
            />
            <div className={`prompt-dialog-error${showError ? '' : ' hidden'}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span>Kolom ini wajib diisi.</span>
            </div>
          </div>
          <div className="prompt-dialog-actions">
            <button type="button" className="btn-secondary" style={{ background: '#f3f4f6' }} onClick={() => finish(null)}>BATAL</button>
            <button type="button" className="btn-primary justify-center" onClick={onOk}>{state.okLabel}</button>
          </div>
        </div>
      )}
    </div>
  );

  return { showPromptDialog, PromptDialog };
}
