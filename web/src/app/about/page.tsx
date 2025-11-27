import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/">
              <div className="text-2xl font-bold text-primary-600">Core Studio</div>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/about" className="text-primary-600 font-medium">
                About
              </Link>
              <Link href="/classes" className="text-gray-600 hover:text-primary-600">
                Classes
              </Link>
              <Link href="/pricing" className="text-gray-600 hover:text-primary-600">
                Pricing
              </Link>
              <Link href="/instructors" className="text-gray-600 hover:text-primary-600">
                Instructors
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">About Core Studio</h1>
            <p className="text-xl text-gray-600">
              Your journey to strength, flexibility, and mindful movement starts here.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Our Story</h2>

            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">
                Core Studio was founded with a simple mission: to make Pilates accessible,
                effective, and enjoyable for everyone. Whether you're a beginner or an advanced
                practitioner, we're here to support your fitness journey.
              </p>

              <p className="text-gray-600 mb-6">
                Our studio combines traditional Pilates principles with modern techniques,
                offering both mat-based and equipment-based sessions tailored to your individual
                needs and goals.
              </p>

              <p className="text-gray-600 mb-6">
                We believe in the transformative power of mindful movement. Our approach focuses
                on building core strength, improving posture, increasing flexibility, and
                creating body awareness that extends beyond the studio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-4">Personalized Attention</h3>
              <p className="text-gray-600">
                Every body is unique. We provide individualized instruction and modifications
                to ensure safe, effective practice for all fitness levels.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-4">Expert Instruction</h3>
              <p className="text-gray-600">
                Our certified instructors bring years of experience and ongoing education
                to deliver the highest quality Pilates instruction.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-4">Welcoming Community</h3>
              <p className="text-gray-600">
                Join a supportive community of like-minded individuals committed to
                health, wellness, and personal growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location & Contact */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Visit Us</h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Location</h3>
                <p className="text-gray-600 mb-2">
                  Dhaka, Bangladesh
                </p>
                <p className="text-gray-600 mb-4">
                  Convenient location with easy access
                </p>

                <h3 className="text-xl font-bold mb-4 mt-8">Contact</h3>
                <p className="text-gray-600 mb-2">
                  Email: info@corestudio.com
                </p>
                <p className="text-gray-600">
                  Phone: +880-xxx-xxx-xxxx
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">Studio Hours</h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span>6:00 AM - 9:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span>7:00 AM - 7:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>7:00 AM - 7:00 PM</span>
                  </div>
                </div>

                <div className="mt-8">
                  <Link href="/auth/register">
                    <Button size="lg" className="w-full">
                      Book Your First Session
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>© 2025 Core Studio. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <Link href="/about" className="hover:text-primary-600">About</Link>
            <Link href="/classes" className="hover:text-primary-600">Classes</Link>
            <Link href="/pricing" className="hover:text-primary-600">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
