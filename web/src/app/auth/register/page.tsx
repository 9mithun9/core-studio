'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/lib/auth';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import '@/lib/i18n';

export default function RegisterPage() {
  const router = useRouter();
  const { t, ready } = useTranslation('auth');
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

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader className="text-center space-y-2 pb-6">
            <Link href="/" className="inline-block">
              <div className="text-2xl md:text-3xl font-bold text-primary-600 mb-2 hover:text-primary-700 transition-colors">
                Core Studio
              </div>
            </Link>
            <CardTitle className="text-xl md:text-2xl">{t('register.title')}</CardTitle>
            <CardDescription className="text-sm md:text-base">{t('register.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            {success ? (
              <div className="text-center py-8">
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 md:px-4 py-3 rounded mb-4">
                  <p className="font-semibold mb-2 text-sm md:text-base">{t('register.successTitle')}</p>
                  <p className="text-xs md:text-sm">
                    {t('register.successMessage')}
                  </p>
                </div>
                <Link href="/auth/login">
                  <Button variant="outline" className="text-sm md:text-base">{t('register.returnToLogin')}</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded text-sm">
                    {error}
                  </div>
                )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  {t('register.name')}
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                  placeholder={t('register.namePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  {t('register.email')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                  placeholder={t('register.emailPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                  {t('register.phone')}
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                  placeholder={t('register.phonePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  {t('register.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  {t('register.confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                  placeholder="••••••••"
                />
              </div>

                <Button
                  type="submit"
                  className="w-full text-sm md:text-base py-2 md:py-2.5"
                  disabled={loading}
                >
                  {loading ? t('register.submitting') : t('register.createAccount')}
                </Button>
              </form>
            )}

            {!success && (
              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600">{t('register.haveAccount')} </span>
                <Link href="/auth/login" className="text-primary-600 hover:underline font-medium">
                  {t('register.signInLink')}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
