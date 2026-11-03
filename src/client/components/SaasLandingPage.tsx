import React, { useState } from 'react';
import {
  JuraganKosLogo,
  NavBerandaIcon,
  NavKamarIcon,
  NavTagihanIcon,
  NavLainnyaIcon,
  WhatsAppIcon,
} from './BrandIcons';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  Receipt,
  DoorOpen,
  QrCode,
  Lock,
  ExternalLink,
  ChevronRight,
  FileCheck,
  Users,
  Wallet,
  Building2,
} from 'lucide-react';

interface Props {
  submittingDemo: boolean;
  onQuickDemoLogin: (role: 'owner' | 'staff') => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenPublicCatalog: (slug: string) => void;
  onOpenPublicComplaint: (slug: string) => void;
  onOpenPublicInvoice: (token: string) => void;
}

type ScreenType = 'kamar' | 'tagihan' | 'kas' | 'publik';

export default function SaasLandingPage({
  submittingDemo,
  onQuickDemoLogin,
  onOpenLogin,
  onOpenRegister,
  onOpenPublicCatalog,
  onOpenPublicComplaint,
  onOpenPublicInvoice,
}: Props) {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('kamar');
  const [previewRole, setPreviewRole] = useState<'owner' | 'staff'>('owner');

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-emerald-700 selection:text-white w-full overflow-x-clip font-sans">
      {/* ================= STICKY TOP NAVIGATION ================= */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-sm shadow-emerald-950/20 shrink-0">
              <JuraganKosLogo className="w-5 h-5 text-emerald-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 truncate">
                  OpenHouse
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 hidden sm:inline-block shrink-0">
                  openhouse.my.id
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate">
                Manajemen Properti & Kos Modern
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a
              href="#interactive-demo"
              className="hover:text-emerald-700 transition"
            >
              Simulasi Langsung
            </a>
            <a href="#fitur" className="hover:text-emerald-700 transition">
              Fitur Operasional
            </a>
            <a href="#harga" className="hover:text-emerald-700 transition">
              Paket Harga
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition whitespace-nowrap"
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={onOpenRegister}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white text-xs font-bold transition shadow-sm shadow-emerald-900/10 whitespace-nowrap flex items-center gap-1.5"
            >
              <span>Mulai Gratis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION WITH MODERN LIVE INTERFACE PREVIEW ================= */}
      <section
        id="interactive-demo"
        className="pt-10 sm:pt-16 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span>Aplikasi Manajemen Kos & Properti Sewa Modern</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Kelola Kos & Tagihan Tanpa Ribet.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Pantau kamar, kirim tagihan WhatsApp otomatis, dan kelola staf tanpa membocorkan laba bersih.
              </p>
            </div>

            {/* Quick Interactive Selector Tabs */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Coba Pratinjau Fitur Interaktif:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'kamar',
                    label: 'Kamar & KTP',
                    desc: 'Status & deposit',
                    icon: DoorOpen,
                  },
                  {
                    id: 'tagihan',
                    label: 'Tagihan WA',
                    desc: 'Bukti & kwitansi',
                    icon: Receipt,
                  },
                  {
                    id: 'kas',
                    label: 'Laba & Akses Staf',
                    desc: 'Laba rahasia pemilik',
                    icon: Wallet,
                  },
                  {
                    id: 'publik',
                    label: 'Link Anak Kos',
                    desc: 'Katalog & lapor QR',
                    icon: QrCode,
                  },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = activeScreen === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveScreen(t.id as ScreenType)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        active
                          ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          active ? 'text-emerald-300' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">
                          {t.label}
                        </span>
                        <span
                          className={`text-[11px] block truncate ${
                            active ? 'text-emerald-200' : 'text-slate-400'
                          }`}
                        >
                          {t.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTAs & Instant Demo Buttons */}
            <div className="pt-2 space-y-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="h-11 px-5 rounded-xl bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-900/15 transition-all whitespace-nowrap cursor-pointer"
                >
                  <span>Mulai Gratis</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                {/* Unified Demo Switcher Pill */}
                <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/90 gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2 pr-1 select-none">
                    Demo:
                  </span>
                  <button
                    type="button"
                    disabled={submittingDemo}
                    onClick={() => onQuickDemoLogin('owner')}
                    className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-800 font-semibold text-xs flex items-center gap-1.5 shadow-2xs hover:text-emerald-800 transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>Pemilik</span>
                  </button>
                  <button
                    type="button"
                    disabled={submittingDemo}
                    onClick={() => onQuickDemoLogin('staff')}
                    className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs hover:text-emerald-800 transition disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Penjaga</span>
                  </button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium pt-0.5">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Gratis s/d 10 Kamar
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Bisa Bayar Tunai & Transfer
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Kwitansi WhatsApp Otomatis
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Buku Kas Kecil Penjaga
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Modern Workspace Canvas */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl bg-white border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.08),0_0_0_1px_rgba(15,23,42,0.02)] overflow-hidden transition-all">
              {/* Browser/Window Minimal Chrome Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-300/80" />
                  <span className="w-3 h-3 rounded-full bg-slate-300/80" />
                  <span className="w-3 h-3 rounded-full bg-slate-300/80" />
                </div>
                <div className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono font-medium text-slate-600 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>app.openhouse.my.id/dashboard</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  Properti Aktif
                </div>
              </div>

              {/* Sub-Header / Property Meta inside Canvas */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-white shrink-0">
                    <JuraganKosLogo className="w-4 h-4 text-emerald-100" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      Kos Griya Harmoni Residence
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      Malang • 8 Kamar Terdaftar
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    {activeScreen === 'kamar' && 'Manajemen Kamar'}
                    {activeScreen === 'tagihan' && 'Invoicing & Kwitansi'}
                    {activeScreen === 'kas' && 'Laporan Keuangan & Hak Akses'}
                    {activeScreen === 'publik' && 'Microsite & Lapor QR'}
                  </span>
                </div>
              </div>

              {/* Main Canvas Body — Responsive and Spacious */}
              <div className="p-4 sm:p-5 bg-slate-50/50 min-h-[380px] sm:min-h-[420px] flex flex-col justify-between">
                {/* 1. SCREEN: KAMAR & KTP */}
                {activeScreen === 'kamar' && (
                  <div className="space-y-4">
                    {/* Stat Row */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-medium text-slate-500 block">
                          Total Kamar
                        </span>
                        <span className="text-lg font-extrabold text-slate-900">
                          8 Kamar
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-medium text-slate-500 block">
                          Terisi
                        </span>
                        <span className="text-lg font-extrabold text-emerald-700">
                          6 Terisi
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-medium text-slate-500 block">
                          Siap Huni
                        </span>
                        <span className="text-lg font-extrabold text-amber-600">
                          2 Kosong
                        </span>
                      </div>
                    </div>

                    {/* Room Cards Showcase */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Room Card 1 */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-800 text-white font-bold text-xs flex items-center justify-center">
                              101
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                Lt. 1 • VIP AC
                              </p>
                              <p className="text-[11px] text-slate-500">
                                KM Dalam • Water Heater
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                            Terisi
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              Rizky Pratama
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              KTP Tersimpan
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Mahasiswa UB • Semesteran (Rp 7,5 Jt)
                          </p>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-500">
                              Deposit: <strong>Rp 300.000</strong>
                            </span>
                            <span className="text-emerald-700 font-semibold">
                              Aman Ditahan
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Room Card 2 */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center">
                              103
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                Lt. 1 • Reguler
                              </p>
                              <p className="text-[11px] text-slate-500">
                                KM Dalam • Kasur Springbed
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                            Kosong
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">
                              Tarif Sewa
                            </span>
                            <span className="font-extrabold text-slate-900">
                              Rp 900.000 / bln
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onQuickDemoLogin('owner')}
                            className="w-full py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs transition"
                          >
                            + Check-in Penghuni Baru
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SCREEN: TAGIHAN WA & KWITANSI */}
                {activeScreen === 'tagihan' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-medium text-slate-500 block">
                          Perlu Cek Bukti
                        </span>
                        <span className="text-lg font-extrabold text-sky-800">
                          1 Tagihan
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-medium text-slate-500 block">
                          Lunas Bulan Ini
                        </span>
                        <span className="text-lg font-extrabold text-emerald-800">
                          Rp 12.475.000
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              Kamar 102 • Dimas Aditya
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                              Bukti Diunggah
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Sewa Bulanan + Parkir Motor • Jatuh Tempo Hari Ini
                          </p>
                        </div>
                        <span className="text-base font-extrabold text-emerald-800">
                          Rp 975.000
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Receipt className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-600">
                            Transfer BCA an Dimas (Struk Terlampir)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenPublicInvoice('demo-inv-token-102')
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-100"
                          >
                            Buka Link
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickDemoLogin('owner')}
                            className="px-3 py-1 rounded-lg bg-emerald-800 text-white font-semibold text-xs hover:bg-emerald-900"
                          >
                            Konfirmasi Lunas
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. SCREEN: KAS BERSIH & PRIVASI LABA */}
                {activeScreen === 'kas' && (
                  <div className="space-y-4">
                    {/* Role toggle simulator */}
                    <div className="flex items-center justify-between p-1 bg-slate-200/70 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPreviewRole('owner')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                          previewRole === 'owner'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Tampilan Pemilik Kos (Owner)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewRole('staff')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                          previewRole === 'staff'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Tampilan Penjaga Kos (Staf)
                      </button>
                    </div>

                    {previewRole === 'owner' ? (
                      <div className="p-4 rounded-xl bg-emerald-900 text-white space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-200">
                            Laba Bersih Kos Bulan Ini
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-800 text-emerald-200">
                            Akses Pemilik
                          </span>
                        </div>
                        <p className="text-2xl font-extrabold">Rp 12.015.000</p>
                        <div className="flex justify-between text-xs text-emerald-200 pt-2 border-t border-emerald-800/80">
                          <span>Total Pemasukan: Rp 12.850.000</span>
                          <span>Pengeluaran: Rp 835.000</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                          <Lock className="w-4 h-4 text-slate-500" />
                          <span>Laporan Keuangan & Omzet Dikunci</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Penjaga kos hanya dapat mencatat nota pengeluaran
                          harian dan mengecek status kamar tanpa melihat total
                          keuntungan pemilik.
                        </p>
                      </div>
                    )}

                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <span className="font-bold text-slate-900 block">
                        Jurnal Operasional Terakhir
                      </span>
                      <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1.5">
                        <span>Token Listrik Pompa Air • Nota Terlampir</span>
                        <strong className="text-red-700">-Rp 250.000</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Iuran Kebersihan & WiFi Biznet</span>
                        <strong className="text-red-700">-Rp 435.000</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. SCREEN: HALAMAN PUBLIK ANAK KOS */}
                {activeScreen === 'publik' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                      <strong>Tanpa Perlu Login / Install Aplikasi:</strong>{' '}
                      Anak kos dan calon penghuni cukup membuka tautan langsung.
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenPublicCatalog('griya-brawijaya-suhat')
                        }
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-600 text-left flex items-center justify-between transition group shadow-2xs"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                            1. Katalog Kamar Kosong Publik
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            /kos/griya-brawijaya-suhat
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onOpenPublicComplaint('griya-brawijaya-suhat')
                        }
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-600 text-left flex items-center justify-between transition group shadow-2xs"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                            2. Form Lapor Fasilitas via Scan QR Lorong
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            /lapor/griya-brawijaya-suhat
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPublicInvoice('demo-inv-token-102')}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-600 text-left flex items-center justify-between transition group shadow-2xs"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                            3. Invoice Digital & Upload Bukti Transfer
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            /inv/demo-inv-token-102
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Bar inside Preview */}
                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
                  <span>Pratinjau antarmuka langsung</span>
                  <button
                    type="button"
                    onClick={() => onQuickDemoLogin('owner')}
                    className="font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                  >
                    Buka Dashboard Lengkap →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6 REAL FEATURE SPOTLIGHTS ================= */}
      <section
        id="fitur"
        className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200/80"
      >
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fitur Nyata Solusi Masalah Lapangan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Bukan Sekadar Software, Dibuat untuk Realita Kos Indonesia
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Menjawab kebiasaan nyata anak kos, ketelitian pemilik, dan kepraktisan penjaga kos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Terima Tunai */}
            <div className="p-6 rounded-2xl bg-[#f8fafc] border border-slate-200/90 flex flex-col justify-between space-y-5 hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Terima Bayar Tunai & Kwitansi Instan
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Anak kos bayar tunai ke penjaga? Verifikasi 2 ketukan tanpa upload slip transfer, kwitansi resmi siap dikirim via WhatsApp.
                  </p>
                </div>
              </div>

              {/* Visual Card Preview */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">Kamar 102 • Dimas Pratama</p>
                    <p className="text-[11px] text-slate-500">Tagihan Sewa Bulan Ini</p>
                  </div>
                  <span className="font-extrabold text-slate-900 shrink-0">Rp 950.000</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                  <span className="px-2 py-1 rounded-md bg-emerald-800 text-white font-bold flex items-center gap-1">
                    💵 Terima Tunai
                  </span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    ✓ Kwitansi Terbit
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 2: Kas Kecil Penjaga */}
            <div className="p-6 rounded-2xl bg-[#f8fafc] border border-slate-200/90 flex flex-col justify-between space-y-5 hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Buku Kas Kecil Penjaga (Petty Cash)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Pantau uang pegangan penjaga untuk beli token PLN darurat, kran & galon. Sisa kas di tangan terpantau jelas + 1-klik kirim rekap nota WA ke pemilik.
                  </p>
                </div>
              </div>

              {/* Visual Card Preview */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Modal Diberikan: Rp 500.000</span>
                  <span className="font-bold text-red-600">Pakai: Rp 180.000</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-700 font-semibold">Sisa Kas di Tangan:</span>
                  <span className="font-extrabold text-emerald-800">Rp 320.000 (Aman)</span>
                </div>
                <div className="text-[10px] text-right font-bold text-emerald-800">
                  💬 1-Klik Kirim Laporan WA
                </div>
              </div>
            </div>

            {/* Feature 3: Pengingat H-7 */}
            <div className="p-6 rounded-2xl bg-[#f8fafc] border border-slate-200/90 flex flex-col justify-between space-y-5 hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pengingat H-7 & Konfirmasi Perpanjang
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sistem mendeteksi sewa yang mau habis dalam 7 hari. Chat WA ramah menanyakan perpanjangan sewa agar pemilik tidak kaget kamar mendadak kosong.
                  </p>
                </div>
              </div>

              {/* Visual Card Preview */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                    H-7 Jatuh Tempo
                  </span>
                  <span className="text-slate-400">Kamar 104</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 leading-snug">
                  "Halo Kak, apakah bulan depan berencana lanjut sewa Kamar 104? 🙏"
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">
                  ✓ Deteksi Dini Mencegah Kamar Menganggur
                </div>
              </div>
            </div>

            {/* Feature 4: Deposit WA */}
            <div className="p-6 rounded-2xl bg-[#f8fafc] border border-slate-200/90 flex flex-col justify-between space-y-5 hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  04
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tanda Terima Deposit Digital ke WA
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Kirim bukti penerimaan uang jaminan kunci & kamar langsung ke WhatsApp anak kos saat check-in, mencegah perselisihan saat mereka keluar kos.
                  </p>
                </div>
              </div>

              {/* Visual Card Preview */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-semibold">Uang Deposit Ditahan:</span>
                  <span className="font-extrabold text-slate-900">Rp 500.000</span>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  "Jaminan dikembalikan utuh saat check-out tanpa tunggakan & kerusakan."
                </p>
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-emerald-700 font-bold">💬 Bukti WA Terkirim</span>
                  <span className="text-slate-400">Status: Ditahan Aman</span>
                </div>
              </div>
            </div>

            {/* Feature 5: Katalog Tanya Kamar Spesifik */}
            <div className="p-6 rounded-2xl bg-[#f8fafc] border border-slate-200/90 flex flex-col justify-between space-y-5 hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  05
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Katalog Web & Chat Kamar Spesifik
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Calon penghuni melihat foto & tarif kamar kosong secara mandiri. Tombol chat WhatsApp otomatis menyertakan nomor kamar spesifik tanpa perlu tanya bolak-balik.
                  </p>
                </div>
              </div>

              {/* Visual Card Preview */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-900">Kamar 103 (VIP AC)</span>
                  <span className="font-extrabold text-emerald-800">Rp 1.200.000/bln</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/70 text-[11px] text-slate-700 truncate">
                  💬 "Halo, saya tertarik sewa Kamar 103 VIP AC..."
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Kamar Mandi Dalam • Water Heater</span>
                  <span className="text-emerald-700 font-bold">Siap Huni</span>
                </div>
              </div>
            </div>

            {/* Feature 6: Komplain QR & Proteksi Laba */}
            <div className="p-6 rounded-2xl bg-[#f8fafc] border border-slate-200/90 flex flex-col justify-between space-y-5 hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  06
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Lapor Komplain QR & Privasi Laba
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Anak kos cukup scan stiker QR di dinding lorong untuk lapor lampu mati / kran bocor. Penjaga memproses tiket tanpa pernah melihat nominal laba bersih pemilik.
                  </p>
                </div>
              </div>

              {/* Visual Card Preview */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px]">
                  <span className="text-slate-700 font-medium">Tiket: Kran Bocor (K.105)</span>
                  <span className="font-bold text-emerald-700">Dikerjakan Staf ✓</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px]">
                  <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-700" />
                    Laba Bersih & Omzet:
                  </span>
                  <span className="font-bold text-amber-900">Terkunci Khusus Pemilik 🔒</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= COMPACT PRICING SECTION ================= */}
      <section
        id="harga"
        className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pilihan Paket yang Jelas & Transparan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Gratis selamanya untuk kos kecil, terjangkau bagi pemilik kos besar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Starter Plan */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 flex flex-col justify-between gap-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  OpenHouse Starter
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  GRATIS
                </span>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900">
                  Rp 0
                  <span className="text-xs font-normal text-slate-500 ml-1">
                    / selamanya
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Cocok untuk kos 1 properti skala kecil
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Maksimal <strong>1 Lokasi Kos & 10 Kamar</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Terima Bayar Tunai & Transfer Bank</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Kwitansi Digital & Pengingat WA 1-Klik</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Tanda Terima Deposit & Pengingat H-7</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={onOpenRegister}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 active:scale-[0.98] text-slate-800 font-bold text-xs transition cursor-pointer"
            >
              Daftar Paket Gratis
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-emerald-950 text-white rounded-2xl p-6 sm:p-7 border-2 border-emerald-600 flex flex-col justify-between gap-6 shadow-md shadow-emerald-950/20 relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">OpenHouse Pro</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-emerald-950">
                  UNLIMITED
                </span>
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">
                  Rp 49.000
                  <span className="text-xs font-normal text-emerald-200 ml-1">
                    / bulan
                  </span>
                </p>
                <p className="text-xs text-emerald-300 mt-1">
                  Untuk juragan dengan banyak kamar & penjaga kos
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-emerald-100 pt-2 border-t border-emerald-900">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Unlimited Kamar</strong> & Multi-Cabang Kos
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Akun <strong>Penjaga Kos</strong> (Laba Bersih Terkunci)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Buku Kas Kecil Penjaga</strong> (Token & Galon)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Poster QR Komplain & Katalog Publik Kamar</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onQuickDemoLogin('owner')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-extrabold text-xs transition shadow-sm"
            >
              Coba Simulasi OpenHouse Pro
            </button>
          </div>
        </div>
      </section>

      {/* ================= MINIMAL MODERN FOOTER ================= */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <JuraganKosLogo className="w-4 h-4 text-emerald-800" />
            <span className="font-semibold text-slate-700">
              OpenHouse — openhouse.my.id
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => onOpenPublicCatalog('griya-brawijaya-suhat')}
              className="hover:text-emerald-800 font-medium transition"
            >
              Contoh Katalog Kos
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="hover:text-emerald-800 font-medium transition"
            >
              Masuk Dashboard
            </button>
            <button
              type="button"
              onClick={onOpenRegister}
              className="hover:text-emerald-800 font-medium transition"
            >
              Daftar Akun Baru
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
