'use client';

import React, { useState } from 'react';
import { Utensils, User, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './ui/Logo';

export default function AuthScreen({ embedded = false, compact = false }) {
  const [mode, setMode] = useState('auth'); // 'auth' | 'reset'
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const backToSignIn = () => {
    setMode('auth');
    setResetSent(false);
    setError('');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}`,
            queryParams: { prompt: 'select_account' }
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className={`w-full ${embedded ? '' : 'max-w-sm md:max-w-lg bg-card p-8 rounded-2xl border border-border relative overflow-hidden'}`}>
      <div className={`relative z-10 text-center ${compact ? 'mb-6' : 'mb-8'}`}>
        {!embedded && (
          <div className="mb-4 flex justify-center">
            <Logo size={64} className="rounded-2xl" />
          </div>
        )}
        <h1 className={`font-bold text-foreground mb-2 ${compact ? 'text-2xl' : 'text-3xl'}`}>{isRegistering ? 'Create Account' : 'Welcome Back'}</h1>
        <p className="text-muted-foreground">{isRegistering ? 'Start your journey today' : 'Sign in to continue tracking'}</p>
      </div>

      <form onSubmit={handleAuth} className="flex flex-col relative z-10">
        <AnimatePresence initial={false}>
          {isRegistering && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="relative overflow-hidden"
            >
              <User className="absolute left-4 top-3.5 w-5 h-5 text-faint" />
              <input
                type="text"
                placeholder="Full Name"
                autoComplete="name"
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl focus:border-ring focus:ring-2 focus:ring-ring outline-none transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative mb-4">
          <Mail className="absolute left-4 top-3.5 w-5 h-5 text-faint" />
          <input
            type="email"
            placeholder="Email Address"
            autoComplete="email"
            className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl focus:border-ring focus:ring-2 focus:ring-ring outline-none transition-all"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="relative mb-4">
          <Lock className="absolute left-4 top-3.5 w-5 h-5 text-faint" />
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            className="w-full pl-12 pr-12 py-3 bg-muted border border-border rounded-xl focus:border-ring focus:ring-2 focus:ring-ring outline-none transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {isRegistering && (
          <p className="text-xs text-muted-foreground -mt-2 mb-4">At least 6 characters</p>
        )}

        {!isRegistering && (
          <button
            type="button"
            onClick={() => setMode('reset')}
            className="text-protein-text text-sm text-left -mt-2 mb-4 hover:underline self-start"
          >
            Forgot password?
          </button>
        )}

        {error && (
          <div className="text-destructive-text text-sm text-center bg-destructive/10 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full ${compact ? 'py-3.5' : 'py-4'} bg-training text-white font-bold rounded-2xl hover:bg-training/90 active:scale-95 transition-all flex items-center justify-center gap-2`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {isRegistering ? 'Create Account' : 'Sign In'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className={`text-center relative z-10 ${compact ? 'mt-5 space-y-3' : 'mt-6 space-y-4'}`}>
        <p className="text-muted-foreground text-sm">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-protein-text font-bold ml-1 hover:underline"
          >
            {isRegistering ? 'Login' : 'Sign Up'}
          </button>
        </p>

        <div className="relative flex py-2 items-center">
          <div className="grow border-t border-border"></div>
          <span className="shrink mx-4 text-muted-foreground text-xs uppercase">Or continue with</span>
          <div className="grow border-t border-border"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-3 bg-card border border-border text-foreground font-bold rounded-2xl hover:bg-muted active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>
      </div>
    </div>
  );

  const resetContent = (
    <div className={`w-full ${embedded ? '' : 'max-w-sm md:max-w-lg bg-card p-8 rounded-2xl border border-border relative overflow-hidden'}`}>
      <div className={`relative z-10 text-center ${compact ? 'mb-6' : 'mb-8'}`}>
        {!embedded && (
          <div className="mb-4 flex justify-center">
            <Logo size={64} className="rounded-2xl" />
          </div>
        )}
        <h1 className={`font-bold text-foreground mb-2 ${compact ? 'text-2xl' : 'text-3xl'}`}>Reset password</h1>
        {!resetSent && (
          <p className="text-muted-foreground">Enter your email and we will send you a reset link</p>
        )}
      </div>

      {resetSent ? (
        <div className="relative z-10 text-center">
          <p className="text-foreground mb-6">Check your email — we sent a reset link.</p>
          <button
            type="button"
            onClick={backToSignIn}
            className="text-protein-text font-bold hover:underline"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col relative z-10">
          <div className="relative mb-4">
            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-faint" />
            <input
              type="email"
              placeholder="Email Address"
              autoComplete="email"
              className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl focus:border-ring focus:ring-2 focus:ring-ring outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="text-destructive-text text-sm text-center bg-destructive/10 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${compact ? 'py-3.5' : 'py-4'} bg-training text-white font-bold rounded-2xl hover:bg-training/90 active:scale-95 transition-all flex items-center justify-center gap-2`}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Send reset link
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={backToSignIn}
            className="text-protein-text text-sm font-bold mt-4 hover:underline"
          >
            Back to sign in
          </button>
        </form>
      )}
    </div>
  );

  const activeContent = mode === 'reset' ? resetContent : content;

  if (embedded) return activeContent;

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center p-6 font-sans text-foreground w-full">
      {activeContent}
    </div>
  );
}
