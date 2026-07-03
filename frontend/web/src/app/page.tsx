import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'JobSwipe - Swipe Your Way to Your Dream Job',
  description: 'The modern way to find your perfect job. Swipe right on opportunities, swipe left on what doesn\'t fit. Your career journey starts here.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-indigo-600">💼 JobSwipe</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-700 hover:text-indigo-600 transition">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-indigo-600 transition">How It Works</a>
              <a href="#about" className="text-gray-700 hover:text-indigo-600 transition">About</a>
            </div>
            <div className="flex space-x-4">
              <Link href="/login" className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium transition">
                Sign In
              </Link>
              <Link href="/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Swipe Your Way to Your
            <span className="text-indigo-600"> Dream Job</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            The modern way to find your perfect career match. Swipe right on opportunities that excite you, 
            swipe left on what doesn&apos;t fit. It&apos;s job hunting, reimagined.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition shadow-lg">
              Start Swiping Jobs
            </Link>
            <Link href="/login" className="px-8 py-4 bg-white text-indigo-600 border-2 border-indigo-600 rounded-lg text-lg font-semibold hover:bg-indigo-50 transition">
              Post a Job
            </Link>
          </div>
          <div className="mt-12 flex justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Free to use
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span> No spam
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Smart matching
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why JobSwipe?</h2>
            <p className="text-xl text-gray-600">Modern job hunting for the modern professional</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="text-4xl mb-4">👆</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Swipe to Match</h3>
              <p className="text-gray-600">
                Intuitive swipe interface makes job hunting fun and efficient. Right for yes, left for no.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Matching</h3>
              <p className="text-gray-600">
                Our AI learns your preferences and shows you jobs that truly match your skills and interests.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Apply</h3>
              <p className="text-gray-600">
                Apply to jobs with one tap. Your profile is always ready, no repetitive forms.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Direct Chat</h3>
              <p className="text-gray-600">
                Connect directly with hiring managers. No middlemen, no delays.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Track Progress</h3>
              <p className="text-gray-600">
                See all your applications in one place. Know exactly where you stand.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Privacy First</h3>
              <p className="text-gray-600">
                Your data is yours. We never share your information without permission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get started in 3 simple steps</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Create Your Profile</h3>
              <p className="text-gray-600">
                Sign up in minutes. Add your skills, experience, and what you&apos;re looking for.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Start Swiping</h3>
              <p className="text-gray-600">
                Browse personalized job matches. Swipe right on jobs you love, left on ones you don&apos;t.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Hired</h3>
              <p className="text-gray-600">
                When you match with a company, chat directly and schedule interviews. Land your dream job!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-indigo-200">Active Jobs</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5K+</div>
              <div className="text-indigo-200">Companies</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-indigo-200">Job Seekers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-indigo-200">Match Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Find Your Dream Job?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of professionals who&apos;ve already found their perfect match
          </p>
          <Link href="/login" className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700 transition shadow-lg">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-white text-xl font-bold mb-4">💼 JobSwipe</div>
              <p className="text-sm">Swipe your way to your dream job</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">For Companies</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 JobSwipe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
