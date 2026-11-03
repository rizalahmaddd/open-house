import React, { useState, useMemo } from 'react';
import {
  Plus,
  MessageCircle,
  CheckCircle2,
  ExternalLink,
  Download,
  RefreshCw,
  FileCheck2,
  SlidersHorizontal,
  X,
  Search,
  AlertCircle,
  Clock,
  Receipt,
  Calendar,
  Banknote,
  CreditCard,
  Send,
} from 'lucide-react';
import { downloadReceiptAsPng } from '../utils/receipt-canvas';
import type { LeaseRecord } from './RoomsAndTenantsTab';

export interface FullInvoiceRecord {
  id: string;
  leaseId: string;
  propertyId: string;
  tenantId: string;
  invoiceNumber: string;
  publicToken: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  baseAmount: number;
  additionalItems: Array<{ label: string; amount: number }>;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'unpaid' | 'waiting_verification' | 'partial' | 'paid' | 'overdue';
  paymentProofUrl: string | null;
  paidAt: string | null;
  notes: string;
  tenantName: string;
  tenantPhone: string;
  tenantKampus: string;
  roomNumber: string;
  roomTypeName: string;
  billingCycle: string;
  propertyName: string;
  propertyAddress: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  qrisImageUrl: string | null;
}

interface Props {
  invoices: FullInvoiceRecord[];
  activeLeases: LeaseRecord[];
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
  onOpenPublicInvoice: (publicToken: string) => void;
  onNotifySuccess: (msg: string) => void;
  onNotifyError: (msg: string) => void;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const DEFAULT_WA_TEMPLATE =
  'Halo Kak {nama} (Kamar {kamar} - {kos}), mengingatkan tagihan sewa kos sebesar *{nominal}* dengan jatuh tempo *{jatuh_tempo}*. Silakan lihat rincian rekening/QRIS & unggah bukti transfer melalui tautan resmi berikut: {link_invoice} — Terima kasih.';

export default function BillingAndReceiptsTab({
  invoices,
  activeLeases,
  apiFetch,
  onRefresh,
  onOpenPublicInvoice,
  onNotifySuccess,
  onNotifyError,
}: Props) {
  const [filter, setFilter] = useState<
    'all' | 'unpaid_overdue' | 'waiting_verification' | 'upcoming_due' | 'paid'
  >(() => {
    const f = new URLSearchParams(window.location.search).get('filter');
    if (f === 'unpaid_overdue' || f === 'unpaid' || f === 'overdue') return 'unpaid_overdue';
    if (f === 'waiting_verification' || f === 'verifikasi') return 'waiting_verification';
    if (f === 'upcoming_due' || f === 'upcoming' || f === 'h7') return 'upcoming_due';
    if (f === 'paid' || f === 'lunas') return 'paid';
    return 'all';
  });

  const changeFilter = (
    newFilter: 'all' | 'unpaid_overdue' | 'waiting_verification' | 'upcoming_due' | 'paid'
  ) => {
    setFilter(newFilter);
    const url = new URL(window.location.href);
    if (newFilter === 'all') {
      url.searchParams.delete('filter');
    } else {
      url.searchParams.set('filter', newFilter);
    }
    window.history.replaceState({}, '', url.pathname + url.search);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [showWaTemplateEditor, setShowWaTemplateEditor] = useState(false);
  const [waTemplate, setWaTemplate] = useState<string>(
    () => localStorage.getItem('jk_wa_template') || DEFAULT_WA_TEMPLATE
  );

  // Create Manual Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>(
    activeLeases[0]?.leaseId || ''
  );
  const [invDueDate, setInvDueDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [invBaseAmount, setInvBaseAmount] = useState<string>(
    String(activeLeases[0]?.baseRentAmount || 900000)
  );
  const [invAddons, setInvAddons] = useState<
    Array<{ label: string; amount: number }>
  >([]);
  const [invDiscount, setInvDiscount] = useState<string>('0');
  const [invNotes, setInvNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Verify Payment Modal
  const [verifyingInvoice, setVerifyingInvoice] =
    useState<FullInvoiceRecord | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'paid' | 'partial'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [verifyPaidAmount, setVerifyPaidAmount] = useState<string>('0');
  const [verifyNotes, setVerifyNotes] = useState<string>('');
  const [justVerifiedInv, setJustVerifiedInv] = useState<FullInvoiceRecord | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const isUpcomingDue = (inv: FullInvoiceRecord) => {
    if (inv.status === 'paid') return false;
    const diffDays = Math.ceil(
      (new Date(inv.dueDate).getTime() - new Date(todayStr).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diffDays >= 0 && diffDays <= 7;
  };

  const summary = useMemo(() => {
    const unpaidList = invoices.filter(
      (i) => i.status === 'unpaid' || i.status === 'overdue' || i.status === 'partial'
    );
    const waitingList = invoices.filter((i) => i.status === 'waiting_verification');
    const paidList = invoices.filter((i) => i.status === 'paid');
    const upcomingList = invoices.filter(isUpcomingDue);

    const totalUnpaidNominal = unpaidList.reduce(
      (acc, i) => acc + Math.max(0, i.totalAmount - i.paidAmount),
      0
    );
    const totalWaitingNominal = waitingList.reduce(
      (acc, i) => acc + i.totalAmount,
      0
    );
    const totalPaidNominal = paidList.reduce(
      (acc, i) => acc + (i.paidAmount || i.totalAmount),
      0
    );

    return {
      allCount: invoices.length,
      unpaidCount: unpaidList.length,
      waitingCount: waitingList.length,
      upcomingCount: upcomingList.length,
      paidCount: paidList.length,
      totalUnpaidNominal,
      totalWaitingNominal,
      totalPaidNominal,
    };
  }, [invoices, todayStr]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filter === 'unpaid_overdue') {
        if (
          inv.status !== 'unpaid' &&
          inv.status !== 'overdue' &&
          inv.status !== 'partial'
        )
          return false;
      } else if (filter === 'waiting_verification') {
        if (inv.status !== 'waiting_verification') return false;
      } else if (filter === 'upcoming_due') {
        if (!isUpcomingDue(inv)) return false;
      } else if (filter === 'paid') {
        if (inv.status !== 'paid') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRoom = inv.roomNumber.toLowerCase().includes(q);
        const matchName = inv.tenantName.toLowerCase().includes(q);
        const matchInv = inv.invoiceNumber.toLowerCase().includes(q);
        return matchRoom || matchName || matchInv;
      }

      return true;
    });
  }, [invoices, filter, searchQuery, todayStr]);

  const buildWaReminderUrl = (inv: FullInvoiceRecord) => {
    const publicLink = `${window.location.origin}/inv/${inv.publicToken}`;
    const diffDays = Math.ceil(
      (new Date(inv.dueDate).getTime() - new Date(todayStr).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const isUpcoming = diffDays >= 0 && diffDays <= 7;

    let message = '';
    if (isUpcoming) {
      message = `Halo Kak *${inv.tenantName}*, sekadar konfirmasi ramah sewa *Kamar ${inv.roomNumber}* (*${inv.propertyName}*) akan jatuh tempo pada *${inv.dueDate}* (Total: ${formatRupiah(inv.totalAmount - inv.paidAmount)}). Apakah bulan depan berencana lanjut sewa atau ada rencana check-out? Rincian tagihan resmi dapat dicek di: ${publicLink} — Terima kasih! 🙏`;
    } else {
      message = waTemplate
        .replace(/\{nama\}/g, inv.tenantName)
        .replace(/\{kamar\}/g, inv.roomNumber)
        .replace(/\{kos\}/g, inv.propertyName)
        .replace(/\{nominal\}/g, formatRupiah(inv.totalAmount - inv.paidAmount))
        .replace(/\{jatuh_tempo\}/g, inv.dueDate)
        .replace(/\{link_invoice\}/g, publicLink);
    }

    const cleanPhone = inv.tenantPhone.replace(/^0/, '62').replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const buildWaReceiptUrl = (inv: FullInvoiceRecord) => {
    const publicLink = `${window.location.origin}/inv/${inv.publicToken}`;
    const msg = `Halo Kak ${inv.tenantName} (Kamar ${inv.roomNumber}), pembayaran sewa kos (${
      inv.invoiceNumber
    }) sebesar *${formatRupiah(
      inv.paidAmount || inv.totalAmount
    )}* telah kami terima dan verifikasi LUNAS. Anda dapat mengunduh Kwitansi Digital resmi di tautan ini: ${publicLink} — Terima kasih!`;
    const cleanPhone = inv.tenantPhone.replace(/^0/, '62').replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleRunCron = async () => {
    try {
      setSubmitting(true);
      const res = await apiFetch('/api/invoices/run-cron', { method: 'POST' });
      onNotifySuccess(
        `Pengecekan jatuh tempo selesai: ${res.generatedInvoices} tagihan periode baru dibuat, ${res.markedOverdue} tagihan ditandai lewat jatuh tempo.`
      );
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaseId) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          leaseId: selectedLeaseId,
          dueDate: invDueDate,
          periodStart: invDueDate,
          baseAmount: Number(invBaseAmount),
          additionalItems: invAddons,
          discountAmount: Number(invDiscount),
          notes: invNotes,
        }),
      });
      setShowCreateModal(false);
      onNotifySuccess('Tagihan baru berhasil dibuat & siap dikirim via WhatsApp!');
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingInvoice) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/invoices/${verifyingInvoice.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          status: verifyStatus,
          paidAmount:
            verifyStatus === 'paid'
              ? verifyingInvoice.totalAmount
              : Number(verifyPaidAmount),
          notes: verifyNotes,
        }),
      });
      const targetName = verifyingInvoice.tenantName;
      const verifiedRecord = {
        ...verifyingInvoice,
        status: verifyStatus,
        paidAmount:
          verifyStatus === 'paid'
            ? verifyingInvoice.totalAmount
            : Number(verifyPaidAmount),
        paidAt: new Date().toISOString(),
      };
      setJustVerifiedInv(verifiedRecord);
      setVerifyingInvoice(null);
      onNotifySuccess(
        `Pembayaran ${targetName} berhasil dikonfirmasi ${
          verifyStatus === 'paid' ? 'LUNAS' : 'CICILAN/DP'
        }! Kwitansi digital siap dibagikan ke WhatsApp.`
      );
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Post-Verification Quick WhatsApp Receipt Prompt */}
      {justVerifiedInv && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Pembayaran Kamar {justVerifiedInv.roomNumber} ({justVerifiedInv.tenantName}) Berhasil LUNAS!
              </p>
              <p className="text-[11px] text-emerald-800">
                Kwitansi digital sah telah terbit. Kirimkan langsung ke WhatsApp penghuni sekarang.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={buildWaReceiptUrl(justVerifiedInv)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim Kwitansi ke WA</span>
            </a>
            <button
              type="button"
              onClick={() => setJustVerifiedInv(null)}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Interactive KPI Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => changeFilter('all')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            filter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                filter === 'all' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Semua Tagihan
            </span>
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          </div>
          <div className="mt-2">
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {summary.allCount}
            </p>
            <p
              className={`text-[11px] mt-0.5 truncate ${
                filter === 'all' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Total tagihan aktif
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => changeFilter('waiting_verification')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            filter === 'waiting_verification'
              ? 'bg-sky-900 text-white border-sky-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-sky-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                filter === 'waiting_verification'
                  ? 'text-sky-200'
                  : 'text-slate-500'
              }`}
            >
              Cek Bukti
            </span>
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
          </div>
          <div className="mt-2">
            <p
              className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                filter === 'waiting_verification'
                  ? 'text-white'
                  : 'text-sky-800'
              }`}
            >
              {summary.waitingCount}
            </p>
            <p
              className={`text-[11px] mt-0.5 truncate ${
                filter === 'waiting_verification'
                  ? 'text-sky-200'
                  : 'text-slate-500'
              }`}
            >
              {formatRupiah(summary.totalWaitingNominal)}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => changeFilter('upcoming_due')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            filter === 'upcoming_due'
              ? 'bg-amber-900 text-white border-amber-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                filter === 'upcoming_due' ? 'text-amber-200' : 'text-slate-500'
              }`}
            >
              H-7 Jatuh Tempo
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          </div>
          <div className="mt-2">
            <p
              className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                filter === 'upcoming_due' ? 'text-white' : 'text-amber-700'
              }`}
            >
              {summary.upcomingCount}
            </p>
            <p
              className={`text-[11px] mt-0.5 truncate ${
                filter === 'upcoming_due' ? 'text-amber-200' : 'text-slate-500'
              }`}
            >
              Konfirmasi lanjut sewa
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => changeFilter('unpaid_overdue')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            filter === 'unpaid_overdue'
              ? 'bg-red-900 text-white border-red-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-red-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                filter === 'unpaid_overdue' ? 'text-red-200' : 'text-slate-500'
              }`}
            >
              Belum Lunas / Telat
            </span>
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
          </div>
          <div className="mt-2">
            <p
              className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                filter === 'unpaid_overdue' ? 'text-white' : 'text-red-700'
              }`}
            >
              {summary.unpaidCount}
            </p>
            <p
              className={`text-[11px] mt-0.5 truncate ${
                filter === 'unpaid_overdue' ? 'text-red-200' : 'text-slate-500'
              }`}
            >
              Piutang {formatRupiah(summary.totalUnpaidNominal)}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => changeFilter('paid')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between col-span-2 sm:col-span-1 ${
            filter === 'paid'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                filter === 'paid' ? 'text-emerald-200' : 'text-slate-500'
              }`}
            >
              Lunas & Kwitansi
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </div>
          <div className="mt-2">
            <p
              className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                filter === 'paid' ? 'text-white' : 'text-emerald-800'
              }`}
            >
              {summary.paidCount}
            </p>
            <p
              className={`text-[11px] mt-0.5 truncate ${
                filter === 'paid' ? 'text-emerald-200' : 'text-slate-500'
              }`}
            >
              {formatRupiah(summary.totalPaidNominal)}
            </p>
          </div>
        </button>
      </div>

      {/* 2. Search & Action Toolbar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor kamar, nama penghuni, atau nomor invoice..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs sm:text-sm text-slate-900 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            type="button"
            onClick={() => setShowWaTemplateEditor(!showWaTemplateEditor)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition ${
              showWaTemplateEditor
                ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                : 'border-stone-300 text-stone-700 hover:bg-stone-50'
            }`}
          >
            Template WA
          </button>
          <button
            type="button"
            onClick={handleRunCron}
            disabled={submitting}
            className="px-3 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold whitespace-nowrap transition"
            title="Jalankan pengecekan otomatis tagihan jatuh tempo"
          >
            Cek Jatuh Tempo
          </button>
          <button
            type="button"
            onClick={() => {
              if (activeLeases.length > 0) {
                const first = activeLeases[0];
                setSelectedLeaseId(first.leaseId);
                setInvBaseAmount(String(first.baseRentAmount));
                setInvAddons(first.recurringAddons || []);
                setInvDueDate(first.nextDueDate);
              }
              setShowCreateModal(true);
            }}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold whitespace-nowrap text-center shadow-xs transition"
          >
            + Buat Tagihan
          </button>
        </div>
      </div>

      {/* Editor Template Pesan Pengingat WhatsApp */}
      {showWaTemplateEditor && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-emerald-700 space-y-3 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Pengaturan Template Pesan Pengingat WhatsApp
              </h3>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                Variabel otomatis:{' '}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {'{nama}'}
                </code>{' '}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {'{kamar}'}
                </code>{' '}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {'{kos}'}
                </code>{' '}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {'{nominal}'}
                </code>{' '}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {'{jatuh_tempo}'}
                </code>{' '}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                  {'{link_invoice}'}
                </code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWaTemplateEditor(false)}
              className="p-1 text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            rows={3}
            value={waTemplate}
            onChange={(e) => {
              setWaTemplate(e.target.value);
              localStorage.setItem('jk_wa_template', e.target.value);
            }}
            className="w-full rounded-xl border border-stone-300 p-3 text-xs font-mono bg-stone-50 focus:bg-white"
          />
          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={() => {
                setWaTemplate(DEFAULT_WA_TEMPLATE);
                localStorage.setItem('jk_wa_template', DEFAULT_WA_TEMPLATE);
              }}
              className="text-xs font-medium text-stone-600 hover:text-stone-900 underline"
            >
              Reset ke Standar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowWaTemplateEditor(false);
                onNotifySuccess('Template pesan WhatsApp berhasil disimpan!');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
            >
              Simpan Template
            </button>
          </div>
        </div>
      )}

      {/* 3. Daftar Kartu Tagihan */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-stone-200 text-center space-y-2">
          <Receipt className="w-8 h-8 text-stone-400 mx-auto" />
          <p className="text-sm font-bold text-stone-800">
            Tidak ada data tagihan pada kategori ini
          </p>
          <p className="text-xs text-stone-500">
            Coba ubah filter di atas atau buat tagihan baru untuk penghuni aktif.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((inv) => {
            const isPaid = inv.status === 'paid';
            const isWaiting = inv.status === 'waiting_verification';
            const isOverdue = inv.status === 'overdue';

            return (
              <div
                key={inv.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition hover:shadow-xs ${
                  isWaiting
                    ? 'border-sky-300 bg-sky-50/20'
                    : isOverdue
                    ? 'border-red-300'
                    : 'border-stone-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-stone-900 text-white text-xs font-bold">
                        Kamar {inv.roomNumber}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-stone-900 truncate">
                        {inv.tenantName}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-900'
                            : isWaiting
                            ? 'bg-sky-100 text-sky-900 border border-sky-300'
                            : inv.status === 'partial'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-red-100 text-red-900'
                        }`}
                      >
                        {isPaid
                          ? 'LUNAS'
                          : isWaiting
                          ? 'CEK BUKTI TRANSFER'
                          : inv.status === 'partial'
                          ? 'CICILAN / DP'
                          : isOverdue
                          ? 'LEWAT JATUH TEMPO'
                          : 'BELUM BAYAR'}
                      </span>
                      <span className="text-[11px] font-mono text-stone-400">
                        #{inv.invoiceNumber}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        Periode: <strong className="text-stone-800">{inv.periodStart}</strong> s/d{' '}
                        <strong className="text-stone-800">{inv.periodEnd}</strong>
                      </span>
                      <span>
                        Jatuh Tempo:{' '}
                        <strong
                          className={
                            isOverdue && !isPaid ? 'text-red-700' : 'text-stone-900'
                          }
                        >
                          {inv.dueDate}
                        </strong>
                      </span>
                    </div>

                    {(inv.additionalItems.length > 0 || inv.discountAmount > 0 || inv.notes) && (
                      <div className="text-[11px] text-stone-500 space-y-0.5 bg-stone-50 px-3 py-2 rounded-xl border border-stone-100">
                        {(inv.additionalItems.length > 0 || inv.discountAmount > 0) && (
                          <p>
                            Pokok {formatRupiah(inv.baseAmount)}
                            {inv.additionalItems
                              .map((a) => ` + ${a.label} (${formatRupiah(a.amount)})`)
                              .join('')}
                            {inv.discountAmount > 0
                              ? ` - Diskon ${formatRupiah(inv.discountAmount)}`
                              : ''}
                          </p>
                        )}
                        {inv.notes && <p className="italic text-stone-600">Catatan: {inv.notes}</p>}
                      </div>
                    )}
                  </div>

                  {/* Right Price & Action Buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-stone-500 block">
                        Total Tagihan
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-emerald-900">
                        {formatRupiah(inv.totalAmount)}
                      </span>
                      {inv.paidAmount > 0 && inv.paidAmount < inv.totalAmount && (
                        <span className="block text-[11px] font-semibold text-amber-800">
                          Terbayar {formatRupiah(inv.paidAmount)} (Sisa{' '}
                          {formatRupiah(inv.totalAmount - inv.paidAmount)})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => onOpenPublicInvoice(inv.publicToken)}
                        className="px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                        title="Lihat halaman tagihan publik yang dibuka penghuni"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Link Penghuni</span>
                      </button>

                      {!isPaid ? (
                        <>
                          <a
                            href={buildWaReminderUrl(inv)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                            title={
                              isUpcomingDue(inv)
                                ? 'Kirim WA konfirmasi perpanjangan sewa (H-7)'
                                : 'Kirim WA tagihan sewa'
                            }
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{isUpcomingDue(inv) ? 'Konfirmasi WA' : 'Tagih WA'}</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setVerifyingInvoice(inv);
                              setPaymentMethod('cash');
                              setVerifyStatus('paid');
                              setVerifyPaidAmount(String(inv.totalAmount));
                              setVerifyNotes('Diterima tunai oleh pengelola kos');
                            }}
                            className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition whitespace-nowrap"
                            title="Terima uang sewa tunai langsung di tempat"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Terima Tunai</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setVerifyingInvoice(inv);
                              setPaymentMethod(inv.paymentProofUrl ? 'transfer' : 'cash');
                              setVerifyStatus('paid');
                              setVerifyPaidAmount(String(inv.totalAmount));
                              setVerifyNotes(
                                inv.paymentProofUrl
                                  ? 'Pembayaran transfer telah diverifikasi masuk'
                                  : 'Diterima tunai oleh pengelola kos'
                              );
                            }}
                            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                              isWaiting
                                ? 'bg-sky-700 hover:bg-sky-800'
                                : 'bg-slate-800 hover:bg-slate-900'
                            }`}
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>{isWaiting ? 'Cek Bukti' : 'Verifikasi'}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => downloadReceiptAsPng(inv)}
                            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Kwitansi PNG</span>
                          </button>
                          <a
                            href={buildWaReceiptUrl(inv)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Kirim WA</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL 1: VERIFIKASI BUKTI BAYAR & KONFIRMASI LUNAS ================= */}
      {verifyingInvoice && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 border border-stone-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                Konfirmasi Pembayaran — Kamar {verifyingInvoice.roomNumber}
              </h3>
              <button
                type="button"
                onClick={() => setVerifyingInvoice(null)}
                className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <p>
                Penghuni: <strong>{verifyingInvoice.tenantName}</strong> (
                {verifyingInvoice.invoiceNumber})
              </p>
              <p>
                Total Tagihan:{' '}
                <strong className="text-emerald-900 text-sm">
                  {formatRupiah(verifyingInvoice.totalAmount)}
                </strong>
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('transfer');
                    setVerifyNotes('Transfer bank telah diverifikasi masuk');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    paymentMethod === 'transfer'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-600 shadow-2xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-800" />
                  <span>Transfer Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('cash');
                    setVerifyNotes('Diterima tunai oleh pengelola kos');
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-600 shadow-2xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-emerald-800" />
                  <span>Tunai di Tempat</span>
                </button>
              </div>
            </div>

            {paymentMethod === 'cash' ? (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Uang Tunai Diterima Langsung</span>
                </p>
                <p className="text-[11px] text-emerald-800">
                  Tidak memerlukan unggahan foto bukti transfer. Kwitansi digital sah akan langsung terbit dan dapat dikirim via WhatsApp.
                </p>
              </div>
            ) : verifyingInvoice.paymentProofUrl ? (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-stone-800">
                  Foto Bukti Transfer dari Penghuni:
                </p>
                <img
                  src={verifyingInvoice.paymentProofUrl}
                  alt="Bukti Transfer Penghuni"
                  width={360}
                  height={220}
                  className="w-full max-h-56 object-contain rounded-xl border border-stone-300 bg-stone-50"
                />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-stone-50 border border-dashed border-stone-300 text-xs text-stone-500 text-center">
                Penghuni belum mengunggah foto bukti di link tagihan (Konfirmasi manual via mutasi rekening bank).
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Status Konfirmasi Pembayaran
                </label>
                <select
                  value={verifyStatus}
                  onChange={(e) => {
                    const st = e.target.value as 'paid' | 'partial';
                    setVerifyStatus(st);
                    if (st === 'paid') {
                      setVerifyPaidAmount(String(verifyingInvoice.totalAmount));
                    }
                  }}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white font-semibold"
                >
                  <option value="paid">Lunas Penuh (Terbitkan Kwitansi Sah)</option>
                  <option value="partial">Pembayaran Sebagian / Cicilan / DP</option>
                </select>
              </div>

              {verifyStatus === 'partial' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nominal yang Sudah Dibayar (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    value={verifyPaidAmount}
                    onChange={(e) => setVerifyPaidAmount(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Catatan Kwitansi / Verifikasi
                </label>
                <input
                  type="text"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingInvoice(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Memverifikasi...' : 'Konfirmasi & Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: BUAT TAGIHAN MANUAL ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-stone-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                Buat Tagihan Sewa Kos Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Pilih Kamar & Penghuni Aktif
                </label>
                <select
                  value={selectedLeaseId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedLeaseId(id);
                    const found = activeLeases.find((l) => l.leaseId === id);
                    if (found) {
                      setInvBaseAmount(String(found.baseRentAmount));
                      setInvAddons(found.recurringAddons || []);
                      setInvDueDate(found.nextDueDate);
                    }
                  }}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white font-semibold"
                >
                  {activeLeases.map((l) => (
                    <option key={l.leaseId} value={l.leaseId}>
                      Kamar {l.roomNumber} — {l.fullName} (
                      {formatRupiah(l.baseRentAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tanggal Jatuh Tempo
                  </label>
                  <input
                    type="date"
                    required
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Sewa Kamar Pokok (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    value={invBaseAmount}
                    onChange={(e) => setInvBaseAmount(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-bold"
                  />
                </div>
              </div>

              {/* Additional Items */}
              <div className="space-y-2 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-700">
                    Biaya Tambahan / Denda (Listrik, Parkir, Denda)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setInvAddons([
                        ...invAddons,
                        { label: 'Denda Keterlambatan', amount: 25000 },
                      ])
                    }
                    className="text-xs font-bold text-emerald-800 hover:underline"
                  >
                    + Tambah Biaya
                  </button>
                </div>
                {invAddons.map((addon, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={addon.label}
                      onChange={(e) => {
                        const next = [...invAddons];
                        next[idx].label = e.target.value;
                        setInvAddons(next);
                      }}
                      className="flex-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                    <input
                      type="number"
                      value={addon.amount}
                      onChange={(e) => {
                        const next = [...invAddons];
                        next[idx].amount = Number(e.target.value);
                        setInvAddons(next);
                      }}
                      className="w-28 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setInvAddons(invAddons.filter((_, i) => i !== idx))
                      }
                      className="text-xs text-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Potongan / Diskon (Rp)
                  </label>
                  <input
                    type="number"
                    value={invDiscount}
                    onChange={(e) => setInvDiscount(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Catatan Tagihan
                  </label>
                  <input
                    type="text"
                    value={invNotes}
                    onChange={(e) => setInvNotes(e.target.value)}
                    placeholder="Contoh: Periode Semester Ganjil"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                >
                  {submitting ? 'Membuat...' : 'Simpan & Buat Tagihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
