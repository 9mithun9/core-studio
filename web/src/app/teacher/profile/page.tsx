'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

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
      toast.success(t('profile.updateSuccess'));
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('profile.error_update_profile'));
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
      if (!file.type.startsWith('image/')) {
        toast.error(t('profile.error_select_image'));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('profile.error_file_size'));
        return;
      }

      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile) {
      toast.error(t('profile.error_select_file'));
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('photo', selectedFile);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/teachers/me/profile-photo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const baseUrl = apiBaseUrl.replace('/api', '');
      const fullPhotoUrl = `${baseUrl}${data.photoUrl}`;
      setPreviewUrl(fullPhotoUrl);

      toast.success(t('profile.photo_upload_success'));
      setSelectedFile(null);

      await fetchProfile();
    } catch (error: any) {
      toast.error(error.message || t('profile.error_upload_photo'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-6 md:py-8">{t('common.loading')}</div>;
  }

  if (!profile) {
    return <div className="container mx-auto px-4 py-6 md:py-8">{t('profile.not_found')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">{t('profile.title')}</h1>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        {/* Profile Photo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">{t('profile.photo_title')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('profile.photo_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-3 md:space-y-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={t('profile.profilePhoto')}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-primary-100"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary-100 flex items-center justify-center text-3xl md:text-4xl font-bold text-primary-600">
                  {profile.userId.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="w-full space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full text-xs md:text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />

                {selectedFile && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-gray-600">
                      {t('profile.selected')}: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                    <Button
                      type="button"
                      onClick={handlePhotoUpload}
                      disabled={uploading}
                      className="w-full"
                      size="sm"
                    >
                      <span className="text-xs md:text-sm">{uploading ? t('profile.uploading') : t('profile.upload_photo')}</span>
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center">
                {t('profile.upload_note')}
              </p>
            </div>

            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm text-gray-600">{t('profile.status')}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    profile.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.isActive ? t('profile.active') : t('profile.inactive')}
                  </span>
                </div>
                {profile.yearsOfExperience !== undefined && profile.yearsOfExperience > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-gray-600">{t('profile.experience')}</span>
                    <span className="text-xs md:text-sm font-medium text-gray-900">
                      {profile.yearsOfExperience} {profile.yearsOfExperience === 1 ? t('profile.year') : t('profile.years')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Form */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.edit_profile_title')}</CardTitle>
              <CardDescription>{t('profile.edit_profile_description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('profile.fullName')}</label>
                    <input
                      type="text"
                      value={profile.userId.name}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('profile.contact_admin_name')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t('profile.email')}</label>
                    <input
                      type="email"
                      value={profile.userId.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('profile.contact_admin_email')}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('profile.phoneNumber')}</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={t('profile.phone_placeholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">{t('profile.yearsOfExperience')}</label>
                    <input
                      type="number"
                      name="yearsOfExperience"
                      value={formData.yearsOfExperience}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={t('profile.experience_placeholder')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('profile.bio')}</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={t('profile.bio_placeholder')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('profile.bio_note')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">{t('profile.specialties')}</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SPECIALTY_OPTIONS.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => toggleSpecialty(specialty)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          formData.specialties.includes(specialty)
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('profile.specialties_note')}
                  </p>
                </div>

                {formData.specialties.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('profile.selected_specialties')}</label>
                    <div className="flex flex-wrap gap-2">
                      {formData.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? t('profile.saving') : t('profile.save_changes')}
                  </Button>
                  <Button type="button" variant="outline" onClick={fetchProfile}>
                    {t('profile.cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
