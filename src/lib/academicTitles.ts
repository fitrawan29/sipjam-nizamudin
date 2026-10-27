/**
 * Academic & Professional Titles (Multi-Gelar) Management Module
 * Supports multiple prefix (Dr., Prof., Ir., Hj., etc.) and suffix (S.Pd., M.Pd., Gr., etc.) titles.
 * Formats full names cleanly: [prefixes] [coreName], [suffixes]
 */

export type TitlePosition = 'prefix' | 'suffix';

export interface AcademicTitle {
  id: string;
  text: string;
  position: TitlePosition;
}

export const COMMON_PREFIXES = [
  'Dr.',
  'Drs.',
  'Dra.',
  'Prof.',
  'Ir.',
  'H.',
  'Hj.',
  'K.H.',
  'dr.',
  'drg.',
  'apt.',
  'Ns.'
];

export const COMMON_SUFFIXES = [
  'S.Pd.',
  'M.Pd.',
  'S.Kom.',
  'M.Kom.',
  'S.T.',
  'M.T.',
  'S.Si.',
  'M.Si.',
  'S.E.',
  'M.M.',
  'S.Ag.',
  'M.Ag.',
  'S.Sos.',
  'M.Sos.',
  'S.H.',
  'M.H.',
  'S.Ked.',
  'Gr.',
  'Ph.D.',
  'M.Sc.',
  'B.Sc.',
  'LL.M.',
  'MBA',
  'A.Md.'
];

/**
 * Combines core name and multiple titles into a standard formal name.
 * Format: "Prefix1 Prefix2 CoreName, Suffix1, Suffix2"
 * Handles edge cases cleanly:
 * - No prefixes: "CoreName, Suffix1, Suffix2"
 * - No suffixes: "Prefix1 Prefix2 CoreName"
 * - No titles: "CoreName"
 * - Prevents double commas, dangling commas, or multiple spaces.
 */
export function formatFullName(
  coreName: string,
  titles: Array<{ text: string; position: TitlePosition }>
): string {
  // Strip zero-width chars and collapse internal spaces
  let cleanCore = (coreName || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^,+|,+$/g, '')
    .trim();

  const cleanTitles = (titles || [])
    .map(t => ({
      position: t.position,
      text: (t.text || '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/^,+|,+$/g, '')
        .trim()
    }))
    .filter(t => t.text.length > 0);

  const prefixes = cleanTitles
    .filter(t => t.position === 'prefix')
    .map(t => t.text);

  const suffixes = cleanTitles
    .filter(t => t.position === 'suffix')
    .map(t => t.text);

  const prefixStr = prefixes.join(' ').trim();
  const suffixStr = suffixes.join(', ').trim();

  let formatted = '';

  if (prefixStr && cleanCore) {
    formatted = `${prefixStr} ${cleanCore}`;
  } else if (prefixStr && !cleanCore) {
    formatted = prefixStr;
  } else if (!prefixStr && cleanCore) {
    formatted = cleanCore;
  }

  if (suffixStr) {
    if (formatted) {
      formatted = `${formatted}, ${suffixStr}`;
    } else {
      formatted = suffixStr;
    }
  }

  return formatted
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
}

/**
 * Parses an existing full name string into core name and extracted titles.
 * Useful when populating edit forms for users or teachers.
 */
export function parseNameAndTitles(fullName?: string | null): {
  coreName: string;
  titles: AcademicTitle[];
} {
  if (!fullName) {
    return { coreName: '', titles: [] };
  }

  const raw = fullName.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!raw) {
    return { coreName: '', titles: [] };
  }

  const titles: AcademicTitle[] = [];

  // Known prefix regex with word boundaries to avoid false matching words like "Hadi", "Irwan", etc.
  const prefixRegex = /^(Prof\.|Prof\b|Dr\.|Dr\b|Drs\.|Drs\b|Dra\.|Dra\b|Ir\.|Ir\b|H\.|H\b|Hj\.|Hj\b|K\.H\.|KH\b|Ust\.|Ustadz\b|dr\.|dr\b|drg\.|drg\b|Ns\.|apt\.)\s*/i;

  // Split by comma for suffixes
  // Format: "Prefixes CoreName, Suffix1, Suffix2"
  const commaParts = raw.split(',').map(p => p.trim()).filter(Boolean);

  let preComma = commaParts[0] || '';
  const postComma = commaParts.slice(1);

  // Extract prefixes from preComma
  let match: RegExpExecArray | null = null;
  while ((match = prefixRegex.exec(preComma)) !== null) {
    let matchedPrefix = match[1].trim();
    if (!matchedPrefix.endsWith('.') && matchedPrefix.length <= 4) {
      matchedPrefix += '.';
    }
    titles.push({
      id: Math.random().toString(36).substring(2, 9),
      text: matchedPrefix,
      position: 'prefix'
    });
    preComma = preComma.slice(match[0].length).trim();
  }

  // Extract suffixes from postComma
  for (const suffix of postComma) {
    if (suffix) {
      titles.push({
        id: Math.random().toString(36).substring(2, 9),
        text: suffix,
        position: 'suffix'
      });
    }
  }

  // If there was no comma, check if preComma ends with a common suffix (e.g. "Budi Santoso S.Pd.")
  if (postComma.length === 0) {
    const trailingSuffixRegex = /\s+(S\.Pd\.?|M\.Pd\.?|S\.Kom\.?|M\.Kom\.?|S\.T\.?|M\.T\.?|S\.Si\.?|M\.Si\.?|S\.E\.?|M\.M\.?|S\.Ag\.?|M\.Ag\.?|Gr\.?|Ph\.D\.?|M\.Sc\.?|B\.Sc\.?)$/i;
    let sMatch = trailingSuffixRegex.exec(preComma);
    while (sMatch) {
      titles.push({
        id: Math.random().toString(36).substring(2, 9),
        text: sMatch[1],
        position: 'suffix'
      });
      preComma = preComma.slice(0, sMatch.index).trim();
      sMatch = trailingSuffixRegex.exec(preComma);
    }
  }

  return {
    coreName: preComma.trim(),
    titles
  };
}

