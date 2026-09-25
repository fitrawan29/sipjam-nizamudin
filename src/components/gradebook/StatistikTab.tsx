import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { TujuanPembelajaran, AsesmenKolom, NilaiSiswa } from '@/types/database';

export default function StatistikTab(props: any) {
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
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Rata-rata Kelas</span>
                <span className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-chart-line"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {classAnalytics.classAvg}
                </span>
                <span className="text-xs text-gray-500 font-semibold">/ 100</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Dari {classAnalytics.gradedStudents} siswa dinilai
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Ketuntasan (KKTP ≥ 75)</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-check-double"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {classAnalytics.tuntasPct}%
                </span>
                <span className="text-xs text-gray-500 font-semibold">
                  ({classAnalytics.tuntasCount} siswa)
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Kriteria Ketercapaian Tujuan Pembelajaran
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Nilai Tertinggi</span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-trophy"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {classAnalytics.highestScore}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Skor tertinggi di TP ini</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Nilai Terendah</span>
                <span className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-arrow-down-wide-short"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-red-600 dark:text-red-400">
                  {classAnalytics.lowestScore}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Skor terendah di TP ini</p>
            </div>
          </div>

          {/* Grade Distribution Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
              Distribusi Capaian Kompetensi Kurikulum Merdeka
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50">
                <div className="flex justify-between items-center text-xs font-bold text-green-800 dark:text-green-300">
                  <span>Sangat Baik (A)</span>
                  <span>85 - 100</span>
                </div>
                <div className="mt-2 text-2xl font-black text-green-700 dark:text-green-400">
                  {classAnalytics.distribution.a}{' '}
                  <span className="text-xs font-medium text-gray-500">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.a / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                <div className="flex justify-between items-center text-xs font-bold text-blue-800 dark:text-blue-300">
                  <span>Baik (B)</span>
                  <span>75 - 84</span>
                </div>
                <div className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-400">
                  {classAnalytics.distribution.b}{' '}
                  <span className="text-xs font-medium text-gray-500">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.b / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/50">
                <div className="flex justify-between items-center text-xs font-bold text-yellow-800 dark:text-yellow-300">
                  <span>Cukup (C)</span>
                  <span>65 - 74</span>
                </div>
                <div className="mt-2 text-2xl font-black text-yellow-700 dark:text-yellow-400">
                  {classAnalytics.distribution.c}{' '}
                  <span className="text-xs font-medium text-gray-500">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.c / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
                <div className="flex justify-between items-center text-xs font-bold text-red-800 dark:text-red-300">
                  <span>Perlu Bimbingan (D)</span>
                  <span>&lt; 65</span>
                </div>
                <div className="mt-2 text-2xl font-black text-red-700 dark:text-red-400">
                  {classAnalytics.distribution.d}{' '}
                  <span className="text-xs font-medium text-gray-500">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.d / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      
</>
    );
}
