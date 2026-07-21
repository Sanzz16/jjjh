'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAdminToasts } from '@/components/AdminToasts';
import { useAdminConfirm, useAdminPrompt } from '@/components/AdminDialogs';
import { useLinkVerifyDialog } from '@/components/LinkVerifyDialog';

// Matches admin.html ADMIN_CATEGORY_LIST / ADMIN_CATEGORY_ICONS exactly.
const ADMIN_CATEGORY_LIST = ['Top-up Game', 'Akun Streaming', 'Akun Sosmed', 'Voucher Digital', 'OPEN REQUEST', 'TIDAK OPEN REQUEST', 'produk Alight Motion'];

const ADMIN_CATEGORY_ICONS = {
  'Top-up Game': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="6" /><path d="M7 10v4" /><path d="M5 12h4" /><circle cx="16" cy="10.5" r="1" /><circle cx="18" cy="13.5" r="1" /></svg>
  ),
  'Akun Streaming': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 18v3" /><polygon points="10 8 15 11 10 14 10 8" /></svg>
  ),
  'Akun Sosmed': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="6" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
  ),
  'Voucher Digital': (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.24L3 3v6.59a2 2 0 0 0 .59 1.41l9.58 9.58a2 2 0 0 0 2.83 0l4.59-4.59a2 2 0 0 0 0-2.83z" /><circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" /></svg>
  ),
  default: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 9h6v6H9z" /></svg>
  ),
};

function getAdminCategoryIcon(name) {
  return ADMIN_CATEGORY_ICONS[name] || ADMIN_CATEGORY_ICONS.default;
}

const SITE_STATUS_PREVIEW_MAP = {
  normal: { label: '✅ Toko berjalan normal, tidak ada overlay yang tampil ke user.', bg: '#dcfce7', color: '#16a34a' },
  maintenance: { label: '🛠️ Maintenance aktif — user akan melihat halaman perbaikan dan tidak bisa checkout.', bg: '#fef3c7', color: '#d97706' },
  busy: { label: '⚡ Server Sibuk aktif — user akan melihat halaman server sibuk dan tidak bisa checkout.', bg: '#fee2e2', color: '#dc2626' },
};

const STATUS_LABEL_MAP = { pending: 'Menunggu Konfirmasi', processing: 'Diproses', waiting_link: 'Menunggu Link Alight Motion', completed: 'Berhasil', cancelled: 'Dibatalkan' };

function escapeHtmlAdmin(str) {
  return str == null ? '' : String(str);
}

