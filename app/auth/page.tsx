'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Loader2, Sparkles, ShieldCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [userExists, setUserExists] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg('');
    
    try {
      // Check if user is present in our database registry
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserExists(data.exists);
        setStep('password');
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to authentication API.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (userExists) {
        // Sign In Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Successfully signed in! Redirecting...');
          setTimeout(() => {
            router.push('/');
            router.refresh();
          }, 1500);
        }
      } else {
        // Sign Up Flow
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else if (data.user) {
          // Register the new user in our local database
          const regRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.user.id, email: data.user.email })
          });

          if (regRes.ok) {
            // Log the user in directly (Supabase auto logs in on signup usually)
            // But just in case, trigger sign in or redirect
            setSuccessMsg('Account created successfully! Redirecting...');
            setTimeout(() => {
              router.push('/');
              router.refresh();
            }, 1500);
          } else {
            setErrorMsg('Failed to complete database registration.');
          }
        } else {
          setErrorMsg('Signup did not return a valid user session.');
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Authentication request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[70vh] px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-900 shadow-xl transition-all">
        {/* Banner header */}
        <div className="flex flex-col items-center text-center gap-2 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-950 text-white dark:bg-zinc-50 dark:text-black shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {step === 'email' ? 'Welcome to ShopNow' : userExists ? 'Welcome Back!' : 'Create Your Account'}
          </h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            {step === 'email'
              ? 'Enter your email to sign in or create an account.'
              : userExists
              ? 'Enter your password to sign in to your account.'
              : 'Set up a password to register a new account.'}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3.5 text-xs text-red-600 bg-red-500/5 rounded-xl border border-red-500/10 dark:text-red-400 dark:border-red-500/20">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3.5 text-xs text-green-600 bg-green-500/5 rounded-xl border border-green-500/10 dark:text-green-400 dark:border-green-500/20 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-green-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="pl-10 h-11 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-5 font-semibold flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Step 2: Password Form */}
        {step === 'password' && (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="text-xs text-zinc-500 flex items-center justify-between mb-2">
              <span>Signing in as: <strong className="text-zinc-700 dark:text-zinc-300">{email}</strong></span>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setPassword('');
                  setConfirmPassword('');
                  setErrorMsg('');
                }}
                className="text-neutral-500 hover:text-black dark:hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" />
                Change
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10 h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Confirm Password (only for Sign Up) */}
            {!userExists && (
              <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
                <label htmlFor="confirmPassword" className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-5 font-semibold flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : userExists ? (
                'Login'
              ) : (
                'Create Account & Login'
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
