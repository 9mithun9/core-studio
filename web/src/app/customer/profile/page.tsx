'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import toast, { Toaster } from 'react-hot-toast';

interface CustomerProfile {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  medicalNotes?: string;
  profilePhoto?: string;
  profession?: string;
  gender?: 'male' | 'female' | 'other';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export default function CustomerProfilePage() {
  const { t } = useTranslation('customer');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    phone: '',
    dateOfBirth: '',
    height: '',
    weight: '',
    medicalNotes: '',
    profilePhoto: '',
    profession: '',
    gender: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data: any = await apiClient.get('/customers/me/overview');
      setProfile(data.customer);

      // Populate form with existing data
      setFormData({
        phone: data.customer.userId.phone || '',
        dateOfBirth: data.customer.dateOfBirth ? new Date(data.customer.dateOfBirth).toISOString().split('T')[0] : '',
        height: data.customer.height?.toString() || '',
        weight: data.customer.weight?.toString() || '',
        medicalNotes: data.customer.medicalNotes || '',
        profilePhoto: data.customer.profilePhoto || '',
        profession: data.customer.profession || '',
        gender: data.customer.gender || '',
        emergencyContactName: data.customer.emergencyContactName || '',
        emergencyContactPhone: data.customer.emergencyContactPhone || '',
      });

      // Set preview URL if profile photo exists
      if (data.customer.profilePhoto) {
        if (data.customer.profilePhoto.startsWith('http')) {
          setPreviewUrl(data.customer.profilePhoto);
        } else {
          // Remove /api from the URL since uploads are served from root
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          const baseUrl = apiBaseUrl.replace('/api', '');
          setPreviewUrl(`${baseUrl}${data.customer.profilePhoto}`);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
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
        profession: formData.profession,
        gender: formData.gender,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        medicalNotes: formData.medicalNotes,
        profilePhoto: formData.profilePhoto,
      };

      if (formData.dateOfBirth) {
        updates.dateOfBirth = formData.dateOfBirth;
      }
      if (formData.height) {
        updates.height = parseFloat(formData.height);
      }
      if (formData.weight) {
        updates.weight = parseFloat(formData.weight);
      }

      await apiClient.patch('/customers/me/profile', updates);
      toast.success(t('profile.updateSuccess'));
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('profile.updateError'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t('profile.photo.invalidType'));
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('profile.photo.fileTooLarge'));
        return;
      }

      setSelectedFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile) {
      toast.error(t('profile.photo.selectFile'));
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('photo', selectedFile);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/customers/me/profile-photo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: t('profile.photo.uploadFailed') }));
        throw new Error(errorData.error || t('profile.photo.uploadFailed'));
      }

      const data = await response.json();

      // Immediately update the preview URL with the uploaded photo
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const baseUrl = apiBaseUrl.replace('/api', '');
      const fullPhotoUrl = `${baseUrl}${data.photoUrl}`;
      setPreviewUrl(fullPhotoUrl);
      setFormData(prev => ({
        ...prev,
        profilePhoto: data.photoUrl,
      }));

      toast.success(t('profile.photo.uploadSuccess'));
      setSelectedFile(null);

      // Refetch profile to sync with server
      await fetchProfile();
    } catch (error: any) {
      toast.error(error.message || t('profile.photo.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
          <p className="text-lg text-gray-600">{t('profile.loading')}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-3xl p-16 shadow-xl border border-gray-200 text-center max-w-2xl mx-auto">
          <p className="text-lg text-gray-600">{t('profile.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Photo Section */}
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-lg border border-white/30 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-6">
              <h2 className="text-2xl font-bold text-white mb-1">{t('profile.photo.title')}</h2>
              <p className="text-orange-100 text-sm">{t('profile.photo.description')}</p>
            </div>
            <div className="p-8">
              <div className="flex flex-col items-center space-y-6">
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Profile"
                      className="w-48 h-48 rounded-full object-cover ring-4 ring-orange-100 shadow-xl"
                    />
                    <div className="absolute bottom-2 right-2 w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center text-6xl font-bold text-white shadow-xl ring-4 ring-orange-100">
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
                        Choose Photo
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
                      <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                        <p className="text-xs text-orange-900 font-medium">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handlePhotoUpload}
                        disabled={uploading}
                        className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-xl py-3 shadow-md hover:shadow-lg transition-all"
                      >
                        {uploading ? t('profile.photo.uploading') : t('profile.photo.uploadButton')}
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center leading-relaxed">
                    {t('profile.photo.uploadInstruction')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-lg border border-white/30 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-8 py-6">
                <h2 className="text-2xl font-bold text-white mb-1">{t('profile.personalInfo')}</h2>
                <p className="text-orange-100 text-sm">{t('profile.personalInfoDesc')}</p>
              </div>
              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.fields.fullName')}</label>
                      <input
                        type="text"
                        value={profile.userId.name}
                        disabled
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-medium"
                      />
                      <p className="text-xs text-gray-500 mt-2">{t('profile.fields.contactAdminName')}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.fields.email')}</label>
                      <input
                        type="email"
                        value={profile.userId.email}
                        disabled
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 font-medium"
                      />
                      <p className="text-xs text-gray-500 mt-2">{t('profile.fields.contactAdminEmail')}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.fields.phone')}</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      placeholder={t('profile.fields.phonePlaceholder')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.fields.dateOfBirth')}</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.fields.gender')}</label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                      >
                        <option value="">{t('profile.fields.genderSelect')}</option>
                        <option value="male">{t('profile.fields.genderMale')}</option>
                        <option value="female">{t('profile.fields.genderFemale')}</option>
                        <option value="other">{t('profile.fields.genderOther')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.fields.profession')}</label>
                    <select
                      name="profession"
                      value={formData.profession}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    >
                      <option value="">{t('profile.fields.professionSelect')}</option>
                      <option value="student">{t('profile.fields.professionStudent')}</option>
                      <option value="employed">{t('profile.fields.professionEmployed')}</option>
                      <option value="retired">{t('profile.fields.professionRetired')}</option>
                      <option value="homemaker">{t('profile.fields.professionHomemaker')}</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      {t('profile.fields.professionNote')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.fields.height')}</label>
                      <input
                        type="number"
                        name="height"
                        value={formData.height}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder={t('profile.fields.heightPlaceholder')}
                        min="0"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.fields.weight')}</label>
                      <input
                        type="number"
                        name="weight"
                        value={formData.weight}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder={t('profile.fields.weightPlaceholder')}
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      {t('profile.fields.medicalNotes')}
                    </label>
                    <textarea
                      name="medicalNotes"
                      value={formData.medicalNotes}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
                      placeholder={t('profile.fields.medicalNotesPlaceholder')}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {t('profile.fields.medicalNotesNote')}
                    </p>
                  </div>

                  {/* Emergency Contact */}
                  <div className="pt-6 border-t-2 border-gray-100">
                    <h3 className="font-bold mb-6 text-xl text-gray-900 flex items-center gap-2">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {t('profile.emergency.title')}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.emergency.name')}</label>
                        <input
                          type="text"
                          name="emergencyContactName"
                          value={formData.emergencyContactName}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder={t('profile.emergency.namePlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">{t('profile.emergency.phone')}</label>
                        <input
                          type="tel"
                          name="emergencyContactPhone"
                          value={formData.emergencyContactPhone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder={t('profile.emergency.phonePlaceholder')}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all font-semibold"
                    >
                      {saving ? t('profile.buttons.saving') : t('profile.buttons.save')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={fetchProfile}
                      className="flex-1 py-3 rounded-xl border-2 font-semibold"
                    >
                      {t('profile.buttons.cancel')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

      <Toaster position="top-right" />
    </div>
  );
}