function fmtDateTime(iso, opts) {
  try {
    return new Date(iso).toLocaleString('id-ID', opts || { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    return '';
  }
}

export default function AdminPage() {
  const { showToast, ToastContainer } = useAdminToasts();
  const { showConfirmDialog, ConfirmDialog } = useAdminConfirm();
  const { showPromptDialog, PromptDialog } = useAdminPrompt();

  const [curTab, setCurTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState('');

  // ---- dashboard ----
  const [stats, setStats] = useState({ totalOrders: 0, completedOrders: 0, revenue: 0 });

  // ---- products ----
  const [products, setProducts] = useState([]);
  const [stockByProduct, setStockByProduct] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm());
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState('');
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [pCategoryDropdownOpen, setPCategoryDropdownOpen] = useState(false);

  // ---- accounts ----
  const [accounts, setAccounts] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accForm, setAccForm] = useState({ product_id: '', username: '', password: '' });
  const [accBulk, setAccBulk] = useState('');

  // ---- orders ----
  const [orders, setOrders] = useState([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [proofDialogUrl, setProofDialogUrl] = useState(null);
  const [txnLookupOrder, setTxnLookupOrder] = useState(null);

  // ---- settings ----
  const [settingsForm, setSettingsForm] = useState({ store_name: '', whatsapp_number: '', running_text: '' });
  const [siteStatusForm, setSiteStatusForm] = useState({ site_status: 'normal', site_status_reason: '' });
  const [bannerForm, setBannerForm] = useState({ id: null, title: '', image_url: '', link_url: '' });
  const [banners, setBanners] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [annForm, setAnnForm] = useState(emptyAnnForm());
  const [annMediaFile, setAnnMediaFile] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [pmModalOpen, setPmModalOpen] = useState(false);
  const [pmForm, setPmForm] = useState(emptyPmForm());

  const liveDataInterval = useRef(null);

  const { openLinkVerify, LinkVerifyDialog } = useLinkVerifyDialog({
    showConfirmDialog,
    showToast,
    api,
    onDone: () => loadOrders(),
  });

  function emptyProductForm() {
    return {
      id: '', name: '', category: 'Top-up Game', price: '', prices: '',
      is_open_request: 'false', request_category: 'TIDAK OPEN REQUEST',
      is_alight_motion: 'false', description: '', image_url: '',
    };
  }
  function emptyAnnForm() {
    return { id: '', content: '', type: 'info', media_url: '', media_type: '' };
  }
  function emptyPmForm() {
    return { id: '', name: '', account_number: '', account_name: '', qris_image_url: '' };
  }

  // ============================================================
  // CLOCK
  // ============================================================
  useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // ============================================================
  // LOAD DATA (per-tab) + LIVE POLLING
  // ============================================================
  const loadStats = useCallback(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  const loadProducts = useCallback(() => {
    Promise.all([api.getProducts({ all: true }), api.getStock()])
      .then(([prodRes, stockRes]) => {
        setProducts(prodRes.data || []);
        setStockByProduct(stockRes.data || {});
      })
      .catch(() => {});
  }, []);

  const loadAccounts = useCallback(() => {
    api.getAccounts().then((res) => setAccounts(res.data || [])).catch(() => {});
  }, []);

  const loadOrders = useCallback(() => {
    api.getOrders().then((res) => setOrders(res.data || [])).catch(() => {});
  }, []);

  const loadSettings = useCallback(() => {
    api.getSettings().then((res) => {
      const s = res.settings || {};
      setSettingsForm({
        store_name: s.store_name || '',
        whatsapp_number: s.whatsapp_number || '',
        running_text: s.running_text || '',
      });
      setSiteStatusForm({
        site_status: s.site_status || 'normal',
        site_status_reason: s.site_status_reason || '',
      });
    }).catch(() => {});
  }, []);

  const loadBanner = useCallback(() => {
    api.getActiveBanner().then((b) => {
      if (b) setBannerForm({ id: b.id, title: b.title || '', image_url: b.image_url || '', link_url: b.link_url || '' });
    }).catch(() => {});
  }, []);

  const loadBannerHistory = useCallback(() => {
    api.getBanners().then((res) => setBanners(res.data || [])).catch(() => {});
  }, []);

  const loadAnnouncementHistory = useCallback(() => {
    api.getAnnouncements().then((res) => setAnnouncements(res.data || [])).catch(() => {});
  }, []);

  const loadPaymentMethods = useCallback(() => {
    api.getPaymentMethods().then((res) => setPaymentMethods(res.data || [])).catch(() => {});
  }, []);

  const loadData = useCallback(() => {
    if (curTab === 'dashboard') loadStats();
    if (curTab === 'products') loadProducts();
    if (curTab === 'accounts') loadAccounts();
    if (curTab === 'orders') loadOrders();
    if (curTab === 'settings') { loadSettings(); loadBanner(); loadBannerHistory(); loadAnnouncementHistory(); loadPaymentMethods(); }
  }, [curTab, loadStats, loadProducts, loadAccounts, loadOrders, loadSettings, loadBanner, loadBannerHistory, loadAnnouncementHistory, loadPaymentMethods]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (liveDataInterval.current) clearInterval(liveDataInterval.current);
    liveDataInterval.current = setInterval(() => {
      if (curTab === 'dashboard') loadStats();
      if (curTab === 'products') loadProducts();
      if (curTab === 'accounts') loadAccounts();
      if (curTab === 'orders') loadOrders();
    }, 6000);
    return () => clearInterval(liveDataInterval.current);
  }, [curTab, loadStats, loadProducts, loadAccounts, loadOrders]);

  const orderBadgeCount = orders.filter((o) => o.status === 'pending').length;

  const filteredProducts = productSearch.trim()
    ? products.filter((p) => (p.name || '').toLowerCase().includes(productSearch.trim().toLowerCase()) || (p.category || '').toLowerCase().includes(productSearch.trim().toLowerCase()))
    : products;

  const filteredAccounts = accountSearch.trim()
    ? accounts.filter((a) => {
        const q = accountSearch.trim().toLowerCase();
        const pname = a.products ? a.products.name : '';
        return (pname || '').toLowerCase().includes(q) || (a.username || '').toLowerCase().includes(q) || (a.status || '').toLowerCase().includes(q);
      })
    : accounts;

  const filteredOrders = orderSearch.trim()
    ? orders.filter((o) => {
        const q = orderSearch.trim().toLowerCase();
        const pname = o.products ? o.products.name : '';
        return (o.id || '').toLowerCase().includes(q) || (o.user_name || '').toLowerCase().includes(q) ||
          (o.user_contact || '').toLowerCase().includes(q) || (pname || '').toLowerCase().includes(q) ||
          (o.status || '').toLowerCase().includes(q);
      })
    : orders;

  // ============================================================
  // PRODUCT HANDLERS
  // ============================================================
  const resetProductForm = () => {
    setProductForm(emptyProductForm());
    setProductImageFile(null);
    setProductImagePreview('');
  };

  const openEditProduct = (id) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setProductForm({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      prices: (p.prices || []).join(','),
      is_open_request: String(p.is_open_request),
      request_category: p.request_category || 'TIDAK OPEN REQUEST',
      is_alight_motion: String(p.is_alight_motion),
      description: p.description || '',
      image_url: p.image_url || '',
    });
    setProductImageFile(null);
    setProductImagePreview(p.image_url || '');
    setProductModalOpen(true);
  };

  const onProductImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Foto Terlalu Besar', 'Ukuran foto maksimal 5MB.', 'warning');
      e.target.value = '';
      return;
    }
    setProductImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProductImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submitProductForm = async (e) => {
    e.preventDefault();
    setProductSubmitting(true);
    try {
      let imageUrl = productForm.image_url;
      if (productImageFile) {
        imageUrl = await api.upload(productImageFile, 'products');
      }
      const pricesArr = productForm.prices
        ? productForm.prices.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n))
        : [];
      const data = {
        name: productForm.name,
        category: productForm.category,
        price: productForm.price,
        prices: pricesArr,
        description: productForm.description,
        is_open_request: productForm.is_open_request === 'true',
        request_category: productForm.request_category,
        is_alight_motion: productForm.is_alight_motion === 'true',
        image_url: imageUrl || '',
      };
      const isEdit = !!productForm.id;
      if (isEdit) {
        await api.updateProduct(productForm.id, data);
      } else {
        await api.createProduct(data);
      }
      setProductModalOpen(false);
      resetProductForm();
      loadProducts();
      showToast(isEdit ? 'Produk Diperbarui!' : 'Produk Ditambahkan!', `${data.name} berhasil ${isEdit ? 'diperbarui' : 'disimpan'}.`, 'success');
    } catch (err) {
      showToast('Gagal Menyimpan', err.message, 'error');
    } finally {
      setProductSubmitting(false);
    }
  };

  const deleteProduct = async (id) => {
    const ok = await showConfirmDialog({
      title: 'Hapus Produk?',
      desc: 'Produk ini akan dihapus permanen beserta relasinya. Tindakan ini tidak bisa dibatalkan.',
      type: 'danger',
      okLabel: 'YA, HAPUS',
    });
    if (!ok) return;
    try {
      await api.deleteProduct(id);
      showToast('Produk Dihapus', 'Produk berhasil dihapus dari katalog.', 'success', 2500);
      loadProducts();
    } catch (err) {
      showToast('Gagal Menghapus', err.message, 'error');
    }
  };

  const selectPCategoryOption = (name) => {
    setProductForm((f) => ({ ...f, category: name }));
    setPCategoryDropdownOpen(false);
  };

  // ============================================================
  // ACCOUNT HANDLERS
  // ============================================================
  const submitAccountForm = async (e) => {
    e.preventDefault();
    try {
      await api.createAccount(accForm);
      setAccForm({ product_id: '', username: '', password: '' });
      setAccountModalOpen(false);
      showToast('Stok Ditambahkan!', 'Akun baru berhasil ditambahkan.', 'success', 2500);
      loadAccounts();
      loadProducts();
    } catch (err) {
      showToast('Gagal Menambah Stok', err.message, 'error');
    }
  };

  const submitBulkAccounts = async () => {
    const productId = accForm.product_id;
    const raw = accBulk.trim();
    if (!productId) { showToast('Belum Lengkap', 'Pilih produk terlebih dahulu.', 'warning'); return; }
    if (!raw) { showToast('Belum Lengkap', 'Isi daftar akun terlebih dahulu.', 'warning'); return; }

    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 2) continue;
      rows.push({ product_id: productId, username: parts[0].trim(), password: parts.slice(1).join(',').trim() });
    }
    if (rows.length === 0) { showToast('Format Tidak Valid', 'Gunakan format: username,password per baris.', 'error'); return; }

    try {
      await api.createAccountsBulk(rows);
      setAccBulk('');
      setAccountModalOpen(false);
      loadAccounts();
      loadProducts();
      showToast('Berhasil!', `Berhasil menambah ${rows.length} akun ke stok.`, 'success');
    } catch (err) {
      showToast('Gagal Menambah Stok', err.message, 'error');
    }
  };

  const updateAccountStatus = async (id, newStatus) => {
    try {
      await api.updateAccountStatus(id, newStatus);
      showToast('Status Diperbarui', 'Status akun berhasil diubah.', 'success', 2200);
      loadAccounts();
    } catch (err) {
      showToast('Gagal Update', err.message, 'error');
    }
  };

  const deleteAccount = async (id) => {
    const ok = await showConfirmDialog({
      title: 'Hapus Stok Akun?',
      desc: 'Akun ini akan dihapus permanen dari stok. Tindakan ini tidak bisa dibatalkan.',
      type: 'danger',
      okLabel: 'YA, HAPUS',
    });
    if (!ok) return;
    try {
      await api.deleteAccount(id);
      showToast('Akun Dihapus', 'Stok akun berhasil dihapus.', 'success', 2500);
      loadAccounts();
      loadProducts();
    } catch (err) {
      showToast('Gagal Menghapus', err.message, 'error');
    }
  };

  const clearSoldAccounts = async () => {
    const soldCount = accounts.filter((a) => a.status === 'sold').length;
    if (soldCount === 0) {
      showToast('Tidak Ada Data', 'Tidak ada akun berstatus sold untuk dihapus.', 'warning');
      return;
    }
    const ok = await showConfirmDialog({
      title: 'Hapus Semua Akun Sold?',
      desc: `Ini akan menghapus permanen ${soldCount} akun berstatus "sold" dari stok. Tindakan ini tidak bisa dibatalkan.`,
      type: 'danger',
      okLabel: 'YA, HAPUS SEMUA',
    });
    if (!ok) return;
    try {
      await api.clearSoldAccounts();
      showToast('Berhasil!', `${soldCount} akun sold berhasil dihapus.`, 'success');
      loadAccounts();
      loadProducts();
    } catch (err) {
      showToast('Gagal Menghapus', err.message, 'error');
    }
  };

  // ============================================================
  // ORDER HANDLERS
  // ============================================================
  const copyToClipboardAdmin = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Tersalin!', 'ID transaksi disalin ke clipboard.', 'success', 2000))
      .catch(() => showToast('Gagal Menyalin', 'Tidak bisa menyalin otomatis.', 'error'));
  };

  const viewTransactionDetail = (id) => {
    const o = orders.find((x) => x.id === id);
    setTxnLookupOrder(o || null);
  };

  const confirmOrder = async (o) => {
    const qty = o.quantity || 1;
    const prod = o.products;
    // NOTE: admin.html re-fetches the order+product before branching; here
    // we already have `products.name` joined from loadOrders, but the
    // is_alight_motion/is_open_request flags require the full product row.
    let fullProduct = products.find((p) => p.id === o.product_id);
    if (!fullProduct) {
      // fallback: fetch it fresh if not present in the currently loaded product list
      try {
        const res = await api.getProducts({ all: true });
        fullProduct = (res.data || []).find((p) => p.id === o.product_id);
      } catch (e) { /* ignore */ }
    }
    if (!fullProduct) { showToast('Gagal', 'Produk tidak ditemukan.', 'error'); return; }

    if (fullProduct.is_alight_motion) {
      const linkMsg = await showPromptDialog({
        title: 'Kirim Link Alight Motion',
        desc: 'Masukkan link/instruksi Alight Motion untuk dikirim ke pembeli:',
        placeholder: 'https://alight-creative... atau instruksi lainnya',
        okLabel: 'KIRIM KE PEMBELI',
        defaultValue: o.admin_note || '',
      });
      if (linkMsg === null) return;
      try {
        await api.confirmOrder(o.id, { link_message: linkMsg });
        showToast('Pembayaran Dikonfirmasi!', 'Pembeli akan diminta mengirim link Alight Motion mereka.', 'success');
        loadOrders();
      } catch (err) {
        showToast('Gagal', err.message, 'error');
      }
      return;
    }

    if (fullProduct.is_open_request) {
      const adminNote = await showPromptDialog({
        title: 'Kirim Catatan ke Pembeli',
        desc: 'Masukkan Gmail/Catatan untuk pembeli:',
        placeholder: 'Gmail atau catatan lainnya',
        okLabel: 'KIRIM & SELESAIKAN',
        defaultValue: o.admin_note || '',
      });
      if (adminNote === null) return;
      try {
        await api.confirmOrder(o.id, { admin_note: adminNote });
        showToast('Pesanan Selesai!', 'Catatan/Link telah dikirim ke pembeli.', 'success');
        loadOrders();
      } catch (err) {
        showToast('Gagal', err.message, 'error');
      }
      return;
    }

    const ok = await showConfirmDialog({
      title: 'Konfirmasi Pesanan',
      desc: `Konfirmasi pembayaran untuk ${qty} akun? Akun akan langsung dikirim ke pembeli.`,
      type: 'question',
      okLabel: 'YA, KONFIRMASI',
    });
    if (!ok) return;
    try {
      const res = await api.confirmOrder(o.id, { quantity: qty });
      if (res.warning) {
        showToast('Sebagian Proses Gagal', res.warning, 'warning');
      } else {
        showToast('Pesanan Selesai!', `${qty} akun telah berhasil dikirim ke pembeli.`, 'success');
      }
      loadOrders();
      loadProducts();
    } catch (err) {
      showToast('Stok Tidak Cukup', err.message, 'error');
    }
  };

  // ============================================================
  // SETTINGS HANDLERS
  // ============================================================
  const submitSettingsForm = async (e) => {
    e.preventDefault();
    try {
      await api.saveSettings([
        { key: 'store_name', value: settingsForm.store_name },
        { key: 'whatsapp_number', value: settingsForm.whatsapp_number },
        { key: 'running_text', value: settingsForm.running_text },
      ]);
      showToast('Berhasil!', 'Pengaturan toko berhasil disimpan.', 'success');
    } catch (err) {
      showToast('Gagal Menyimpan', err.message, 'error');
    }
  };

  const submitSiteStatusForm = async (e) => {
    e.preventDefault();
    const { site_status, site_status_reason } = siteStatusForm;
    const reason = (site_status_reason || '').trim();
    if (site_status !== 'normal' && !reason) {
      showToast('Belum Lengkap', 'Isi alasan/pesan untuk user sebelum mengaktifkan Maintenance atau Server Sibuk.', 'warning');
      return;
    }
    try {
      await api.saveSettings([
        { key: 'site_status', value: site_status },
        { key: 'site_status_reason', value: reason },
      ]);
      if (site_status === 'normal') {
        showToast('Toko Kembali Normal', 'Overlay maintenance/server sibuk sudah dimatikan untuk user.', 'success');
      } else {
        showToast('Status Toko Diperbarui!', `User sekarang akan melihat halaman ${site_status === 'maintenance' ? 'Maintenance' : 'Server Sibuk'}.`, 'success');
      }
    } catch (err) {
      showToast('Gagal Menyimpan', err.message, 'error');
    }
  };

  const submitBannerForm = async (e) => {
    e.preventDefault();
    try {
      await api.saveBanner(bannerForm);
      showToast('Berhasil!', 'Banner berhasil diperbarui.', 'success');
      loadBanner();
      loadBannerHistory();
    } catch (err) {
      showToast('Gagal Menyimpan', err.message, 'error');
    }
  };

  const editBannerFromHistory = (id) => {
    const b = banners.find((x) => x.id === id);
    if (!b) return;
    setBannerForm({ id: b.id, title: b.title || '', image_url: b.image_url || '', link_url: b.link_url || '' });
    showToast('Mode Edit', 'Banner dimuat ke form, silakan ubah lalu simpan.', 'info', 2500);
  };

  const deleteBannerFromHistory = async (id) => {
    const ok = await showConfirmDialog({ title: 'Hapus Banner?', desc: 'Banner ini akan dihapus permanen.', type: 'danger', okLabel: 'YA, HAPUS' });
    if (!ok) return;
    try {
      await api.deleteBanner(id);
      showToast('Berhasil!', 'Banner berhasil dihapus.', 'success');
      loadBanner();
      loadBannerHistory();
    } catch (err) {
      showToast('Gagal Menghapus', err.message, 'error');
    }
  };

  const onAnnMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAnnMediaFile(file);
    const isVideo = file.type.indexOf('video') === 0;
    const url = URL.createObjectURL(file);
    setAnnForm((f) => ({ ...f, media_url: url, media_type: isVideo ? 'video' : 'image' }));
  };

  const removeAnnouncementMedia = () => {
    setAnnMediaFile(null);
    setAnnForm((f) => ({ ...f, media_url: '', media_type: '' }));
  };

  const resetAnnouncementForm = () => {
    setAnnForm(emptyAnnForm());
    setAnnMediaFile(null);
  };

  const submitAnnouncementForm = async (e) => {
    e.preventDefault();
    const content = annForm.content.trim();
    if (!content) { showToast('Belum Lengkap', 'Isi pengumuman tidak boleh kosong.', 'warning'); return; }
    try {
      let mediaUrl = annForm.media_url || null;
      let mediaType = annForm.media_type || null;
      if (annMediaFile) {
        mediaUrl = await api.upload(annMediaFile, 'announcements');
        mediaType = annMediaFile.type.indexOf('video') === 0 ? 'video' : 'image';
      }
      await api.saveAnnouncement({ id: annForm.id || undefined, content, type: annForm.type, media_url: mediaUrl, media_type: mediaType });
      showToast('Berhasil!', annForm.id ? 'Announcement berhasil diperbarui.' : 'Announcement berhasil ditambahkan.', 'success');
      resetAnnouncementForm();
      loadAnnouncementHistory();
    } catch (err) {
      showToast('Gagal Menyimpan', err.message, 'error');
    }
  };

  const editAnnouncement = (id) => {
    const a = announcements.find((x) => x.id === id);
    if (!a) return;
    setAnnForm({ id: a.id, content: a.content, type: a.type, media_url: a.media_url || '', media_type: a.media_type || '' });
    setAnnMediaFile(null);
  };

  const deleteAnnouncement = async (id) => {
    const ok = await showConfirmDialog({ title: 'Hapus Announcement?', desc: 'Pengumuman ini akan dihapus permanen.', type: 'danger', okLabel: 'YA, HAPUS' });
    if (!ok) return;
    try {
      await api.deleteAnnouncement(id);
      showToast('Berhasil!', 'Announcement berhasil dihapus.', 'success');
      loadAnnouncementHistory();
    } catch (err) {
      showToast('Gagal Menghapus', err.message, 'error');
    }
  };

  const resetPaymentMethodForm = () => setPmForm(emptyPmForm());

  const submitPaymentMethodForm = async (e) => {
    e.preventDefault();
    const name = pmForm.name.trim();
    if (!name) { showToast('Belum Lengkap', 'Nama metode wajib diisi.', 'warning'); return; }
    try {
      await api.savePaymentMethod({
        id: pmForm.id || undefined,
        name,
        account_number: pmForm.account_number.trim(),
        account_name: pmForm.account_name.trim(),
        qris_image_url: pmForm.qris_image_url.trim(),
      });
      showToast('Berhasil!', pmForm.id ? 'Metode pembayaran diperbarui.' : 'Metode pembayaran ditambahkan.', 'success');
      setPmModalOpen(false);
      resetPaymentMethodForm();
      loadPaymentMethods();
    } catch (err) {
      showToast('Gagal Menyimpan', err.message, 'error');
    }
  };

  const editPaymentMethod = (id) => {
    const pm = paymentMethods.find((x) => x.id === id);
    if (!pm) return;
    setPmForm({ id: pm.id, name: pm.name || '', account_number: pm.account_number || '', account_name: pm.account_name || '', qris_image_url: pm.qris_image_url || '' });
    setPmModalOpen(true);
  };

  const togglePaymentMethodActive = async (id, newState) => {
    try {
      await api.updatePaymentMethod(id, { is_active: newState });
      showToast('Berhasil!', 'Status metode pembayaran diperbarui.', 'success', 2200);
      loadPaymentMethods();
    } catch (err) {
      showToast('Gagal Update', err.message, 'error');
    }
  };

  const deletePaymentMethod = async (id) => {
    const ok = await showConfirmDialog({
      title: 'Hapus Metode Pembayaran?',
      desc: 'Metode ini akan dihapus permanen dan tidak akan muncul lagi di halaman checkout.',
      type: 'danger',
      okLabel: 'YA, HAPUS',
    });
    if (!ok) return;
    try {
      await api.deletePaymentMethod(id);
      showToast('Berhasil!', 'Metode pembayaran dihapus.', 'success');
      loadPaymentMethods();
    } catch (err) {
      showToast('Gagal Menghapus', err.message, 'error');
    }
  };

  const siteStatusPreview = SITE_STATUS_PREVIEW_MAP[siteStatusForm.site_status] || SITE_STATUS_PREVIEW_MAP.normal;

  return (
    <div className="sanz-admin">
      <ToastContainer />
      <ConfirmDialog />
      <PromptDialog />
      <LinkVerifyDialog />

      {/* TOP HEADER */}
      <div className="top-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <span className="text-xl font-black tracking-tighter">SANZXMZZ</span>
            <span className="text-[9px] bg-black text-white px-2.5 py-0.5 rounded-full font-bold tracking-wide">ADMIN</span>
          </div>
          <span className="text-xs text-gray-400 font-semibold">{currentTime}</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* Dashboard */}
        <div className={`tab-content${curTab === 'dashboard' ? ' active' : ''}`}>
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Dashboard</h2>
            <p className="text-gray-400 font-medium mt-1">Selamat datang kembali, Admin.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="stat-card">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Orders</p>
              <h3 className="text-3xl font-black tracking-tighter mt-1">{stats.totalOrders}</h3>
            </div>
            <div className="stat-card">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Completed</p>
              <h3 className="text-3xl font-black tracking-tighter mt-1 text-green-600">{stats.completedOrders}</h3>
            </div>
            <div className="stat-card">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Revenue</p>
              <h3 className="text-3xl font-black tracking-tighter mt-1">Rp {stats.revenue.toLocaleString('id-ID')}</h3>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className={`tab-content${curTab === 'products' ? ' active' : ''}`}>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">Produk</h2>
              <p className="text-gray-400 font-medium mt-1">Kelola katalog layanan Anda.</p>
            </div>
            <button onClick={() => { resetProductForm(); setProductModalOpen(true); }} className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              TAMBAH
            </button>
          </div>
          <div className="admin-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="admin-search-icon"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" className="admin-search-input" placeholder="Cari nama produk atau kategori..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
          </div>
          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Produk</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Kategori</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Harga</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Stok Live</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 font-bold">Belum ada produk.</td></tr>
                ) : filteredProducts.map((p) => {
                  const stock = stockByProduct[p.id] || 0;
                  const stockClass = stock <= 0 ? 'empty' : (stock <= 5 ? 'low' : 'ok');
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={p.image_url || 'https://via.placeholder.com/64x64?text=No+Img'} className="w-10 h-10 rounded-xl object-cover bg-gray-100"
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/64x64?text=No+Img'; }} alt="" />
                          <span className="font-bold">{escapeHtmlAdmin(p.name)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className="category-tag">{escapeHtmlAdmin(p.category)}</span></td>
                      <td className="px-6 py-4 font-black">Rp {Number(p.price).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4"><span className={`stock-count-badge ${stockClass}`}><span className="live-dot" />{stock} akun</span></td>
                      <td className="px-6 py-4 flex flex-wrap gap-2">
                        <button onClick={() => openEditProduct(p.id)} className="btn-primary" style={{ padding: '8px 14px', fontSize: '11px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          {' '}EDIT
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="btn-danger">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          {' '}HAPUS
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Accounts */}
        <div className={`tab-content${curTab === 'accounts' ? ' active' : ''}`}>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">Stok Akun</h2>
              <p className="text-gray-400 font-medium mt-1">Input akun premium yang akan dijual.</p>
            </div>
            <button onClick={() => setAccountModalOpen(true)} className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              TAMBAH
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="admin-search-wrap" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="admin-search-icon"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" className="admin-search-input" placeholder="Cari produk atau username..." value={accountSearch} onChange={(e) => setAccountSearch(e.target.value)} />
            </div>
            <button onClick={clearSoldAccounts} className="btn-danger" style={{ padding: '12px 18px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              HAPUS SEMUA YANG SOLD
            </button>
          </div>
          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Produk</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Credentials</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-bold">Belum ada stok akun.</td></tr>
                ) : filteredAccounts.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-bold">{escapeHtmlAdmin(a.products ? a.products.name : 'Unknown')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">{escapeHtmlAdmin(a.username)} / {escapeHtmlAdmin(a.password)}</td>
                    <td className="px-6 py-4">
                      <select className="inline-edit-input" style={{ width: 120 }} value={a.status} onChange={(e) => updateAccountStatus(a.id, e.target.value)}>
                        <option value="available">available</option>
                        <option value="sold">sold</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => deleteAccount(a.id)} className="btn-danger">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        {' '}HAPUS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Orders */}
        <div className={`tab-content${curTab === 'orders' ? ' active' : ''}`}>
          <div className="mb-6">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Pesanan</h2>
            <p className="text-gray-400 font-medium mt-1">Konfirmasi pembayaran dari user.</p>
          </div>
          <div className="admin-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="admin-search-icon"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input type="text" className="admin-search-input" placeholder="Cari ID transaksi, nama, kontak, atau produk..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
          </div>
          <div className="table-wrap">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">ID Transaksi</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Customer</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Produk</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Tanggal/Jam</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-bold">Belum ada pesanan.</td></tr>
                ) : filteredOrders.map((o) => {
                  const productName = o.products ? o.products.name : 'Unknown';
                  const statusClass = o.status === 'pending' ? 'pending' : (o.status === 'completed' ? 'completed' : (o.status === 'waiting_link' ? 'pending' : 'sold'));
                  const qty = o.quantity || 1;
                  return (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4">
                        <button onClick={() => copyToClipboardAdmin(o.id)} className="flex items-center gap-1.5 font-mono text-[11px] text-gray-500 hover:text-black transition bg-gray-50 px-2.5 py-1.5 rounded-lg">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          {' '}{o.id.substring(0, 8)}...
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold">{escapeHtmlAdmin(o.user_name)}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{escapeHtmlAdmin(o.user_contact)}</p>
                      </td>
                      <td className="px-6 py-4 font-bold">{escapeHtmlAdmin(productName)} <span className="text-gray-400 font-semibold">x{qty}</span></td>
                      <td className="px-6 py-4 text-xs text-gray-500 font-semibold whitespace-nowrap">{fmtDateTime(o.created_at)}</td>
                      <td className="px-6 py-4"><span className={`status-badge ${statusClass}`}>{o.status}</span></td>
                      <td className="px-6 py-4 flex flex-wrap items-center gap-2">
                        <button onClick={() => viewTransactionDetail(o.id)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '11px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          {' '}VIEW
                        </button>
                        {o.payment_proof_url ? (
                          <button onClick={() => setProofDialogUrl(o.payment_proof_url)} className="text-black font-bold text-xs hover:underline flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-xl transition hover:bg-gray-200">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            {' '}BUKTI
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-300 font-bold">Tidak ada</span>
                        )}
                        {(o.status === 'pending' || o.status === 'processing') && (
                          <button onClick={() => confirmOrder(o)} className="bg-black text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:scale-105 transition active:scale-95 shadow-lg shadow-black/20">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            {' '}KONFIRMASI
                          </button>
                        )}
                        {o.status === 'waiting_link' && (
                          o.request_link ? (
                            <button onClick={() => openLinkVerify(o.id, o.request_link)} className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:scale-105 transition active:scale-95 shadow-lg shadow-blue-600/20">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              {' '}VERIFIKASI LINK
                            </button>
                          ) : (
                            <span className="text-[10px] text-blue-500 font-bold uppercase">Menunggu link user</span>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Settings */}
        <div className={`tab-content${curTab === 'settings' ? ' active' : ''}`}>
          <div className="mb-6">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Settings</h2>
            <p className="text-gray-400 font-medium mt-1">Atur konfigurasi toko Anda.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="stat-card">
              <h4 className="text-lg font-bold mb-4">Site Information</h4>
              <form onSubmit={submitSettingsForm} className="space-y-4">
                <div>
                  <label>Nama Toko</label>
                  <input type="text" placeholder="SANZXMZZ STORE" value={settingsForm.store_name} onChange={(e) => setSettingsForm((f) => ({ ...f, store_name: e.target.value }))} />
                </div>
                <div>
                  <label>WhatsApp Admin</label>
                  <input type="text" placeholder="628xxxx" value={settingsForm.whatsapp_number} onChange={(e) => setSettingsForm((f) => ({ ...f, whatsapp_number: e.target.value }))} />
                </div>
                <div>
                  <label>Running Text (Promo)</label>
                  <input type="text" placeholder="Selamat datang..." value={settingsForm.running_text} onChange={(e) => setSettingsForm((f) => ({ ...f, running_text: e.target.value }))} />
                </div>
                <button type="submit" className="btn-primary w-full justify-center">SIMPAN PERUBAHAN</button>
              </form>
            </div>

            <div className="stat-card">
              <h4 className="text-lg font-bold mb-1">Status Toko</h4>
              <p className="text-xs text-gray-400 font-semibold mb-4">Aktifkan mode Maintenance atau Server Sibuk untuk memblokir sementara pembelian di halaman utama, lengkap dengan alasannya.</p>
              <form onSubmit={submitSiteStatusForm} className="space-y-4">
                <div>
                  <label>Pilih Status</label>
                  <select value={siteStatusForm.site_status} onChange={(e) => setSiteStatusForm((f) => ({ ...f, site_status: e.target.value }))}>
                    <option value="normal">Normal (Toko Buka Seperti Biasa)</option>
                    <option value="maintenance">Maintenance (Sedang Ada Perbaikan)</option>
                    <option value="busy">Server Sibuk</option>
                  </select>
                </div>
                <div>
                  <label>Alasan / Pesan untuk User</label>
                  <textarea rows={3} placeholder="Contoh: Sedang ada perbaikan sistem pembayaran, mohon tunggu 30 menit lagi."
                    style={{ width: '100%', padding: '14px 16px', background: '#f8f9fa', border: '2px solid transparent', borderRadius: 16, fontFamily: 'inherit', fontWeight: 500, outline: 'none', fontSize: 14, resize: 'vertical' }}
                    value={siteStatusForm.site_status_reason}
                    onChange={(e) => setSiteStatusForm((f) => ({ ...f, site_status_reason: e.target.value }))} />
                </div>
                <div style={{ borderRadius: 16, padding: '12px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', background: siteStatusPreview.bg, color: siteStatusPreview.color }}>
                  {siteStatusPreview.label}
                </div>
                <button type="submit" className="btn-primary w-full justify-center">SIMPAN STATUS TOKO</button>
              </form>
            </div>

            <div className="stat-card">
              <h4 className="text-lg font-bold mb-4">Promo Banner</h4>
              <form onSubmit={submitBannerForm} className="space-y-4">
                <div>
                  <label>Judul Promo</label>
                  <input type="text" placeholder="Diskon Akhir Tahun" value={bannerForm.title} onChange={(e) => setBannerForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label>Image URL</label>
                  <input type="text" placeholder="https://..." value={bannerForm.image_url} onChange={(e) => setBannerForm((f) => ({ ...f, image_url: e.target.value }))} />
                </div>
                <div>
                  <label>Link URL (Opsional)</label>
                  <input type="text" placeholder="https://..." value={bannerForm.link_url} onChange={(e) => setBannerForm((f) => ({ ...f, link_url: e.target.value }))} />
                </div>
                <button type="submit" className="btn-primary w-full justify-center">UPDATE BANNER</button>
              </form>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Riwayat Banner</p>
                <div className="space-y-2">
                  {banners.length === 0 ? (
                    <p className="text-xs text-gray-400 font-semibold text-center py-4">Belum ada banner.</p>
                  ) : banners.map((b) => (
                    <div key={b.id} className={`history-item-row${b.is_active ? '' : ' inactive'}`}>
                      <div className="history-item-content">
                        <p>{escapeHtmlAdmin(b.title || '(Tanpa judul)')}</p>
                        <span>{b.is_active ? 'Aktif' : 'Nonaktif'}</span>
                      </div>
                      <div className="history-item-actions">
                        <button className="btn-edit-mini" title="Edit" onClick={() => editBannerFromHistory(b.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button className="btn-delete-mini" title="Hapus" onClick={() => deleteBannerFromHistory(b.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <h4 className="text-lg font-bold mb-4">Announcement</h4>
              <form onSubmit={submitAnnouncementForm} className="space-y-4">
                <div>
                  <label>Isi Pengumuman</label>
                  <textarea rows={2} placeholder="Contoh: Server maintenance jam 00:00 - 02:00"
                    style={{ width: '100%', padding: '14px 16px', background: '#f8f9fa', border: '2px solid transparent', borderRadius: 16, fontFamily: 'inherit', fontWeight: 500, outline: 'none', fontSize: 14, resize: 'vertical' }}
                    value={annForm.content}
                    onChange={(e) => setAnnForm((f) => ({ ...f, content: e.target.value }))} />
                </div>
                <div>
                  <label>Tipe</label>
                  <select value={annForm.type} onChange={(e) => setAnnForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                  </select>
                </div>
                <div>
                  <label>Lampiran Foto/Video (opsional)</label>
                  <input type="file" accept="image/*,video/*" onChange={onAnnMediaChange} />
                  {annForm.media_url && (
                    <div className="mt-3" style={{ position: 'relative', maxWidth: 220 }}>
                      {annForm.media_type === 'video' ? (
                        <video src={annForm.media_url} style={{ width: '100%', borderRadius: 14 }} controls />
                      ) : (
                        <img src={annForm.media_url} style={{ width: '100%', borderRadius: 14 }} alt="" />
                      )}
                      <button type="button" onClick={removeAnnouncementMedia} className="btn-delete-mini" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary flex-1 justify-center">{annForm.id ? 'UPDATE PENGUMUMAN' : 'TAMBAH PENGUMUMAN'}</button>
                  {annForm.id && (
                    <button type="button" onClick={resetAnnouncementForm} className="btn-secondary">BATAL</button>
                  )}
                </div>
              </form>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Riwayat Announcement</p>
                <div className="space-y-2">
                  {announcements.length === 0 ? (
                    <p className="text-xs text-gray-400 font-semibold text-center py-4">Belum ada announcement.</p>
                  ) : announcements.map((a) => (
                    <div key={a.id} className={`history-item-row${a.is_active ? '' : ' inactive'}`} style={{ alignItems: 'center' }}>
                      {a.media_url && (
                        a.media_type === 'video'
                          ? <video src={a.media_url} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} muted />
                          : <img src={a.media_url} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} alt="" />
                      )}
                      <div className="history-item-content">
                        <p>{escapeHtmlAdmin(a.content)}</p>
                        <span>{a.type} · {a.is_active ? 'Aktif' : 'Nonaktif'} · {fmtDateTime(a.created_at, { day: '2-digit', month: 'short', year: 'numeric' })}{a.media_url ? ` · 📎 ${a.media_type === 'video' ? 'Video' : 'Foto'}` : ''}</span>
                      </div>
                      <div className="history-item-actions">
                        <button className="btn-edit-mini" title="Edit" onClick={() => editAnnouncement(a.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button className="btn-delete-mini" title="Hapus" onClick={() => deleteAnnouncement(a.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="stat-card mt-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <h4 className="text-lg font-bold">Metode Pembayaran</h4>
              <button type="button" onClick={() => { resetPaymentMethodForm(); setPmModalOpen(true); }} className="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                TAMBAH METODE
              </button>
            </div>
            <div className="space-y-2">
              {paymentMethods.length === 0 ? (
                <p className="text-xs text-gray-400 font-semibold text-center py-4">Belum ada metode pembayaran.</p>
              ) : paymentMethods.map((pm) => (
                <div key={pm.id} className={`history-item-row${pm.is_active ? '' : ' inactive'}`}>
                  <div className="history-item-content">
                    <p>{escapeHtmlAdmin(pm.name)}</p>
                    <span>{escapeHtmlAdmin(pm.account_number || '-')} · {escapeHtmlAdmin(pm.account_name || '-')} · {pm.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  </div>
                  <div className="history-item-actions">
                    <button className="btn-edit-mini" title={pm.is_active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => togglePaymentMethodActive(pm.id, !pm.is_active)}>
                      {pm.is_active ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      )}
                    </button>
                    <button className="btn-edit-mini" title="Edit" onClick={() => editPaymentMethod(pm.id)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button className="btn-delete-mini" title="Hapus" onClick={() => deletePaymentMethod(pm.id)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM NAVBAR */}
      <nav className="bottom-nav">
        <button onClick={() => setCurTab('dashboard')} className={`nav-item${curTab === 'dashboard' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
          </span>
          <span className="nav-label">Dashboard</span>
        </button>
        <button onClick={() => setCurTab('products')} className={`nav-item${curTab === 'products' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-4.5A2.5 2.5 0 0 1 13 4.5V3" /><path d="M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" /><polyline points="9 11 12 14 22 4" /></svg>
          </span>
          <span className="nav-label">Produk</span>
        </button>
        <button onClick={() => setCurTab('accounts')} className={`nav-item${curTab === 'accounts' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a8 8 0 0 1 8 8c0 3.5-2 6.5-5 8l-3 4-3-4c-3-1.5-5-4.5-5-8a8 8 0 0 1 8-8z" /><circle cx="12" cy="10" r="3" /></svg>
          </span>
          <span className="nav-label">Stok</span>
        </button>
        <button onClick={() => setCurTab('orders')} className={`nav-item${curTab === 'orders' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
          </span>
          <span className="nav-label">Pesanan</span>
          {orderBadgeCount > 0 && <span className="badge">{orderBadgeCount}</span>}
        </button>
        <button onClick={() => setCurTab('settings')} className={`nav-item${curTab === 'settings' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </span>
          <span className="nav-label">Settings</span>
        </button>
        <a href="/" className="nav-item logout">
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </span>
          <span className="nav-label">Keluar</span>
        </a>
      </nav>

      {/* PROOF DIALOG */}
      <div id="proofDialog" className={proofDialogUrl ? 'modal open' : 'modal'}>
        <div className="modal-box">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-black tracking-tight">Bukti Transfer</h3>
            <button type="button" onClick={() => setProofDialogUrl(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          {proofDialogUrl && (
            <>
              <img src={proofDialogUrl} alt="Bukti Transfer" />
              <a href={proofDialogUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2 mt-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                Buka di Tab Baru
              </a>
            </>
          )}
        </div>
      </div>

      {/* TRANSACTION DETAIL / LOOKUP MODAL */}
      <div className={txnLookupOrder ? 'modal open' : 'modal'}>
        <div className="modal-box">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-black tracking-tight">Detail Transaksi</h3>
            <button type="button" onClick={() => setTxnLookupOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          {txnLookupOrder && (() => {
            const o = txnLookupOrder;
            const productName = o.products ? o.products.name : 'Unknown';
            const qty = o.quantity || 1;
            const row = (label, value) => (
              <div className="flex justify-between items-start gap-4 py-3 border-b border-gray-50" key={label}>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
                <span className="text-sm font-bold text-right">{value}</span>
              </div>
            );
            return (
              <div>
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-bold text-gray-500 break-all">{escapeHtmlAdmin(o.id)}</span>
                  <button onClick={() => copyToClipboardAdmin(o.id)} className="btn-secondary flex-shrink-0" style={{ padding: '8px 12px', fontSize: '10px' }}>SALIN</button>
                </div>
                {row('Nama Pembeli', escapeHtmlAdmin(o.user_name || '-'))}
                {row('Nomor/Kontak', escapeHtmlAdmin(o.user_contact || '-'))}
                {row('Produk', escapeHtmlAdmin(productName))}
                {row('Jumlah Beli', `${qty} akun`)}
                {row('Total Harga', `Rp ${Number(o.total_amount || 0).toLocaleString('id-ID')}`)}
                {row('Metode Pembayaran', escapeHtmlAdmin(o.payment_method || '-'))}
                {row('Waktu Pembelian', fmtDateTime(o.created_at, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) || '-')}
                {row('Status', <span className={`status-badge ${o.status === 'pending' ? 'pending' : (o.status === 'completed' ? 'completed' : 'sold')}`}>{STATUS_LABEL_MAP[o.status] || o.status}</span>)}
                {o.request_link ? row('Link Request', escapeHtmlAdmin(o.request_link)) : null}
                {o.admin_note ? row('Catatan Admin', escapeHtmlAdmin(o.admin_note)) : null}
              </div>
            );
          })()}
        </div>
      </div>

      {/* PAYMENT METHOD MODAL */}
      <div className={pmModalOpen ? 'modal open' : 'modal'}>
        <div className="modal-box">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-black tracking-tight">{pmForm.id ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran'}</h3>
            <button type="button" onClick={() => setPmModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <form onSubmit={submitPaymentMethodForm} className="space-y-4">
            <div>
              <label>Nama Metode</label>
              <input type="text" required placeholder="Contoh: DANA, OVO, GOPAY, QRIS" value={pmForm.name} onChange={(e) => setPmForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label>Nomor Tujuan (HP/Rekening)</label>
              <input type="text" placeholder="0812xxxxxxx" value={pmForm.account_number} onChange={(e) => setPmForm((f) => ({ ...f, account_number: e.target.value }))} />
            </div>
            <div>
              <label>Nama Pemilik Akun</label>
              <input type="text" placeholder="Nama sesuai akun" value={pmForm.account_name} onChange={(e) => setPmForm((f) => ({ ...f, account_name: e.target.value }))} />
            </div>
            <div>
              <label>URL Gambar QRIS (Khusus QRIS statis, opsional)</label>
              <input type="text" placeholder="https://... (kosongkan jika pakai QRIS dinamis otomatis)" value={pmForm.qris_image_url} onChange={(e) => setPmForm((f) => ({ ...f, qris_image_url: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setPmModalOpen(false)} className="btn-secondary">BATAL</button>
              <button type="submit" className="btn-primary">{pmForm.id ? 'UPDATE METODE' : 'SIMPAN METODE'}</button>
            </div>
          </form>
        </div>
      </div>

      {/* PRODUCT MODAL */}
      <div className={productModalOpen ? 'modal open' : 'modal'}>
        <div className="modal-box">
          <h3 className="text-2xl font-black tracking-tight mb-6">{productForm.id ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
          <form onSubmit={submitProductForm} className="space-y-5">
            <div>
              <label>Nama Produk</label>
              <input type="text" required placeholder="Contoh: Netflix Premium" value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Kategori</label>
                <div className={`cdd${pCategoryDropdownOpen ? ' open' : ''}`}>
                  <button type="button" className="cdd-trigger" onClick={() => setPCategoryDropdownOpen((v) => !v)}>
                    <span className="cdd-trigger-icon">{getAdminCategoryIcon(productForm.category)}</span>
                    <span className="cdd-trigger-label">{productForm.category || 'Pilih Kategori'}</span>
                    <span className="cdd-chevron">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </span>
                  </button>
                  <div className="cdd-panel">
                    {ADMIN_CATEGORY_LIST.map((name) => (
                      <div key={name} className={`cdd-option${name === productForm.category ? ' selected' : ''}`} onClick={() => selectPCategoryOption(name)}>
                        <span className="cdd-option-icon">{getAdminCategoryIcon(name)}</span>
                        <span className="cdd-option-label">{name}</span>
                        <svg className="cdd-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label>Harga Default (Rp)</label>
                <input type="number" required placeholder="10000" value={productForm.price} onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div>
              <label>Multi-Harga (Pisahkan dengan koma, misal: 500,1000,2000)</label>
              <input type="text" placeholder="500,1000,2000" value={productForm.prices} onChange={(e) => setProductForm((f) => ({ ...f, prices: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Request Gmail?</label>
                <select value={productForm.is_open_request} onChange={(e) => setProductForm((f) => ({ ...f, is_open_request: e.target.value }))}>
                  <option value="false">Tidak</option>
                  <option value="true">Ya (Open Request)</option>
                </select>
              </div>
              <div>
                <label>Status Request</label>
                <select value={productForm.request_category} onChange={(e) => setProductForm((f) => ({ ...f, request_category: e.target.value }))}>
                  <option value="TIDAK OPEN REQUEST">TIDAK OPEN REQUEST</option>
                  <option value="OPEN REQUEST">OPEN REQUEST</option>
                </select>
              </div>
            </div>
            <div>
              <label>Produk Alight Motion?</label>
              <select value={productForm.is_alight_motion} onChange={(e) => setProductForm((f) => ({ ...f, is_alight_motion: e.target.value }))}>
                <option value="false">Tidak</option>
                <option value="true">Ya</option>
              </select>
            </div>
            <div>
              <label>Deskripsi Produk</label>
              <textarea rows={3} placeholder="Jelaskan detail produk, garansi, dll..."
                style={{ width: '100%', padding: '14px 16px', background: '#f8f9fa', border: '2px solid transparent', borderRadius: 16, fontFamily: 'inherit', fontWeight: 500, outline: 'none', fontSize: 14, resize: 'vertical' }}
                value={productForm.description}
                onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label>Foto Produk (Upload dari HP)</label>
              <div className="img-upload-dropzone">
                <input type="file" accept="image/*" onChange={onProductImageChange} />
                {productImagePreview ? (
                  <img className="img-upload-preview show" src={productImagePreview} alt="Preview" />
                ) : (
                  <div>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                    <p className="text-xs font-bold text-gray-500">Tap untuk ambil/pilih foto</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-semibold mt-2 uppercase tracking-wide">Atau isi URL gambar manual di bawah</p>
              <input type="text" placeholder="https://example.com/image.jpg" className="mt-2" value={productForm.image_url} onChange={(e) => setProductForm((f) => ({ ...f, image_url: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setProductModalOpen(false)} className="btn-secondary">BATAL</button>
              <button type="submit" className="btn-primary" disabled={productSubmitting}>{productSubmitting ? 'MENYIMPAN...' : 'SIMPAN PRODUK'}</button>
            </div>
          </form>
        </div>
      </div>

      {/* ACCOUNT MODAL */}
      <div className={accountModalOpen ? 'modal open' : 'modal'}>
        <div className="modal-box">
          <h3 className="text-2xl font-black tracking-tight mb-6">Tambah Stok Akun</h3>
          <form onSubmit={submitAccountForm} className="space-y-5">
            <div>
              <label>Pilih Produk</label>
              <select required value={accForm.product_id} onChange={(e) => setAccForm((f) => ({ ...f, product_id: e.target.value }))}>
                <option value="" disabled>Pilih produk...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (stok: {stockByProduct[p.id] || 0})</option>
                ))}
              </select>
            </div>
            <div>
              <label>Username / Email</label>
              <input type="text" required placeholder="user@example.com" value={accForm.username} onChange={(e) => setAccForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label>Password</label>
              <input type="text" required placeholder="••••••••" value={accForm.password} onChange={(e) => setAccForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setAccountModalOpen(false)} className="btn-secondary">BATAL</button>
              <button type="submit" className="btn-primary">TAMBAH STOK</button>
            </div>
          </form>
          <div className="mt-2 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tambah Banyak Sekaligus</p>
            <label>Format: username,password (satu baris = satu akun)</label>
            <textarea rows={4} placeholder={"user1@mail.com,pass123\nuser2@mail.com,pass456"}
              style={{ width: '100%', padding: '14px 16px', background: '#f8f9fa', border: '2px solid transparent', borderRadius: 16, fontFamily: 'monospace', fontSize: 12, outline: 'none', resize: 'vertical' }}
              value={accBulk}
              onChange={(e) => setAccBulk(e.target.value)} />
            <button type="button" onClick={submitBulkAccounts} className="btn-primary w-full justify-center mt-3">TAMBAH SEMUA</button>
          </div>
        </div>
      </div>
    </div>
  );
}
