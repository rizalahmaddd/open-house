export interface ReceiptData {
  invoiceNumber: string;
  propertyName: string;
  propertyAddress: string;
  tenantName: string;
  tenantKampus?: string;
  roomNumber: string;
  roomTypeName?: string;
  periodStart: string;
  periodEnd: string;
  paidAt: string | null;
  baseAmount: number;
  additionalItems: Array<{ label: string; amount: number }>;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes?: string;
}

function formatRp(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function downloadReceiptAsPng(data: ReceiptData) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 620;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#fafaf9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Border
  ctx.strokeStyle = '#065f46';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // Header Banner
  ctx.fillStyle = '#065f46';
  ctx.fillRect(20, 20, canvas.width - 40, 95);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(data.propertyName.toUpperCase(), 48, 62);

  ctx.fillStyle = '#d1fae5';
  ctx.font = '14px sans-serif';
  ctx.fillText(data.propertyAddress || 'Indonesia', 48, 90);

  // Right Header: KWITANSI RESMI
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('KWITANSI PEMBAYARAN KOS', canvas.width - 48, 60);
  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`No: ${data.invoiceNumber}`, canvas.width - 48, 88);
  ctx.textAlign = 'left';

  // Content Info
  let y = 155;
  ctx.fillStyle = '#44403c';
  ctx.font = '15px sans-serif';
  ctx.fillText('Telah diterima dari:', 48, y);
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(
    `${data.tenantName} (${data.tenantKampus || 'Penghuni Kos'})`,
    230,
    y
  );

  y += 34;
  ctx.fillStyle = '#44403c';
  ctx.font = '15px sans-serif';
  ctx.fillText('Unit Kamar:', 48, y);
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(
    `Kamar ${data.roomNumber} — ${data.roomTypeName || 'Reguler'}`,
    230,
    y
  );

  y += 34;
  ctx.fillStyle = '#44403c';
  ctx.font = '15px sans-serif';
  ctx.fillText('Periode Sewa:', 48, y);
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${data.periodStart}  s/d  ${data.periodEnd}`, 230, y);

  // Divider
  y += 26;
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(48, y);
  ctx.lineTo(canvas.width - 48, y);
  ctx.stroke();

  // Breakdown Table
  y += 32;
  ctx.fillStyle = '#1c1917';
  ctx.font = '15px sans-serif';
  ctx.fillText('Sewa Kamar Pokok', 48, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(formatRp(data.baseAmount), canvas.width - 48, y);
  ctx.textAlign = 'left';

  for (const item of data.additionalItems) {
    y += 28;
    ctx.fillStyle = '#44403c';
    ctx.font = '15px sans-serif';
    ctx.fillText(`+ ${item.label}`, 48, y);
    ctx.textAlign = 'right';
    ctx.fillText(formatRp(Number(item.amount)), canvas.width - 48, y);
    ctx.textAlign = 'left';
  }

  if (data.discountAmount > 0) {
    y += 28;
    ctx.fillStyle = '#047857';
    ctx.font = '15px sans-serif';
    ctx.fillText('Potongan Diskon', 48, y);
    ctx.textAlign = 'right';
    ctx.fillText(`- ${formatRp(data.discountAmount)}`, canvas.width - 48, y);
    ctx.textAlign = 'left';
  }

  // Total Box
  y += 26;
  ctx.fillStyle = '#ecfdf5';
  ctx.fillRect(48, y, canvas.width - 96, 56);
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(48, y, canvas.width - 96, 56);

  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('TOTAL DIBAYAR', 68, y + 35);
  ctx.textAlign = 'right';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(formatRp(data.paidAmount || data.totalAmount), canvas.width - 68, y + 36);
  ctx.textAlign = 'left';

  // Stamp & Footer
  const footerY = 530;
  ctx.fillStyle = '#57534e';
  ctx.font = '14px sans-serif';
  ctx.fillText(
    `Catatan: ${data.notes || 'Pembayaran sewa kos sah & terverifikasi.'}`,
    48,
    footerY
  );
  ctx.fillText(
    `Tanggal Bayar: ${(data.paidAt || new Date().toISOString()).slice(0, 10)}`,
    48,
    footerY + 26
  );

  // Official Stamp Box
  ctx.save();
  ctx.translate(canvas.width - 240, footerY - 15);
  ctx.rotate(-0.06);
  ctx.strokeStyle = data.status === 'paid' ? '#047857' : '#d97706';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 185, 58);
  ctx.fillStyle = data.status === 'paid' ? '#047857' : '#d97706';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(
    data.status === 'paid' ? 'LUNAS SAH' : 'BELUM LUNAS',
    34,
    30
  );
  ctx.font = '11px sans-serif';
  ctx.fillText('OPENHOUSE • OPENHOUSE.MY.ID', 14, 47);
  ctx.restore();

  const link = document.createElement('a');
  const safeNum = data.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '-');
  link.download = `Kwitansi-${safeNum}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
