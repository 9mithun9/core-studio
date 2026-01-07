'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { authService } from '@/lib/auth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import '@/lib/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const { t, ready } = useTranslation('auth');
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('errors.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || t('errors.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!mounted || !ready) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background Pattern - Same as landing page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/background-1.jpg"
            alt="Background"
            fill
            className="object-cover blur-sm"
            priority
            quality={100}
          />
          {/* Overlay for better readability */}
          <div className="absolute inset-0 bg-white/30"></div>
        </div>
        {/* Falling snowflakes */}
        <svg className="absolute top-0 left-[5%] w-8 h-8 text-purple-400/70 animate-fall-1" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L13 8L12 11L11 8L12 0ZM12 13L13 16L12 24L11 16L12 13ZM0 12L8 11L11 12L8 13L0 12ZM13 12L16 11L24 12L16 13L13 12ZM4 4L9 9L7 11L4 8L2 11L4 4ZM15 13L17 15L20 20L15 17L13 15L15 13ZM20 4L18 7L15 10L17 13L20 20L22 13L15 10L18 7L20 4Z"/>
        </svg>
        <svg className="absolute top-0 left-[15%] w-7 h-7 text-blue-300/60 animate-fall-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L12.5 10L12 12L11.5 10L12 2ZM12 14L12.5 16L12 22L11.5 16L12 14ZM2 12L10 11.5L12 12L10 12.5L2 12ZM14 12L16 11.5L22 12L16 12.5L14 12ZM5 5L10 10L8 12L5 9L3 12L5 5ZM16 12L18 14L19 19L16 16L14 14L16 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[25%] w-6 h-6 text-pink-400/65 animate-fall-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L12.5 9L12 11L11.5 9L12 1ZM12 13L12.5 15L12 23L11.5 15L12 13ZM1 12L9 11.5L11 12L9 12.5L1 12ZM13 12L15 11.5L23 12L15 12.5L13 12ZM4 4L9.5 9.5L7.5 11.5L4 8L2 11.5L4 4Z"/>
        </svg>
        <svg className="absolute top-0 left-[35%] w-7 h-7 text-purple-300/55 animate-fall-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L12.5 8L12 11L11.5 8L12 0ZM12 13L12.5 16L12 24L11.5 16L12 13ZM0 12L8 11L11 12L8 13L0 12ZM13 12L16 11L24 12L16 13L13 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[45%] w-8 h-8 text-indigo-400/65 animate-fall-1" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L12.5 10L12 12L11.5 10L12 2ZM12 14L12.5 16L12 22L11.5 16L12 14ZM2 12L10 11.5L12 12L10 12.5L2 12ZM14 12L16 11.5L22 12L16 12.5L14 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[55%] w-6 h-6 text-blue-400/60 animate-fall-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L12.5 9L12 11L11.5 9L12 1ZM12 13L12.5 15L12 23L11.5 15L12 13ZM1 12L9 11.5L11 12L9 12.5L1 12ZM13 12L15 11.5L23 12L15 12.5L13 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[65%] w-7 h-7 text-pink-300/65 animate-fall-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L12.5 8L12 11L11.5 8L12 0ZM12 13L12.5 16L12 24L11 16L12 13ZM0 12L8 11L11 12L8 13L0 12ZM13 12L16 11L24 12L16 13L13 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[75%] w-6 h-6 text-purple-400/60 animate-fall-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L12.5 9L12 11L11.5 9L12 1ZM12 13L12.5 15L12 23L11.5 15L12 13ZM1 12L9 11.5L11 12L9 12.5L1 12ZM13 12L15 11.5L23 12L15 12.5L13 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[85%] w-8 h-8 text-blue-300/65 animate-fall-1" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L12.5 10L12 12L11.5 10L12 2ZM12 14L12.5 16L12 22L11.5 16L12 14ZM2 12L10 11.5L12 12L10 12.5L2 12ZM14 12L16 11.5L22 12L16 12.5L14 12Z"/>
        </svg>
        <svg className="absolute top-0 left-[95%] w-6 h-6 text-indigo-300/60 animate-fall-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L12.5 9L12 11L11.5 9L12 1ZM12 13L12.5 15L12 23L11.5 15L12 13ZM1 12L9 11.5L11 12L9 12.5L1 12ZM13 12L15 11.5L23 12L15 12.5L13 12Z"/>
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Language Switcher */}
        <div className="flex justify-end mb-6">
          <LanguageSwitcher />
        </div>

        {/* Register Card */}
        <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 overflow-hidden">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-orange-400 to-pink-400 px-8 py-10 text-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mb-16"></div>
            </div>

            {/* Logo/Brand */}
            <Link href="/" className="inline-block relative z-10">
              <div className="text-3xl md:text-4xl font-bold text-white mb-3 hover:scale-105 transition-transform">
                Core Studio Pilates
              </div>
            </Link>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2 relative z-10">{t('register.title')}</h1>
            <p className="text-orange-100 text-sm relative z-10">{t('register.subtitle')}</p>
          </div>

          {/* Form Content */}
          <div className="px-8 py-8">
            {success ? (
              <div className="text-center py-8">
                <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-4 rounded-xl mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-bold mb-2 text-lg">{t('register.successTitle')}</p>
                  <p className="text-sm">{t('register.successMessage')}</p>
                </div>
                <Link href="/auth/login">
                  <Button className="w-full text-base py-6 bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold">
                    {t('register.returnToLogin')}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                    {t('register.name')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder={t('register.namePlaceholder')}
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                    {t('register.email')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder={t('register.emailPlaceholder')}
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                    {t('register.phone')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder={t('register.phonePlaceholder')}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                    {t('register.password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                    {t('register.confirmPassword')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full pl-12 pr-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full text-base py-6 bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('register.submitting')}
                    </span>
                  ) : (
                    t('register.createAccount')
                  )}
                </Button>
              </form>
            )}

            {/* Sign In Link */}
            {!success && (
              <div className="mt-8 text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 text-gray-700">or</span>
                  </div>
                </div>

                <p className="mt-6 text-sm text-gray-800">
                  {t('register.haveAccount')}{' '}
                  <Link href="/auth/login" className="font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                    {t('register.signInLink')}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Text */}
        <p className="mt-8 text-center text-xs text-gray-500">
          © 2026 Core Studio Pilates. All rights reserved.
        </p>
      </div>
    </div>
  );
}
