import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header/Navigation */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Core Studio Pilates"
                width={300}
                height={120}
                className="h-24 w-auto md:h-28"
                priority
              />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/about" className="text-gray-600 hover:text-primary-600">
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
              <Link href="/contact" className="text-gray-600 hover:text-primary-600">
                Contact
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
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Transform Your Body & Mind
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Experience the power of Pilates with our expert instructors. Build strength, flexibility, and
          mindfulness in our premium studio.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg">Book Your First Session</Button>
          </Link>
          <Link href="/classes">
            <Button size="lg" variant="outline">
              View Classes
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Core Studio?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Expert Instructors</CardTitle>
              <CardDescription>
                Certified Pilates instructors with years of experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Our team of certified instructors brings expertise and passion to every session,
                ensuring you get personalized attention and proper form.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flexible Scheduling</CardTitle>
              <CardDescription>Book sessions that fit your lifestyle</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Easy online booking system with flexible scheduling options. Choose from private
                sessions or group classes at times that work for you.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Premium Equipment</CardTitle>
              <CardDescription>State-of-the-art Pilates equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Train with top-quality reformers and equipment in a clean, welcoming studio
                environment designed for your comfort.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Class Types */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Classes</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Private Sessions</CardTitle>
                <CardDescription>One-on-one personalized training</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Get personalized attention with private sessions tailored to your goals, fitness
                  level, and any specific needs or injuries.
                </p>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full">
                    View Pricing
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Group Classes</CardTitle>
                <CardDescription>Small group training sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Join our intimate group classes for a motivating and social Pilates experience
                  while still receiving individual attention.
                </p>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full">
                    View Pricing
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join our community and discover the transformative power of Pilates.
        </p>
        <Link href="/auth/register">
          <Button size="lg">Get Started Today</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Image
                src="/logo.png"
                alt="Core Studio Pilates"
                width={180}
                height={70}
                className="h-14 w-auto mb-4"
              />
              <div className="text-xl font-bold text-primary-600 mb-4 sr-only">Core Studio</div>
              <p className="text-gray-600 text-sm">
                Premium Pilates studio dedicated to helping you achieve your fitness goals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-primary-600">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/classes" className="text-gray-600 hover:text-primary-600">
                    Classes
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-gray-600 hover:text-primary-600">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>info@corestudio.com</li>
                <li>+66-xxx-xxx-xxxx</li>
                <li>Bangkok, Thailand</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Hours</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Mon - Fri: 6AM - 9PM</li>
                <li>Sat - Sun: 7AM - 7PM</li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
            © 2025 Core Studio Pilates. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
