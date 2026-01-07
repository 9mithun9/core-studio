'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { apiClient } from '@/lib/apiClient';

interface Teacher {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  bio?: string;
  specialties?: string[];
  yearsOfExperience?: number;
  imageUrl?: string;
  isActive: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const user = authService.getStoredUser();
    if (user) {
      // Redirect to appropriate dashboard
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else if (user.role === 'customer') {
        router.push('/customer/dashboard');
      }
    } else {
      // Fetch teachers for public view
      fetchTeachers();
    }
  }, [router]);

  const fetchTeachers = async () => {
    try {
      const response: any = await apiClient.get('/teachers');
      if (response && response.teachers) {
        const activeTeachers = response.teachers.filter((t: Teacher) => t.isActive);
        setTeachers(activeTeachers);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const packages = [
    {
      key: 'single',
      sessions: 1,
      pricing: { private: 1500, duo: 1200, group: 800 },
    },
    {
      key: 'starter',
      sessions: 5,
      pricing: { private: 7000, duo: 5500, group: 3500 },
      popular: true,
    },
    {
      key: 'standard',
      sessions: 10,
      pricing: { private: 13000, duo: 10000, group: 6500 },
      popular: true,
    },
    {
      key: 'premium',
      sessions: 20,
      pricing: { private: 24000, duo: 18000, group: 12000 },
    },
    {
      key: 'ultimate',
      sessions: 30,
      pricing: { private: 34000, duo: 25000, group: 16500 },
    },
  ];

  const handlePackageClick = () => {
    setShowAuthModal(true);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background Pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, top: '-100px', bottom: 0 }}>
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
          {/* Overlay for better text readability */}
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
          <path d="M12 0L12.5 8L12 11L11.5 8L12 0ZM12 13L12.5 16L12 24L11.5 16L12 13ZM0 12L8 11L11 12L8 13L0 12ZM13 12L16 11L24 12L16 13L13 12Z"/>
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

      {/* Floating Buttons */}
      <div className="fixed top-8 right-8 flex items-center gap-3 z-50">
        <Link
          href="/auth/login"
          className="px-6 py-3 text-sm font-semibold text-white bg-white/20 backdrop-blur-md border border-white/30 rounded-full hover:bg-white/30 transition-all shadow-lg"
        >
          Sign In
        </Link>
        <Link
          href="/auth/register"
          className="px-6 py-3 text-sm font-semibold text-white bg-white/20 backdrop-blur-md border border-white/30 rounded-full hover:bg-white/30 transition-all shadow-lg"
        >
          Get Started
        </Link>
      </div>

      {/* Hero Section - Big Title */}
      <section className="relative min-h-screen flex items-center px-4" style={{ zIndex: 1 }}>
        <div className="container mx-auto">
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-extrabold text-white leading-none tracking-tight">
            CORE<br />
            STUDIO<br />
            PILATES
          </h1>
        </div>
      </section>

      {/* Contact & Location Section */}
      <section id="contact" className="relative py-20 px-4" style={{ zIndex: 1 }}>
        <div className="container mx-auto px-4 md:px-8">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                Visit Us
              </h2>
              <p className="text-lg text-gray-700">Find us and get in touch</p>
            </div>

            {/* Content */}
            <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="flex flex-col justify-center h-full space-y-8">
                {/* Location */}
                <div className="group">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-orange-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 leading-relaxed text-lg">
                        Lobby 92 Ravipha residence<br />
                        Thetsaban Songkhro 2 Alley, Lat Yao<br />
                        Chatuchak, Bangkok 10900
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="group">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-orange-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <a href="tel:+66659693099" className="text-orange-600 hover:text-orange-700 font-semibold text-xl inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                        <span>+66 65 969 3099</span>
                        <span className="text-base text-gray-600">(LINE)</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Follow Us */}
                <div className="group">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-orange-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <a
                        href="https://www.facebook.com/profile.php?id=100063617495076"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 hover:text-orange-700 font-semibold text-xl inline-block hover:underline"
                      >
                        Core Studio Pilates
                      </a>
                    </div>
                  </div>
                </div>
            </div>

            {/* Map */}
            <div className="rounded-3xl overflow-hidden shadow-2xl border-8 border-white">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3873.6891234567!2d100.5615!3d13.8445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTPCsDUwJzQwLjIiTiAxMDDCsDMzJzQxLjQiRQ!5e0!3m2!1sen!2sth!4v1234567890"
                width="100%"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Core Studio Pilates Location"
              ></iframe>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="relative py-20 px-4" style={{ zIndex: 1 }}>
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Choose Your Package
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Flexible options designed to match your fitness goals and lifestyle
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {packages.map((pkg) => (
              <div
                key={pkg.key}
                className={`relative bg-white/30 backdrop-blur-md rounded-3xl p-6 shadow-xl border-2 transition-all hover:scale-105 hover:shadow-2xl ${
                  pkg.popular ? 'border-orange-300/50' : 'border-white/40'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-orange-400 to-pink-400 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                      POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1 capitalize">{pkg.key}</h3>
                  <p className="text-gray-700 text-sm">{pkg.sessions} {pkg.sessions === 1 ? 'Session' : 'Sessions'}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">Private</span>
                    <span className="font-bold text-orange-600 text-sm">฿{pkg.pricing.private.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">Duo</span>
                    <span className="font-bold text-orange-600 text-sm">฿{pkg.pricing.duo.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">Group</span>
                    <span className="font-bold text-orange-600 text-sm">฿{pkg.pricing.group.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={handlePackageClick}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold rounded-full hover:shadow-lg transition-all text-sm"
                >
                  Request
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teachers Section */}
      {teachers.length > 0 && (
        <section id="teachers" className="relative py-20 px-4" style={{ zIndex: 1 }}>
          <div className="container mx-auto px-4 md:px-8">
            <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 p-8 md:p-12">
              {/* Header */}
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                  Meet Our Instructors
                </h2>
                <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                  Expert guidance from certified Pilates professionals
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
              {teachers.map((teacher) => (
                <div
                  key={teacher._id}
                  className="bg-white/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-white/60 group w-56"
                >
                  <div className="aspect-square relative bg-gradient-to-br from-orange-100 to-pink-100">
                    {teacher.imageUrl ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${teacher.imageUrl}`}
                        alt={teacher.userId.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold">
                          {teacher.userId.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-white/60 backdrop-blur-sm text-center">
                    <h3 className="text-lg font-bold text-gray-900">{teacher.userId.name}</h3>
                    {teacher.yearsOfExperience && (
                      <p className="text-xs text-orange-600 font-semibold mt-1">
                        {teacher.yearsOfExperience} Years
                      </p>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/40">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Your Journey?</h3>
            <p className="text-gray-700 mb-8">
              Sign in to request a package and begin your Pilates transformation.
            </p>
            <div className="space-y-3">
              <Link
                href="/auth/login"
                className="block w-full py-3 bg-gradient-to-r from-orange-400 to-pink-400 text-white font-semibold rounded-full text-center hover:shadow-lg transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="block w-full py-3 bg-white/50 backdrop-blur-sm border-2 border-white/60 text-orange-600 font-semibold rounded-full text-center hover:bg-white/70 transition-all"
              >
                Create Account
              </Link>
              <button
                onClick={() => setShowAuthModal(false)}
                className="block w-full py-3 bg-white/40 backdrop-blur-sm text-gray-700 font-medium hover:bg-white/60 transition-all rounded-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-orange-400 to-pink-400 text-white py-6 px-4" style={{ zIndex: 1 }}>
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm font-medium">
              © 2026 Core Studio Pilates. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="tel:+66659693099" className="hover:text-white/80 transition-colors" title="LINE">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.776.039 1.08l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.541 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.843 2.572-5.787zm-18.988-2.595c.129 0 .234.105.234.234v4.153h2.287c.129 0 .233.104.233.233v.842c0 .129-.104.234-.233.234h-3.363c-.129 0-.234-.105-.234-.234v-5.228c0-.129.105-.234.234-.234h.842zm3.728 0c.129 0 .234.105.234.234v5.228c0 .129-.105.234-.234.234h-.842c-.129 0-.234-.105-.234-.234v-5.228c0-.129.105-.234.234-.234h.842zm5.484 0c.129 0 .234.105.234.234v.842c0 .129-.105.234-.234.234h-2.287v.883h2.287c.129 0 .234.105.234.234v.842c0 .129-.105.234-.234.234h-2.287v.883h2.287c.129 0 .234.105.234.234v.842c0 .129-.105.234-.234.234h-3.363c-.129 0-.234-.105-.234-.234v-5.228c0-.129.105-.234.234-.234h3.363zm5.484 0c.129 0 .234.105.234.234v5.228c0 .129-.105.234-.234.234h-.842c-.129 0-.234-.105-.234-.234v-3.546l-2.681 3.64c-.047.065-.123.106-.206.106h-.047c-.082 0-.158-.041-.206-.106l-2.68-3.64v3.546c0 .129-.105.234-.234.234h-.842c-.129 0-.234-.105-.234-.234v-5.228c0-.129.105-.234.234-.234h.076c.082 0 .158.041.205.106l3.073 4.168 3.073-4.168c.047-.065.123-.106.205-.106h.076z"/>
                </svg>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=100063617495076"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/80 transition-colors"
                title="Facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
