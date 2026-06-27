'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Optional: Verify that a session exists (Supabase should auto-establish a session from the reset link hash)
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Note: Sometimes the hash fragments are processed asynchronously.
        // We can wait a bit or let the user try resetting first.
        console.log("No active reset session found yet.");
      }
    }
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('Your password has been reset successfully! Redirecting...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1800);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update password. Please try again.');
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
            Set New Password
          </h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            Enter your new password below to securely access your account.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              New Password
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

          <div className="space-y-1.5">
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-5 font-semibold flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Update Password
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
