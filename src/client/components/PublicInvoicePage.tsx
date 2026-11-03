import React, { useEffect, useState } from 'react';
import { JuraganKosLogo } from './BrandIcons';
import { compressImageToWebP } from '../utils/image';
import { downloadReceiptAsPng } from '../utils/receipt-canvas';

interface Props {
  publicToken: string;
  onBackToApp?: () => void;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PublicInvoicePage({ publicToken, onBackToApp }: Props) {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tenantNote, setTenantNote] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/public/${publicToken}`);
      const data = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(data.error || 'Tagihan tidak ditemukan');
      }
      setInvoice(data.invoice);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [publicToken]);

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setUploadSuccess(null);
    try {
      const compressed = await compressImageToWebP(file);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('notes', tenantNote);

      const res = await fetch(
        `/api/invoices/public/${publicToken}/upload-proof`,
        {
          method: 'POST',
          body: formData,
        }
      );
      const data = (await res.json()) as any;
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah bukti pembayaran');
      }
      setUploadSuccess(
        'Bukti pembayaran berhasil dikirim! Pengelola kos akan segera memverifikasi pembayaran Anda.'
      );
      await fetchInvoice();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <p className="text-sm font-medium text-stone-600">
          Memuat rincian tagihan kos...
        </p>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 text-center space-y-3 shadow-sm">
          <h1 className="text-base font-bold text-slate-900">
            Link Tagihan Tidak Ditemukan
          </h1>
          <p className="text-xs text-slate-600">{error}</p>
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition"
            >
              ← Kembali ke Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';
  const isWaiting = invoice.status === 'waiting_verification';

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 font-sans">
      <div className="max-w-lg mx-auto space-y-4">
        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs transition"
          >
            <span>← Kembali ke Dashboard Pengelola</span>
          </button>
        )}

        {/* Main Invoice Digital Receipt Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.06)] overflow-hidden">
          {/* Header Banner — Modern Deep Emerald Folio */}
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white p-5 sm:p-6 space-y-4">
            {/* Top Row: Logo + Status Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-800/80 border border-emerald-700/60 flex items-center justify-center shrink-0">
                  <JuraganKosLogo className="w-5 h-5 text-emerald-100" />
                </div>
                <span className="text-xs font-bold tracking-tight text-emerald-200">
                  OpenHouse Billing
                </span>
              </div>

              <span
                className={`text-[11px] font-extrabold px-3 py-1 rounded-full shrink-0 whitespace-nowrap shadow-2xs ${
                  isPaid
                    ? 'bg-emerald-400 text-emerald-950'
                    : isWaiting
                    ? 'bg-sky-400 text-sky-950'
                    : 'bg-amber-400 text-amber-950'
                }`}
              >
                {isPaid
                  ? 'LUNAS TERVERIFIKASI'
                  : isWaiting
                  ? 'MENUNGGU VERIFIKASI'
                  : 'BELUM DIBAYAR'}
              </span>
            </div>

            {/* Property Name & Location */}
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-snug">
                {invoice.propertyName}
              </h1>
              <p className="text-xs text-emerald-300/80 leading-relaxed">
                {invoice.areaMalang || invoice.propertyAddress}
              </p>
            </div>

            {/* Invoice Number & Due Date */}
            <div className="pt-3 border-t border-emerald-800/80 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-emerald-200">
              <span className="whitespace-nowrap">
                No. Tagihan:{' '}
                <strong className="font-mono text-white">
                  {invoice.invoiceNumber}
                </strong>
              </span>
              <span className="whitespace-nowrap">
                Jatuh Tempo:{' '}
                <strong className="text-amber-300 font-semibold">{invoice.dueDate}</strong>
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Info Penghuni & Kamar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-500 block">
                  Nama Penghuni
                </span>
                <strong className="text-slate-900 text-sm font-extrabold block">
                  {invoice.tenantName}
                </strong>
                {invoice.tenantKampus && (
                  <span className="text-slate-600 block">
                    {invoice.tenantKampus}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-4">
                <span className="text-[11px] text-slate-500 block">
                  Unit Kamar & Periode Sewa
                </span>
                <strong className="text-slate-900 text-sm font-extrabold block">
                  Kamar {invoice.roomNumber}
                </strong>
                <span className="text-slate-600 block whitespace-nowrap">
                  {invoice.periodStart} s/d {invoice.periodEnd}
                </span>
              </div>
            </div>

            {/* Rincian Tagihan */}
            <div className="space-y-2 text-xs">
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Rincian Tagihan
              </h2>
              <div className="divide-y divide-slate-100 border rounded-2xl border-slate-200 p-4 space-y-2.5 bg-white shadow-2xs">
                <div className="flex items-baseline justify-between gap-4 py-1">
                  <span className="text-slate-700 leading-snug">
                    Sewa Kamar ({invoice.roomTypeName})
                  </span>
                  <span className="font-bold text-slate-900 shrink-0 whitespace-nowrap">
                    {formatRupiah(invoice.baseAmount)}
                  </span>
                </div>
                {invoice.additionalItems.map(
                  (item: { label: string; amount: number }, i: number) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-4 py-1"
                    >
                      <span className="text-slate-700 leading-snug">
                        + {item.label}
                      </span>
                      <span className="font-bold text-slate-900 shrink-0 whitespace-nowrap">
                        {formatRupiah(Number(item.amount))}
                      </span>
                    </div>
                  )
                )}
                {invoice.discountAmount > 0 && (
                  <div className="flex items-baseline justify-between gap-4 py-1 text-emerald-700">
                    <span>Potongan Diskon</span>
                    <span className="font-bold shrink-0 whitespace-nowrap">
                      - {formatRupiah(invoice.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-4 pt-3 text-sm font-extrabold text-slate-900">
                  <span>Total Tagihan</span>
                  <span className="text-emerald-800 text-base sm:text-lg shrink-0 whitespace-nowrap">
                    {formatRupiah(invoice.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Jika Sudah Lunas -> Tombol Download Kwitansi Resmi */}
            {isPaid ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 text-center">
                <div>
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-200 text-emerald-950 mb-1.5">
                    PEMBAYARAN SAH
                  </span>
                  <h3 className="text-sm font-extrabold text-emerald-950">
                    Pembayaran Lunas & Telah Diverifikasi
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Terima kasih! Kwitansi resmi berstempel digital siap diunduh di bawah ini.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadReceiptAsPng(invoice)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-sm"
                >
                  Unduh Kwitansi Resmi (PNG)
                </button>
              </div>
            ) : (
              <>
                {/* Rekening Tujuan & QRIS */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <p className="text-xs font-bold text-slate-800">
                    Transfer ke Rekening Resmi Kos:
                  </p>
                  <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900">
                        Bank {invoice.bankName} —{' '}
                        <span className="font-mono text-sm">
                          {invoice.bankAccountNumber || 'Hubungi Pengelola'}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        a.n. {invoice.bankAccountHolder}
                      </p>
                    </div>
                    {invoice.bankAccountNumber && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(invoice.bankAccountNumber);
                          setCopiedBank(true);
                          setTimeout(() => setCopiedBank(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-800 shrink-0 whitespace-nowrap transition"
                      >
                        {copiedBank ? 'Tersalin!' : 'Salin Rekening'}
                      </button>
                    )}
                  </div>

                  {invoice.qrisImageUrl && (
                    <div className="text-center space-y-1.5 pt-2">
                      <p className="text-xs font-semibold text-slate-700">
                        Atau Pindai Kode QRIS Kos:
                      </p>
                      <img
                        src={invoice.qrisImageUrl}
                        alt="QRIS Kos"
                        width={200}
                        height={200}
                        className="w-44 h-44 object-contain mx-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xs"
                      />
                    </div>
                  )}
                </div>

                {/* Form Upload Bukti Transfer */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">
                      Upload Bukti Pembayaran
                    </h3>
                    {isWaiting && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-900">
                        Sedang diverifikasi
                      </span>
                    )}
                  </div>

                  {uploadSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-100 text-emerald-950 text-xs font-medium">
                      {uploadSuccess}
                    </div>
                  )}

                  {invoice.paymentProofUrl && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-600">
                        Bukti transfer terkirim:
                      </p>
                      <img
                        src={invoice.paymentProofUrl}
                        alt="Bukti Transfer"
                        width={300}
                        height={200}
                        className="w-full max-h-52 object-contain rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tenantNote}
                      onChange={(e) => setTenantNote(e.target.value)}
                      placeholder="Catatan transfer (contoh: Dari BCA an Budi)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white focus:outline-none"
                    />
                    <label className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white py-3 px-4 text-xs font-bold cursor-pointer transition text-center shadow-sm">
                      <span>
                        {uploading
                          ? 'Mengompresi & Mengunggah...'
                          : invoice.paymentProofUrl
                          ? 'Ganti Foto Bukti Transfer'
                          : 'Pilih / Ambil Foto Bukti Transfer'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        onChange={handleUploadProof}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200/80 text-center text-xs text-slate-500">
            Dikelola secara digital dengan <strong>OpenHouse</strong> •{' '}
            <span className="font-mono">openhouse.my.id</span>
          </div>
        </div>
      </div>
    </div>
  );
}
