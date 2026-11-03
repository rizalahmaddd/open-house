import React, { useState, useEffect, useCallback } from 'react';
import {
  type TabId,
  type PublicRoute,
  TAB_TO_PATH,
  navigate,
  useLocationRoute,
} from './router';
import {
  LogOut,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserPlus,
  Trash2,
  RefreshCw,
  Settings,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Building2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  JuraganKosLogo,
  NavBerandaIcon,
  NavKamarIcon,
  NavTagihanIcon,
  NavKasIcon,
  NavTimIcon,
  NavPaketIcon,
  NavLainnyaIcon,
} from './components/BrandIcons';
import SaasLandingPage from './components/SaasLandingPage';
import DashboardOverviewTab from './components/DashboardOverviewTab';
import RoomsAndTenantsTab, {
  type LeaseRecord,
  type RoomRecord,
} from './components/RoomsAndTenantsTab';
import PropertySettingsModal, {
  type PropertyRecord,
} from './components/PropertySettingsModal';
import BillingAndReceiptsTab, {
  type FullInvoiceRecord,
} from './components/BillingAndReceiptsTab';
import OperationsAndFinanceTab, {
  type ExpenseRecord,
  type FullTicketRecord,
} from './components/OperationsAndFinanceTab';
import PublicInvoicePage from './components/PublicInvoicePage';
import PublicComplaintPage from './components/PublicComplaintPage';
import PublicCatalogPage from './components/PublicCatalogPage';
import PwaInstallAndOfflineBar from './components/PwaInstallAndOfflineBar';

interface UserInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface OrgInfo {
  id: string;
  name: string;
  planTier: 'free' | 'pro';
  maxRooms: number;
  maxProperties: number;
}

interface OverviewData {
  org: OrgInfo;
  role: 'owner' | 'staff';
  quota: {
    roomsUsed: number;
    maxRooms: number;
    propertiesUsed: number;
    maxProperties: number;
    staffCount: number;
  };
  properties: PropertyRecord[];
  roomSummary: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
    rooms: RoomRecord[];
  };
  financials: {
    totalRevenuePaid: number;
    totalUnpaidReceivables: number;
    totalExpenses: number;
    netCashflow: number;
  } | null;
}

interface StaffMember {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'staff';
  assignedPropertyIds: string[];
  createdAt: string;
}

const MALANG_AREAS = [
  'Jakarta Selatan - Setiabudi / Kuningan',
  'Bandung - Dipatiukur / Dago',
  'Yogyakarta - Sleman / Seturan',
  'Surabaya - Gubeng / Sukolilo',
  'Depok - Margonda / Kukusan',
  'Tangerang - BSD / Gading Serpong',
  'Semarang - Tembalang / Banyumanik',
  'Malang - Lowokwaru / Soekarno Hatta',
  'Bali - Denpasar / Jimbaran',
];

const TAB_HEADERS: Record<
  'overview' | 'rooms-tenants' | 'billing' | 'operations' | 'staff' | 'plan',
  { title: string; subtitle: string }