/**
 * Interactive DOM Manager for SweetAlert2 modals in AdminDataView.
 * Handles dynamic adding, modifying, removing, and live preview of titles.
 */
export function setupSwalTitleManager(options: {
  popup: HTMLElement;
  initialCoreName: string;
  initialTitles: AcademicTitle[];
  coreInputId: string;
  titlesContainerId: string;
  addBtnId: string;
  previewId: string;
  summaryId?: string;
  hiddenInputId: string;
}) {
  let currentCoreName = options.initialCoreName || '';
  let currentTitles: AcademicTitle[] = [...(options.initialTitles || [])];

  const coreInput = options.popup.querySelector('#' + options.coreInputId) as HTMLInputElement;
  const titlesContainer = options.popup.querySelector('#' + options.titlesContainerId) as HTMLElement;
  const addBtn = options.popup.querySelector('#' + options.addBtnId) as HTMLElement;
  const previewEl = options.popup.querySelector('#' + options.previewId) as HTMLElement;
  const summaryEl = options.summaryId ? (options.popup.querySelector('#' + options.summaryId) as HTMLElement) : null;
  const hiddenInput = options.popup.querySelector('#' + options.hiddenInputId) as HTMLInputElement;

  if (coreInput) {
    coreInput.value = currentCoreName;
  }

  const updatePreviewAndHidden = () => {
    const formatted = formatFullName(currentCoreName, currentTitles);
    if (previewEl) {
      previewEl.textContent = formatted || '(Nama belum diisi)';
    }
    if (hiddenInput) {
      hiddenInput.value = formatted;
    }
    if (summaryEl) {
      const prefixCount = currentTitles.filter(t => t.position === 'prefix' && t.text.trim()).length;
      const suffixCount = currentTitles.filter(t => t.position === 'suffix' && t.text.trim()).length;
      if (prefixCount > 0 || suffixCount > 0) {
        summaryEl.textContent = `${prefixCount} Depan, ${suffixCount} Belakang`;
      } else {
        summaryEl.textContent = 'Tanpa Gelar';
      }
    }
  };

  const renderTitlesList = () => {
    if (!titlesContainer) return;

    if (currentTitles.length === 0) {
      titlesContainer.innerHTML = `
        <div class="text-[11px] text-gray-400 dark:text-gray-500 italic py-1">
          Belum ada gelar ditambahkan. Klik tombol "+ Tambah Gelar" atau klik tombol pilihan cepat di atas.
        </div>
      `;
      return;
    }

    const doc = options.popup?.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (!doc) return;

    titlesContainer.innerHTML = '';
    currentTitles.forEach((title, idx) => {
      const row = doc.createElement('div');
      row.className = 'flex items-center gap-1.5 bg-white dark:bg-gray-800 p-1.5 rounded-md border border-gray-200 dark:border-gray-700';

      row.innerHTML = `
        <select class="swal-title-pos text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-medium cursor-pointer">
          <option value="prefix" ${title.position === 'prefix' ? 'selected' : ''}>Depan (Prefix)</option>
          <option value="suffix" ${title.position === 'suffix' ? 'selected' : ''}>Belakang (Suffix)</option>
        </select>
        <input type="text" class="swal-title-text flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white focus:outline-hidden" placeholder="Contoh: S.Pd. atau Dr." value="${title.text || ''}">
        <button type="button" class="swal-title-del w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer" title="Hapus Gelar">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      `;

      const posSelect = row.querySelector('.swal-title-pos') as HTMLSelectElement;
      const textInput = row.querySelector('.swal-title-text') as HTMLInputElement;
      const delBtn = row.querySelector('.swal-title-del') as HTMLButtonElement;

      posSelect.addEventListener('change', () => {
        currentTitles[idx].position = posSelect.value as TitlePosition;
        updatePreviewAndHidden();
      });

      textInput.addEventListener('input', () => {
        currentTitles[idx].text = textInput.value;
        updatePreviewAndHidden();
      });

      delBtn.addEventListener('click', () => {
        currentTitles.splice(idx, 1);
        renderTitlesList();
        updatePreviewAndHidden();
      });

      titlesContainer.appendChild(row);
    });
  };

  if (coreInput) {
    coreInput.addEventListener('input', () => {
      currentCoreName = coreInput.value;
      updatePreviewAndHidden();
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      currentTitles.push({
        id: Math.random().toString(36).substring(2, 9),
        text: '',
        position: 'suffix'
      });
      renderTitlesList();
      updatePreviewAndHidden();
      // Auto-focus the newly added input
      const lastInput = titlesContainer.querySelector('div:last-child input.swal-title-text') as HTMLInputElement;
      if (lastInput && typeof lastInput.focus === 'function') {
        lastInput.focus();
      }
    });
  }

  // Quick Chips
  const quickChips = options.popup.querySelectorAll('.swal-quick-chip');
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const pos = (chip.getAttribute('data-pos') as TitlePosition) || 'suffix';
      const val = chip.getAttribute('data-val') || '';
      currentTitles.push({
        id: Math.random().toString(36).substring(2, 9),
        text: val,
        position: pos
      });
      renderTitlesList();
      updatePreviewAndHidden();
    });
  });

  renderTitlesList();
  updatePreviewAndHidden();

  return {
    getCoreName: () => currentCoreName,
    getTitles: () => currentTitles,
    getFormattedName: () => formatFullName(currentCoreName, currentTitles)
  };
}
