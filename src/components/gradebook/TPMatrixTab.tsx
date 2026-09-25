import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { TujuanPembelajaran, AsesmenKolom, NilaiSiswa } from '@/types/database';

export default function TPMatrixTab(props: any) {
    const {
        user,
        isAdmin,
        sekolahId,
        setSekolahId,
        isGuruPengampu,
        setIsGuruPengampu,
        syncedTahunAjaran,
        setSyncedTahunAjaran,
        syncedSemester,
        setSyncedSemester,
        selectedGuru,
        setSelectedGuru,
        selectedMapel,
        setSelectedMapel,
        selectedKelas,
        setSelectedKelas,
        selectedSemester,
        setSelectedSemester,
        selectedTahunAjaran,
        setSelectedTahunAjaran,
        studentSearch,
        setStudentSearch,
        activeTab,
        setActiveTab,
        teachersList,
        setTeachersList,
        mapelList,
        setMapelList,
        kelasList,
        setKelasList,
        students,
        setStudents,
        tpList,
        setTpList,
        selectedTpId,
        setSelectedTpId,
        columnsList,
        setColumnsList,
        allSemesterColumns,
        setAllSemesterColumns,
        gradesMap,
        setGradesMap,
        dirtyGrades,
        setDirtyGrades,
        isLoadingMaster,
        setIsLoadingMaster,
        isLoadingTP,
        setIsLoadingTP,
        isLoadingGrades,
        setIsLoadingGrades,
        isSaving,
        setIsSaving,
        isTpModalOpen,
        setIsTpModalOpen,
        editingTp,
        setEditingTp,
        tpForm,
        setTpForm,
        isColModalOpen,
        setIsColModalOpen,
        editingCol,
        setEditingCol,
        colForm,
        setColForm,
        isBulkFillModalOpen,
        setIsBulkFillModalOpen,
        bulkFillColId,
        setBulkFillColId,
        bulkFillValue,
        setBulkFillValue,
        bulkFillOnlyEmpty,
        setBulkFillOnlyEmpty,
        orientation,
        setOrientation,
        currentTP,
        diagnostikCol,
        formatifCols,
        sumatifCols,
        handleGradeChange,
        handleSaveGrades,
        handleOpenAddTpModal,
        handleOpenEditTpModal,
        handleSaveTp,
        handleDeleteTp,
        handleOpenAddColModal,
        handleOpenEditColModal,
        handleSaveCol,
        handleDeleteCol,
        handleOpenBulkFillModal,
        handleApplyBulkFill,
        getGradeColor,
        calculateRataRata,
        calculateNilaiRaporTP,
        unsavedCount,
        generateExcel,
        handleOpenBulkFill,
        handleExecuteBulkFill,
        getSemesterRataRata,
        getSemesterRaporSiswa,
        calculateSemesterStats,
        chartData
    } = props;

    return (
        <>

        <div className="space-y-4">
          {/* TP Selector Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 no-print">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  Tujuan Pembelajaran:
                </span>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-lg">
                  {tpList.length} TP Tersedia
                </span>
              </div>
              {!isAdmin && isGuruPengampu && (
                <button
                  type="button"
                  onClick={handleOpenAddTpModal}
                  className="btn-click bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-plus text-xs"></i> Tambah TP Baru
                </button>
              )}
            </div>

            {/* Horizontal TP Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scroll">
              {tpList.length === 0 ? (
                <div className="text-xs italic text-gray-400 dark:text-gray-500 py-2">
                  Belum ada Tujuan Pembelajaran (TP) untuk mata pelajaran dan kelas ini. Klik "Tambah TP Baru".
                </div>
              ) : (
                tpList.map(tp => (
                  <div
                    key={tp.id}
                    onClick={() => setSelectedTpId(tp.id)}
                    className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition shrink-0 ${
                      selectedTpId === tp.id
                        ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-700 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span>{tp.kode_tp}</span>
                    <span className="font-normal text-[11px] max-w-[140px] truncate text-gray-500 dark:text-gray-400">
                      {tp.deskripsi}
                    </span>
                    {selectedTpId === tp.id && !isAdmin && isGuruPengampu && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTpModal(tp);
                          }}
                          className="w-5 h-5 rounded-md hover:bg-teal-100 dark:hover:bg-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300"
                          title="Edit TP"
                        >
                          <i className="fa-solid fa-pen text-[10px]"></i>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTp(tp);
                          }}
                          className="w-5 h-5 rounded-md hover:bg-red-100 dark:hover:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400"
                          title="Hapus TP"
                        >
                          <i className="fa-solid fa-trash text-[10px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Active TP Description Banner */}
            {currentTP && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/60 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span className="font-black text-gray-900 dark:text-white mr-2">
                    {currentTP.kode_tp}:
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {currentTP.deskripsi}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    Urutan #{currentTP.urutan}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Assessment Columns Toolbar & Student Search */}
          {currentTP && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 no-print flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  Kelola Kolom:
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <i className="fa-solid fa-check text-[10px]"></i> 1 Diagnostik (Wajib)
                </span>
                {!isAdmin && isGuruPengampu && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenAddColModal('Formatif')}
                      className="btn-click px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i> + Kolom Formatif
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddColModal('Sumatif')}
                      className="btn-click px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i> + Kolom Sumatif
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenBulkFill()}
                      className="btn-click px-3 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-bolt text-[10px]"></i> Isi Nilai Cepat
                    </button>
                  </>
                )}
              </div>

              <div className="w-full md:w-64">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Cari nama atau NISN..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SPREADSHEET MATRIX TABLE */}
          {!currentTP ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 mx-auto rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl mb-3">
                <i className="fa-solid fa-book-bookmark"></i>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Belum Ada Tujuan Pembelajaran Terpilih
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                Silakan buat Tujuan Pembelajaran (TP) terlebih dahulu untuk memulai pengisian asesmen Diagnostik, Formatif, dan Sumatif.
              </p>
              {!isAdmin && isGuruPengampu && (
                <button
                  type="button"
                  onClick={handleOpenAddTpModal}
                  className="btn-click bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-2"
                >
                  <i className="fa-solid fa-plus"></i> Tambah TP Sekarang
                </button>
              )}
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <i className="fa-solid fa-users-slash text-3xl text-gray-400 mb-2"></i>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tidak ada data siswa ditemukan untuk kelas <strong>{selectedKelas}</strong>.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden print:overflow-visible print:max-h-none print:border-none print:shadow-none">
              <div className="overflow-x-auto max-h-[600px] custom-scroll relative print:overflow-visible print:max-h-none">
                <table className="w-full text-left text-xs border-collapse">
                  {/* Table Header */}
                  <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                    {/* Upper Category Row */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-[11px] font-black uppercase tracking-wider">
                      <th colSpan={4} className="py-2.5 px-3 border-r border-gray-200 dark:border-gray-700 text-center bg-gray-100/70 dark:bg-gray-800/80">
                        Identitas Siswa
                      </th>
                      <th className="py-2.5 px-3 border-r border-gray-200 dark:border-gray-700 text-center bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                        Diagnostik (Baseline)
                      </th>
                      <th
                        colSpan={Math.max(formatifCols.length, 1)}
                        className="py-2.5 px-3 border-r border-gray-200 dark:border-gray-700 text-center bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                      >
                        Asesmen Formatif (Proses)
                      </th>
                      <th
                        colSpan={Math.max(sumatifCols.length, 1)}
                        className="py-2.5 px-3 border-r border-gray-200 dark:border-gray-700 text-center bg-purple-50/70 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300"
                      >
                        Asesmen Sumatif (Lingkup Materi)
                      </th>
                      <th colSpan={4} className="py-2.5 px-3 text-center bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                        Kalkulasi Kurikulum Merdeka
                      </th>
                    </tr>

                    {/* Column Headers */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200 text-[11px]">
                      <th className="py-2 px-2.5 w-10 text-center">#</th>
                      <th className="py-2 px-2.5 w-24">NISN</th>
                      <th className="py-2 px-3 min-w-[180px]">Nama Siswa</th>
                      <th className="py-2 px-2 w-12 text-center border-r border-gray-200 dark:border-gray-700">L/P</th>

                      {/* Diagnostik Column */}
                      {diagnostikCol && (
                        <th className="py-2 px-2 w-28 text-center bg-blue-50/30 dark:bg-blue-950/20 border-r border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-center gap-1">
                            <span>{diagnostikCol.nama}</span>
                            <span className="text-[9px] px-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded">
                              1x
                            </span>
                          </div>
                        </th>
                      )}

                      {/* Formatif Columns */}
                      {formatifCols.length === 0 ? (
                        <th className="py-2 px-3 w-28 text-center italic text-gray-400 border-r border-gray-200 dark:border-gray-700">
                          Belum ada formatif
                        </th>
                      ) : (
                        formatifCols.map(col => (
                          <th
                            key={col.id}
                            className="py-2 px-2 w-28 text-center bg-emerald-50/30 dark:bg-emerald-950/20 border-r border-gray-200 dark:border-gray-700 group"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="truncate max-w-[70px]">{col.nama}</span>
                              {!isAdmin && isGuruPengampu && (
                                <div className="flex items-center gap-0.5 no-print">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditColModal(col)}
                                    className="w-4 h-4 rounded text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                    title="Ubah Nama/Bobot"
                                  >
                                    <i className="fa-solid fa-pen text-[9px]"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCol(col)}
                                    className="w-4 h-4 rounded text-red-400 hover:text-red-600"
                                    title="Hapus Kolom"
                                  >
                                    <i className="fa-solid fa-trash text-[9px]"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                        ))
                      )}

                      {/* Sumatif Columns */}
                      {sumatifCols.length === 0 ? (
                        <th className="py-2 px-3 w-28 text-center italic text-gray-400 border-r border-gray-200 dark:border-gray-700">
                          Belum ada sumatif
                        </th>
                      ) : (
                        sumatifCols.map(col => (
                          <th
                            key={col.id}
                            className="py-2 px-2 w-28 text-center bg-purple-50/30 dark:bg-purple-950/20 border-r border-gray-200 dark:border-gray-700 group"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="truncate max-w-[70px]">{col.nama}</span>
                              {!isAdmin && isGuruPengampu && (
                                <div className="flex items-center gap-0.5 no-print">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditColModal(col)}
                                    className="w-4 h-4 rounded text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                    title="Ubah Nama/Bobot"
                                  >
                                    <i className="fa-solid fa-pen text-[9px]"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCol(col)}
                                    className="w-4 h-4 rounded text-red-400 hover:text-red-600"
                                    title="Hapus Kolom"
                                  >
                                    <i className="fa-solid fa-trash text-[9px]"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                        ))
                      )}

                      {/* Summary Columns */}
                      <th className="py-2 px-2 w-24 text-center bg-amber-50/30 dark:bg-amber-950/20">Rata Formatif</th>
                      <th className="py-2 px-2 w-24 text-center bg-amber-50/30 dark:bg-amber-950/20">Rata Sumatif</th>
                      <th className="py-2 px-2 w-28 text-center font-black bg-amber-100/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
                        Nilai Akhir TP
                      </th>
                      <th className="py-2 px-2.5 w-32 text-center">Predikat</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredStudents.map((student, idx) => {
                      const stats = calculateStudentTpStats(student.nisn);
                      const sGrades = gradesMap[student.nisn] || {};

                      return (
                        <tr
                          key={student.nisn}
                          className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          {/* Student Info */}
                          <td className="py-2 px-2.5 text-center text-gray-500 font-medium">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                            {student.nisn}
                          </td>
                          <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">
                            {student.nama_siswa}
                          </td>
                          <td className="py-2 px-2 text-center text-gray-500 border-r border-gray-200 dark:border-gray-700">
                            {student.gender || '-'}
                          </td>

                          {/* Diagnostik Cell */}
                          {diagnostikCol && (
                            <td className="p-1 text-center bg-blue-50/10 dark:bg-blue-950/10 border-r border-gray-200 dark:border-gray-700">
                              {isAdmin || !isGuruPengampu ? (
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {sGrades[diagnostikCol.id] ?? '-'}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={sGrades[diagnostikCol.id] ?? ''}
                                  onChange={e => handleGradeChange(student.nisn, diagnostikCol.id, e.target.value)}
                                  placeholder="-"
                                  className={`w-16 mx-auto text-center py-1 px-1 rounded-lg border text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    dirtyGrades[`${student.nisn}_${diagnostikCol.id}`]
                                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                                  }`}
                                />
                              )}
                            </td>
                          )}

                          {/* Formatif Cells */}
                          {formatifCols.map(col => {
                            const isDirty = dirtyGrades[`${student.nisn}_${col.id}`];
                            return (
                              <td
                                key={col.id}
                                className="p-1 text-center bg-emerald-50/10 dark:bg-emerald-950/10 border-r border-gray-200 dark:border-gray-700"
                              >
                                {isAdmin || !isGuruPengampu ? (
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {sGrades[col.id] ?? '-'}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={sGrades[col.id] ?? ''}
                                    onChange={e => handleGradeChange(student.nisn, col.id, e.target.value)}
                                    placeholder="-"
                                    className={`w-16 mx-auto text-center py-1 px-1 rounded-lg border text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                      isDirty
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                                    }`}
                                  />
                                )}
                              </td>
                            );
                          })}

                          {/* Sumatif Cells */}
                          {sumatifCols.map(col => {
                            const isDirty = dirtyGrades[`${student.nisn}_${col.id}`];
                            return (
                              <td
                                key={col.id}
                                className="p-1 text-center bg-purple-50/10 dark:bg-purple-950/10 border-r border-gray-200 dark:border-gray-700"
                              >
                                {isAdmin || !isGuruPengampu ? (
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {sGrades[col.id] ?? '-'}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={sGrades[col.id] ?? ''}
                                    onChange={e => handleGradeChange(student.nisn, col.id, e.target.value)}
                                    placeholder="-"
                                    className={`w-16 mx-auto text-center py-1 px-1 rounded-lg border text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                      isDirty
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                                    }`}
                                  />
                                )}
                              </td>
                            );
                          })}

                          {/* Calculated Summary Cells */}
                          <td className="py-2 px-2 text-center font-bold text-gray-700 dark:text-gray-300">
                            {stats.avgFormatif !== null ? stats.avgFormatif : '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-gray-700 dark:text-gray-300">
                            {stats.avgSumatif !== null ? stats.avgSumatif : '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-black text-sm bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                            {stats.nilaiAkhir !== null ? stats.nilaiAkhir : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            {stats.predikat !== '-' ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${stats.predikatClass}`}>
                                {stats.predikat}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer: Class Average */}
                  <tfoot className="bg-gray-100/90 dark:bg-gray-900 font-extrabold border-t-2 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right border-r border-gray-200 dark:border-gray-700">
                        Rata-rata Kelas:
                      </td>
                      {diagnostikCol && (
                        <td className="py-2.5 px-2 text-center text-blue-700 dark:text-blue-300 border-r border-gray-200 dark:border-gray-700">
                          {(() => {
                            let sum = 0, c = 0;
                            students.forEach(s => {
                              const v = gradesMap[s.nisn]?.[diagnostikCol.id];
                              if (v !== null && v !== undefined && !isNaN(v)) { sum += v; c++; }
                            });
                            return c > 0 ? (sum / c).toFixed(1) : '-';
                          })()}
                        </td>
                      )}
                      {formatifCols.map(col => (
                        <td key={col.id} className="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-300 border-r border-gray-200 dark:border-gray-700">
                          {(() => {
                            let sum = 0, c = 0;
                            students.forEach(s => {
                              const v = gradesMap[s.nisn]?.[col.id];
                              if (v !== null && v !== undefined && !isNaN(v)) { sum += v; c++; }
                            });
                            return c > 0 ? (sum / c).toFixed(1) : '-';
                          })()}
                        </td>
                      ))}
                      {sumatifCols.map(col => (
                        <td key={col.id} className="py-2.5 px-2 text-center text-purple-700 dark:text-purple-300 border-r border-gray-200 dark:border-gray-700">
                          {(() => {
                            let sum = 0, c = 0;
                            students.forEach(s => {
                              const v = gradesMap[s.nisn]?.[col.id];
                              if (v !== null && v !== undefined && !isNaN(v)) { sum += v; c++; }
                            });
                            return c > 0 ? (sum / c).toFixed(1) : '-';
                          })()}
                        </td>
                      ))}
                      <td className="py-2.5 px-2 text-center text-gray-700 dark:text-gray-300">
                        {(() => {
                          let sum = 0, c = 0;
                          students.forEach(s => {
                            const stats = calculateStudentTpStats(s.nisn);
                            if (stats.avgFormatif !== null) { sum += stats.avgFormatif; c++; }
                          });
                          return c > 0 ? (sum / c).toFixed(1) : '-';
                        })()}
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-700 dark:text-gray-300">
                        {(() => {
                          let sum = 0, c = 0;
                          students.forEach(s => {
                            const stats = calculateStudentTpStats(s.nisn);
                            if (stats.avgSumatif !== null) { sum += stats.avgSumatif; c++; }
                          });
                          return c > 0 ? (sum / c).toFixed(1) : '-';
                        })()}
                      </td>
                      <td className="py-2.5 px-2 text-center text-sm font-black text-amber-800 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-950/40">
                        {classAnalytics.classAvg > 0 ? classAnalytics.classAvg : '-'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-[11px]">
                        Tuntas: {classAnalytics.tuntasPct}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Print Signature Component */}
          <PrintSignature
            leftTitle="Mengetahui,"
            leftSubtitle="Guru Mata Pelajaran"
            leftName={selectedGuru || user?.nama}
            leftNip={user?.nip}
          />
        </div>
      
</>
    );
}
