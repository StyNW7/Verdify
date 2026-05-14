'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

import { requestPasswordReset } from '@/lib/auth-actions';

type Phase = 'form' | 'sent';

export default function ForgotPasswordPage() {
  const [phase, setPhase] = useState<Phase>('form');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string): string => {
    if (!value) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email';
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
    setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }

    setIsLoading(true);
    setSubmitError('');

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setPhase('sent');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (phase === 'sent') {
    return (
      <div>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-500 leading-relaxed">
            Check your email for a link to reset your password — it may take a few minutes to arrive. The link works for 1 hour.
          </p>
        </div>

        <a
          href="/auth/login"
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
        >
          <ArrowLeft size={18} />
          <span>Back to sign in</span>
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset your password</h1>
        <p className="text-gray-500">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                emailError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-200 focus:ring-emerald-500 focus:border-emerald-500'
              }`}
            />
          </div>
          {emailError && (
            <p className="mt-1 text-sm text-red-500">{emailError}</p>
          )}
        </div>

        {submitError && (
          <p className="text-sm text-red-500">{submitError}</p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex min-w-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="truncate">Send reset link</span>
              <ArrowRight size={18} />
            </>
          )}
        </motion.button>
      </form>

      <p className="text-center text-gray-600 mt-8">
        Remember your password?{' '}
        <a
          href="/auth/login"
          className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
