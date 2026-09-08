'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';

export default function DokumenView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('list');
  const [judul, setJudul] = useState('');
  const [jenis, setJenis] = useState('');

  const submitDokumen = (e: React.FormEvent) => {
    e.preventDefault();
    Swal.fire('Info', 'Fitur upload sedang dalam pengembangan pada versi Next.js', 'info');
  };

  return (
    <section id="view-dokumen" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-folder-open text-amber-500"></i> Perangkat Pembelajaran
                </h2>
                <button type="button" className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1">
                <button 
                  type="button" 
                  onClick={() => setActiveTab('list')} 
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 shadow-sm border ${activeTab === 'list' ? 'bg-green-50 text-nizamudin-green border-nizamudin-green dark:bg-green-900/20 dark:text-nizamudin-gold dark:border-nizamudin-gold' : 'border-gray-200 text-gray-500 dark:text-gray-400 dark:border-gray-700'}`}
                >
                  Daftar Dokumen
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveTab('upload')} 
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 border ${activeTab === 'upload' ? 'bg-green-50 text-nizamudin-green border-nizamudin-green dark:bg-green-900/20 dark:text-nizamudin-gold dark:border-nizamudin-gold' : 'border-gray-200 text-gray-500 dark:text-gray-400 dark:border-gray-700'}`}
                >
                  Upload Baru
                </button>
            </div>
            
            {activeTab === 'list' && (
              <div id="dokumen-content-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
                <div className="col-span-full text-center py-10 text-gray-400 text-xs italic dark:text-gray-500">Belum ada dokumen.</div>
              </div>
            )}

            {activeTab === 'upload' && (
              <div id="dokumen-content-upload" className="fade-in">
                  <form onSubmit={submitDokumen} className="space-y-4">
                      <div>
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Jenis Dokumen</label>
                          <select required value={jenis} onChange={e => setJenis(e.target.value)} className="w-full px-3 py-3 text-sm rounded-xl input-premium">
                              <option value="" disabled>Pilih Jenis...</option>
                              <option value="Analisis Capaian Pembelajaran">Analisis Capaian Pembelajaran</option>
                              <option value="Alur Tujuan Pembelajaran">Alur Tujuan Pembelajaran</option>
                              <option value="Rencana Pekan Efektif">Rencana Pekan Efektif</option>
                              <option value="Program Tahunan">Program Tahunan</option>
                              <option value="Program Semester">Program Semester</option>
                              <option value="Rencana Pembelajaran Mendalam">Rencana Pembelajaran Mendalam</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Judul / Deskripsi</label>
                          <input type="text" required value={judul} onChange={e => setJudul(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl input-premium" placeholder="Contoh: Modul Ajar Bab 1 Kelas X" />
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 text-red-500"><i className="fa-solid fa-asterisk"></i> File PDF/Gambar (Bisa lebih dari 1)</label>
                          <input type="file" required multiple accept=".pdf,image/*" className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800" />
                      </div>
                      <div className="pt-2">
                          <button type="submit" className="btn-click w-full bg-amber-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-amber-900/20 text-sm flex items-center justify-center gap-2 hover:bg-amber-700 transition">
                            <i className="fa-solid fa-cloud-arrow-up"></i> Upload
                          </button>
                      </div>
                  </form>
              </div>
            )}
        </div>
    </section>
  );
}
