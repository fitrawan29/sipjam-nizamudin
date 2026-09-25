import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { TujuanPembelajaran, AsesmenKolom, NilaiSiswa } from '@/types/database';

export default function RekapSemesterTab(props: any) {
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 no-print">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Rekapitulasi Nilai Akhir Semester (Rapor)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Nilai Akhir dari setiap Tujuan Pembelajaran (TP) dikompilasi untuk menghasilkan Nilai Rapor Semester.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800">
                  Total {tpList.length} TP Terkompilasi
                </span>
              </div>
            </div>
          </div>

          {tpList.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <i className="fa-solid fa-folder-open text-3xl text-gray-400 mb-2"></i>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Belum ada TP yang dibuat untuk semester ini.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden print:overflow-visible print:max-h-none print:border-none print:shadow-none">
              <div className="overflow-x-auto max-h-[600px] custom-scroll print:overflow-visible print:max-h-none">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                    <tr className="border-b border-gray-200 dark:border-gray-700 font-bold text-[11px]">
                      <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                      <th className="py-2.5 px-2.5 w-24">NISN</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Nama Siswa</th>
                      <th className="py-2.5 px-2 w-12 text-center border-r border-gray-200 dark:border-gray-700">L/P</th>

                      {/* Header per TP */}
                      {tpList.map(tp => (
                        <th
                          key={tp.id}
                          className="py-2.5 px-3 w-28 text-center bg-teal-50/40 dark:bg-teal-950/20 border-r border-gray-200 dark:border-gray-700"
                        >
                          <div className="font-extrabold text-teal-800 dark:text-teal-300">{tp.kode_tp}</div>
                          <div className="font-normal text-[9px] text-gray-500 dark:text-gray-400 truncate max-w-[90px] mx-auto">
                            {tp.deskripsi}
                          </div>
                        </th>
                      ))}

                      <th className="py-2.5 px-3 w-32 text-center font-black bg-amber-100/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-r border-gray-200 dark:border-gray-700">
                        Nilai Rapor
                      </th>
                      <th className="py-2.5 px-3 w-36 text-center">Predikat Semester</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredStudents.map((student, idx) => {
                      const stats = calculateStudentSemesterStats(student.nisn);
                      return (
                        <tr
                          key={student.nisn}
                          className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-2.5 text-center text-gray-500 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                            {student.nisn}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">
                            {student.nama_siswa}
                          </td>
                          <td className="py-2.5 px-2 text-center text-gray-500 border-r border-gray-200 dark:border-gray-700">
                            {student.gender || '-'}
                          </td>

                          {/* Nilai per TP */}
                          {tpList.map(tp => {
                            const score = stats.tpResults[tp.id];
                            return (
                              <td
                                key={tp.id}
                                className="py-2.5 px-3 text-center font-bold border-r border-gray-200 dark:border-gray-700"
                              >
                                {score !== null ? (
                                  <span
                                    className={
                                      score >= 75
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                    }
                                  >
                                    {score}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Nilai Rapor Semester */}
                          <td className="py-2.5 px-3 text-center font-black text-sm bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-r border-gray-200 dark:border-gray-700">
                            {stats.semesterFinal !== null ? stats.semesterFinal : '-'}
                          </td>

                          {/* Predikat */}
                          <td className="py-2.5 px-3 text-center">
                            {stats.predikat !== '-' ? (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${stats.predikatBadge}`}>
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
                </table>
              </div>
            </div>
          )}

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
