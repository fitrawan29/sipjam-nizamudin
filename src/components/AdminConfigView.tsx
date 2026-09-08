'use client';

export default function AdminConfigView({ user }: { user: any }) {
  return (
    <section id="view-admin-config" className="view-section fade-in">
        <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-gears text-gray-500"></i> Konfigurasi
            </h2>
            <form className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 ml-1">TAHUN AJARAN</label>
                      <input type="text" required className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white" defaultValue="2024/2025" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 ml-1">SEMESTER</label>
                      <select required className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white">
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                    <h3 className="text-[10px] font-bold text-gray-400 mb-3 uppercase flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> Waktu Efektif</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-1">Mulai Sem.</label><input type="date" required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white" /></div>
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-1">Akhir Sem.</label><input type="date" required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white" /></div>
                    </div>
                    <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-1">Hari Sekolah / Minggu</label><select required className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white"><option value="6">6 Hari (Senin - Sabtu)</option><option value="5">5 Hari (Senin - Jumat)</option></select></div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4">
                    <h3 className="text-[10px] font-bold text-blue-800 dark:text-blue-500 mb-3 uppercase flex items-center gap-1.5"><i className="fa-solid fa-print"></i> Pengaturan Kop Surat</h3>
                    <div className="space-y-2.5">
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Nama Yayasan</label><input type="text" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-bold bg-white dark:bg-gray-800 dark:text-white" placeholder="Contoh: YAYASAN NIZAMUDIN" /></div>
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Nama Sekolah</label><input type="text" required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-bold bg-white dark:bg-gray-800 dark:text-white" /></div>
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Alamat Lengkap</label><input type="text" required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" /></div>
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">NPSN</label><input type="text" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" placeholder="Nomor Pokok Sekolah Nasional" /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Logo Kiri (Dinas)</label>
                                <input type="text" required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" placeholder="Link Hosting JPEG/PNG Logo Kiri" />
                            </div>
                            <div>
                                <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Logo Kanan (Sekolah)</label>
                                <input type="text" required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" placeholder="Link Hosting JPEG/PNG Logo Kanan" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                    <h3 className="text-[10px] font-bold text-gray-400 mb-3 uppercase flex items-center gap-1.5"><i className="fa-solid fa-signature"></i> Tanda Tangan Laporan</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Nama Kepala Sekolah</label>
                            <input type="text" id="cfg-kepsek" required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">NIP Kepala Sekolah</label>
                            <input type="text" id="cfg-nip" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" placeholder="Kosongkan jika tidak ada" />
                        </div>
                    </div>
                </div>
                <button type="submit" className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-900/20 text-sm flex justify-center items-center gap-2 mt-4 transition"><i className="fa-solid fa-save"></i> Simpan Konfigurasi</button>
            </form>
        </div>
    </section>
  );
}
