'use client';

import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

export default function ContactPage() {
  const { t } = useTranslation('customer');

  return (
    <div className="min-h-screen">
      {/* Contact & Location Section */}
      <section className="relative py-20">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                Contact Us
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
      </section>
    </div>
  );
}
