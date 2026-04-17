'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { useLocation } from "react-router-dom";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const location = useLocation();
  const pathname = location.pathname;
  const isLogin = pathname === '/auth/login';

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <div className="flex min-h-screen">
        {/* Left Side - Image/Visual Section */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-600 to-green-700 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-10 animate-float">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <Leaf className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="absolute bottom-20 right-10 animate-float-delayed">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-white z-10 w-full px-12">
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto backdrop-blur-sm">
                <Leaf className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl font-bold">
                {isLogin ? 'Welcome Back!' : 'Join Verdify'}
              </h2>
              <p className="text-lg text-emerald-100 leading-relaxed max-w-md mx-auto">
                {isLogin 
                  ? 'Sign in to continue your green journey and track your environmental impact.'
                  : 'Create your account and start making a difference with sustainable mobility.'}
              </p>
              <div className="flex justify-center gap-2 mt-8">
                <div className="w-2 h-2 rounded-full bg-white/60" />
                <div className="w-2 h-2 rounded-full bg-white/30" />
                <div className="w-2 h-2 rounded-full bg-white/30" />
              </div>
            </motion.div>
          </div>

          {/* Decorative Circles */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Right Side - Form Section */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-8">
              <div className="bg-gradient-to-br from-emerald-600 to-green-600 p-3 rounded-2xl">
                <Leaf className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, x: isLogin ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? -30 : 30 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}