'use client';

import { useState } from 'react';
import { signIn } from '../lib/auth-stubs';
import { useRouter } from 'next/navigation';

export default function SimpleLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn({ username: email, password });
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
      {/* Header */}
      <div className="bg-white px-8 py-6">
        <h1 className="text-2xl font-semibold text-black">QAlien</h1>
      </div>

      {/* Login Form Container */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#1A1F2E] rounded-2xl p-8 shadow-xl">
          <h2 className="text-3xl font-semibold text-white text-center mb-2">Login</h2>
          <p className="text-gray-400 text-center mb-8">Enter your email and password to log in</p>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border border-transparent focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border border-transparent focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#4C9BF5] hover:bg-[#3A89E3] disabled:bg-[#4C9BF5]/50 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}