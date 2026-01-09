'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';

interface Teacher {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  bio?: string;
  specialties?: string[];
  yearsOfExperience?: number;
  imageUrl?: string;
  isActive: boolean;
}

export default function TeachersPage() {
  const { t } = useTranslation('customer');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response: any = await apiClient.get('/teachers');

      if (response && response.teachers) {
        const activeTeachers = response.teachers.filter((t: Teacher) => t.isActive);
        setTeachers(activeTeachers);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
          <p className="text-lg text-gray-600">{t('teachers.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            {t('teachers.title')}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            {t('teachers.subtitle')}
          </p>
        </div>

        {teachers.length === 0 ? (
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-16 shadow-xl border border-white/30 text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-lg text-gray-600">{t('teachers.noTeachers')}</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-transparent max-w-full">
              <div className="flex gap-6 px-4" style={{ scrollBehavior: 'smooth' }}>
            {teachers.map((teacher) => {
              const teacherName = teacher.userId?.name || 'Teacher';
              const teacherInitial = teacherName.charAt(0).toUpperCase();

              return (
                <div
                  key={teacher._id}
                  className="group bg-white/10 backdrop-blur-md rounded-3xl overflow-hidden transition-all duration-300 border border-white/20 hover:border-orange-300/50 flex-shrink-0 w-80 snap-start"
                >
                  {/* Card Header with Profile Image */}
                  <div className="relative bg-gradient-to-br from-orange-500 via-pink-500 to-orange-600 p-8 pb-12">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20"></div>
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mb-16"></div>
                    </div>

                    {/* Experience Badge - Top Left */}
                    {teacher.yearsOfExperience !== undefined && (
                      <div className="absolute top-4 left-4 z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          <span className="text-xs font-bold text-gray-900">
                            {teacher.yearsOfExperience}{' '}
                            {teacher.yearsOfExperience === 1 ? t('teachers.year') : t('teachers.years')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Profile Picture */}
                    <div className="relative flex justify-center">
                      <div className="w-40 h-40 rounded-full bg-white p-1.5 shadow-2xl ring-4 ring-white ring-opacity-50">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center text-white text-5xl font-bold overflow-hidden">
                          {teacher.imageUrl ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${teacher.imageUrl}`}
                              alt={teacherName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            teacherInitial
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="px-8 pb-8 pt-4">
                    {/* Name */}
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {teacherName}
                      </h3>
                    </div>

                    {/* Bio */}
                    {teacher.bio && (
                      <p className="text-gray-600 text-sm leading-relaxed mb-6 text-center min-h-[3rem]">
                        {teacher.bio}
                      </p>
                    )}

                    {/* Specialties */}
                    {teacher.specialties && teacher.specialties.length > 0 && (
                      <div className="mb-6">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {teacher.specialties.map((specialty, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-700 rounded-full text-xs font-semibold border border-orange-200"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact Button */}
                    {teacher.userId?.phone && (
                      <a
                        href={`https://line.me/ti/p/~${teacher.userId.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-semibold text-sm group-hover:scale-105 transform duration-200"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                        </svg>
                        {t('teachers.contactLine')}
                      </a>
                    )}

                    {/* Empty State for Minimal Info */}
                    {!teacher.bio && (!teacher.specialties || teacher.specialties.length === 0) && !teacher.userId?.phone && (
                      <div className="text-center py-6">
                        <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">
                          {t('teachers.certifiedInstructor')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
