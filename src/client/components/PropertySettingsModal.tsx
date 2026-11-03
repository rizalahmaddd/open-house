import React, { useState } from 'react';
import { Upload, X, QrCode } from 'lucide-react';
import { uploadFileToR2 } from '../utils/image';

export interface PropertyRecord {
  id: string;
  name: string;
  slug: string;
  areaMalang: string;
  address: string;
  genderType: 'putra' | 'putri' | 'campur';
  rulesText?: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  qrisImageUrl?: string | null;
}

interface Props {
  property: PropertyRecord;
  malangAreas: string[];
  token: string | null;
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotifySuccess: (msg: string) => void;
  onNotifyError: (msg: string) => void;
}

export default function PropertySettingsModal({
  property,
  malangAreas,
  token,
  apiFetch,
  onClose,
  onSaved,
  onNotifySuccess,
  onNotifyError,
}: Props) {
  const [name, setName] = useState(property.name);
  const [areaMalang, setAreaMalang] = useState(property.areaMalang);
  const [address, setAddress] = useState(property.address);
  const [genderType, setGenderType] = useState<'putra' | 'putri' | 'campur'>(
    property.genderType
  );
  const [rulesText, setRulesText] = useState(property.rulesText || '');
  const [bankName, setBankName] = useState(property.bankName || 'BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState(
    property.bankAccountNumber || ''
  );
  const [bankAccountHolder, setBankAccountHolder] = useState(
    property.bankAccountHolder || ''
  );
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(
    property.qrisImageUrl || null
  );
  const [uploadingQris, setUploadingQris] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleQrisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQris(true);
    try {
      const up = await uploadFileToR2(file, 'qris', token);
      setQrisImageUrl(up.url);
      onNotifySuccess('Foto QRIS pembayaran berhasil disimpan!');
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setUploadingQris(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/properties/${property.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          areaMalang,
          address,
          genderType,
          rulesText,
          bankName,
          bankAccountNumber,
          bankAccountHolder,
          qrisImageUrl,
        }),
      });
      onNotifySuccess(`Pengaturan "${name}" & Rekening/QRIS berhasil disimpan!`);
      await onSaved();
      onClose();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-xl w-full p-5 sm:p-6 border border-slate-200/90 max-h-[92vh] overflow-y-auto space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Pengaturan Properti Kos, Rekening & QRIS
            </h3>
            <p className="text-xs text-slate-500">
              Informasi rekening & QRIS akan ditampilkan pada halaman tagihan penghuni
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nama Properti Kos
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Kategori Kos
              </label>
              <select
                value={genderType}
                onChange={(e) =>
                  setGenderType(e.target.value as 'putra' | 'putri' | 'campur')
                }
                className="w-full rounded-lg border border-stone-300 pl-3 pr-10 py-2 text-sm bg-white"
              >
                <option value="putra">Kos Putra</option>
                <option value="putri">Kos Putri</option>
                <option value="campur">Kos Campur / Pasutri</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Kota / Kawasan Lokasi Kos
            </label>
            <input
              type="text"
              list="openhouse-areas-list"
              required
              value={areaMalang}
              onChange={(e) => setAreaMalang(e.target.value)}
              placeholder="Contoh: Jakarta Selatan - Setiabudi / Bandung - Dago / Yogyakarta"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
            />
            <datalist id="openhouse-areas-list">
              {malangAreas.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Alamat Lengkap Kos
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tata Tertib / Peraturan Utama Kos
            </label>
            <textarea
              rows={2}
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          {/* Info Rekening & Upload Foto QRIS */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-800" />
              Rekening Tujuan Transfer & Foto QRIS Pembayaran
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Bank
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="BCA / Mandiri / BRI / BSI"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="8160xxxxxx"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Atas Nama Rekening
                </label>
                <input
                  type="text"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  placeholder="Nama Pemilik Rekening"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-stone-700">
                Foto / Barcode QRIS Pembayaran (Opsional)
              </label>
              {qrisImageUrl && (
                <div className="flex items-center gap-3">
                  <img
                    src={qrisImageUrl}
                    alt="QRIS Kos"
                    width={120}
                    height={120}
                    className="w-28 h-28 object-contain rounded-lg border border-stone-300 bg-white p-1"
                  />
                  <button
                    type="button"
                    onClick={() => setQrisImageUrl(null)}
                    className="text-xs text-red-700 font-semibold hover:underline"
                  >
                    Hapus QRIS
                  </button>
                </div>
              )}
              <label className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-emerald-700 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>
                  {uploadingQris
                    ? 'Mengunggah foto QRIS...'
                    : qrisImageUrl
                    ? 'Ganti Foto QRIS'
                    : 'Unggah Foto QRIS Pembayaran'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrisUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || uploadingQris}
              className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan Kos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
