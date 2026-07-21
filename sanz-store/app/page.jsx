'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useToasts } from '@/components/Toasts';
import { usePaymentTimer } from '@/components/usePaymentTimer';
import { renderQRCode } from '@/lib/qris';

const CATEGORY_ICONS = {
  all: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>,
  'Top-up Game': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="6" /><path d="M7 10v4" /><path d="M5 12h4" /><circle cx="16" cy="10.5" r="1" /><circle cx="18" cy="13.5" r="1" /></svg>,
  'Akun Streaming': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 18v3" /><polygon points="10 8 15 11 10 14 10 8" /></svg>,
  'Akun Sosmed': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="6" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>,
  'Voucher Digital': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.24L3 3v6.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83z" /><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" /></svg>,
  default: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 9h6v6H9z" /></svg>,
};
function getCategoryIcon(name) { return CATEGORY_ICONS[name] || CATEGORY_ICONS.default; }

const SITE_STATUS_ICONS = {
  maintenance: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  busy: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
};
const SITE_STATUS_TITLES = { maintenance: 'Sedang Maintenance', busy: 'Server Sedang Sibuk' };
const SITE_STATUS_DEFAULT_DESC = {
  maintenance: 'Toko sedang dalam perbaikan sistem. Mohon tunggu sebentar, kami akan segera kembali.',
  busy: 'Server sedang menerima banyak trafik. Mohon coba beberapa saat lagi ya.',
};

const HISTORY_KEY = 'sanzxmzz_purchase_history';
const SEEN_FEED_KEY = 'sanzxmzz_seen_feed_ids';
const SITE_STATUS_DISMISS_KEY = 'sanzxmzz_site_status_dismissed';
const FAB_HINT_KEY = 'sanzxmzz_fab_hint_dismissed';

const STATUS_LABEL = { pending: 'Menunggu Konfirmasi', processing: 'Sedang Diproses', waiting_link: 'Kirim Link Alight Motion', completed: 'Berhasil', cancelled: 'Dibatalkan' };
const STATUS_LABEL_SHORT = { pending: 'Menunggu', completed: 'Berhasil', cancelled: 'Dibatalkan' };
const STATUS_ICON = {
  pending: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  waiting_link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  completed: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  cancelled: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
};

const FAQ_ITEMS = [
  { q: 'Berapa lama proses konfirmasi pesanan?', a: 'Setelah bukti transfer dikirim, admin biasanya mengkonfirmasi dalam hitungan menit hingga maksimal 1x24 jam pada jam sibuk.' },
  { q: 'Apakah akun yang dibeli bergaransi?', a: 'Ya, setiap akun yang dijual melalui sistem ini melewati pengecekan stok otomatis. Jika ada kendala, silakan hubungi admin via WhatsApp dengan menyertakan ID Transaksi.' },
  { q: 'Bagaimana cara melacak transaksi saya?', a: 'Gunakan ID Transaksi yang tertera pada riwayat pembelian atau pesan konfirmasi WhatsApp. ID ini bisa dicari langsung oleh admin untuk melihat detail lengkap pesanan.' },
  { q: 'Metode pembayaran apa saja yang tersedia?', a: 'Tersedia DANA, OVO, GOPAY, dan QRIS (scan otomatis dengan nominal yang sudah sesuai). Admin dapat menambah metode baru sewaktu-waktu.' },
  { q: 'Kenapa waktu pembayaran saya habis?', a: 'Setiap sesi checkout memiliki batas waktu 1 menit untuk menyelesaikan pembayaran demi menjaga keakuratan harga dan ketersediaan stok. Jika habis, silakan pilih ulang metode pembayaran untuk memulai sesi baru.' },
  { q: 'Bagaimana proses request Alight Motion?', a: 'Isi Gmail (dan password bila diminta), lanjutkan ke pembayaran. Setelah dikonfirmasi admin, kamu akan diminta mengirim link Alight Motion dari admin. Setelah link tersebut kamu kirim balik dan diverifikasi admin, pesanan dinyatakan sukses.' },
];

function escapeHtml(str) { return str == null ? '' : String(str); }

function maskName(name) {
  if (!name) return 'Seseorang';
  const trimmed = name.trim().split(' ')[0];
  if (trimmed.length <= 2) return trimmed.charAt(0) + '***';
  return trimmed.substring(0, 3) + '***';
}

