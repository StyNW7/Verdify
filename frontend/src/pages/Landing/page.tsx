'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  ArrowRight,
  Leaf,
  MapPin,
  BarChart3,
  Zap,
  Users,
  TrendingUp,
  ChevronDown,
  Sparkles,
  Award,
  Shield,
  Globe,
  Battery,
  Cloud,
  Database,
  Cpu,
  Network,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Custom hook for scroll animations
const useScrollAnimation = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  return { ref, inView };
};

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const heroRef = useScrollAnimation();
  const aboutRef = useScrollAnimation();
  const howItWorksRef = useScrollAnimation();
  const featuresRef = useScrollAnimation();
  const statsRef = useScrollAnimation();
  const techRef = useScrollAnimation();
  const testimonialsRef = useScrollAnimation();
  const faqRef = useScrollAnimation();

  return (
    <div className="bg-white overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-green-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-100/50 to-transparent rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              ref={heroRef.ref}
              initial={{ opacity: 0, x: -50 }}
              animate={heroRef.inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-full mb-6"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  AI-Powered Sustainable Mobility
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={heroRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 }}
                className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight"
              >
                Navigate Green,
                <br />
                <span className="text-gradient">Travel Smart</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={heroRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4 }}
                className="text-xl text-gray-600 mb-8 leading-relaxed"
              >
                Verdify is your AI Personal Green Navigator. We autonomously plan, calculate, book, and report sustainable journeys while minimizing your carbon footprint.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 mb-12"
              >
                <button className="group bg-gradient-to-r from-emerald-600 to-green-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
                  Start Your Green Journey
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </button>
                <button className="border-2 border-emerald-600 text-emerald-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-emerald-50 transition-all duration-300">
                  Watch Demo
                </button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={heroRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-3 gap-6"
              >
                {[
                  { value: "500K+", label: "Green Journeys", icon: Leaf },
                  { value: "50K", label: "Tons CO₂ Saved", icon: BarChart3 },
                  { value: "98%", label: "Satisfaction", icon: Award },
                ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <stat.icon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Visual */}
            <motion.div
              ref={heroRef.ref}
              initial={{ opacity: 0, x: 50 }}
              animate={heroRef.inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-emerald-100 to-green-100 rounded-3xl p-8 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-3xl" />
                
                {/* Animated Map Illustration */}
                <div className="relative aspect-square rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/50 rounded-2xl" />

                  <img src='/Images/Johor-Singapore.jpg' className='h-full'></img>
                  
                  {/* Floating Elements */}
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="absolute top-8 left-8 bg-white p-4 rounded-xl shadow-lg"
                  >
                    <Leaf className="w-8 h-8 text-emerald-600" />
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-8 right-8 bg-white p-4 rounded-xl shadow-lg"
                  >
                    <MapPin className="w-8 h-8 text-emerald-600" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-xl"
                  >
                    <p className="text-sm font-semibold text-gray-900">Route Optimized</p>
                    <p className="text-xs text-emerald-600">-85% Carbon</p>
                  </motion.div>

                  {/* Decorative Lines */}
                  <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.1 }}>
                    <circle cx="50%" cy="50%" r="80" fill="none" stroke="#059669" strokeWidth="2" strokeDasharray="4 4" />
                    <circle cx="50%" cy="50%" r="140" fill="none" stroke="#059669" strokeWidth="1" strokeDasharray="2 6" />
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            ref={aboutRef.ref}
            initial={{ opacity: 0, y: 30 }}
            animate={aboutRef.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">About Verdify</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Verdify is revolutionizing sustainable mobility by combining AI intelligence with practical routing to help individuals and businesses reduce their carbon emissions.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "AI-Powered Planning",
                description: "Intelligent algorithms analyze millions of routes to find the most sustainable options tailored to your needs.",
                icon: Cpu,
              },
              {
                title: "Autonomous Booking",
                description: "Seamlessly book green transportation options without switching between multiple platforms.",
                icon: Zap,
              },
              {
                title: "Impact Tracking",
                description: "Track your carbon footprint reduction and see the real environmental impact of your green choices.",
                icon: TrendingUp,
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={aboutRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="bg-gradient-to-br from-emerald-100 to-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <item.icon className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            ref={howItWorksRef.ref}
            initial={{ opacity: 0, y: 30 }}
            animate={howItWorksRef.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">How Verdify Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Four simple steps to your most sustainable journey yet.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Input Journey", description: "Tell us your destination, time, and preferences", icon: MapPin },
              { step: "02", title: "AI Analysis", description: "Our AI evaluates all sustainable options", icon: Cpu },
              { step: "03", title: "Autonomous Booking", description: "One-click booking with integrated services", icon: Zap },
              { step: "04", title: "Track Impact", description: "Monitor your carbon footprint savings", icon: BarChart3 },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={howItWorksRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-xl transition-all duration-300 group">
                  <div className="text-5xl font-bold text-emerald-200 mb-4">{item.step}</div>
                  <div className="bg-emerald-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-emerald-300">
                    <ArrowRight size={24} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            ref={featuresRef.ref}
            initial={{ opacity: 0, y: 30 }}
            animate={featuresRef.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Powerful Features</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to make sustainable mobility decisions with confidence.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: "Real-Time Route Optimization", description: "Get updated routes based on traffic, weather, and transport availability.", icon: MapPin },
              { title: "Carbon Emissions Calculator", description: "Transparent calculations show exactly how much CO₂ you're saving.", icon: BarChart3 },
              { title: "Multi-Modal Transportation", description: "Seamlessly combine walking, cycling, public transit, and electric vehicles.", icon: Battery },
              { title: "Community Impact", description: "Join a community of eco-conscious travelers and see collective impact.", icon: Users },
              { title: "Green Rewards System", description: "Earn points for sustainable choices and redeem them for exclusive benefits.", icon: Award },
              { title: "Enterprise Integration", description: "Fleet management solutions for businesses committed to sustainability.", icon: Shield },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={featuresRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                className="group bg-white p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex gap-4">
                  <div className="bg-gradient-to-br from-emerald-100 to-green-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 to-green-700">
        <div className="max-w-7xl mx-auto">
          <motion.div
            ref={statsRef.ref}
            initial={{ opacity: 0, y: 30 }}
            animate={statsRef.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Our Impact</h2>
            <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
              Real numbers from our growing community of green travelers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "500K+", label: "Green Journeys", icon: Leaf, suffix: "" },
              { value: "50K", label: "Tons CO₂ Saved", icon: Globe, suffix: "" },
              { value: "150+", label: "Cities Covered", icon: MapPin, suffix: "" },
              { value: "98", label: "User Satisfaction", icon: Award, suffix: "%" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={statsRef.inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: index * 0.1 }}
                className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/20 transition-all duration-300"
              >
                <stat.icon className="w-10 h-10 text-white mx-auto mb-4" />
                <p className="text-4xl lg:text-5xl font-bold text-white mb-2">
                  {stat.value}{stat.suffix}
                </p>
                <p className="text-emerald-100 text-lg">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack Section */}
      <section id="technology" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            ref={techRef.ref}
            initial={{ opacity: 0, y: 30 }}
            animate={techRef.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Powered by Google AI Ecosystem</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Verdify leverages cutting-edge Google technologies to deliver intelligent, sustainable routing solutions.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { name: "Google Gemini", description: "Advanced language models for natural conversation and smart recommendations.", icon: Sparkles },
              { name: "Firebase Genkit", description: "Reliable AI application framework for seamless integration and deployment.", icon: Zap },
              { name: "Vertex AI Search", description: "RAG-powered semantic search for optimal route discovery and matching.", icon: Database },
              { name: "Google Cloud Run", description: "Serverless containerized deployment for scalable, always-on service.", icon: Cloud },
            ].map((tech, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={techRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                className="group bg-gray-50 p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="bg-gradient-to-br from-emerald-100 to-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <tech.icon className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{tech.name}</h3>
                <p className="text-gray-600 leading-relaxed">{tech.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Architecture Diagram */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={techRef.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4 }}
            className="bg-gray-900 rounded-3xl p-8 text-white"
          >
            <h3 className="text-2xl font-bold mb-6 text-center">Verdify Architecture</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-emerald-600/20 p-4 rounded-xl mb-3">
                  <Cpu className="w-8 h-8 text-emerald-400 mx-auto" />
                </div>
                <p className="font-semibold">Frontend</p>
                <p className="text-sm text-gray-400">React + Vite + Tailwind</p>
              </div>
              <div className="text-center">
                <div className="bg-emerald-600/20 p-4 rounded-xl mb-3">
                  <Network className="w-8 h-8 text-emerald-400 mx-auto" />
                </div>
                <p className="font-semibold">Backend</p>
                <p className="text-sm text-gray-400">Firebase Genkit + Vertex AI</p>
              </div>
              <div className="text-center">
                <div className="bg-emerald-600/20 p-4 rounded-xl mb-3">
                  <Cloud className="w-8 h-8 text-emerald-400 mx-auto" />
                </div>
                <p className="font-semibold">Deployment</p>
                <p className="text-sm text-gray-400">Google Cloud Run</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            ref={testimonialsRef.ref}
            initial={{ opacity: 0, y: 30 }}
            animate={testimonialsRef.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">What Users Say</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real stories from people making a difference with Verdify.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Sarah Chen", role: "Daily Commuter", quote: "Verdify has transformed my daily commute. I now save 85% on emissions while actually enjoying the journey.", rating: 5 },
              { name: "Marcus Johnson", role: "Fleet Manager", quote: "Our company reduced fleet emissions by 60% in just 3 months using Verdify's routing recommendations.", rating: 5 },
              { name: "Amirah Binti Abdullah", role: "Environmental Advocate", quote: "Finally, technology that matches my values. Verdify makes sustainability effortless and accessible.", rating: 5 },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={testimonialsRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic mb-4">"{testimonial.quote}"</p>
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            ref={faqRef.ref}
            initial={{ opacity: 0, y: 30 }}
            animate={faqRef.inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">
              Find answers to common questions about Verdify.
            </p>
          </motion.div>

          <div className="space-y-4">
            {[
              { q: "How does Verdify calculate carbon emissions?", a: "Verdify uses Gemini AI models trained on real-world transportation data to calculate precise carbon emissions for each route option. We factor in vehicle type, distance, energy source, and current traffic conditions." },
              { q: "Is Verdify available in my area?", a: "Verdify currently covers 150+ cities across the Johor-Singapore Innovation Corridor and is expanding. Check our coverage map or enter your location to see availability." },
              { q: "Can I integrate Verdify with my company's fleet management?", a: "Yes! We offer enterprise integrations for fleet management, expense tracking, and reporting. Contact our sales team for custom solutions." },
              { q: "How does the booking system work?", a: "Verdify integrates with multiple transportation providers. After you approve a route, we handle all bookings seamlessly across integrated services with one-click confirmation." },
              { q: "Is my data secure?", a: "We use enterprise-grade encryption and comply with GDPR and PDPA regulations. Your location and travel history are never shared without explicit consent." },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={faqRef.inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.05 }}
                className="border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-200 transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 text-left">{faq.q}</h3>
                  <ChevronDown
                    className={`text-emerald-600 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}
                    size={20}
                  />
                </button>
                {openFaq === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 py-4 bg-gray-50 border-t border-gray-200"
                  >
                    <p className="text-gray-600">{faq.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 to-green-700">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Make a Difference?
            </h2>
            <p className="text-xl text-emerald-100 mb-10">
              Join thousands of users navigating green and building a sustainable future for the Johor-Singapore Innovation Corridor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="group bg-white text-emerald-600 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2">
                Start Free Today
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </button>
              <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white/10 transition-all duration-300">
                Schedule a Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}