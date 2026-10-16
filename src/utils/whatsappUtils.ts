import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';

/**
 * Normalizes Indonesian phone numbers into pure international format without '+' or non-digit chars.
 * Handles inputs like '08...', '+62...', '62...', '8...', spaces, dashes, parens.
 * Returns '628...' or null if invalid / missing / less than 9 digits.
 */
export function normalizeIndonesianPhoneNumber(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('08')) {
    digits = '62' + digits.slice(1);
  } else if (digits.startsWith('8')) {
    digits = '62' + digits;
  } else if (digits.startsWith('6208')) {
    digits = '628' + digits.slice(4);
  }

  if (!digits.startsWith('628')) {
    return null;
  }

  // Indonesian cellular numbers: 628 + 7 to 12 digits (10 to 15 digits total)
  if (digits.length < 10 || digits.length > 16) {
    return null;
  }

  return digits;
}

/**
 * Formats a polite, clear Indonesian attendance notification message for parents.
 */
export function formatWhatsAppAttendanceMessage(params: {
  studentName: string;
  kelas: string;
  tanggal: string;
  status: string;
  schoolName?: string;
  note?: string;
  timeStr?: string;
}): string {
  const studentName = params.studentName?.trim() || 'Siswa';
  const kelas = params.kelas?.trim() || '-';
  const school = params.schoolName?.trim() || 'Sekolah';
  const tanggal = params.tanggal?.trim() || new Date().toISOString().slice(0, 10);
  const status = params.status?.trim() || 'Tercatat';

  const lines: string[] = [
    `Yth. Bapak/Ibu Orang Tua/Wali dari *${studentName}* (${kelas}),`,
    '',
    `Kami dari *${school}* menginformasikan status presensi putra/putri Bapak/Ibu:`,
    `📅 Tanggal: ${tanggal}`
  ];

  if (params.timeStr?.trim()) {
    lines.push(`⏰ Waktu: ${params.timeStr.trim()}`);
  }

  lines.push(`📌 Status Kehadiran: *${status}*`);

  if (params.note?.trim()) {
    lines.push(`📝 Catatan: ${params.note.trim()}`);
  }

  lines.push('');
  lines.push('Pesan ini disampaikan secara otomatis untuk pemantauan kehadiran putra/putri Anda di sekolah. Terima kasih atas perhatian dan kerja sama Bapak/Ibu.');

  return lines.join('\n');
}

/**
 * Generates native WhatsApp direct URL (https://wa.me/...) with URL-encoded attendance message.
 */
export function generateParentWhatsAppUrl(params: {
  phone: string;
  studentName: string;
  kelas: string;
  tanggal: string;
  status: string;
  schoolName?: string;
  note?: string;
  timeStr?: string;
}): string {
  const normalized = normalizeIndonesianPhoneNumber(params.phone) || params.phone.replace(/\D/g, '');
  const message = formatWhatsAppAttendanceMessage({
    studentName: params.studentName,
    kelas: params.kelas,
    tanggal: params.tanggal,
    status: params.status,
    schoolName: params.schoolName,
    note: params.note,
    timeStr: params.timeStr,
  });
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/**
 * Triggers WhatsApp 1-click notification to parent.
 * If parent phone is valid, opens WhatsApp web / app directly.
 * If phone is missing/invalid, presents a SweetAlert modal allowing manual phone input or clipboard copy.
 */
export async function triggerParentWhatsApp(
  student: { nama_siswa?: string; nama?: string; kelas?: string; no_hp_ortu?: string | null },
  attendance: { status: string; tanggal: string; timeStr?: string; note?: string },
  schoolName?: string
): Promise<void> {
  const studentName = student.nama_siswa || student.nama || 'Siswa';
  const kelas = student.kelas || '-';
  const normalizedPhone = normalizeIndonesianPhoneNumber(student.no_hp_ortu);

  const message = formatWhatsAppAttendanceMessage({
    studentName,
    kelas,
    tanggal: attendance.tanggal,
    status: attendance.status,
    schoolName,
    note: attendance.note,
    timeStr: attendance.timeStr,
  });

  if (normalizedPhone) {
    const url = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
    return;
  }

  if (typeof window === 'undefined') return;

  const result = await Swal.fire({
    title: 'No. HP Orang Tua Belum Terdaftar',
    html: `
      <div class="text-left space-y-2 text-xs text-gray-700">
        <p>Nomor WhatsApp orang tua/wali untuk <b>${studentName}</b> (${kelas}) belum terdaftar atau tidak valid.</p>
        <p class="text-gray-500">Anda dapat memasukkan nomor sementara untuk membuka WhatsApp sekarang, atau menyalin isi pesan ke clipboard:</p>
        <div class="mt-3">
          <label class="block font-semibold mb-1 text-gray-800">Nomor WhatsApp Sementara:</label>
          <input id="swal-parent-phone" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 081234567890" />
        </div>
      </div>
    `,
    icon: 'info',
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: '<i class="fa-brands fa-whatsapp mr-1"></i> Buka WhatsApp',
    denyButtonText: '<i class="fa-solid fa-copy mr-1"></i> Salin Pesan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#25D366',
    denyButtonColor: '#0d9488',
    preConfirm: () => {
      const input = document.getElementById('swal-parent-phone') as HTMLInputElement | null;
      return input?.value?.trim() || '';
    }
  });

  if (result.isConfirmed) {
    const manualPhone = result.value;
    const validManualPhone = normalizeIndonesianPhoneNumber(manualPhone);
    if (validManualPhone) {
      const url = `https://wa.me/${validManualPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      await Swal.fire({
        icon: 'warning',
        title: 'Nomor Tidak Valid',
        text: 'Format nomor telepon tidak dikenali. Gunakan format seperti 081234567890.',
        confirmButtonColor: '#0d9488'
      });
    }
  } else if (result.isDenied) {
    try {
      await navigator.clipboard.writeText(message);
      showToast('Pesan berhasil disalin ke clipboard!', '', 'success');
    } catch {
      showToast('Gagal menyalin pesan', '', 'error');
    }
  }
}
