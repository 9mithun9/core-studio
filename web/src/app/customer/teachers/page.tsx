'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response: any = await apiClient.get('/teachers');
      console.log('Teachers response:', response);

      if (response && response.teachers) {
        const activeTeachers = response.teachers.filter((t: Teacher) => t.isActive);
        console.log('Active teachers:', activeTeachers);
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-gray-600">Loading teachers...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Instructors</h1>
        <p className="text-gray-600">
          Meet our team of certified Pilates instructors dedicated to helping you achieve your fitness
          goals.
        </p>
      </div>

      {teachers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No instructors available at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <Card key={teacher._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex flex-col items-center mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold mb-4 overflow-hidden">
                    {teacher.imageUrl ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${teacher.imageUrl}`}
                        alt={teacher.userId.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      teacher.userId.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <CardTitle className="text-xl text-center">{teacher.userId.name}</CardTitle>
                  {teacher.yearsOfExperience !== undefined && (
                    <p className="text-sm text-gray-600 mt-1">
                      {teacher.yearsOfExperience} {teacher.yearsOfExperience === 1 ? 'year' : 'years'}{' '}
                      of experience
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {teacher.bio && (
                  <p className="text-gray-700 mb-4 text-sm leading-relaxed">{teacher.bio}</p>
                )}

                {teacher.specialties && teacher.specialties.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-gray-900 mb-2">Specialties:</h4>
                    <div className="flex flex-wrap gap-2">
                      {teacher.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-medium"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {teacher.userId.phone && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                      href={`https://line.me/ti/p/~${teacher.userId.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                      </svg>
                      Contact on LINE
                    </a>
                  </div>
                )}

                {!teacher.bio && (!teacher.specialties || teacher.specialties.length === 0) && !teacher.userId.phone && (
                  <p className="text-gray-500 text-sm italic text-center">
                    Certified Pilates Instructor
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
