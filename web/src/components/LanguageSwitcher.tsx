'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const router = useRouter();
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language || 'en';

  const handleLanguageToggle = async () => {
    const newLang = currentLanguage === 'en' ? 'th' : 'en';
    await i18n.changeLanguage(newLang);
    router.refresh();
  };

  return (
    <button
      onClick={handleLanguageToggle}
      className="relative inline-flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-lg border-2 border-gray-200 hover:border-orange-400 hover:shadow-xl transition-all duration-300 group overflow-hidden"
      title={currentLanguage === 'en' ? 'Switch to Thai' : 'Switch to English'}
    >
      {/* English Flag */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
          currentLanguage === 'en'
            ? 'opacity-100 scale-100 rotate-0'
            : 'opacity-0 scale-50 rotate-180'
        }`}
      >
        <svg className="w-8 h-8" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
          {/* UK Flag */}
          <clipPath id="s">
            <path d="M0,0 v30 h60 v-30 z"/>
          </clipPath>
          <clipPath id="t">
            <path d="M30,15 h30 v15 z v-30 h-30 z h-30 v15 z v-15 h30 z"/>
          </clipPath>
          <g clipPath="url(#s)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
          </g>
        </svg>
      </div>

      {/* Thai Flag */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
          currentLanguage === 'th'
            ? 'opacity-100 scale-100 rotate-0'
            : 'opacity-0 scale-50 rotate-180'
        }`}
      >
        <svg className="w-8 h-8" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
          {/* Thai Flag */}
          <rect width="60" height="40" fill="#A51931"/>
          <rect y="6.67" width="60" height="26.66" fill="#F4F5F8"/>
          <rect y="13.33" width="60" height="13.34" fill="#2D2A4A"/>
        </svg>
      </div>

      {/* Hover Ring Effect */}
      <div className="absolute inset-0 rounded-full bg-orange-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
    </button>
  );
}
