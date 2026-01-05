'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import toast, { Toaster } from 'react-hot-toast';

interface TeacherProfile {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  bio: string;
  specialties: string[];
  yearsOfExperience?: number;
  imageUrl?: string;
  isActive: boolean;
}

// Common Pilates specialties
const SPECIALTY_OPTIONS = [
  'Reformer Pilates',
  'Mat Pilates',
  'Tower Pilates',
  'Chair Pilates',
  'Cadillac',
  'Prenatal Pilates',
  'Postnatal Pilates',
  'Rehabilitation',
  'Sports Pilates',
  'Senior Pilates',
  'Group Classes',
  'Private Sessions',
];

export default function TeacherProfilePage() {
  const { t } = useTranslation('teacher');
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    phone: '',
    bio: '',
    specialties: [] as string[],
    yearsOfExperience: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data: any = await apiClient.get('/teachers/me');
      setProfile(data.teacher);

      // Populate form with existing data
      setFormData({
        phone: data.teacher.userId.phone || '',
        bio: data.teacher.bio || '',
        specialties: data.teacher.specialties || [],
        yearsOfExperience: data.teacher.yearsOfExperience?.toString() || '',
      });

      // Set preview URL if profile photo exists
      if (data.teacher.imageUrl) {
        if (data.teacher.imageUrl.startsWith('http')) {
          setPreviewUrl(data.teacher.imageUrl);
        } else {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          const baseUrl = apiBaseUrl.replace('/api', '');
          setPreviewUrl(`${baseUrl}${data.teacher.imageUrl}`);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(t('profile.error_load_profile'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      const updates: any = {
        phone: formData.phone,
        bio: formData.bio,
        specialties: formData.specialties,
      };

      if (formData.yearsOfExperience) {
        updates.yearsOfExperience = parseInt(formData.yearsOfExperience);
      }

      await apiClient.patch('/teachers/me', updates);
      toast.success(t('profile.success_update'));
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('profile.error_update'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('profile.invalid_file_type'));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('profile.file_too_large'));
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('photo', selectedFile);

      const token = localStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      const response = await fetch(
        `${apiBaseUrl}/teachers/me/profile-photo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t('profile.upload_failed') }));
        throw new Error(errorData.error || t('profile.upload_failed'));
      }

      const data = await response.json();

      // Immediately update the preview URL with the uploaded photo
      const baseUrl = apiBaseUrl.replace('/api', '');
      const fullPhotoUrl = `${baseUrl}${data.imageUrl}`;
      setPreviewUrl(fullPhotoUrl);

      toast.success(t('profile.upload_success'));
      setSelectedFile(null);

      // Refetch profile to sync with server
      await fetchProfile();
    } catch (error: any) {
      toast.error(error.message || t('profile.upload_failed'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
          <p className="text-lg text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-16 shadow-xl border border-gray-200 text-center max-w-2xl mx-auto">
          <p className="text-lg text-gray-600">{t('profile.not_found')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Photo Section */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-6">
                <h2 className="text-2xl font-bold text-white mb-1">{t('profile.photo_title')}</h2>
                <p className="text-purple-100 text-sm">{t('profile.photo_description')}</p>
              </div>
              <div className="p-8">
                <div className="flex flex-col items-center space-y-6">
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Profile"
                        className="w-48 h-48 rounded-full object-cover ring-4 ring-purple-100 shadow-xl"
                      />
                      <div className="absolute bottom-2 right-2 w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-6xl font-bold text-white shadow-xl ring-4 ring-purple-100">
                        {profile.userId.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}

                  <div className="w-full space-y-4">
                    <div>
                      <label className="block w-full cursor-pointer">
                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 text-gray-700 rounded-xl transition-all border-2 border-gray-200 font-medium">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {t('profile.choose_photo') || 'Choose Photo'}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {selectedFile && (
                      <div className="space-y-3">
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                          <p className="text-xs text-purple-900 font-medium">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={handlePhotoUpload}
                          disabled={uploading}
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl py-3 shadow-md hover:shadow-lg transition-all"
                        >
                          {uploading ? t('profile.uploading') : t('profile.upload_photo')}
                        </Button>
                      </div>
                    )}

                    <p className="text-xs text-gray-500 text-center leading-relaxed">
                      {t('profile.upload_note')}
                    </p>
                  </div>
                </div>

                {/* Status Section */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">{t('profile.status')}</span>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        profile.isActive
                          ? 'bg-green-100 text-green-700 ring-2 ring-green-200'
                          : 'bg-gray-100 text-gray-700 ring-2 ring-gray-200'
                      }`}>
                        {profile.isActive ? t('profile.active') : t('profile.inactive')}
                      </span>
                    </div>
                    {profile.yearsOfExperience !== undefined && profile.yearsOfExperience > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">{t('profile.experience')}</span>
                        <span className="text-sm font-bold text-purple-600">
                          {profile.yearsOfExperience} {profile.yearsOfExperience === 1 ? t('profile.year') : t('profile.years')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Information Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6">
                  <h2 className="text-2xl font-bold text-white mb-1">{t('profile.edit_profile_title')}</h2>
                  <p className="text-purple-100 text-sm">{t('profile.edit_profile_description')}</p>
                </div>
                <div className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.fullName')}</label>
                        <input
                          type="text"
                          value={profile.userId.name}
                          disabled
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-medium"
                        />
                        <p className="text-xs text-gray-500 mt-1.5">{t('profile.contact_admin_name')}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.email')}</label>
                        <input
                          type="email"
                          value={profile.userId.email}
                          disabled
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-medium"
                        />
                        <p className="text-xs text-gray-500 mt-1.5">{t('profile.contact_admin_email')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.phoneNumber')}</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                          placeholder={t('profile.phone_placeholder')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.yearsOfExperience')}</label>
                        <input
                          type="number"
                          name="yearsOfExperience"
                          value={formData.yearsOfExperience}
                          onChange={handleChange}
                          min="0"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                          placeholder={t('profile.experience_placeholder')}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.bio')}</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all resize-none"
                        placeholder={t('profile.bio_placeholder')}
                      />
                      <p className="text-xs text-gray-500 mt-1.5">
                        {t('profile.bio_note')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-3">{t('profile.specialties')}</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {SPECIALTY_OPTIONS.map((specialty) => (
                          <button
                            key={specialty}
                            type="button"
                            onClick={() => toggleSpecialty(specialty)}
                            className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                              formData.specialties.includes(specialty)
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md hover:shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
                            }`}
                          >
                            {specialty}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        {t('profile.specialties_note')}
                      </p>
                    </div>

                    {formData.specialties.length > 0 && (
                      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200">
                        <label className="block text-sm font-semibold text-purple-900 mb-3">{t('profile.selected_specialties')}</label>
                        <div className="flex flex-wrap gap-2">
                          {formData.specialties.map((specialty, index) => (
                            <span
                              key={index}
                              className="px-4 py-2 bg-white text-purple-700 rounded-full text-sm font-semibold shadow-sm ring-2 ring-purple-200"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-8 py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        {saving ? t('profile.saving') : t('profile.save_changes')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchProfile}
                        className="px-8 py-3 rounded-xl border-2 border-gray-300 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                      >
                        {t('profile.cancel')}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