> = {
  overview: {
    title: 'Beranda & Ringkasan Kos',
    subtitle: 'Pantau okupansi kamar, tagihan jatuh tempo, komplain aktif, dan kas bersih hari ini',
  },
  'rooms-tenants': {
    title: 'Kamar, Penghuni & Deposit',
    subtitle: 'Kelola status kamar, check-in KTP, pindah kamar, dan check-out',
  },
  billing: {
    title: 'Tagihan WA & Kwitansi Digital',
    subtitle: 'Kirim pengingat WhatsApp 1-klik, cek bukti transfer, dan unduh kwitansi',
  },
  operations: {
    title: 'Kas, Pengeluaran, Komplain QR & Katalog',
    subtitle: 'Laporan laba bersih, jurnal biaya operasional, tiket kerusakan & link publik',
  },
  staff: {
    title: 'Manajemen Penjaga Kos',
    subtitle: 'Atur akses staf operasional tanpa membocorkan laporan laba bersih',
  },
  plan: {
    title: 'Cabang Kos & Paket Langganan',
    subtitle: 'Kelola daftar lokasi kos, rekening/QRIS, dan kuota langganan OpenHouse',
  },
};

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('jk_token')
  );

  const { pathname, search, parsed } = useLocationRoute(!!token);

  // Sync selectedPropertyId from URL search param if present
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('propertyId') || 'all';
  });

  const activeTab: TabId = parsed.kind === 'dashboard' ? parsed.tab : 'overview';
  const showAuthScreen = parsed.kind === 'auth';
  const authMode: 'login' | 'register' =
    parsed.kind === 'auth' ? parsed.mode : 'login';
  const publicRoute: PublicRoute | null =
    parsed.kind === 'public' ? parsed.route : null;

  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [leases, setLeases] = useState<LeaseRecord[]>([]);
  const [fullInvoices, setFullInvoices] = useState<FullInvoiceRecord[]>([]);
  const [expensesList, setExpensesList] = useState<ExpenseRecord[]>([]);
  const [ticketsList, setTicketsList] = useState<FullTicketRecord[]>([]);
  const [showMoreSheet, setShowMoreSheet] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Redirect logged-in user away from /login or /register
  useEffect(() => {
    if (token && (pathname === '/login' || pathname === '/register')) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, pathname]);

  // Normalize / to /dashboard when logged in
  useEffect(() => {
    if (token && pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [token, pathname]);

  // Redirect unauthenticated user trying to access protected routes to /login
  useEffect(() => {
    if (
      !token &&
      parsed.kind === 'auth' &&
      pathname !== '/login' &&
      pathname !== '/register'
    ) {
      navigate(`/login?redirect=${encodeURIComponent(pathname)}`, {
        replace: true,
      });
    }
  }, [token, parsed.kind, pathname]);

  // Auth forms
  const [loginEmail, setLoginEmail] = useState('juragan@malangkos.id');
  const [loginPassword, setLoginPassword] = useState('malang123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regKosName, setRegKosName] = useState('');
  const [regArea, setRegArea] = useState(MALANG_AREAS[0]);
  const [regGender, setRegGender] = useState<'putra' | 'putri' | 'campur'>('putra');
  const [showAdvancedKosSettings, setShowAdvancedKosSettings] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Property Edit & Add
  const [editingProperty, setEditingProperty] = useState<PropertyRecord | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropArea, setNewPropArea] = useState(MALANG_AREAS[1]);
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropGender, setNewPropGender] = useState<'putra' | 'putri' | 'campur'>('putri');

  // Staff list & form
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      headers.set('Content-Type', 'application/json');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const res = await fetch(path, {
        ...options,
        headers,
        credentials: 'include',
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan pada server.');
      }
      return data;
    },
    [token]
  );

  const loadWorkspaceData = useCallback(
    async (propId = selectedPropertyId) => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const me = await apiFetch('/api/auth/me');
        setCurrentUser(me.user);

        const q = `?propertyId=${encodeURIComponent(propId)}`;
        const [ov, ls, invs, exps, tkts] = await Promise.all([
          apiFetch(`/api/org/overview${q}`),
          apiFetch(`/api/tenants-leases${q}`),
          apiFetch(`/api/invoices${q}`),
          apiFetch(`/api/operations/expenses${q}`),
          apiFetch(`/api/operations/tickets${q}`),
        ]);
        setOverview(ov);
        setLeases(ls.leases || []);
        setFullInvoices(invs.invoices || []);
        setExpensesList(exps.expenses || []);
        setTicketsList(tkts.tickets || []);

        if (me.member.role === 'owner') {
          const st = await apiFetch('/api/auth/staff');
          setStaffList(st.members || []);
        } else {
          setStaffList([]);
        }
      } catch {
        localStorage.removeItem('jk_token');
        setToken(null);
        setCurrentUser(null);
        setOverview(null);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, selectedPropertyId, token]
  );

  useEffect(() => {
    if (!publicRoute) {
      loadWorkspaceData(selectedPropertyId);
    }
  }, [loadWorkspaceData, selectedPropertyId, publicRoute]);

  const notifySuccess = (msg: string) => {
    setErrorMsg(null);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  const notifyError = (msg: string) => {
    setSuccessMsg(null);
    setErrorMsg(msg);
  };

  const handleTabSelect = (tab: TabId, extraSearch = '') => {
    const basePath = TAB_TO_PATH[tab] || '/dashboard';
    const propParam =
      selectedPropertyId !== 'all'
        ? `propertyId=${encodeURIComponent(selectedPropertyId)}`
        : '';
    let finalQuery = '';
    if (extraSearch && propParam) {
      const cleanExtra = extraSearch.startsWith('?')
        ? extraSearch.slice(1)
        : extraSearch;
      finalQuery = `?${propParam}&${cleanExtra}`;
    } else if (extraSearch) {
      finalQuery = extraSearch.startsWith('?') ? extraSearch : `?${extraSearch}`;
    } else if (propParam) {
      finalQuery = `?${propParam}`;
    }
    navigate(`${basePath}${finalQuery}`);
  };

  const handlePropertyChange = (propId: string) => {
    setSelectedPropertyId(propId);
    const url = new URL(window.location.href);
    if (propId === 'all') {
      url.searchParams.delete('propertyId');
    } else {
      url.searchParams.set('propertyId', propId);
    }
    window.history.replaceState({}, '', url.pathname + url.search);
    loadWorkspaceData(propId);
  };

  const exitPublicRoute = () => {
    if (token) {
      const propParam =
        selectedPropertyId !== 'all'
          ? `?propertyId=${encodeURIComponent(selectedPropertyId)}`
          : '';
      navigate(`/dashboard${propParam}`);
      loadWorkspaceData(selectedPropertyId);
    } else {
      navigate('/');
    }
  };

  // ================= PUBLIC PAGES (TANPA LOGIN) =================
  if (publicRoute?.type === 'invoice') {
    return (
      <PublicInvoicePage
        publicToken={publicRoute.param}
        onBackToApp={exitPublicRoute}
      />
    );
  }

  if (publicRoute?.type === 'complaint') {
    return (
      <PublicComplaintPage
        slug={publicRoute.param}
        onBackToApp={exitPublicRoute}
      />
    );
  }

  if (publicRoute?.type === 'catalog') {
    return (
      <PublicCatalogPage
        slug={publicRoute.param}
        onBackToApp={exitPublicRoute}
      />
    );
  }

  const handleLogin = async (
    e?: React.FormEvent,
    customEmail?: string,
    customPass?: string
  ) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: customEmail ?? loginEmail,
          password: customPass ?? loginPassword,
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Gagal login');
      localStorage.setItem('jk_token', data.token);
      setToken(data.token);
      notifySuccess(`Selamat datang kembali, ${data.user.name}!`);

      const redirectTarget =
        parsed.kind === 'auth' && parsed.redirect
          ? parsed.redirect
          : parsed.kind === 'dashboard'
          ? TAB_TO_PATH[parsed.tab] || '/dashboard'
          : '/dashboard';
      navigate(redirectTarget);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    const resolvedKosName =
      regKosName.trim() ||
      (regName.trim() ? `Kos ${regName.trim().split(' ')[0]}` : 'Kos Saya');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          phone: regPhone.trim() || '-',
          email: regEmail.trim(),
          password: regPassword,
          kosName: resolvedKosName,
          areaMalang: regArea || 'Malang',
          genderType: regGender,
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Gagal mendaftar');
      localStorage.setItem('jk_token', data.token);
      setToken(data.token);
      const createdPropName = data.property?.name || resolvedKosName;
      notifySuccess(`Akun berhasil dibuat! Selamat datang di "${createdPropName}".`);

      const redirectTarget =
        parsed.kind === 'auth' && parsed.redirect
          ? parsed.redirect
          : '/dashboard';
      navigate(redirectTarget);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('jk_token');
    setToken(null);
    setCurrentUser(null);
    setOverview(null);
    navigate('/login');
  };

  const handleTogglePlan = async (targetTier: 'free' | 'pro') => {
    setErrorMsg(null);
    try {
      await apiFetch('/api/org/plan', {
        method: 'POST',
        body: JSON.stringify({ planTier: targetTier }),
      });
      await loadWorkspaceData(selectedPropertyId);
      notifySuccess(
        targetTier === 'pro'
          ? 'Paket Juragan Pro aktif! Kuota kamar, cabang kos, dan staf penjaga kini tidak terbatas.'
          : 'Kembali ke Paket Gratis (Maksimal 1 lokasi kos & 10 kamar).'
      );
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiFetch('/api/properties', {
        method: 'POST',
        body: JSON.stringify({
          name: newPropName,
          areaMalang: newPropArea,
          address: newPropAddress,
          genderType: newPropGender,
        }),
      });
      setNewPropName('');
      setNewPropAddress('');
      setShowAddProperty(false);
      await loadWorkspaceData(selectedPropertyId);
      notifySuccess(`Cabang kos "${newPropName}" berhasil ditambahkan!`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiFetch('/api/auth/staff', {
        method: 'POST',
        body: JSON.stringify({
          name: staffName,
          phone: staffPhone,
          email: staffEmail,
          password: staffPassword,
          assignedPropertyIds: ['*'],
        }),
      });
      setStaffName('');
      setStaffPhone('');
      setStaffEmail('');
      setStaffPassword('');
      await loadWorkspaceData(selectedPropertyId);
      notifySuccess(`Akun Penjaga Kos "${staffName}" berhasil dibuat!`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteStaff = async (memberId: string, name: string) => {
    setErrorMsg(null);
    try {
      await apiFetch(`/api/auth/staff/${memberId}`, { method: 'DELETE' });
      await loadWorkspaceData(selectedPropertyId);
      notifySuccess(`Akses penjaga kos "${name}" telah dicabut.`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  if (loading && token && !overview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="flex flex-col items-center gap-3 text-stone-700">
          <RefreshCw className="w-7 h-7 animate-spin text-emerald-800" />
          <p className="text-sm font-medium">
            Memuat data properti kos Anda...
          </p>
        </div>
      </div>
    );
  }

  // ================= UNAUTHENTICATED VIEW (LANDING PAGE OR LOGIN / REGISTER) =================
  if (!token || !overview || !currentUser) {
    if (!showAuthScreen) {
      return (
        <SaasLandingPage
          submittingDemo={submitting}
          onOpenLogin={() => {
            navigate('/login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenRegister={() => {
            navigate('/register');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onQuickDemoLogin={(role) =>
            handleLogin(
              undefined,
              role === 'owner'
                ? 'juragan@malangkos.id'
                : 'penjaga@malangkos.id',
              'malang123'
            )
          }
          onOpenPublicCatalog={(slug) => {
            navigate(`/kos/${slug}`);
          }}
          onOpenPublicComplaint={(slug) => {
            navigate(`/lapor/${slug}`);
          }}
          onOpenPublicInvoice={(tk) => {
            navigate(`/inv/${tk}`);
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-4">
          <button
            type="button"
            onClick={() => {
              navigate('/');
              setErrorMsg(null);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white px-3.5 py-2 rounded-xl border border-stone-200 shadow-2xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Halaman Utama (Landing Page)</span>
          </button>

          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#084732] flex items-center justify-center text-white shadow-sm">
              <JuraganKosLogo className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-stone-900">
                OpenHouse <span className="text-emerald-800 text-xs font-mono">openhouse.my.id</span>
              </h1>
              <p className="text-xs text-stone-600">
                Aplikasi Kelola Kos, Tagihan WA & Kwitansi Digital
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-6 px-5 shadow-xs rounded-3xl border border-stone-200 sm:px-8">
            <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-950 mb-2">
                Masuk Cepat Akun Demo OpenHouse:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleLogin(undefined, 'juragan@malangkos.id', 'malang123')
                  }
                  disabled={submitting}
                  className="flex flex-col items-start p-3 rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 transition text-left shadow-xs"
                >
                  <span className="text-xs font-bold">Pemilik Kos</span>
                  <span className="text-[11px] text-emerald-100 mt-0.5">
                    H. Bambang (Akses Penuh + Laba)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleLogin(undefined, 'penjaga@malangkos.id', 'malang123')
                  }
                  disabled={submitting}
                  className="flex flex-col items-start p-3 rounded-xl bg-white text-stone-800 border border-emerald-300 hover:bg-emerald-100/60 transition text-left"
                >
                  <span className="text-xs font-bold text-emerald-950">
                    Penjaga Kos
                  </span>
                  <span className="text-[11px] text-stone-600 mt-0.5">
                    Pak Slamet (Operasional Kamar)
                  </span>
                </button>
              </div>
            </div>

            <div className="flex rounded-xl bg-stone-100 p-1 mb-5">
              <button
                type="button"
                onClick={() => {
                  const q =
                    parsed.kind === 'auth' && parsed.redirect
                      ? `?redirect=${encodeURIComponent(parsed.redirect)}`
                      : '';
                  navigate(`/login${q}`, { replace: true });
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                  authMode === 'login'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  const q =
                    parsed.kind === 'auth' && parsed.redirect
                      ? `?redirect=${encodeURIComponent(parsed.redirect)}`
                      : '';
                  navigate(`/register${q}`, { replace: true });
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                  authMode === 'register'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Daftar Pemilik Baru
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Email Akun Kos
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="current-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan password"
                      className="w-full rounded-xl border border-stone-300 pl-3.5 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label={showLoginPassword ? 'Sembunyikan password' : 'Lihat password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 rounded-md transition"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm transition shadow-xs disabled:opacity-60"
                >
                  {submitting ? 'Memproses...' : 'Masuk ke Dashboard Kos'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Nama Lengkap Anda
                  </label>
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Contoh: Rini Wulandari"
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      Email Aktif
                    </label>
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-xs font-semibold text-stone-700 mb-1"
                    >
                      No. WhatsApp <span className="font-normal text-stone-400 text-[11px]">(Opsional)</span>
                    </label>
                    <input
                      id="reg-phone"
                      name="tel"
                      type="tel"
                      autoComplete="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-pass"
                    className="block text-xs font-semibold text-stone-700 mb-1"
                  >
                    Password Akun (Min. 6 Karakter)
                  </label>
                  <div className="relative">
                    <input
                      id="reg-pass"
                      name="new-password"
                      type={showRegPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full rounded-xl border border-stone-300 pl-3.5 pr-11 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      aria-label={showRegPassword ? 'Sembunyikan password' : 'Lihat password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 rounded-md transition"
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Auto Kos Setup Preview & Optional Customization */}
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-100 p-3 text-xs text-stone-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-stone-500 font-medium">Kos Pertama Otomatis:</div>
                        <div className="font-semibold text-stone-900 truncate">
                          {regKosName.trim() || (regName.trim() ? `Kos ${regName.trim().split(' ')[0]}` : 'Kos Saya')}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedKosSettings(!showAdvancedKosSettings)}
                      className="text-emerald-800 hover:text-emerald-950 font-semibold text-xs flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-emerald-100 transition"
                    >
                      <span>{showAdvancedKosSettings ? 'Tutup' : 'Ubah Nama & Tipe'}</span>
                      {showAdvancedKosSettings ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {showAdvancedKosSettings && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/70 space-y-2.5">
                      <div>
                        <label
                          htmlFor="reg-kos"
                          className="block text-[11px] font-semibold text-stone-700 mb-1"
                        >
                          Nama Kos Pilihan Anda
                        </label>
                        <input
                          id="reg-kos"
                          name="kosName"
                          type="text"
                          value={regKosName}
                          onChange={(e) => setRegKosName(e.target.value)}
                          placeholder={`Contoh: Kos ${regName.trim().split(' ')[0] || 'Harmoni'}`}
                          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label
                            htmlFor="reg-area"
                            className="block text-[11px] font-semibold text-stone-700 mb-1"
                          >
                            Kota / Kawasan
                          </label>
                          <input
                            id="reg-area"
                            name="area"
                            type="text"
                            list="reg-areas-list"
                            value={regArea}
                            onChange={(e) => setRegArea(e.target.value)}
                            placeholder="Contoh: Lowokwaru / Malang"
                            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                          />
                          <datalist id="reg-areas-list">
                            {MALANG_AREAS.map((area) => (
                              <option key={area} value={area} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label
                            htmlFor="reg-gender"
                            className="block text-[11px] font-semibold text-stone-700 mb-1"
                          >
                            Kategori Kos
                          </label>
                          <select
                            id="reg-gender"
                            name="genderType"
                            value={regGender}
                            onChange={(e) =>
                              setRegGender(e.target.value as 'putra' | 'putri' | 'campur')
                            }
                            className="w-full rounded-lg border border-stone-300 bg-white pl-2.5 pr-8 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                          >
                            <option value="putra">Kos Putra</option>
                            <option value="putri">Kos Putri</option>
                            <option value="campur">Kos Campur / Pasutri</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Mendaftarkan...' : 'Daftar Gratis & Mulai Kelola'}
                </button>
                <p className="text-center text-[11px] text-stone-500">
                  Gratis hingga 10 kamar &bull; Tanpa kartu kredit &bull; Siap pakai 1 menit
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= AUTHENTICATED NATIVE APP SHELL =================
  const isOwner = overview.role === 'owner';
  const isPro = overview.org.planTier === 'pro';
  const currentDefaultProperty =
    selectedPropertyId !== 'all'
      ? overview.properties.find((p) => p.id === selectedPropertyId) ||
        overview.properties[0]
      : overview.properties[0];

  const activeLeases = leases.filter((l) => l.leaseStatus === 'active');
  const unpaidOrWaitingCount = fullInvoices.filter(
    (i) => i.status !== 'paid'
  ).length;
  const openTicketsCount = ticketsList.filter(
    (t) => t.status !== 'resolved'
  ).length;

  const effectiveTab: TabId =
    !isOwner && (activeTab === 'staff' || activeTab === 'plan')
      ? 'overview'
      : activeTab;

  const navItems: Array<{
    id: TabId;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeTone?: 'neutral' | 'alert';
  }> = [
    {
      id: 'overview',
      label: 'Beranda Ringkasan',
      shortLabel: 'Beranda',
      icon: NavBerandaIcon,
    },
    {
      id: 'rooms-tenants',
      label: 'Kamar & Penghuni',
      shortLabel: 'Kamar',
      icon: NavKamarIcon,
      badge: `${overview.roomSummary.occupied}/${overview.roomSummary.total}`,
      badgeTone: 'neutral',
    },
    {
      id: 'billing',
      label: 'Tagihan & Kwitansi',
      shortLabel: 'Tagihan',
      icon: NavTagihanIcon,
      badge: unpaidOrWaitingCount > 0 ? unpaidOrWaitingCount : undefined,
      badgeTone: 'alert',
    },
    {
      id: 'operations',
      label: 'Kas, Komplain & QR',
      shortLabel: 'Kas & QR',
      icon: NavKasIcon,
      badge: openTicketsCount > 0 ? openTicketsCount : undefined,
      badgeTone: 'alert',
    },
    ...(isOwner
      ? [
          {
            id: 'staff' as const,
            label: 'Penjaga Kos',
            shortLabel: 'Penjaga',
            icon: NavTimIcon,
          },
          {
            id: 'plan' as const,
            label: 'Cabang & Paket SaaS',
            shortLabel: 'Cabang',
            icon: NavPaketIcon,
            badge: isPro ? 'PRO' : 'FREE',
            badgeTone: 'neutral' as const,
          },
        ]
      : []),
  ];

  const currentHeader = TAB_HEADERS[effectiveTab];

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col lg:flex-row">
      {/* ================= DESKTOP STICKY LEFT SIDEBAR (lg: 1024px+) ================= */}
      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen bg-white border-r border-stone-200 z-30 select-none">
        {/* Brand Header */}
        <div
          onClick={() => handleTabSelect('overview')}
          className="p-5 border-b border-stone-100 flex items-center gap-3 cursor-pointer hover:bg-stone-50 transition"
        >
          <div className="w-11 h-11 rounded-2xl bg-[#084732] flex items-center justify-center text-white shrink-0 shadow-xs">
            <JuraganKosLogo className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-stone-900 text-sm truncate">
              {overview.org.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              {isOwner ? (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                    isPro
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-stone-100 text-stone-700 border border-stone-200'
                  }`}
                >
                  {isPro ? 'OPENHOUSE PRO' : 'PAKET GRATIS'}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap bg-emerald-50 text-emerald-800 border border-emerald-200">
                  AKUN PENJAGA KOS
                </span>
              )}
              <span className="text-[11px] text-stone-400 whitespace-nowrap">
                • OpenHouse
              </span>
            </div>
          </div>
        </div>

        {/* Property Selector Card (Clean Vertical Stack — Zero Text Wrapping) */}
        <div className="p-4 border-b border-stone-100 bg-stone-50/70 space-y-2">
          <label
            htmlFor="sidebar-prop-select"
            className="block text-[10px] font-extrabold uppercase tracking-wider text-stone-400 whitespace-nowrap"
          >
            Cabang Kos Aktif
          </label>
          <select
            id="sidebar-prop-select"
            value={selectedPropertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white pl-3.5 pr-10 py-2.5 text-xs font-bold text-stone-900 shadow-2xs"
          >
            {overview.properties.length > 1 && (
              <option value="all">
                Semua Cabang Kos ({overview.properties.length})
              </option>
            )}
            {overview.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {isOwner && currentDefaultProperty && (
            <button
              type="button"
              onClick={() => setEditingProperty(currentDefaultProperty)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center justify-between transition whitespace-nowrap"
            >
              <span>Pengaturan Rekening & QRIS</span>
              <span className="text-emerald-800 font-bold">→</span>
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-emerald-200' : 'text-stone-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined ? (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                      isActive
                        ? 'bg-emerald-800 text-emerald-100'
                        : item.badgeTone === 'alert'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Quota Progress + Role Switcher + User Profile Footer */}
        <div className="p-4 border-t border-stone-200 space-y-3 bg-stone-50/50">
          {/* Quota Meter (Khusus Pemilik Kos) */}
          {isOwner && (
            <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] whitespace-nowrap">
                <span className="font-semibold text-stone-600">Kuota Kamar</span>
                <span className="font-bold text-stone-900">
                  {overview.quota.roomsUsed} / {isPro ? '∞' : overview.quota.maxRooms}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-700 rounded-full transition-all"
                  style={{
                    width: isPro
                      ? '25%'
                      : `${Math.min(
                          100,
                          Math.round(
                            (overview.quota.roomsUsed / overview.quota.maxRooms) *
                              100
                          )
                        )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Discreet Role Switcher for Demo Simulation */}
          <button
            type="button"
            onClick={() =>
              handleLogin(
                undefined,
                isOwner ? 'penjaga@malangkos.id' : 'juragan@malangkos.id',
                'malang123'
              )
            }
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition whitespace-nowrap shadow-2xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
            <span>
              Simulasi: {isOwner ? 'Coba Akun Penjaga' : 'Kembali ke Pemilik'}
            </span>
          </button>

          {/* User Info & Logout */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentUser.name}
              </p>
              <p
                className={`text-[11px] font-semibold truncate ${
                  isOwner ? 'text-emerald-800' : 'text-sky-800'
                }`}
              >
                {isOwner ? 'Pemilik Kos (Owner)' : 'Penjaga Kos (Staf)'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-red-700 hover:bg-red-50 transition shrink-0 whitespace-nowrap"
              title="Keluar Akun"
            >
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-20 lg:pb-10">
        <PwaInstallAndOfflineBar />

        {/* Mobile & Tablet Top App Bar (< lg) */}
        <header className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-4 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => handleTabSelect('overview')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-white shrink-0 shadow-2xs">
                <JuraganKosLogo className="w-5 h-5 text-emerald-100" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                    {overview.org.name}
                  </h1>
                  {isOwner && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                        isPro
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isPro ? 'PRO' : 'FREE'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentUser.name} •{' '}
                  <strong
                    className={isOwner ? 'text-emerald-800' : 'text-sky-800'}
                  >
                    {isOwner ? 'Pemilik' : 'Penjaga'}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isOwner && currentDefaultProperty && (
                <button
                  type="button"
                  onClick={() => setEditingProperty(currentDefaultProperty)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold whitespace-nowrap"
                  title="Pengaturan Rekening & QRIS"
                >
                  QRIS & Bank
                </button>
              )}
            </div>
          </div>

          {/* Compact Property Bar on Mobile/Tablet */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-stone-100">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-700 shrink-0" />
              <select
                aria-label="Pilih lokasi cabang kos"
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="text-xs font-bold text-stone-800 bg-transparent truncate w-full focus:outline-none"
              >
                {overview.properties.length > 1 && (
                  <option value="all">
                    Semua Cabang Kos ({overview.properties.length})
                  </option>
                )}
                {overview.properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.areaMalang.split(' ')[0]})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] font-semibold text-stone-500 shrink-0 whitespace-nowrap">
              {overview.roomSummary.occupied}/{overview.roomSummary.total} Terisi
            </span>
          </div>
        </header>

        {/* Desktop Contextual Top Header (lg+) */}
        <header className="hidden lg:flex bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-20 px-8 py-4 items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-stone-900 truncate">
              {currentHeader.title}
            </h2>
            <p className="text-xs text-stone-500 truncate">
              {currentHeader.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {currentDefaultProperty && (
              <div className="px-3.5 py-2 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-700 flex items-center gap-2 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-700 shrink-0" />
                <span className="font-bold">
                  {selectedPropertyId === 'all'
                    ? `Semua Cabang (${overview.properties.length})`
                    : currentDefaultProperty.name}
                </span>
              </div>
            )}
            {isOwner && currentDefaultProperty && (
              <button
                type="button"
                onClick={() => setEditingProperty(currentDefaultProperty)}
                className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold transition whitespace-nowrap shrink-0"
              >
                Rekening & QRIS
              </button>
            )}
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5 flex-1">
          {/* Mobile Section Title */}
          <div className="lg:hidden">
            <h2 className="text-base sm:text-lg font-extrabold text-stone-900">
              {currentHeader.title}
            </h2>
            <p className="text-xs text-stone-500">{currentHeader.subtitle}</p>
          </div>

          {/* Global Alert / Toast Banners */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm font-medium text-red-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {(errorMsg.includes('Upgrade ke') ||
                  errorMsg.includes('OpenHouse Pro') ||
                  errorMsg.includes('Juragan Pro')) &&
                  isOwner && (
                    <button
                      type="button"
                      onClick={() => handleTogglePlan('pro')}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold whitespace-nowrap"
                    >
                      Aktifkan OpenHouse Pro
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="p-1 text-red-700 hover:bg-red-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm font-medium text-emerald-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg(null)}
                className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================= TAB 0: BERANDA RINGKASAN EKSEKUTIF ================= */}
          {effectiveTab === 'overview' && currentDefaultProperty && (
            <DashboardOverviewTab
              isOwner={isOwner}
              roomSummary={overview.roomSummary}
              financials={overview.financials}
              leases={leases}
              invoices={fullInvoices}
              tickets={ticketsList}
              currentProperty={currentDefaultProperty}
              onNavigateTab={(tab, extraSearch) =>
                handleTabSelect(tab, extraSearch)
              }
              onOpenPublicCatalog={(slug) => {
                navigate(`/kos/${slug}`);
              }}
              onOpenPublicComplaint={(slug) => {
                navigate(`/lapor/${slug}`);
              }}
            />
          )}

          {/* ================= TAB 1: KAMAR, CHECK-IN, DEPOSIT & CHECK-OUT ================= */}
          {effectiveTab === 'rooms-tenants' && currentDefaultProperty && (
            <RoomsAndTenantsTab
              rooms={overview.roomSummary.rooms}
              leases={leases}
              defaultPropertyId={currentDefaultProperty.id}
              token={token}
              apiFetch={apiFetch}
              onRefresh={() => loadWorkspaceData(selectedPropertyId)}
              onNotifySuccess={notifySuccess}
              onNotifyError={notifyError}
            />
          )}

          {/* ================= TAB 2: TAGIHAN WA, LINK BUKTI BAYAR & KWITANSI ================= */}
          {effectiveTab === 'billing' && (
            <BillingAndReceiptsTab
              invoices={fullInvoices}
              activeLeases={activeLeases}
              apiFetch={apiFetch}
              onRefresh={() => loadWorkspaceData(selectedPropertyId)}
              onOpenPublicInvoice={(tk) => {
                navigate(`/inv/${tk}`);
              }}
              onNotifySuccess={notifySuccess}
              onNotifyError={notifyError}
            />
          )}

          {/* ================= TAB 3: PENGELUARAN, LABA BERSIH, KOMPLAIN QR & KATALOG KOS ================= */}
          {effectiveTab === 'operations' && currentDefaultProperty && (
            <OperationsAndFinanceTab
              isOwner={isOwner}
              financials={overview.financials}
              expenses={expensesList}
              tickets={ticketsList}
              currentProperty={currentDefaultProperty}
              token={token}
              apiFetch={apiFetch}
              onRefresh={() => loadWorkspaceData(selectedPropertyId)}
              onOpenPublicComplaint={(slug) => {
                navigate(`/lapor/${slug}`);
              }}
              onOpenPublicCatalog={(slug) => {
                navigate(`/kos/${slug}`);
              }}
              onNotifySuccess={notifySuccess}
              onNotifyError={notifyError}
            />
          )}

          {/* ================= TAB 4: MANAJEMEN STAF PENJAGA KOS ================= */}
          {effectiveTab === 'staff' && isOwner && (
            <div className="space-y-5">
              {!isOwner ? (
                <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center space-y-2">
                  <Lock className="w-8 h-8 text-stone-400 mx-auto" />
                  <h2 className="text-base font-bold text-stone-900">
                    Halaman Khusus Pemilik Kos
                  </h2>
                  <p className="text-xs text-stone-600 max-w-md mx-auto">
                    Anda sedang masuk sebagai{' '}
                    <strong>Penjaga Kos ({currentUser.name})</strong>. Hanya
                    Pemilik Kos yang dapat menambah atau mencabut akses Penjaga
                    Kos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-stone-200 space-y-4">
                    <div>
                      <h2 className="text-base font-bold text-stone-900">
                        Daftar Akun Pengelola & Penjaga Kos
                      </h2>
                      <p className="text-xs text-stone-600">
                        Penjaga kos dapat mengelola kamar, check-in/out penghuni,
                        tagihan, dan tiket komplain tanpa bisa melihat total laba
                        bersih.
                      </p>
                    </div>

                    <div className="divide-y divide-stone-200">
                      {staffList.map((m) => (
                        <div
                          key={m.memberId}
                          className="py-3.5 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-stone-900">
                                {m.name}
                              </span>
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                                  m.role === 'owner'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : 'bg-sky-100 text-sky-900'
                                }`}
                              >
                                {m.role === 'owner'
                                  ? 'PEMILIK UTAMA'
                                  : 'PENJAGA KOS'}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 mt-0.5">
                              {m.email} • WA: {m.phone}
                            </p>
                          </div>

                          {m.role === 'staff' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteStaff(m.memberId, m.name)
                              }
                              className="px-3 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Cabut Akses
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-emerald-800" />
                      <h3 className="text-sm font-bold text-stone-900">
                        Tambah Akun Penjaga Kos
                      </h3>
                    </div>

                    {!isPro && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
                        <p className="font-semibold">
                          Fitur Multi-Penjaga Kos memerlukan Paket OpenHouse Pro.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleTogglePlan('pro')}
                          className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                        >
                          Aktifkan OpenHouse Pro (Simulasi)
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleAddStaff} className="space-y-3">
                      <div>
                        <label
                          htmlFor="st-name"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Nama Penjaga Kos
                        </label>
                        <input
                          id="st-name"
                          type="text"
                          required
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                          placeholder="Contoh: Mas Budi Santoso"
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="st-phone"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Nomor WhatsApp
                        </label>
                        <input
                          id="st-phone"
                          type="tel"
                          required
                          value={staffPhone}
                          onChange={(e) => setStaffPhone(e.target.value)}
                          placeholder="0857xxxxxxxx"
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="st-email"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Email Login Penjaga
                        </label>
                        <input
                          id="st-email"
                          type="email"
                          required
                          value={staffEmail}
                          onChange={(e) => setStaffEmail(e.target.value)}
                          placeholder="budi@openhouse.my.id"
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="st-pass"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Password Login
                        </label>
                        <input
                          id="st-pass"
                          type="password"
                          required
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition"
                      >
                        Buat Akun Penjaga Kos
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 5: CABANG KOS & PAKET SAAS FREEMIUM ================= */}
          {effectiveTab === 'plan' && isOwner && (
            <div className="space-y-5">
              <section className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-stone-900">
                      Daftar Cabang / Lokasi Kos (
                      {overview.properties.length}/
                      {isPro ? '∞' : overview.quota.maxProperties})
                    </h2>
                    <p className="text-xs text-stone-600">
                      Kelola seluruh cabang properti kos beserta Rekening & QRIS
                      masing-masing
                    </p>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowAddProperty(!showAddProperty)}
                      className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Cabang Kos Baru
                    </button>
                  )}
                </div>

                {showAddProperty && (
                  <form
                    onSubmit={handleAddProperty}
                    className="p-4 rounded-2xl bg-stone-50 border border-stone-300 space-y-3"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Tambah Cabang Lokasi Kos Baru
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor="pr-name"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Nama Cabang Kos
                        </label>
                        <input
                          id="pr-name"
                          type="text"
                          required
                          value={newPropName}
                          onChange={(e) => setNewPropName(e.target.value)}
                          placeholder="Misal: Kos Putri Melati Residence"
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="pr-area"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Kota / Kawasan Kos
                        </label>
                        <input
                          id="pr-area"
                          type="text"
                          list="plan-areas-list"
                          required
                          value={newPropArea}
                          onChange={(e) => setNewPropArea(e.target.value)}
                          placeholder="Ketik kota atau kawasan..."
                          className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                        />
                        <datalist id="plan-areas-list">
                          {MALANG_AREAS.map((a) => (
                            <option key={a} value={a} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label
                          htmlFor="pr-gen"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Kategori Kos
                        </label>
                        <select
                          id="pr-gen"
                          value={newPropGender}
                          onChange={(e) =>
                            setNewPropGender(
                              e.target.value as 'putra' | 'putri' | 'campur'
                            )
                          }
                          className="w-full rounded-xl border border-stone-300 pl-3 pr-10 py-2 text-sm bg-white"
                        >
                          <option value="putra">Kos Putra</option>
                          <option value="putri">Kos Putri</option>
                          <option value="campur">Kos Campur</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="pr-addr"
                        className="block text-xs font-semibold text-stone-700 mb-1"
                      >
                        Alamat Lengkap
                      </label>
                      <input
                        id="pr-addr"
                        type="text"
                        required
                        value={newPropAddress}
                        onChange={(e) => setNewPropAddress(e.target.value)}
                        placeholder="Contoh: Jl. Sudirman No. 12, Setiabudi, Jakarta Selatan"
                        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddProperty(false)}
                        className="px-3 py-2 text-xs font-semibold text-stone-600"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
                      >
                        Simpan Cabang Kos
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overview.properties.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 sm:p-5 rounded-2xl border border-stone-200 flex flex-col justify-between gap-3 hover:shadow-xs transition"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-stone-900">
                            {p.name}
                          </h3>
                          <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 shrink-0 whitespace-nowrap">
                            Kos {p.genderType}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-emerald-800 mt-1">
                          {p.areaMalang}
                        </p>
                        <p className="text-xs text-stone-600 mt-0.5">
                          {p.address}
                        </p>
                      </div>
                      <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2 text-xs">
                        <span className="text-stone-600 truncate">
                          Rekening: <strong>{p.bankName}</strong>{' '}
                          {p.bankAccountNumber || '-'} a.n. {p.bankAccountHolder}
                        </span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => setEditingProperty(p)}
                            className="px-3 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-50 font-semibold text-stone-800 shrink-0 whitespace-nowrap"
                          >
                            Edit & QRIS
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`bg-white rounded-2xl p-6 border-2 ${
                    !isPro ? 'border-emerald-800' : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-stone-900">
                      Paket Gratis (OpenHouse Starter)
                    </h3>
                    {!isPro && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 shrink-0 whitespace-nowrap">
                        PAKET AKTIF
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-extrabold text-stone-900 mt-2">
                    Rp 0{' '}
                    <span className="text-xs font-normal text-stone-500">
                      / selamanya
                    </span>
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-stone-700">
                    <li>
                      • Maksimal <strong>1 Lokasi Kos</strong> &{' '}
                      <strong>10 Kamar</strong>
                    </li>
                    <li>• 1 Akun Pemilik Kos (Tanpa Akun Penjaga Kos)</li>
                    <li>
                      • Tagihan Bulanan, Semesteran, Tahunan & Kirim WA 1-Klik
                    </li>
                    <li>• Pencatatan Pengeluaran & Laporan Kas</li>
                  </ul>
                  {isOwner && isPro && (
                    <button
                      type="button"
                      onClick={() => handleTogglePlan('free')}
                      className="mt-5 w-full py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 text-xs font-semibold text-stone-800"
                    >
                      Simulasi Turun ke Paket Gratis
                    </button>
                  )}
                </div>

                <div
                  className={`bg-white rounded-2xl p-6 border-2 ${
                    isPro ? 'border-amber-500' : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-stone-900">
                      Paket OpenHouse Pro
                    </h3>
                    {isPro && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 shrink-0 whitespace-nowrap">
                        PAKET AKTIF
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-extrabold text-stone-900 mt-2">
                    Rp 49.000{' '}
                    <span className="text-xs font-normal text-stone-500">
                      / bulan
                    </span>
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-stone-700">
                    <li>
                      • <strong>Unlimited Kamar</strong> &{' '}
                      <strong>Multi-Cabang Kos</strong> di seluruh Indonesia
                    </li>
                    <li>
                      • Tambah Akun <strong>Penjaga Kos</strong> (Tanpa Bocor
                      Laba Bersih)
                    </li>
                    <li>• Link & QR Code Komplain Kerusakan Fasilitas Kamar</li>
                    <li>• Katalog Publik Kos Kamar Kosong (`/kos/:slug`)</li>
                  </ul>
                  {isOwner && !isPro && (
                    <button
                      type="button"
                      onClick={() => handleTogglePlan('pro')}
                      className="mt-5 w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                    >
                      Aktifkan OpenHouse Pro (Simulasi Instan)
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {editingProperty && (
        <PropertySettingsModal
          property={editingProperty}
          malangAreas={MALANG_AREAS}
          token={token}
          apiFetch={apiFetch}
          onClose={() => setEditingProperty(null)}
          onSaved={() => loadWorkspaceData(selectedPropertyId)}
          onNotifySuccess={notifySuccess}
          onNotifyError={notifyError}
        />
      )}

      {/* ================= MOBILE & TABLET BOTTOM NAVIGATION BAR (< lg) ================= */}
      <nav
        aria-label="Navigasi Utama"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 grid grid-cols-4 py-1.5 px-2 select-none"
      >
        {isOwner ? (
          <>
            {navItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const isActive = effectiveTab === item.id && !showMoreSheet;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setShowMoreSheet(false);
                    handleTabSelect(item.id);
                  }}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl text-[11px] font-bold transition ${
                    isActive
                      ? 'text-emerald-900 bg-emerald-50/90'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 mb-0.5 ${
                        isActive ? 'text-emerald-800' : 'text-stone-400'
                      }`}
                    />
                    {item.badge !== undefined && item.badgeTone === 'alert' && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="truncate max-w-full px-1">{item.shortLabel}</span>
                </button>
              );
            })}

            {/* 4th Item for Owner: Menu Lainnya (Opens Bottom Sheet) */}
            {(() => {
              const isMoreActive =
                showMoreSheet ||
                effectiveTab === 'operations' ||
                effectiveTab === 'staff' ||
                effectiveTab === 'plan';
              const activeMoreLabel =
                effectiveTab === 'operations'
                  ? 'Kas & QR'
                  : effectiveTab === 'staff'
                  ? 'Penjaga'
                  : effectiveTab === 'plan'
                  ? 'Cabang'
                  : 'Lainnya';

              return (
                <button
                  type="button"
                  onClick={() => setShowMoreSheet(!showMoreSheet)}
                  className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl text-[11px] font-bold transition ${
                    isMoreActive
                      ? 'text-emerald-900 bg-emerald-50/90'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <div className="relative">
                    <NavLainnyaIcon
                      className={`w-5 h-5 mb-0.5 ${
                        isMoreActive ? 'text-emerald-800' : 'text-stone-400'
                      }`}
                    />
                    {openTicketsCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                        {openTicketsCount}
                      </span>
                    )}
                  </div>
                  <span className="truncate max-w-full px-1">{activeMoreLabel}</span>
                </button>
              );
            })()}
          </>
        ) : (
          /* Penjaga Kos Direct 4-Tab Access: Beranda, Kamar, Tagihan, Kas & QR */
          navItems.map((item) => {
            const Icon = item.icon;
            const isActive = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabSelect(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl text-[11px] font-bold transition ${
                  isActive
                    ? 'text-emerald-900 bg-emerald-50/90'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 mb-0.5 ${
                      isActive ? 'text-emerald-800' : 'text-stone-400'
                    }`}
                  />
                  {item.badge !== undefined && item.badgeTone === 'alert' && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-full px-1">{item.shortLabel}</span>
              </button>
            );
          })
        )}
      </nav>

      {/* Floating Discreet Demo Role Switcher */}
      <div className="fixed bottom-20 lg:bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={() =>
            handleLogin(
              undefined,
              isOwner ? 'penjaga@malangkos.id' : 'juragan@malangkos.id',
              'malang123'
            )
          }
          className="px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md border border-slate-700/80 transition active:scale-95"
          title="Simulasi Role: Klik untuk beralih antara Pemilik & Penjaga Kos"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>Simulasi: {isOwner ? 'Pemilik Kos' : 'Penjaga Kos'}</span>
        </button>
      </div>

      {/* ================= BOTTOM SHEET MENU "LAINNYA" (Khusus Pemilik Kos di Mobile) ================= */}
      {isOwner && showMoreSheet && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-[1px] flex items-end justify-center"
          onClick={() => setShowMoreSheet(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-24 border-t border-stone-200 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bottom Sheet Handle */}
            <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-stone-900">
                  Menu Operasional & Pengaturan Kos
                </h3>
                <p className="text-xs text-stone-500">
                  Pilih modul pengelolaan kos di bawah ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreSheet(false)}
                className="p-1.5 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary Navigation Items in Bottom Sheet */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  handleTabSelect('operations');
                  setShowMoreSheet(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition ${
                  effectiveTab === 'operations'
                    ? 'bg-emerald-900 text-white border-emerald-900'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      effectiveTab === 'operations'
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-white text-emerald-800 border border-stone-200'
                    }`}
                  >
                    <NavKasIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate">
                      Kas, Pengeluaran, Komplain QR & Katalog
                    </p>
                    <p
                      className={`text-[11px] truncate ${
                        effectiveTab === 'operations'
                          ? 'text-emerald-200'
                          : 'text-stone-500'
                      }`}
                    >
                      Laporan laba bersih, jurnal biaya, tiket komplain & poster QR
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {openTicketsCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold">
                      {openTicketsCount} Komplain
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabSelect('staff');
                  setShowMoreSheet(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition ${
                  effectiveTab === 'staff'
                    ? 'bg-emerald-900 text-white border-emerald-900'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      effectiveTab === 'staff'
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-white text-emerald-800 border border-stone-200'
                    }`}
                  >
                    <NavTimIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate">
                      Manajemen Penjaga Kos
                    </p>
                    <p
                      className={`text-[11px] truncate ${
                        effectiveTab === 'staff'
                          ? 'text-emerald-200'
                          : 'text-stone-500'
                      }`}
                    >
                      Kelola akses staf operasional tanpa bocor laba bersih
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabSelect('plan');
                  setShowMoreSheet(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition ${
                  effectiveTab === 'plan'
                    ? 'bg-emerald-900 text-white border-emerald-900'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      effectiveTab === 'plan'
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-white text-emerald-800 border border-stone-200'
                    }`}
                  >
                    <NavPaketIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate">
                      Cabang Kos & Paket SaaS ({overview.quota.roomsUsed}/
                      {isPro ? '∞' : overview.quota.maxRooms} Kamar)
                    </p>
                    <p
                      className={`text-[11px] truncate ${
                        effectiveTab === 'plan'
                          ? 'text-emerald-200'
                          : 'text-stone-500'
                      }`}
                    >
                      Tambah cabang lokasi kos & atur paket langganan
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-60 shrink-0" />
              </button>
            </div>

            {/* Quick Settings & Account Footer inside Bottom Sheet */}
            <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-2">
              {isOwner && currentDefaultProperty && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreSheet(false);
                    setEditingProperty(currentDefaultProperty);
                  }}
                  className="p-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Rekening & QRIS</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowMoreSheet(false);
                  handleLogout();
                }}
                className="p-2.5 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100 text-red-800 text-xs font-bold flex items-center justify-center gap-1.5 col-span-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
