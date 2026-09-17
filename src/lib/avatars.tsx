import React from 'react';

export interface AvatarItem {
  id: string;
  name: string;
  gradient: string;
  accent: string;
  svg: (className?: string) => React.ReactNode;
}

export const AVATAR_LIST: AvatarItem[] = [
  {
    id: 'avatar_1',
    name: 'Pak Guru - Kacamata Biru',
    gradient: 'from-blue-500 to-indigo-600',
    accent: '#3B82F6',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="4" />
        {/* Hair */}
        <path d="M28 38C28 22 38 16 50 16C62 16 72 22 72 38C72 40 68 40 68 36C64 24 36 24 32 36C32 40 28 40 28 38Z" fill="#1E293B" />
        {/* Face */}
        <circle cx="50" cy="46" r="22" fill="#FDE68A" />
        {/* Glasses */}
        <circle cx="42" cy="45" r="7" stroke="#1D4ED8" strokeWidth="2.5" fill="none" />
        <circle cx="58" cy="45" r="7" stroke="#1D4ED8" strokeWidth="2.5" fill="none" />
        <path d="M49 45H51" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="42" cy="45" r="2" fill="#1E293B" />
        <circle cx="58" cy="45" r="2" fill="#1E293B" />
        {/* Smile */}
        <path d="M44 57C46 60 54 60 56 57" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
        {/* Body */}
        <path d="M24 88C24 72 35 68 50 68C65 68 76 72 76 88" fill="#2563EB" />
        <polygon points="50,68 45,88 55,88" fill="#FFFFFF" />
        <polygon points="50,72 47,82 50,88 53,82" fill="#DC2626" />
      </svg>
    )
  },
  {
    id: 'avatar_2',
    name: 'Ibu Guru - Hijab Ungu',
    gradient: 'from-purple-500 to-pink-600',
    accent: '#A855F7',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#F3E8FF" stroke="#A855F7" strokeWidth="4" />
        {/* Hijab Base */}
        <path d="M22 65C22 36 32 18 50 18C68 18 78 36 78 65C78 84 68 92 50 92C32 92 22 84 22 65Z" fill="#7E22CE" />
        {/* Inner Hijab */}
        <path d="M30 46C30 30 38 24 50 24C62 24 70 30 70 46C70 60 62 68 50 68C38 68 30 60 30 46Z" fill="#A855F7" />
        {/* Face */}
        <ellipse cx="50" cy="48" rx="16" ry="19" fill="#FDE68A" />
        {/* Eyes & Lashes */}
        <ellipse cx="44" cy="46" rx="2.5" ry="3" fill="#1E293B" />
        <ellipse cx="56" cy="46" rx="2.5" ry="3" fill="#1E293B" />
        <path d="M41 42C43 41 46 42 47 43" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M53 43C54 42 57 41 59 42" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />
        {/* Smile */}
        <path d="M45 56C47 59 53 59 55 56" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />
        {/* Blush */}
        <circle cx="39" cy="52" r="3" fill="#FDA4AF" opacity="0.6" />
        <circle cx="61" cy="52" r="3" fill="#FDA4AF" opacity="0.6" />
        {/* Brooch */}
        <circle cx="50" cy="74" r="4" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
      </svg>
    )
  },
  {
    id: 'avatar_3',
    name: 'Pak Guru - Dasi Hijau',
    gradient: 'from-emerald-500 to-teal-600',
    accent: '#10B981',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#ECFDF5" stroke="#10B981" strokeWidth="4" />
        {/* Hair */}
        <path d="M26 36C26 20 38 14 50 14C62 14 74 20 74 36C70 26 60 22 50 22C40 22 30 26 26 36Z" fill="#334155" />
        {/* Face */}
        <circle cx="50" cy="46" r="22" fill="#FED7AA" />
        {/* Eyebrows & Eyes */}
        <circle cx="43" cy="44" r="2.5" fill="#1E293B" />
        <circle cx="57" cy="44" r="2.5" fill="#1E293B" />
        {/* Smile */}
        <path d="M44 55C47 59 53 59 56 55" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
        {/* Suit */}
        <path d="M22 88C22 72 34 68 50 68C66 68 78 72 78 88" fill="#065F46" />
        <polygon points="50,68 44,88 56,88" fill="#F8FAFC" />
        <polygon points="50,72 47,82 50,88 53,82" fill="#10B981" />
      </svg>
    )
  },
  {
    id: 'avatar_4',
    name: 'Ibu Guru - Hijab Oranye',
    gradient: 'from-orange-500 to-amber-600',
    accent: '#F97316',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FFF7ED" stroke="#F97316" strokeWidth="4" />
        {/* Hijab */}
        <path d="M24 64C24 35 34 18 50 18C66 18 76 35 76 64C76 84 66 92 50 92C34 92 24 84 24 64Z" fill="#EA580C" />
        <path d="M32 46C32 30 40 24 50 24C60 24 68 30 68 46C68 60 60 67 50 67C40 67 32 60 32 46Z" fill="#FB923C" />
        {/* Face */}
        <ellipse cx="50" cy="48" rx="15" ry="18" fill="#FED7AA" />
        {/* Eyes */}
        <circle cx="44" cy="46" r="2.5" fill="#1E293B" />
        <circle cx="56" cy="46" r="2.5" fill="#1E293B" />
        {/* Smile */}
        <path d="M45 56C47 59 53 59 55 56" stroke="#C2410C" strokeWidth="2.5" strokeLinecap="round" />
        {/* Pin */}
        <circle cx="50" cy="72" r="3.5" fill="#FDE047" />
      </svg>
    )
  },
  {
    id: 'avatar_5',
    name: 'Pak Guru - Jas Marun',
    gradient: 'from-rose-500 to-red-700',
    accent: '#E11D48',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FFE4E6" stroke="#E11D48" strokeWidth="4" />
        {/* Hair */}
        <path d="M26 36C26 22 36 16 50 16C64 16 74 22 74 36C70 28 62 24 50 24C38 24 30 28 26 36Z" fill="#18181B" />
        {/* Face */}
        <circle cx="50" cy="46" r="22" fill="#FDE68A" />
        {/* Mustache */}
        <path d="M42 54C46 52 48 54 50 54C52 54 54 52 58 54C55 56 45 56 42 54Z" fill="#27272A" />
        <circle cx="43" cy="43" r="2.5" fill="#1E293B" />
        <circle cx="57" cy="43" r="2.5" fill="#1E293B" />
        {/* Suit */}
        <path d="M20 88C20 72 32 68 50 68C68 68 80 72 80 88" fill="#881337" />
        <polygon points="50,68 45,88 55,88" fill="#FFF" />
        <polygon points="50,71 48,79 50,85 52,79" fill="#18181B" />
      </svg>
    )
  },
  {
    id: 'avatar_6',
    name: 'Ibu Guru - Kacamata Cyan',
    gradient: 'from-cyan-500 to-blue-600',
    accent: '#06B6D4',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#ECFEFF" stroke="#06B6D4" strokeWidth="4" />
        {/* Hair Bun */}
        <circle cx="50" cy="22" r="12" fill="#451A03" />
        {/* Hair */}
        <path d="M26 44C26 26 36 20 50 20C64 20 74 26 74 44C74 52 70 54 68 46C64 30 36 30 32 46C30 54 26 52 26 44Z" fill="#451A03" />
        {/* Face */}
        <circle cx="50" cy="48" r="21" fill="#FDE68A" />
        {/* Glasses */}
        <circle cx="42" cy="46" r="6.5" stroke="#0891B2" strokeWidth="2.5" fill="none" />
        <circle cx="58" cy="46" r="6.5" stroke="#0891B2" strokeWidth="2.5" fill="none" />
        <path d="M48.5 46H51.5" stroke="#0891B2" strokeWidth="2" />
        <circle cx="42" cy="46" r="2" fill="#0F172A" />
        <circle cx="58" cy="46" r="2" fill="#0F172A" />
        {/* Smile */}
        <path d="M45 58C47 61 53 61 55 58" stroke="#BE123C" strokeWidth="2" strokeLinecap="round" />
        {/* Clothes */}
        <path d="M24 88C24 72 34 68 50 68C66 68 76 72 76 88" fill="#0891B2" />
      </svg>
    )
  },
  {
    id: 'avatar_7',
    name: 'Pak Guru - Ceria Dasi Kuning',
    gradient: 'from-amber-400 to-yellow-600',
    accent: '#F59E0B',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="4" />
        {/* Modern Hair */}
        <path d="M26 38C26 22 36 14 52 14C66 14 74 20 74 34C68 22 56 20 48 20C38 20 30 26 26 38Z" fill="#292524" />
        {/* Face */}
        <circle cx="50" cy="46" r="22" fill="#FDE68A" />
        <circle cx="43" cy="44" r="2.5" fill="#1C1917" />
        <circle cx="57" cy="44" r="2.5" fill="#1C1917" />
        {/* Big Smile */}
        <path d="M42 53C45 61 55 61 58 53Z" fill="#DC2626" />
        <path d="M44 54H56" stroke="#FFF" strokeWidth="2" />
        {/* Clothes */}
        <path d="M22 88C22 72 34 68 50 68C66 68 78 72 78 88" fill="#1E293B" />
        <polygon points="50,68 45,88 55,88" fill="#FFF" />
        <polygon points="50,71 47,82 50,88 53,82" fill="#F59E0B" />
      </svg>
    )
  },
  {
    id: 'avatar_8',
    name: 'Ibu Guru - Hijab Tosca',
    gradient: 'from-teal-400 to-emerald-600',
    accent: '#14B8A6',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#CCFBF1" stroke="#14B8A6" strokeWidth="4" />
        <path d="M22 65C22 36 32 18 50 18C68 18 78 36 78 65C78 84 68 92 50 92C32 92 22 84 22 65Z" fill="#0F766E" />
        <path d="M30 46C30 30 38 24 50 24C62 24 70 30 70 46C70 60 62 68 50 68C38 68 30 60 30 46Z" fill="#14B8A6" />
        <ellipse cx="50" cy="48" rx="15" ry="18" fill="#FDE68A" />
        {/* Glasses */}
        <circle cx="43" cy="46" r="5.5" stroke="#115E59" strokeWidth="2" fill="none" />
        <circle cx="57" cy="46" r="5.5" stroke="#115E59" strokeWidth="2" fill="none" />
        <path d="M48.5 46H51.5" stroke="#115E59" strokeWidth="2" />
        <circle cx="43" cy="46" r="1.8" fill="#134E4A" />
        <circle cx="57" cy="46" r="1.8" fill="#134E4A" />
        <path d="M46 57C48 59 52 59 54 57" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    id: 'avatar_9',
    name: 'Pak Guru Senior - Akademis',
    gradient: 'from-slate-500 to-zinc-700',
    accent: '#64748B',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#F1F5F9" stroke="#64748B" strokeWidth="4" />
        {/* Grey Hair */}
        <path d="M26 40C26 22 36 16 50 16C64 16 74 22 74 40C70 28 62 24 50 24C38 24 30 28 26 40Z" fill="#94A3B8" />
        <circle cx="50" cy="47" r="22" fill="#FED7AA" />
        {/* Beard / Goatee */}
        <path d="M46 62C48 66 52 66 54 62C52 64 48 64 46 62Z" fill="#94A3B8" />
        {/* Glasses */}
        <rect x="36" y="41" width="12" height="9" rx="2" stroke="#334155" strokeWidth="2" fill="none" />
        <rect x="52" y="41" width="12" height="9" rx="2" stroke="#334155" strokeWidth="2" fill="none" />
        <path d="M48 45H52" stroke="#334155" strokeWidth="2" />
        <circle cx="42" cy="45.5" r="1.8" fill="#1E293B" />
        <circle cx="58" cy="45.5" r="1.8" fill="#1E293B" />
        <path d="M45 56C47 58 53 58 55 56" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
        {/* Suit */}
        <path d="M22 88C22 72 34 69 50 69C66 69 78 72 78 88" fill="#334155" />
        <polygon points="50,69 46,88 54,88" fill="#E2E8F0" />
      </svg>
    )
  },
  {
    id: 'avatar_10',
    name: 'Kepala Sekolah / Pimpinan',
    gradient: 'from-amber-600 to-yellow-700',
    accent: '#D97706',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FEF3C7" stroke="#D97706" strokeWidth="4" />
        {/* Elegant Hijab / Scarf */}
        <path d="M22 65C22 35 32 18 50 18C68 18 78 35 78 65C78 84 68 92 50 92C32 92 22 84 22 65Z" fill="#B45309" />
        <path d="M30 46C30 30 38 24 50 24C62 24 70 30 70 46C70 60 62 68 50 68C38 68 30 60 30 46Z" fill="#D97706" />
        <ellipse cx="50" cy="48" rx="15" ry="18" fill="#FDE68A" />
        <circle cx="43" cy="46" r="2.5" fill="#1E293B" />
        <circle cx="57" cy="46" r="2.5" fill="#1E293B" />
        <path d="M45 56C47 59 53 59 55 56" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
        {/* Gold Brooch */}
        <polygon points="50,70 54,75 50,80 46,75" fill="#FDE047" stroke="#78350F" strokeWidth="1" />
      </svg>
    )
  },
  {
    id: 'avatar_11',
    name: 'Guru IT / Modern Tech',
    gradient: 'from-indigo-500 to-violet-700',
    accent: '#6366F1',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#EEF2FF" stroke="#6366F1" strokeWidth="4" />
        {/* Spiky Tech Hair */}
        <path d="M28 36C28 20 38 12 50 12C62 12 72 20 72 36C66 24 58 22 50 22C42 22 34 24 28 36Z" fill="#1E1B4B" />
        <circle cx="50" cy="46" r="21" fill="#FDE68A" />
        {/* Modern Round Glasses */}
        <circle cx="43" cy="45" r="6" stroke="#4F46E5" strokeWidth="2.2" fill="none" />
        <circle cx="57" cy="45" r="6" stroke="#4F46E5" strokeWidth="2.2" fill="none" />
        <path d="M49 45H51" stroke="#4F46E5" strokeWidth="2" />
        <circle cx="43" cy="45" r="2" fill="#1E1B4B" />
        <circle cx="57" cy="45" r="2" fill="#1E1B4B" />
        <path d="M45 57C47 59 53 59 55 57" stroke="#4338CA" strokeWidth="2" strokeLinecap="round" />
        {/* Tech Hoodie */}
        <path d="M24 88C24 72 35 68 50 68C65 68 76 72 76 88" fill="#312E81" />
        <path d="M44 68L50 78L56 68" stroke="#818CF8" strokeWidth="2" fill="none" />
      </svg>
    )
  },
  {
    id: 'avatar_12',
    name: 'Ibu Guru - Hijab Mawar',
    gradient: 'from-rose-400 to-pink-600',
    accent: '#FB7185',
    svg: (cls = 'w-full h-full') => (
      <svg className={cls} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#FFF1F2" stroke="#FB7185" strokeWidth="4" />
        <path d="M22 65C22 36 32 18 50 18C68 18 78 36 78 65C78 84 68 92 50 92C32 92 22 84 22 65Z" fill="#BE123C" />
        <path d="M30 46C30 30 38 24 50 24C62 24 70 30 70 46C70 60 62 68 50 68C38 68 30 60 30 46Z" fill="#FB7185" />
        <ellipse cx="50" cy="48" rx="15" ry="18" fill="#FED7AA" />
        <circle cx="43" cy="46" r="2.5" fill="#1E293B" />
        <circle cx="57" cy="46" r="2.5" fill="#1E293B" />
        <path d="M45 56C47 59 53 59 55 56" stroke="#9F1239" strokeWidth="2.5" strokeLinecap="round" />
        {/* Floral Rose Pin */}
        <circle cx="50" cy="74" r="4" fill="#FFE4E6" stroke="#E11D48" strokeWidth="1.5" />
      </svg>
    )
  }
];

export function renderUserAvatar(avatarId?: string | null, className: string = 'w-10 h-10'): React.ReactNode {
  const match = AVATAR_LIST.find((a) => a.id === avatarId) || AVATAR_LIST[0];
  return match.svg(className);
}
