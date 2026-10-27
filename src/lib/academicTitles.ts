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
  'S.Pd.I.',
  'M.Pd.I.',
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
  'S.Psi.',
  'M.Psi.',
  'S.Ked.',
  'S.Hum.',
  'M.Hum.',
  'S.S.',
  'S.Farm.',
  'M.Farm.',
  'S.Sn.',
  'M.Sn.',
  'S.P.',
  'M.P.',
  'Gr.',
  'Ph.D.',
  'M.Sc.',
  'B.Sc.',
  'M.A.',
  'B.A.',
  'M.Ed.',
  'B.Ed.',
  'LL.M.',
  'MBA',
  'M.B.A.',
  'A.Md.',
  'Ak.'
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
    .replace(/^[,;\s]+|[,;\s]+$/g, '')
    .trim();

  const cleanTitles = (titles || [])
    .map(t => ({
      position: t.position,
      text: (t.text || '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^[,;\s]+|[,;\s]+$/g, '')
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
    .replace(/(?:\s*,\s*)+/g, ', ')
    .replace(/^,\s*/, '')
    .replace(/,\s*$/, '')
    .trim();
}

export const PREFIX_PATTERNS = [
  'Prof\\.',
  'Prof\\b',
  'Dr\\.',
  'Dr\\b',
  'Drs\\.',
  'Drs\\b',
  'Dra\\.',
  'Dra\\b',
  'Ir\\.',
  'Ir\\b',
  'H\\.',
  'H\\b',
  'Hj\\.',
  'Hj\\b',
  'K\\.H\\.',
  'KH\\.',
  'KH\\b',
  'K\\.H\\b',
  'Ust\\.',
  'Ust\\b',
  'Ustadz\\b',
  'dr\\.',
  'dr\\b',
  'drg\\.',
  'drg\\b',
  'Ns\\.',
  'Ns\\b',
  'apt\\.',
  'apt\\b'
];

const prefixRegex = new RegExp(`^(${PREFIX_PATTERNS.join('|')})\\s*`, 'i');

const SUFFIX_PATTERNS = [
  'S\\.\\s*Pd\\.\\s*I\\.?',
  'S\\.\\s*Pd\\.?',
  'M\\.\\s*Pd\\.\\s*I\\.?',
  'M\\.\\s*Pd\\.?',
  'S\\.\\s*Kom\\.\\s*I\\.?',
  'S\\.\\s*Kom\\.?',
  'M\\.\\s*Kom\\.?',
  'S\\.\\s*T\\.?',
  'M\\.\\s*T\\.?',
  'S\\.\\s*Si\\.?',
  'M\\.\\s*Si\\.?',
  'S\\.\\s*E\\.?',
  'M\\.\\s*M\\.?',
  'S\\.\\s*Ag\\.?',
  'M\\.\\s*Ag\\.?',
  'S\\.\\s*Sos\\.?',
  'M\\.\\s*Sos\\.?',
  'S\\.\\s*H\\.?',
  'M\\.\\s*H\\.?',
  'S\\.\\s*Psi\\.?',
  'M\\.\\s*Psi\\.?',
  'S\\.\\s*Ked\\.?',
  'S\\.\\s*Hum\\.?',
  'M\\.\\s*Hum\\.?',
  'S\\.\\s*S\\.?',
  'S\\.\\s*Farm\\.?',
  'M\\.\\s*Farm\\.?',
  'S\\.\\s*Sn\\.?',
  'M\\.\\s*Sn\\.?',
  'S\\.\\s*P\\.?',
  'M\\.\\s*P\\.?',
  'Gr\\.?',
  'Ph\\.D\\.?',
  'M\\.\\s*Sc\\.?',
  'B\\.\\s*Sc\\.?',
  'M\\.\\s*A\\.?',
  'B\\.\\s*A\\.?',
  'M\\.\\s*Ed\\.?',
  'B\\.\\s*Ed\\.?',
  'M\\.\\s*Eng\\.?',
  'B\\.\\s*Eng\\.?',
  'LL\\.M\\.?',
  'M\\.\\s*B\\.\\s*A\\.?',
  'MBA\\b',
  'A\\.\\s*Md\\.[A-Za-z]+\\.?',
  'A\\.\\s*Md\\.?',
  'Ak\\.?'
];

const SUFFIX_REGEX_STR = `(${SUFFIX_PATTERNS.join('|')})`;
const standaloneSuffixRegex = new RegExp(`^${SUFFIX_REGEX_STR}$`, 'i');
const trailingSuffixRegex = new RegExp(`\\s+${SUFFIX_REGEX_STR}$`, 'i');

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
  const commaParts = raw.split(',').map(p => p.trim());
  let coreName = '';
  let coreFound = false;

  for (let i = 0; i < commaParts.length; i++) {
    let part = commaParts[i];
    if (!part) continue;

    if (!coreFound) {
      // Extract any leading prefixes
      let pMatch: RegExpExecArray | null = null;
      while ((pMatch = prefixRegex.exec(part)) !== null) {
        let matched = pMatch[1].trim();
        if (!matched.endsWith('.') && matched.length <= 4) {
          matched += '.';
        }
        titles.push({
          id: Math.random().toString(36).substring(2, 9),
          text: matched,
          position: 'prefix'
        });
        part = part.slice(pMatch[0].length).trim();
      }

      // Clean leading punctuation after prefix stripping
      part = part.replace(/^[,.\s]+/, '').trim();

      if (!part) {
        // This part consisted only of prefix titles
        continue;
      }

      // Check if the remaining part is a standalone suffix (e.g. in ', S.Pd.')
      if (standaloneSuffixRegex.test(part)) {
        titles.push({
          id: Math.random().toString(36).substring(2, 9),
          text: part,
          position: 'suffix'
        });
        continue;
      }

      // If this is the last part (or all subsequent parts are empty), check for trailing suffixes without comma
      const remainingCommaParts = commaParts.slice(i + 1).filter(Boolean);
      if (remainingCommaParts.length === 0) {
        const trailing: AcademicTitle[] = [];
        let sMatch = trailingSuffixRegex.exec(part);
        while (sMatch) {
          trailing.unshift({
            id: Math.random().toString(36).substring(2, 9),
            text: sMatch[1],
            position: 'suffix'
          });
          part = part.slice(0, sMatch.index).trim();
          sMatch = trailingSuffixRegex.exec(part);
        }
        titles.push(...trailing);
      }

      // Preserve trailing dot for initials (e.g. 'Budi S.') while removing commas/spaces
      coreName = part.replace(/^[,;\s]+|[,;\s]+$/g, '').trim();
      coreFound = true;
    } else {
      // Subsequent comma-separated parts
      if (part) {
        // If this part is purely a known prefix title (e.g. misplaced "Ahmad Fauzi, Dr.")
        const pMatch = prefixRegex.exec(part);
        if (pMatch && pMatch[0].trim() === part.trim()) {
          let matched = pMatch[1].trim();
          if (!matched.endsWith('.') && matched.length <= 4) {
            matched += '.';
          }
          titles.push({
            id: Math.random().toString(36).substring(2, 9),
            text: matched,
            position: 'prefix'
          });
          continue;
        }

        // Check if this part contains multiple space-separated suffixes (e.g. "S.Pd. M.Pd.")
        const subSuffixes: AcademicTitle[] = [];
        let sMatch = trailingSuffixRegex.exec(part);
        while (sMatch) {
          subSuffixes.unshift({
            id: Math.random().toString(36).substring(2, 9),
            text: sMatch[1],
            position: 'suffix'
          });
          part = part.slice(0, sMatch.index).trim();
          sMatch = trailingSuffixRegex.exec(part);
        }

        if (subSuffixes.length > 0) {
          if (standaloneSuffixRegex.test(part)) {
            subSuffixes.unshift({
              id: Math.random().toString(36).substring(2, 9),
              text: part,
              position: 'suffix'
            });
            part = '';
          }
          titles.push(...subSuffixes);
        }

        if (part) {
          titles.push({
            id: Math.random().toString(36).substring(2, 9),
            text: part,
            position: 'suffix'
          });
        }
      }
    }
  }

  return {
    coreName: coreName.trim(),
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
      if (typeof previewEl.setAttribute === 'function') {
        previewEl.setAttribute('title', formatted || '');
      }
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
        <input type="text" class="swal-title-text flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded bg-transparent text-gray-900 dark:text-white focus:outline-hidden" placeholder="Contoh: S.Pd. atau Dr.">
        <button type="button" class="swal-title-del w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer" title="Hapus Gelar">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      `;

      const posSelect = row.querySelector('.swal-title-pos') as HTMLSelectElement;
      const textInput = row.querySelector('.swal-title-text') as HTMLInputElement;
      const delBtn = row.querySelector('.swal-title-del') as HTMLButtonElement;

      if (textInput) {
        textInput.value = title.text || '';
        textInput.addEventListener('input', () => {
          currentTitles[idx].text = textInput.value;
          updatePreviewAndHidden();
        });
      }

      if (posSelect) {
        posSelect.addEventListener('change', () => {
          currentTitles[idx].position = posSelect.value as TitlePosition;
          updatePreviewAndHidden();
        });
      }

      if (delBtn) {
        delBtn.addEventListener('click', () => {
          currentTitles.splice(idx, 1);
          renderTitlesList();
          updatePreviewAndHidden();
        });
      }

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
