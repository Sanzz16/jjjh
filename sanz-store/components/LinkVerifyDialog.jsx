'use client';

import { useCallback, useState } from 'react';

// Mirrors admin.html verifyAlightMotionLink(oid, submittedLink): a dialog with
// 3 actions -> cancel / verify (YA SELESAIKAN) / return (BALIKIN, link salah).
export function useLinkVerifyDialog({ showConfirmDialog, showToast, api, onDone }) {
  const [state, setState] = useState(null); // { oid, submittedLink }
  const [msg, setMsg] = useState('');

  const open = useCallback((oid, submittedLink) => {
    setMsg('');
    setState({ oid, submittedLink });
  }, []);

  const close = () => setState(null);

  const onCopy = () => {
    navigator.clipboard.writeText(state.submittedLink || '')
      .then(() => showToast('Tersalin!', 'Link user disalin ke clipboard.', 'success', 2000))
      .catch(() => showToast('Gagal Menyalin', 'Tidak bisa menyalin otomatis.', 'error'));
  };

  const onOk = async () => {
    const message = msg.trim();
    try {
      await api.verifyOrderLink(state.oid, 'verify', message);
      showToast('Pesanan Selesai!', 'Link Alight Motion terverifikasi dan pesanan selesai.', 'success');
      close();
      onDone();
    } catch (err) {
      showToast('Gagal', err.message, 'error');
    }
  };

  const onReturn = async () => {
    const message = msg.trim();
    const confirmed = await showConfirmDialog({
      title: 'Balikin Link ke User?',
      desc: 'Link akan dihapus dan user diminta mengirim link baru (misalnya karena link salah atau tidak valid).',
      type: 'danger',
      okLabel: 'YA, BALIKIN',
    });
    if (!confirmed) return;
    try {
      await api.verifyOrderLink(state.oid, 'return', message);
      showToast('Link Dikembalikan', 'User akan diminta mengirim link baru.', 'success');
      close();
      onDone();
    } catch (err) {
      showToast('Gagal', err.message, 'error');
    }
  };

  const LinkVerifyDialog = () => (
    <div id="linkVerifyOverlay" className={state ? 'open' : ''}>
      {state && (
        <div className="link-verify-box">
          <div className="link-verify-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
          </div>
          <h3 className="link-verify-title">Verifikasi Link Alight Motion</h3>
          <p className="link-verify-desc">Link yang dikirim user, periksa apakah valid dan pesanan bisa diselesaikan.</p>
          <div className="link-verify-linkbox">
            <span>{state.submittedLink || '-'}</span>
            <button type="button" className="link-verify-copy" title="Salin link" onClick={onCopy}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            </button>
          </div>
          <div className="link-verify-msg-wrap">
            <label className="link-verify-msg-label">Kirim Pesan ke User (opsional)</label>
            <textarea
              className="link-verify-msg-input"
              placeholder="Tulis pesan untuk user, misalnya alasan link ditolak..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
          </div>
          <div className="link-verify-actions">
            <div className="row-2">
              <button type="button" className="btn-link-cancel" onClick={close}>BATAL</button>
              <button type="button" className="btn-link-ok" onClick={onOk}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                YA, SELESAIKAN
              </button>
            </div>
            <button type="button" className="btn-link-return" title="Link salah/tidak valid, minta user kirim ulang" onClick={onReturn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
              BALIKIN (LINK SALAH / KIRIM ULANG)
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return { openLinkVerify: open, LinkVerifyDialog };
}
