import React from 'react';
import { WhatsAppIcon } from './BrandIcons';
import type { RoomRecord, LeaseRecord } from './RoomsAndTenantsTab';
import type { FullInvoiceRecord } from './BillingAndReceiptsTab';
import type { FullTicketRecord } from './OperationsAndFinanceTab';
import type { PropertyRecord } from './PropertySettingsModal';
import {
  DoorOpen,
  Receipt,
  Wrench,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Lock,
} from 'lucide-react';

interface Props {
  isOwner: boolean;
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
  leases: LeaseRecord[];
  invoices: FullInvoiceRecord[];
  tickets: FullTicketRecord[];
  currentProperty: PropertyRecord;
  onNavigateTab: (
    tab: 'overview' | 'rooms-tenants' | 'billing' | 'operations' | 'staff' | 'plan',
    extraSearch?: string
  ) => void;
  onOpenPublicCatalog: (slug: string) => void;
  onOpenPublicComplaint: (slug: string) => void;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardOverviewTab({
  isOwner,
  roomSummary,
  financials,
  leases,
  invoices,
  tickets,
  currentProperty,
  onNavigateTab,
  onOpenPublicCatalog,
  onOpenPublicComplaint,
}: Props) {
  const occupancyRate =
    roomSummary.total > 0
      ? Math.round((roomSummary.occupied / roomSummary.total) * 100)
      : 0;

  const waitingVerificationInvoices = invoices.filter(
    (i) => i.status === 'waiting_verification'
  );
  const unpaidOrOverdueInvoices = invoices.filter(
    (i) => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partial'
  );
  const openTickets = tickets.filter((t) => t.status !== 'resolved');
  const activeLeases = leases.filter((l) => l.leaseStatus === 'active');

  return (
    <div className="space-y-6">
      {/* 1. Top Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Occupancy */}
        <button
          type="button"
          onClick={() => onNavigateTab('rooms-tenants')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-600 hover:shadow-sm text-left transition-all flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-500">
              Okupansi Kamar
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
              {occupancyRate}%
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {roomSummary.occupied}
              <span className="text-base font-normal text-slate-400">
                /{roomSummary.total}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>{roomSummary.available} kamar kosong</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
            </p>
          </div>
        </button>

        {/* KPI 2: Waiting / Unpaid Invoices */}
        <button
          type="button"
          onClick={() => onNavigateTab('billing')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-sky-600 hover:shadow-sm text-left transition-all flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-500">
              Tagihan Aktif
            </span>
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {waitingVerificationInvoices.length + unpaidOrOverdueInvoices.length}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between truncate">
              <span>
                {waitingVerificationInvoices.length} cek bukti •{' '}
                {unpaidOrOverdueInvoices.length} belum lunas
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
            </p>
          </div>
        </button>

        {/* KPI 3: Open Maintenance Tickets */}
        <button
          type="button"
          onClick={() => onNavigateTab('operations', '?sub=tickets')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-amber-600 hover:shadow-sm text-left transition-all flex flex-col justify-between group shadow-2xs"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-slate-500">
              Komplain Fasilitas
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {openTickets.length}
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Perlu tindakan perbaikan</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition" />
            </p>
          </div>
        </button>

        {/* KPI 4: Net Cashflow (Owner) or Staff Mode */}
        {isOwner && financials ? (
          <button
            type="button"
            onClick={() => onNavigateTab('operations', '?sub=expenses')}
            className="bg-emerald-950 text-white p-4 sm:p-5 rounded-2xl border border-emerald-900 hover:border-emerald-700 hover:shadow-md text-left transition-all flex flex-col justify-between group shadow-sm shadow-emerald-950/10"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-medium text-emerald-200">
                Laba / Kas Bersih
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200">
                Owner
              </span>
            </div>
            <div className="mt-3">
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                {formatRupiah(financials.netCashflow)}
              </p>
              <p className="text-xs text-emerald-300/80 mt-1 flex items-center justify-between truncate">
                <span>Omzet {formatRupiah(financials.totalRevenuePaid)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
              </p>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigateTab('operations', '?sub=expenses')}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-600 hover:shadow-sm text-left transition-all flex flex-col justify-between group shadow-2xs"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-slate-500">
                Kas Kecil Operasional
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            </div>
            <div className="mt-3">
              <p className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center justify-between">
                <span>Buku Kas & Nota</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
              </p>
              <p className="text-xs text-slate-500 mt-1 truncate">
                Catat token listrik darurat, kran & galon
              </p>
            </div>
          </button>
        )}
      </div>

      {/* 2. Main Two-Column Workflow Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Action Priority Items */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 space-y-4 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Prioritas Tindakan Hari Ini
            </h3>
            <p className="text-xs text-slate-500">
              Verifikasi transfer masuk, pengingat jatuh tempo, dan perbaikan fasilitas
            </p>
          </div>

          <div className="space-y-3">
            {/* Waiting Verification Invoices */}
            {waitingVerificationInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 transition flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Kamar {inv.roomNumber} ({inv.tenantName})
                    </p>
                    <span className="text-[10px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full shrink-0">
                      Bukti Diunggah
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 pl-4">
                    Nominal <strong>{formatRupiah(inv.totalAmount)}</strong> • Menunggu konfirmasi lunas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onNavigateTab('billing', '?filter=waiting_verification')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 active:scale-[0.98] text-white text-xs font-semibold shrink-0 whitespace-nowrap transition"
                >
                  Cek Bukti
                </button>
              </div>
            ))}

            {/* Unpaid / Overdue Invoices */}
            {unpaidOrOverdueInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Kamar {inv.roomNumber} ({inv.tenantName})
                    </p>
                    <span className="text-[10px] font-semibold text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                      Jatuh Tempo: {inv.dueDate}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 pl-4">
                    Sisa Tagihan:{' '}
                    <strong className="text-slate-900">
                      {formatRupiah(inv.totalAmount - inv.paidAmount)}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onNavigateTab('billing', '?filter=unpaid_overdue')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white text-xs font-semibold shrink-0 whitespace-nowrap flex items-center gap-1.5 transition"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>
              </div>
            ))}

            {/* Open Maintenance Tickets */}
            {openTickets.map((tkt) => (
              <div
                key={tkt.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-300 transition flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Kamar {tkt.roomNumber}: {tkt.title}
                    </p>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                      {tkt.status === 'in_progress' ? 'Dikerjakan' : 'Baru'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 pl-4 truncate">
                    Pelapor: {tkt.reporterName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('operations', '?sub=tickets')}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold shrink-0 whitespace-nowrap transition"
                >
                  Tangani
                </button>
              </div>
            ))}

            {waitingVerificationInvoices.length === 0 &&
              unpaidOrOverdueInvoices.length === 0 &&
              openTickets.length === 0 && (
                <div className="p-8 rounded-xl bg-emerald-50/50 border border-emerald-200/80 text-center space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700 mx-auto" />
                  <p className="text-xs font-bold text-emerald-950">
                    Semua Tagihan & Fasilitas Terkendali
                  </p>
                  <p className="text-xs text-emerald-700">
                    Tidak ada tunggakan pembayaran maupun komplain yang tertunda.
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Right Column: Public Links & Active Tenants */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Public Microsites Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 space-y-3.5 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Link Publik Anak Kos ({currentProperty.name})
              </h3>
              <p className="text-xs text-slate-500">
                Bisa dibagikan ke WhatsApp tanpa penghuni perlu login
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onOpenPublicCatalog(currentProperty.slug)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/20 text-left transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Katalog Kamar
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition" />
                </div>
                <p className="text-xs font-bold text-slate-900">
                  Ketersediaan Kamar
                </p>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  /kos/{currentProperty.slug}
                </p>
              </button>

              <button
                type="button"
                onClick={() => onOpenPublicComplaint(currentProperty.slug)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/20 text-left transition space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Poster QR Lorong
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition" />
                </div>
                <p className="text-xs font-bold text-slate-900">
                  Lapor Kerusakan
                </p>
                <p className="text-[11px] text-slate-400 font-mono truncate">
                  /lapor/{currentProperty.slug}
                </p>
              </button>
            </div>
          </div>

          {/* Active Tenants List Summary */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Penghuni Aktif ({activeLeases.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Penghuni terdata di cabang ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('rooms-tenants')}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {activeLeases.slice(0, 5).map((l) => (
                <div
                  key={l.leaseId}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {l.roomNumber}
                      </span>
                      <span className="font-bold text-slate-900 truncate">
                        {l.fullName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 pl-8">
                      {l.universityOrWork || 'Umum'} • {l.originCity || 'Lokal'}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 shrink-0">
                    Jatuh Tempo: <strong>{l.nextDueDate}</strong>
                  </span>
                </div>
              ))}
              {activeLeases.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Belum ada penghuni aktif yang terdaftar.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