function censorTxnId(id) {
  if (!id) return 'acak-sanzxmzz-' + Date.now().toString(36).toUpperCase();
  const str = String(id).replace(/-/g, '');
  const seg = (str.substring(0, 4) + str.substring(str.length - 4)).toUpperCase();
  return 'acak-sanzxmzz-' + seg;
}

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
}
function getSeenFeedIds() {
  try {
    const raw = localStorage.getItem(SEEN_FEED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
function markFeedSeen(ids) {
  try {
    let seen = getSeenFeedIds().concat(ids);
    if (seen.length > 200) seen = seen.slice(seen.length - 200);
    localStorage.setItem(SEEN_FEED_KEY, JSON.stringify(seen));
  } catch (e) { /* ignore */ }
}

export default function StorefrontPage() {
  const { showToast, ToastContainer } = useToasts();
  const paymentTimer = usePaymentTimer();
  const qrisBoxRef = useRef(null);

  // ---- global data ----
  const [products, setProducts] = useState([]);
  const [stockByProduct, setStockByProduct] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([{ value: 'all', label: 'Semua Kategori' }]);
  const [siteSettings, setSiteSettings] = useState({});
  const [banner, setBanner] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  // ---- search/filter ----
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // ---- site status overlay ----
  const [siteStatusOverlayOpen, setSiteStatusOverlayOpen] = useState(false);

  // ---- fab menu / hint ----
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [fabHintVisible, setFabHintVisible] = useState(false);
  const fabLongPressTimerRef = useRef(null);
  const fabLongPressTriggeredRef = useRef(false);

  // ---- order/checkout modal ----
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutTab, setCheckoutTab] = useState('main');
  const [orderQty, setOrderQty] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [userName, setUserName] = useState('');
  const [userContact, setUserContact] = useState('');
  const [reqGmail, setReqGmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [paymentMethodSel, setPaymentMethodSel] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [dropzoneDragOver, setDropzoneDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [waLink, setWaLink] = useState('#');

  // ---- history drawer / txn detail ----
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [txnDetailIdx, setTxnDetailIdx] = useState(null);
  const [resendLinkValue, setResendLinkValue] = useState('');
  const [resendLinkSending, setResendLinkSending] = useState(false);

  // ---- other modals ----
  const [allTxnModalOpen, setAllTxnModalOpen] = useState(false);
  const [allTxnList, setAllTxnList] = useState(null); // null = loading
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [faqOpenIdx, setFaqOpenIdx] = useState(null);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [leaderboardList, setLeaderboardList] = useState(null); // null = loading

  const [liveFeedToasts, setLiveFeedToasts] = useState([]);
  const liveFeedIdRef = useRef(0);

  // ============================================================
  // INITIAL LOAD
  // ============================================================
  useEffect(() => {
    api.getSettings().then((res) => setSiteSettings(res.settings || {})).catch(() => {});
    api.getActiveBanner().then((b) => setBanner(b)).catch(() => {});
    api.getActiveAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => {});
    api.getCategories().then((res) => {
      const opts = [{ value: 'all', label: 'Semua Kategori' }];
      (res.data || []).forEach((c) => opts.push({ value: c.name, label: c.name }));
      setCategoryOptions(opts);
    }).catch(() => {});
    api.getProducts().then((res) => setProducts(res.data || [])).catch(() => {});
    api.getStock().then((res) => setStockByProduct(res.data || {})).catch(() => {});
    api.getActivePaymentMethods().then((res) => setPaymentMethods(res.data || [])).catch(() => {});
    setHistoryList(getHistory());

    const dismissed = (() => { try { return localStorage.getItem(FAB_HINT_KEY) === '1'; } catch (e) { return false; } })();
    if (!dismissed) setFabHintVisible(true);
  }, []);

  // Apply site status overlay whenever settings change
  useEffect(() => {
    const status = siteSettings.site_status || 'normal';
    if (status !== 'maintenance' && status !== 'busy') {
      setSiteStatusOverlayOpen(false);
      return;
    }
    const signature = status + '::' + (siteSettings.site_status_reason || '');
    let dismissedSignature = null;
    try { dismissedSignature = localStorage.getItem(SITE_STATUS_DISMISS_KEY); } catch (e) { /* ignore */ }
    if (dismissedSignature !== signature) setSiteStatusOverlayOpen(true);
  }, [siteSettings.site_status, siteSettings.site_status_reason]);

  const closeSiteStatusOverlay = (skipRemember) => {
    setSiteStatusOverlayOpen(false);
    if (!skipRemember) {
      const status = siteSettings.site_status || 'normal';
      const signature = status + '::' + (siteSettings.site_status_reason || '');
      try { localStorage.setItem(SITE_STATUS_DISMISS_KEY, signature); } catch (e) { /* ignore */ }
    }
  };

  // ============================================================
  // POLLING: stock refresh, live feed, history sync (mirrors index.html init())
  // ============================================================
  useEffect(() => {
    const stockInterval = setInterval(() => {
      api.getStock().then((res) => setStockByProduct(res.data || {})).catch(() => {});
    }, 8000);
    const settingsInterval = setInterval(() => {
      api.getSettings().then((res) => setSiteSettings(res.settings || {})).catch(() => {});
    }, 10000);
    return () => { clearInterval(stockInterval); clearInterval(settingsInterval); };
  }, []);

  const pollLiveFeed = useCallback(() => {
    api.getLiveFeed().then((res) => {
      const data = res.data || [];
      const seen = getSeenFeedIds();
      const unseen = data.filter((o) => seen.indexOf(o.id) === -1);
      if (unseen.length === 0) {
        markFeedSeen(data.map((o) => o.id));
        return;
      }
      unseen.slice(0, 3).reverse().forEach((o, idx) => {
        setTimeout(() => showLiveFeedToast(o), idx * 1200);
      });
      markFeedSeen(data.map((o) => o.id));
    }).catch(() => {});
  }, []);

  const showLiveFeedToast = (order) => {
    const id = ++liveFeedIdRef.current;
    setLiveFeedToasts((prev) => [...prev, { id, order }]);
    setTimeout(() => {
      setLiveFeedToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6200);
  };

  useEffect(() => {
    const t = setTimeout(pollLiveFeed, 3000);
    const interval = setInterval(pollLiveFeed, 15000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [pollLiveFeed]);

  const syncOrderHistoryStatus = useCallback(() => {
    const list = getHistory();
    const pendingOrders = list.filter((o) => (o.status === 'pending' || o.status === 'processing' || o.status === 'waiting_link') && o.order_id);
    if (pendingOrders.length === 0) return;
    const ids = pendingOrders.map((o) => o.order_id);
    api.getOrdersByIds(ids).then((res) => {
      const data = res.data;
      if (!data) return;
      let changed = false;
      data.forEach((serverOrder) => {
        const localOrder = list.find((o) => o.order_id === serverOrder.id);
        if (!localOrder) return;
        if (serverOrder.admin_note !== localOrder.admin_note) { localOrder.admin_note = serverOrder.admin_note; changed = true; }
        if (serverOrder.request_link !== localOrder.request_link) { localOrder.request_link = serverOrder.request_link; changed = true; }
        if (serverOrder.admin_message !== localOrder.admin_message) { localOrder.admin_message = serverOrder.admin_message; changed = true; }
        if (Number(serverOrder.link_rejected_count || 0) !== Number(localOrder.link_rejected_count || 0)) {
          localOrder.link_rejected_count = serverOrder.link_rejected_count || 0; changed = true;
        }
        if (serverOrder.status !== localOrder.status) {
          const prevStatus = localOrder.status;
          localOrder.status = serverOrder.status;
          changed = true;
          if (serverOrder.status === 'completed') {
            const accs = [];
            if (serverOrder.order_accounts && serverOrder.order_accounts.length > 0) {
              serverOrder.order_accounts.forEach((oa) => { if (oa.accounts) accs.push(oa.accounts); });
            } else if (serverOrder.accounts) {
              accs.push(serverOrder.accounts);
            }
            localOrder.accounts = accs;
            localOrder.admin_note = serverOrder.admin_note;
            showToast('Pesanan Dikonfirmasi!', localOrder.product_name + ' berhasil diproses.', 'success');
          } else if (serverOrder.status === 'waiting_link' && prevStatus !== 'waiting_link') {
            showToast('Pembayaran Dikonfirmasi!', 'Silakan kirim link Alight Motion kamu di riwayat pembelian.', 'info', 5000);
          }
        }
      });
      if (changed) {
        saveHistory(list);
        setHistoryList(list);
      }
    }).catch(() => {});
  }, [showToast]);

  useEffect(() => {
    const interval = setInterval(syncOrderHistoryStatus, 10000);
    syncOrderHistoryStatus();
    return () => clearInterval(interval);
  }, [syncOrderHistoryStatus]);

  const pendingHistoryCount = historyList.filter((o) => o.status === 'pending').length;

  // ============================================================
  // PRODUCT FILTER
  // ============================================================
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchName = (p.name || '').toLowerCase().includes(q);
    const matchDesc = p.description && p.description.toLowerCase().includes(q);
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    return (matchName || matchDesc) && matchCat;
  });

  const getStockCount = (productId) => stockByProduct[productId] || 0;

  const selectCategoryOption = (value) => {
    setCategoryFilter(value);
    setCategoryDropdownOpen(false);
  };

  // ============================================================
  // CATEGORY DROPDOWN close-on-outside-click / Escape
  // ============================================================
  const categoryDropdownRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false);
      }
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setCategoryDropdownOpen(false); };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // ============================================================
  // FAB LONG PRESS (open menu) vs short tap (open history)
  // ============================================================
  const FAB_LONG_PRESS_MS = 450;
  const fabLongPressStart = () => {
    fabLongPressTriggeredRef.current = false;
    clearTimeout(fabLongPressTimerRef.current);
    fabLongPressTimerRef.current = setTimeout(() => {
      fabLongPressTriggeredRef.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      setFabMenuOpen(true);
      dismissFabHint();
    }, FAB_LONG_PRESS_MS);
  };
  const fabLongPressCancel = () => clearTimeout(fabLongPressTimerRef.current);
  const dismissFabHint = (e) => {
    if (e) e.stopPropagation();
    setFabHintVisible(false);
    try { localStorage.setItem(FAB_HINT_KEY, '1'); } catch (err) { /* ignore */ }
  };
  const onFabClick = () => {
    if (fabLongPressTriggeredRef.current) {
      fabLongPressTriggeredRef.current = false;
      return;
    }
    setHistoryModalOpen(true);
    setHistoryList(getHistory());
  };

  useEffect(() => {
    if (!fabMenuOpen) return;
    const onDocClick = (e) => {
      const wrap = document.getElementById('fabMenuWrap');
      const fabBtn = document.getElementById('historyFabBtn');
      if (wrap && !wrap.contains(e.target) && e.target.id !== 'historyFabBtn' && fabBtn && !fabBtn.contains(e.target)) {
        setFabMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [fabMenuOpen]);

  // ============================================================
  // ORDER MODAL
  // ============================================================
  const resetUploadDropzone = () => {
    setProofFile(null);
    setProofPreview('');
  };

  const openOrderModal = (id) => {
    if (siteSettings.site_status === 'maintenance' || siteSettings.site_status === 'busy') {
      setSiteStatusOverlayOpen(true);
      return;
    }
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const stock = getStockCount(p.id);
    if (stock <= 0) {
      showToast('Stok Habis', 'Produk ini sedang tidak tersedia.', 'warning');
      return;
    }
    setSelectedProduct(p);
    setOrderQty(1);
    setSelectedPrice(Number(p.price));
    setUserName('');
    setUserContact('');
    setReqGmail('');
    setReqPassword('');
    setPaymentMethodSel('');
    resetUploadDropzone();
    paymentTimer.stopPaymentTimer();
    setCheckoutTab(p.is_open_request ? 'request' : 'main');
    setOrderModalOpen(true);
  };

  const closeOrderModal = () => {
    setOrderModalOpen(false);
    paymentTimer.stopPaymentTimer();
  };

  const selectedStock = selectedProduct ? getStockCount(selectedProduct.id) : 0;
  const maxQty = Math.min(20, selectedStock);

  const qtyMinus = () => { if (orderQty > 1) setOrderQty((q) => q - 1); };
  const qtyPlus = () => {
    if (orderQty < maxQty) {
      setOrderQty((q) => q + 1);
    } else {
      showToast('Batas Maksimal', `Maksimal ${maxQty} akun per transaksi.`, 'warning');
    }
  };

  const onProofFileSelected = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File Terlalu Besar', 'Maksimal ukuran file 5MB.', 'error');
      resetUploadDropzone();
      return;
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const onProofInputChange = (e) => onProofFileSelected(e.target.files[0]);
  const removeUploadedProof = (e) => { e.preventDefault(); e.stopPropagation(); resetUploadDropzone(); };
  const onDropzoneDrop = (e) => {
    e.preventDefault();
    setDropzoneDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onProofFileSelected(file);
  };

  const onPaymentMethodChange = (value) => {
    setPaymentMethodSel(value);
    if (value) {
      paymentTimer.startPaymentTimer();
      if (value.toUpperCase() === 'QRIS') {
        setTimeout(() => {
          if (qrisBoxRef.current) {
            const totalAmountNow = (selectedPrice || 0) * (orderQty || 1);
            renderQRCode(qrisBoxRef.current, totalAmountNow);
          }
        }, 0);
      }
    } else {
      paymentTimer.stopPaymentTimer();
    }
  };

  const selectedPaymentMethodObj = paymentMethods.find((pm) => pm.name.toUpperCase() === paymentMethodSel.toUpperCase());
  const totalAmount = (selectedPrice || 0) * (orderQty || 1);

  // Re-render QRIS whenever amount changes while QRIS is selected
  useEffect(() => {
    if (paymentMethodSel.toUpperCase() === 'QRIS' && qrisBoxRef.current) {
      renderQRCode(qrisBoxRef.current, totalAmount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, paymentMethodSel]);

  const submitOrder = async (e) => {
    e.preventDefault();
    if (siteSettings.site_status === 'maintenance' || siteSettings.site_status === 'busy') {
      setOrderModalOpen(false);
      setSiteStatusOverlayOpen(true);
      return;
    }
    if (paymentTimer.isExpired()) {
      showToast('Waktu Habis', 'Waktu pembayaran sudah habis. Silakan pilih ulang metode pembayaran.', 'error');
      return;
    }
    if (!proofFile) {
      showToast('Bukti Transfer Wajib', 'Silakan upload bukti transfer terlebih dahulu.', 'error');
      return;
    }
    const p = selectedProduct;
    const qty = orderQty;
    setSubmitting(true);
    try {
      const proofUrl = await api.upload(proofFile, 'proofs');
      const data = {
        product_id: p.id,
        quantity: qty,
        user_name: userName,
        user_contact: userContact,
        total_amount: totalAmount,
        selected_price: selectedPrice,
        payment_method: paymentMethodSel,
        payment_proof_url: proofUrl || '',
        request_gmail: reqGmail,
        request_password: reqPassword,
      };
      const savedOrder = await api.createOrder(data);

      const newHistory = getHistory();
      newHistory.unshift({
        order_id: savedOrder.id || null,
        product_id: p.id,
        product_name: p.name,
        quantity: qty,
        total_amount: totalAmount,
        user_name: data.user_name,
        user_contact: data.user_contact,
        payment_method: data.payment_method,
        payment_proof_url: proofUrl || '',
        status: 'pending',
        accounts: [],
        created_at: new Date().toISOString(),
      });
      saveHistory(newHistory);
      setHistoryList(newHistory);

      setOrderModalOpen(false);
      setSuccessModalOpen(true);
      paymentTimer.stopPaymentTimer();
      const wa = siteSettings.whatsapp_number || '6281234567890';
      const msg = `Halo Admin, saya beli ${p.name} (x${qty}).\nNama: ${data.user_name}\nTotal: Rp ${totalAmount.toLocaleString('id-ID')}\nID Transaksi: ${savedOrder.id || '-'}\nMohon diproses ya!`;
      setWaLink(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`);
      showToast('Berhasil!', 'Pesanan berhasil dikirim.', 'success');
      api.getStock().then((res) => setStockByProduct(res.data || {})).catch(() => {});
    } catch (err) {
      showToast('Gagal!', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // HISTORY / TXN DETAIL
  // ============================================================
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Tersalin!', 'Berhasil disalin ke clipboard.', 'success', 2000))
      .catch(() => showToast('Gagal', 'Tidak bisa menyalin otomatis.', 'error'));
  };

  const openTxnDetailModal = (idx) => {
    const list = getHistory();
    const o = list[idx];
    if (!o) return;
    setTxnDetailIdx(idx);
    setResendLinkValue('');
    setHistoryModalOpen(false);
  };
  const closeTxnDetailModal = () => setTxnDetailIdx(null);
  const currentTxnDetailOrder = txnDetailIdx !== null ? getHistory()[txnDetailIdx] : null;

  const submitAlightMotionLink = async (orderId) => {
    const link = resendLinkValue.trim();
    if (!link) { showToast('Belum Lengkap', 'Silakan isi link Alight Motion kamu.', 'error'); return; }
    if (!orderId) { showToast('Gagal', 'ID transaksi tidak ditemukan.', 'error'); return; }
    setResendLinkSending(true);
    try {
      await api.updateOrder(orderId, { request_link: link });
      const list = getHistory();
      const idx = list.findIndex((o) => o.order_id === orderId);
      if (idx !== -1) {
        list[idx].request_link = link;
        saveHistory(list);
        setHistoryList(list);
      }
      showToast('Berhasil!', 'Link berhasil dikirim, menunggu verifikasi admin.', 'success');
      setResendLinkValue('');
    } catch (err) {
      showToast('Gagal', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setResendLinkSending(false);
    }
  };

  const buildTxnProofCardHtml = (o) => {
    const dateObj = (() => { try { return new Date(o.created_at); } catch (e) { return null; } })();
    const tanggalStr = dateObj ? dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
    const jamStr = dateObj ? dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
    const proofRow = (label, value, isLast) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;${isLast ? '' : 'border-bottom:1px solid #f3f4f6;'}">
        <span style="font-size:12px;font-weight:700;color:#9ca3af;">${escapeHtml(label)}</span>
        <span style="font-size:13px;font-weight:800;text-align:right;">${escapeHtml(String(value))}</span>
      </div>`;
    const card = document.createElement('div');
    card.style.cssText = 'width:480px;background:#ffffff;padding:36px;font-family:"Plus Jakarta Sans",sans-serif;color:#111827;';
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #111827;">
        <div>
          <p style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">${escapeHtml(siteSettings.store_name || 'SanzXmzz Store')}</p>
          <p style="font-size:11px;color:#9ca3af;font-weight:700;letter-spacing:0.08em;margin-top:2px;">BUKTI TRANSAKSI</p>
        </div>
        <div style="width:44px;height:44px;border-radius:14px;background:#111827;display:flex;align-items:center;justify-content:center;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </div>
      <div style="background:#f8f9fa;border-radius:16px;padding:16px 18px;margin-bottom:24px;">
        <p style="font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:0.06em;margin-bottom:4px;">ID TRANSAKSI</p>
        <p style="font-size:13px;font-weight:700;font-family:monospace;">${escapeHtml(censorTxnId(o.order_id))}</p>
      </div>
      ${proofRow('Status', STATUS_LABEL_SHORT[o.status] || o.status)}
      ${proofRow('Produk', o.product_name)}
      ${proofRow('Jumlah', o.quantity + ' akun')}
      ${proofRow('Total Harga', 'Rp ' + Number(o.total_amount).toLocaleString('id-ID'))}
      ${proofRow('Metode Pembayaran', o.payment_method || '-')}
      ${proofRow('Tanggal', tanggalStr)}
      ${proofRow('Waktu', jamStr, true)}
      <div style="margin-top:28px;padding-top:16px;border-top:1px dashed #d1d5db;text-align:center;">
        <p style="font-size:10px;color:#9ca3af;font-weight:600;">Dokumen ini digenerate otomatis sebagai bukti transaksi.</p>
      </div>`;
    return card;
  };

  const [downloadingProof, setDownloadingProof] = useState(false);
  const downloadTxnProof = async (format) => {
    const o = currentTxnDetailOrder;
    if (!o) { showToast('Gagal', 'Tidak ada transaksi yang dipilih.', 'error'); return; }
    if (typeof window === 'undefined' || !window.html2canvas) {
      showToast('Gagal', 'Fitur download sedang tidak tersedia, coba lagi nanti.', 'error');
      return;
    }
    setDownloadingProof(true);
    const card = buildTxnProofCardHtml(o);
    card.style.position = 'fixed';
    card.style.left = '-9999px';
    card.style.top = '0';
    document.body.appendChild(card);
    try {
      const canvas = await window.html2canvas(card, { scale: 2, backgroundColor: '#ffffff' });
      document.body.removeChild(card);
      const fileBase = 'bukti-transaksi-' + censorTxnId(o.order_id);
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = fileBase + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else if (format === 'pdf') {
        if (!window.jspdf) {
          showToast('Gagal', 'Fitur PDF sedang tidak tersedia, coba lagi nanti.', 'error');
          setDownloadingProof(false);
          return;
        }
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = canvas.width / 2;
        const pdfHeight = canvas.height / 2;
        const JsPDFCtor = window.jspdf.jsPDF;
        const pdf = new JsPDFCtor({
          orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
          unit: 'px',
          format: [pdfWidth, pdfHeight],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(fileBase + '.pdf');
      }
      showToast('Berhasil!', 'Bukti transaksi berhasil diunduh.', 'success', 2500);
    } catch (err) {
      if (document.body.contains(card)) document.body.removeChild(card);
      showToast('Gagal', 'Gagal membuat file, coba lagi.', 'error');
    } finally {
      setDownloadingProof(false);
    }
  };

  // ============================================================
  // ALL TRANSACTIONS / FAQ / LEADERBOARD MODALS
  // ============================================================
  const openAllTransactionsModal = () => {
    setAllTxnModalOpen(true);
    setAllTxnList(null);
    api.getAllTransactions().then((res) => setAllTxnList(res.data || [])).catch(() => setAllTxnList([]));
  };

  const openFaqModal = () => { setFaqModalOpen(true); setFaqOpenIdx(null); };
  const toggleFaqItem = (idx) => setFaqOpenIdx((cur) => (cur === idx ? null : idx));

  const openLeaderboardModal = () => {
    setLeaderboardModalOpen(true);
    setLeaderboardList(null);
    api.getLeaderboard().then((res) => setLeaderboardList(res.data || [])).catch(() => setLeaderboardList([]));
  };

  const siteStatus = siteSettings.site_status || 'normal';

  return (
    <div className="sanz-storefront">
      <ToastContainer />

      {/* LIVE FEED TOASTS */}
      <div id="liveFeedContainer">
        {liveFeedToasts.map((t) => {
          const productName = t.order.products ? t.order.products.name : 'produk premium';
          return (
            <div key={t.id} className="live-feed-toast">
              <div className="live-feed-avatar">{maskName(t.order.user_name).charAt(0)}</div>
              <div className="live-feed-text">
                <b>{maskName(t.order.user_name)}</b> baru saja membeli<br />
                {productName} <span className="lf-price">Rp {Number(t.order.total_amount).toLocaleString('id-ID')}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SITE STATUS OVERLAY */}
      <div id="siteStatusOverlay" className={siteStatusOverlayOpen ? 'open' : ''}>
        <div className="site-status-box">
          <div className={`site-status-icon-wrap ${siteStatus}`}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {SITE_STATUS_ICONS[siteStatus]}
            </svg>
          </div>
          <h2 className="site-status-title">{SITE_STATUS_TITLES[siteStatus] || 'Toko Belum Bisa Diakses'}</h2>
          <p className="site-status-desc">{siteSettings.site_status_reason || SITE_STATUS_DEFAULT_DESC[siteStatus]}</p>
          <button type="button" className="site-status-close-btn" onClick={() => closeSiteStatusOverlay()}>TUTUP</button>
          <p className="site-status-note">Halaman akan otomatis update begitu toko kembali normal.</p>
        </div>
      </div>

      {/* HISTORY FAB */}
      {fabHintVisible && (
        <div className="fab-hint-bubble">
          Tekan lama untuk Leaderboard, Semua Transaksi &amp; FAQ
          <button type="button" className="fab-hint-close" onClick={dismissFabHint} aria-label="Tutup">&times;</button>
        </div>
      )}
      <button
        id="historyFabBtn"
        onClick={onFabClick}
        onPointerDown={fabLongPressStart}
        onPointerUp={fabLongPressCancel}
        onPointerLeave={fabLongPressCancel}
        onPointerCancel={fabLongPressCancel}
        title="Riwayat Pembelian · Tekan lama untuk menu lainnya"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg>
        <span className="fab-badge" style={{ display: pendingHistoryCount > 0 ? 'flex' : 'none' }}>{pendingHistoryCount}</span>
        <span className="fab-longpress-hint" />
      </button>

      <div id="fabMenuWrap" className={fabMenuOpen ? 'open' : ''}>
        <div className={`fab-menu-options${fabMenuOpen ? '' : ' hidden'}`}>
          <button className="fab-menu-item" onClick={() => { openAllTransactionsModal(); setFabMenuOpen(false); }} title="Semua Transaksi">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l4 4v3" /><path d="M9 12h1" /><path d="M9 16h1" /><circle cx="17" cy="17" r="4" /><path d="M20 20l1.5 1.5" /></svg>
            <span>Semua Transaksi</span>
          </button>
          <button className="fab-menu-item" onClick={() => { openLeaderboardModal(); setFabMenuOpen(false); }} title="Leaderboard Pembeli">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8m-4-4v4M17 5V3H7v2M5 5h14l-1 8H6L5 5z" /><path d="M5 5a2 2 0 0 0-2 2c0 3 2 4 4 4M19 5a2 2 0 0 1 2 2c0 3-2 4-4 4" /></svg>
            <span>Leaderboard</span>
          </button>
          <button className="fab-menu-item" onClick={() => { openFaqModal(); setFabMenuOpen(false); }} title="FAQ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            <span>FAQ</span>
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENT BAR */}
      {siteSettings.running_text && (
        <div id="announcementBar" className="bg-black text-white py-2 overflow-hidden">
          <div className="whitespace-nowrap animate-marquee flex items-center gap-8">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">{siteSettings.running_text}</span>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">|</span>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">{siteSettings.running_text}</span>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <h1 className="text-2xl font-extrabold tracking-tighter">{siteSettings.store_name || 'SANZXMZZ'}</h1>
          </div>
          <div className="hidden md:flex space-x-8 font-semibold text-sm uppercase tracking-widest">
            <a href="#" className="hover:text-gray-500 transition">Home</a>
            <a href="#products" className="hover:text-gray-500 transition">Catalog</a>
            <a href="#footer" className="hover:text-gray-500 transition">Contact</a>
          </div>
          <button onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })} className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition active:scale-95 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            SHOP NOW
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="container mx-auto px-6 pt-12 pb-20 text-center">
        {/* ANNOUNCEMENT CARDS */}
        {announcements.length > 0 && (
          <div className="max-w-5xl mx-auto mb-10 space-y-4">
            {announcements.map((a) => {
              const typeTag = { info: 'Pengumuman', warning: 'Perhatian', success: 'Info Promo' };
              return (
                <div key={a.id} className={`announcement-card ${a.type || 'info'}`}>
                  {a.media_url && (
                    <div className="announcement-card-media">
                      {a.media_type === 'video' ? (
                        <video src={a.media_url} muted playsInline loop autoPlay />
                      ) : (
                        <img src={a.media_url} alt="Pengumuman" />
                      )}
                    </div>
                  )}
                  <div className="announcement-card-body">
                    <span className="announcement-card-tag">{typeTag[a.type] || 'Pengumuman'}</span>
                    <p className="announcement-card-text">{a.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PROMO BANNER */}
        {banner && (
          <div className="max-w-5xl mx-auto mb-16 scroll-reveal visible">
            <div className="relative rounded-[2.5rem] overflow-hidden aspect-[21/9] md:aspect-[3/1] shadow-2xl group">
              <img src={banner.image_url} className="w-full h-full object-cover transition duration-1000 group-hover:scale-105" alt="Promo" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8 md:p-12 text-left">
                <h3 className="text-white text-2xl md:text-4xl font-black tracking-tight mb-2">{banner.title}</h3>
                {banner.link_url && (
                  <a href={banner.link_url} className="inline-flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest hover:text-white transition">
                    Lihat Detail
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="fade-in-up">
          <span className="inline-block px-4 py-1.5 border border-black/10 rounded-full text-xs font-bold tracking-widest mb-6">PREMIUM SOSMED SOLUTIONS</span>
          <h2 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-6 leading-none">
            ELEVATE YOUR<br /><span className="text-gray-400">DIGITAL LIFE.</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg mb-10">
            Platform terpercaya untuk top-up dan beli akun premium dengan sistem instan dan keamanan terjamin.
          </p>
          <div className="flex justify-center gap-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <main className="container mx-auto px-6 pb-24">
        {/* Search & Filter */}
        <div className="fade-in-up delay-1 mb-12 flex flex-col md:flex-row gap-4" id="searchSection">
          <div className="search-wrapper flex-grow">
            <span className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </span>
            <input type="text" placeholder="Cari produk favoritmu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className={`cdd md:w-64 w-full${categoryDropdownOpen ? ' open' : ''}`} ref={categoryDropdownRef}>
            <button type="button" className="cdd-trigger" onClick={(e) => { e.stopPropagation(); setCategoryDropdownOpen((v) => !v); }}>
              <span className="cdd-trigger-icon">{getCategoryIcon(categoryFilter)}</span>
              <span className="cdd-trigger-label">{(categoryOptions.find((o) => o.value === categoryFilter) || {}).label || 'Semua Kategori'}</span>
              <span className="cdd-chevron">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </span>
            </button>
            <div className="cdd-panel">
              {categoryOptions.map((opt) => (
                <div key={opt.value} className={`cdd-option${opt.value === categoryFilter ? ' selected' : ''}`} onClick={() => selectCategoryOption(opt.value)}>
                  <span className="cdd-option-icon">{getCategoryIcon(opt.value)}</span>
                  <span className="cdd-option-label">{opt.label}</span>
                  <svg className="cdd-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Catalog */}
        <section id="products">
          <div className="flex items-center gap-3 mb-8 fade-in-up delay-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            <h3 className="text-2xl font-extrabold tracking-tight">Katalog Produk</h3>
          </div>
          <div id="productList" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.length === 0 ? (
              <>
                <div className="bg-gray-100 rounded-3xl h-80 animate-pulse" />
                <div className="bg-gray-100 rounded-3xl h-80 animate-pulse" />
                <div className="bg-gray-100 rounded-3xl h-80 animate-pulse" />
                <div className="bg-gray-100 rounded-3xl h-80 animate-pulse" />
              </>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-20">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <p className="text-gray-400 font-bold">Produk tidak tersedia.</p>
              </div>
            ) : filteredProducts.map((p, i) => {
              const stock = getStockCount(p.id);
              const stockClass = stock <= 0 ? 'out-stock' : (stock <= 5 ? 'low-stock' : 'in-stock');
              const stockLabel = stock <= 0 ? 'Habis' : (stock <= 5 ? `Sisa ${stock}` : `Stok ${stock}`);
              return (
                <div className="scroll-reveal visible" style={{ transitionDelay: `${(i % 4) * 0.08}s` }} key={p.id}>
                  <div className="bg-white rounded-[2rem] border border-black/5 p-6 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-full group">
                    <div className="relative rounded-2xl overflow-hidden mb-6 h-48 bg-gray-50">
                      <img
                        src={p.image_url || 'https://via.placeholder.com/400x300?text=Premium'}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                        alt={p.name}
                        loading="lazy"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'; }}
                      />
                      <div className="absolute top-4 left-4"><span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">{p.category}</span></div>
                      <div className="absolute top-4 right-4"><span className={`stock-pill ${stockClass}`}><span className="dot" />{stockLabel}</span></div>
                    </div>
                    <h4 className="text-lg font-extrabold tracking-tight mb-2">{p.name}</h4>
                    <p className="text-gray-400 text-xs mb-6 line-clamp-2">{p.description || 'Premium quality account with full warranty and fast delivery.'}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xl font-black">Rp {Number(p.price).toLocaleString('id-ID')}</span>
                      <button
                        onClick={() => openOrderModal(p.id)}
                        disabled={stock <= 0}
                        className={`p-3 ${stock <= 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:scale-110 active:scale-95 shadow-lg shadow-black/10'} rounded-xl transition`}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* HISTORY DRAWER MODAL */}
      <div className={`modal${historyModalOpen ? ' open' : ''}`}>
        <div className="modal-content">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-extrabold tracking-tight">Riwayat Pembelian</h3>
            <button onClick={() => setHistoryModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div id="historyList">
            {historyList.length === 0 ? (
              <div className="text-center py-16">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4"><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /></svg>
                <p className="text-gray-400 font-bold text-sm">Belum ada riwayat pembelian.</p>
              </div>
            ) : historyList.map((o, idx) => {
              let dateStr = '';
              try { dateStr = new Date(o.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { /* ignore */ }
              return (
                <div className="history-card" onClick={() => openTxnDetailModal(idx)} key={idx}>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div>
                      <h4 className="font-extrabold text-sm">{o.product_name}</h4>
                      <p className="text-[11px] text-gray-400 font-semibold">{dateStr} · Qty {o.quantity}</p>
                    </div>
                    <span className={`history-status ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
                  </div>
                  <p className="text-sm font-black mt-1">Rp {Number(o.total_amount).toLocaleString('id-ID')}</p>

                  {o.status === 'completed' && o.accounts && o.accounts.length > 0 && (
                    <div className="history-account-box">
                      {o.accounts.map((acc, aIdx) => (
                        <div key={aIdx}>
                          <div className="acc-row"><span>👤 {acc.username}</span>
                            <button className="acc-copy" onClick={(e) => { e.stopPropagation(); copyToClipboard(acc.username); }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                            </button>
                          </div>
                          <div className="acc-row"><span>🔑 {acc.password}</span>
                            <button className="acc-copy" onClick={(e) => { e.stopPropagation(); copyToClipboard(acc.password); }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                            </button>
                          </div>
                          {aIdx < o.accounts.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />}
                        </div>
                      ))}
                    </div>
                  )}
                  {o.status === 'completed' && (!o.accounts || o.accounts.length === 0) && o.admin_note && (
                    <div className="history-account-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <p className="text-[10px] text-green-600 font-bold uppercase mb-1">Pesan dari Admin:</p>
                      <p className="text-xs font-bold text-green-800 break-all">{o.admin_note}</p>
                      <button className="mt-2 w-full bg-green-600 text-white py-2 rounded-lg text-[10px] font-bold" onClick={(e) => { e.stopPropagation(); copyToClipboard(o.admin_note); }}>SALIN PESAN / LINK</button>
                    </div>
                  )}
                  {o.status === 'pending' && (
                    <p className="text-xs text-amber-600 font-semibold mt-2 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      Menunggu admin mengkonfirmasi pembayaran.
                    </p>
                  )}
                  {o.status === 'processing' && (
                    <p className="text-xs text-blue-600 font-semibold mt-2 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /></svg>
                      Sedang diproses oleh admin...
                    </p>
                  )}
                  {o.status === 'waiting_link' && o.request_link && (
                    <p className="text-xs text-blue-600 font-semibold mt-2 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Link sudah dikirim, menunggu verifikasi admin.
                    </p>
                  )}
                  {o.status === 'waiting_link' && !o.request_link && o.link_rejected_count > 0 && (
                    <div className="history-account-box" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                      <p className="text-[10px] text-orange-600 font-bold uppercase mb-1">Link Perlu Dikirim Ulang:</p>
                      <p className="text-xs font-bold text-orange-800 break-all">{o.admin_message || 'Link yang kamu kirim belum valid/salah. Silakan kirim ulang link yang benar ya.'}</p>
                      <button className="mt-2 w-full bg-orange-600 text-white py-2 rounded-lg text-[10px] font-bold" onClick={(e) => { e.stopPropagation(); openTxnDetailModal(idx); }}>KIRIM ULANG LINK</button>
                    </div>
                  )}
                  {o.status === 'waiting_link' && !o.request_link && !(o.link_rejected_count > 0) && (
                    <div className="history-account-box" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Pesan dari Admin:</p>
                      <p className="text-xs font-bold text-blue-800 break-all">{o.admin_note || 'Silakan kirim link Alight Motion kamu.'}</p>
                      <button className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg text-[10px] font-bold" onClick={(e) => { e.stopPropagation(); openTxnDetailModal(idx); }}>KIRIM LINK ALIGHT MOTION</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TRANSACTION DETAIL MODAL */}
      <div className={`modal${txnDetailIdx !== null ? ' open' : ''}`}>
        <div className="modal-content" style={{ maxWidth: 440 }}>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-extrabold tracking-tight">Detail Transaksi</h3>
            <button onClick={closeTxnDetailModal} className="p-2 hover:bg-gray-100 rounded-full transition">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          {currentTxnDetailOrder && (() => {
            const o = currentTxnDetailOrder;
            const dateObj = (() => { try { return new Date(o.created_at); } catch (e) { return null; } })();
            const tanggalStr = dateObj ? dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
            const jamStr = dateObj ? dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
            return (
              <>
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">ID Transaksi</p>
                  <div className="txn-id-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    <span>Transaksi #{censorTxnId(o.order_id)}</span>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="history-status" data-status={o.status} style={{ display: 'inline-flex' }}>{STATUS_ICON[o.status]} {STATUS_LABEL[o.status] || o.status}</span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="txn-detail-row">
                    <span className="txn-detail-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.24L3 3v6.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83z" /></svg> Produk</span>
                    <span className="txn-detail-value">{o.product_name}</span>
                  </div>
                  <div className="txn-detail-row">
                    <span className="txn-detail-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg> Jumlah</span>
                    <span className="txn-detail-value">{o.quantity} akun</span>
                  </div>
                  <div className="txn-detail-row">
                    <span className="txn-detail-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> Total Harga</span>
                    <span className="txn-detail-value">Rp {Number(o.total_amount).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="txn-detail-row">
                    <span className="txn-detail-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> Tanggal</span>
                    <span className="txn-detail-value">{tanggalStr}</span>
                  </div>
                  <div className="txn-detail-row">
                    <span className="txn-detail-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> Waktu</span>
                    <span className="txn-detail-value">{jamStr}</span>
                  </div>
                  <div className="txn-detail-row">
                    <span className="txn-detail-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg> Pembayaran</span>
                    <span className="txn-detail-value">{o.payment_method || '-'}</span>
                  </div>
                </div>
                <div className="mt-4">
                  {o.status === 'completed' && o.accounts && o.accounts.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Detail Akun</p>
                      <div className="history-account-box">
                        {o.accounts.map((acc, aIdx) => (
                          <div key={aIdx}>
                            <div className="acc-row"><span>👤 {acc.username}</span>
                              <button className="acc-copy" onClick={() => copyToClipboard(acc.username)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                              </button>
                            </div>
                            <div className="acc-row"><span>🔑 {acc.password}</span>
                              <button className="acc-copy" onClick={() => copyToClipboard(acc.password)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                              </button>
                            </div>
                            {aIdx < o.accounts.length - 1 && <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {o.status === 'waiting_link' && o.request_link && (
                    <div className="history-account-box" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <p className="text-[10px] text-blue-600 font-bold uppercase mb-1 flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Link Terkirim
                      </p>
                      <p className="text-xs font-bold text-blue-800 break-all">{o.request_link}</p>
                      <p className="text-[10px] text-blue-500 font-semibold mt-2">Menunggu admin memverifikasi link kamu.</p>
                    </div>
                  )}
                  {o.status === 'waiting_link' && !o.request_link && o.link_rejected_count > 0 && (
                    <div className="history-account-box" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                      <p className="text-[10px] text-orange-600 font-bold uppercase mb-1 flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg> Link Dikembalikan Admin
                      </p>
                      <p className="text-xs font-bold text-orange-800 break-all mb-3">{o.admin_message || 'Link yang kamu kirim belum valid/salah. Silakan kirim ulang link yang benar ya.'}</p>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-2">Kirim Ulang Link Alight Motion Kamu</label>
                      <input type="text" placeholder="https://alight-creative..." style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #fed7aa', fontSize: 12, fontWeight: 600, outline: 'none', marginBottom: 8 }}
                        value={resendLinkValue} onChange={(e) => setResendLinkValue(e.target.value)} />
                      <button type="button" disabled={resendLinkSending} className="w-full bg-orange-600 text-white py-2.5 rounded-lg text-[11px] font-bold" onClick={() => submitAlightMotionLink(o.order_id)}>
                        {resendLinkSending ? 'MENGIRIM...' : 'KIRIM ULANG LINK'}
                      </button>
                    </div>
                  )}
                  {o.status === 'waiting_link' && !o.request_link && !(o.link_rejected_count > 0) && (
                    <div className="history-account-box" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Pesan dari Admin</p>
                      <p className="text-xs font-bold text-blue-800 break-all mb-3">{o.admin_note || 'Silakan kirim link Alight Motion kamu.'}</p>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">Link Alight Motion Kamu</label>
                      <input type="text" placeholder="https://alight-creative..." style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #bfdbfe', fontSize: 12, fontWeight: 600, outline: 'none', marginBottom: 8 }}
                        value={resendLinkValue} onChange={(e) => setResendLinkValue(e.target.value)} />
                      <button type="button" disabled={resendLinkSending} className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-[11px] font-bold" onClick={() => submitAlightMotionLink(o.order_id)}>
                        {resendLinkSending ? 'MENGIRIM...' : 'KIRIM LINK'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-5">
                  <button type="button" onClick={() => downloadTxnProof('png')} className={`download-proof-btn${downloadingProof ? ' loading' : ''}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                    PNG
                  </button>
                  <button type="button" onClick={() => downloadTxnProof('pdf')} className={`download-proof-btn${downloadingProof ? ' loading' : ''}`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" /><line x1="9" y1="11" x2="12" y2="11" /></svg>
                    PDF
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ALL TRANSACTIONS MODAL */}
      <div className={`modal${allTxnModalOpen ? ' open' : ''}`}>
        <div className="modal-content" style={{ maxWidth: 520 }}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight">Semua Transaksi</h3>
              <p className="text-xs text-gray-400 font-semibold mt-1">Transparansi transaksi di toko ini</p>
            </div>
            <button onClick={() => setAllTxnModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="border-t border-gray-100 my-4" />
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {allTxnList === null ? (
              <div className="text-center py-10"><div className="animate-spin mx-auto" style={{ width: 32, height: 32, border: '3px solid #f3f4f6', borderTopColor: '#000', borderRadius: '50%' }} /></div>
            ) : allTxnList.length === 0 ? (
              <div className="text-center py-16"><p className="text-gray-400 font-bold text-sm">Belum ada transaksi.</p></div>
            ) : allTxnList.map((o) => {
              const productName = o.products ? o.products.name : 'Produk';
              let dateStr = '';
              try { dateStr = new Date(o.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { /* ignore */ }
              return (
                <div className="txn-public-card" key={o.id}>
                  <div className="txn-public-avatar">{maskName(o.user_name).charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm truncate">{productName} <span className="text-gray-400 font-semibold">x{o.quantity}</span></p>
                    <p className="text-[11px] text-gray-400 font-mono font-semibold truncate">Transaksi #{censorTxnId(o.id)}</p>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{maskName(o.user_name)} · {dateStr}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-sm">Rp {Number(o.total_amount).toLocaleString('id-ID')}</p>
                    <span className={`history-status ${o.status}`} style={{ marginTop: 4 }}>{STATUS_LABEL_SHORT[o.status] || o.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ MODAL */}
      <div className={`modal${faqModalOpen ? ' open' : ''}`}>
        <div className="modal-content" style={{ maxWidth: 520 }}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight">FAQ</h3>
              <p className="text-xs text-gray-400 font-semibold mt-1">Pertanyaan yang sering ditanyakan</p>
            </div>
            <button onClick={() => setFaqModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="border-t border-gray-100 my-4" />
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }} className="space-y-2">
            {FAQ_ITEMS.map((item, idx) => (
              <div className="faq-item" key={idx}>
                <button type="button" className="faq-question" onClick={() => toggleFaqItem(idx)}>
                  <span>{item.q}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="faq-chevron" style={{ transform: faqOpenIdx === idx ? 'rotate(180deg)' : '' }}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <div className={`faq-answer${faqOpenIdx === idx ? '' : ' hidden'}`}><p>{item.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LEADERBOARD MODAL */}
      <div className={`modal${leaderboardModalOpen ? ' open' : ''}`}>
        <div className="modal-content" style={{ maxWidth: 480 }}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight">Leaderboard</h3>
              <p className="text-xs text-gray-400 font-semibold mt-1">Pembeli paling aktif di toko ini</p>
            </div>
            <button onClick={() => setLeaderboardModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="border-t border-gray-100 my-4" />
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }} className="space-y-2">
            {leaderboardList === null ? (
              <div className="text-center py-10"><div className="animate-spin mx-auto" style={{ width: 32, height: 32, border: '3px solid #f3f4f6', borderTopColor: '#000', borderRadius: '50%' }} /></div>
            ) : leaderboardList.length === 0 ? (
              <div className="text-center py-16"><p className="text-gray-400 font-bold text-sm">Belum ada data pembelian.</p></div>
            ) : leaderboardList.map((entry, idx) => {
              const medalColors = ['#facc15', '#9ca3af', '#b45309'];
              return (
                <div className="txn-public-card" key={entry.name + idx}>
                  {idx < 3 ? (
                    <div className="lb-rank-medal" style={{ background: medalColors[idx] }}>{idx + 1}</div>
                  ) : (
                    <div className="lb-rank-plain">{idx + 1}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm truncate">{entry.name}</p>
                    <p className="text-[11px] text-gray-400 font-semibold">{entry.count} transaksi berhasil</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-sm">Rp {entry.total.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ORDER MODAL */}
      <div className={`modal${orderModalOpen ? ' open' : ''}`}>
        <div className="modal-content">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-extrabold tracking-tight">Checkout</h3>
            <button onClick={closeOrderModal} className="p-2 hover:bg-gray-100 rounded-full transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {selectedProduct && selectedProduct.is_open_request && (
            <div className="flex border-b border-gray-100 mb-6">
              <button onClick={() => setCheckoutTab('request')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 ${checkoutTab === 'request' ? 'border-black' : 'border-transparent text-gray-400'}`}>Request Gmail</button>
              <button onClick={() => setCheckoutTab('payment')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest border-b-2 ${checkoutTab === 'payment' ? 'border-black' : 'border-transparent text-gray-400'}`}>Payment</button>
            </div>
          )}

          <form onSubmit={submitOrder} className="space-y-5">
            {selectedProduct && (checkoutTab === 'main' || !selectedProduct.is_open_request) && (
              <div id="checkoutSectionMain">
                <div className="bg-black text-white p-6 rounded-2xl mb-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs uppercase tracking-widest opacity-60">{selectedProduct.category}</p>
                    <span className={`stock-pill ${selectedStock <= 0 ? 'out-stock' : (selectedStock <= 5 ? 'low-stock' : 'in-stock')}`}>
                      <span className="dot" />{selectedStock <= 0 ? 'Habis' : (selectedStock <= 5 ? `Sisa ${selectedStock}` : `Stok ${selectedStock}`)}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold mb-1">{selectedProduct.name}</h4>
                  <p className="text-2xl font-black">Rp {totalAmount.toLocaleString('id-ID')}</p>
                </div>

                {selectedProduct.prices && selectedProduct.prices.length > 0 && (
                  <div className="mb-5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Pilih Harga</label>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedProduct.prices.map((pr) => (
                        <button
                          type="button"
                          key={pr}
                          onClick={() => setSelectedPrice(pr)}
                          className={`price-opt p-4 rounded-2xl border-2 font-bold transition ${pr === selectedPrice ? 'border-black bg-black text-white' : 'border-gray-100 bg-gray-50 text-gray-500'}`}
                        >
                          Rp {pr.toLocaleString('id-ID')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Jumlah (Max 20)</label>
                  <div className="qty-stepper">
                    <button type="button" className="qty-btn" onClick={qtyMinus}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <input type="number" className="qty-input" value={orderQty} min={1} max={20} readOnly />
                    <button type="button" className="qty-btn" onClick={qtyPlus}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 font-semibold mt-2 text-center">Tersedia {selectedStock} stok · Maks. 20 per transaksi</p>
                </div>
              </div>
            )}

            {selectedProduct && selectedProduct.is_open_request && checkoutTab === 'request' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Gmail</label>
                  <input type="email" placeholder="masukan Gmail" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-black focus:ring-0 transition outline-none font-medium"
                    value={reqGmail} onChange={(e) => setReqGmail(e.target.value)} />
                </div>
                {!selectedProduct.is_alight_motion && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Password</label>
                    <input type="text" placeholder="password" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-black focus:ring-0 transition outline-none font-medium"
                      value={reqPassword} onChange={(e) => setReqPassword(e.target.value)} />
                  </div>
                )}
                {selectedProduct.is_alight_motion && (
                  <p className="text-xs text-gray-400 font-semibold bg-gray-50 p-4 rounded-2xl leading-relaxed">
                    Khusus Alight Motion: cukup isi Gmail dulu. Link request akan diminta admin setelah pembayaran dikonfirmasi.
                  </p>
                )}
                <button type="button" onClick={() => setCheckoutTab('payment')} className="w-full bg-black text-white font-bold py-5 rounded-2xl hover:scale-[1.02] transition">LANJUT KE PEMBAYARAN</button>
              </div>
            )}

            {selectedProduct && (checkoutTab === 'payment' || !selectedProduct.is_open_request) && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Nama Lengkap</label>
                  <input type="text" required className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-black focus:ring-0 transition outline-none font-medium"
                    value={userName} onChange={(e) => setUserName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">WhatsApp</label>
                  <input type="tel" required placeholder="08xxxxxx" className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-black focus:ring-0 transition outline-none font-medium"
                    value={userContact} onChange={(e) => setUserContact(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Pembayaran</label>
                  <select required className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-black focus:ring-0 transition outline-none font-semibold"
                    value={paymentMethodSel} onChange={(e) => onPaymentMethodChange(e.target.value)}>
                    <option value="">Pilih Metode</option>
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((pm) => (
                        <option key={pm.id} value={pm.name.toUpperCase()}>{pm.name.toUpperCase() === 'QRIS' ? `${pm.name} (Scan Barcode)` : pm.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="DANA">DANA</option>
                        <option value="OVO">OVO</option>
                        <option value="GOPAY">GOPAY</option>
                        <option value="QRIS">QRIS (Scan Barcode)</option>
                      </>
                    )}
                  </select>
                </div>

                {paymentMethodSel && (
                  <div className="p-5 bg-gray-50 rounded-2xl border border-black/5">
                    {paymentTimer.active && (
                      <div className={`payment-timer-widget${paymentTimer.expired ? ' expired' : ''}${paymentTimer.minimized ? ' minimized' : ''}`}>
                        <div className="payment-timer-header">
                          <div className="payment-timer-label">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            <span>Selesaikan dalam</span>
                          </div>
                          <button type="button" className="payment-timer-minimize-btn" title={paymentTimer.minimized ? 'Perbesar' : 'Minimize'} onClick={(e) => { e.preventDefault(); paymentTimer.toggleMinimize(); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                          </button>
                        </div>
                        {!paymentTimer.expired && <div className="payment-timer-display">{paymentTimer.display}</div>}
                        <div className="payment-timer-bar-track"><div className="payment-timer-bar-fill" style={{ width: paymentTimer.barWidth, background: paymentTimer.barColor }} /></div>
                        {paymentTimer.expired && (
                          <div className="payment-timer-expired">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                            <span>Waktu pembayaran habis. Silakan pilih ulang metode pembayaran.</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-center">
                      {paymentMethodSel.toUpperCase() === 'QRIS' ? (
                        <>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Scan QRIS</p>
                          <p className="text-2xl font-black tracking-tight mb-1">Rp {totalAmount.toLocaleString('id-ID')}</p>
                          <p className="text-xs font-semibold text-gray-400">Nominal sudah termasuk di dalam QR, scan langsung tanpa perlu isi manual.</p>
                        </>
                      ) : selectedPaymentMethodObj ? (
                        <>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Transfer Ke {selectedPaymentMethodObj.name}</p>
                          <p className="text-2xl font-black tracking-tight mb-1">{selectedPaymentMethodObj.account_number || '-'}</p>
                          <p className="text-sm font-bold">A/N {selectedPaymentMethodObj.account_name || '-'}</p>
                        </>
                      ) : (
                        <p className="text-xs font-semibold text-gray-400">Detail metode pembayaran belum dikonfigurasi admin.</p>
                      )}
                    </div>

                    {paymentMethodSel.toUpperCase() === 'QRIS' && (
                      <div className="mt-4 flex justify-center">
                        <div ref={qrisBoxRef} />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Bukti Transfer <span className="text-red-500">*wajib</span></label>
                  <div
                    className={`upload-dropzone${dropzoneDragOver ? ' drag-over' : ''}${proofFile ? ' has-file' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDropzoneDragOver(true); }}
                    onDragEnter={(e) => { e.preventDefault(); setDropzoneDragOver(true); }}
                    onDragLeave={() => setDropzoneDragOver(false)}
                    onDrop={onDropzoneDrop}
                  >
                    <input type="file" accept="image/*" required={!proofFile} onChange={onProofInputChange} />
                    {!proofFile ? (
                      <div>
                        <div className="upload-icon-circle">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        </div>
                        <p className="font-bold text-sm">Tap untuk upload bukti transfer</p>
                        <p className="text-xs text-gray-400 mt-1 font-medium">JPG, PNG (Maks. 5MB)</p>
                      </div>
                    ) : (
                      <div className="upload-preview-wrap">
                        <img src={proofPreview} alt="Preview" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{proofFile.name}</p>
                          <p className="text-xs text-green-600 font-bold flex items-center gap-1 mt-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Siap dikirim
                          </p>
                        </div>
                        <button type="button" className="upload-remove-btn" onClick={removeUploadedProof}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="w-full bg-black text-white font-bold py-5 rounded-2xl hover:scale-[1.02] transition active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-3">
                  {submitting ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>
                      MEMPROSES...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      KONFIRMASI PESANAN
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      <div className={`modal${successModalOpen ? ' open' : ''}`}>
        <div className="modal-content text-center">
          <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h3 className="text-3xl font-extrabold mb-2 tracking-tight">PESANAN TERKIRIM!</h3>
          <p className="text-gray-500 mb-8">Silakan klik tombol di bawah untuk mengirim bukti transfer ke Admin via WhatsApp.</p>
          <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full bg-black text-white font-bold py-5 rounded-2xl hover:scale-[1.02] transition mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
            HUBUNGI ADMIN
          </a>
          <button onClick={() => window.location.reload()} className="text-sm font-bold text-gray-400 hover:text-black transition">KEMBALI KE HOME</button>
        </div>
      </div>

      {/* FOOTER */}
      <footer id="footer" className="bg-white border-t border-black/5 py-20 mt-20">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
            <h4 className="text-xl font-black tracking-tighter uppercase">{siteSettings.store_name || 'SANZXMZZ'}</h4>
          </div>
          <p className="text-gray-400 text-sm mb-8">Premium Sosmed Accounts &amp; Game Top-Up Service.<br />Powered by SanzXmzz Digital Solution.</p>
          <div className="flex justify-center gap-6 mb-12">
            <a href="#" className="p-3 bg-gray-50 rounded-full hover:bg-black hover:text-white transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
            </a>
            <a href="#" className="p-3 bg-gray-50 rounded-full hover:bg-black hover:text-white transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16zM4 20l6.768 -6.768M17.5 6.5l-4 4" /></svg>
            </a>
            <a href="#" className="p-3 bg-gray-50 rounded-full hover:bg-black hover:text-white transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
            </a>
          </div>
          <p className="text-xs font-bold text-gray-300 tracking-widest uppercase">&copy; 2026 {(siteSettings.store_name || 'SANZXMZZ STORE').toUpperCase()}. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
}
