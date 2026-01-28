// Updated file: src/app/login/page.js
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Cookies from 'js-cookie';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading state add karein
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        Cookies.set('auth-token', 'user_is_logged_in_successfully', { expires: 7 });
        router.push('/');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#E6E6E6] overflow-hidden">
      <div className="relative w-full max-w-sm p-8 space-y-4 bg-white rounded-2xl shadow-xl transition-transform transform hover:scale-105 duration-300">
        <div className="relative z-10">
          <div className="flex flex-col items-center justify-center mb-4">
            <Image 
              src="/logo.png" 
              alt="Mr.Denum Logo" 
              width={80} 
              height={80}
              className="rounded-full"
            />
            <h2 className="mt-2 text-2xl font-semibold" style={{ color: '#0D3A25' }}>
              Mr Denum
            </h2>
          </div>
          
          <h1 className="text-3xl font-bold text-center" style={{ color: '#0D3A25' }}>
            Welcome Mr Denum<span role="img" aria-label="waving hand">👋</span>
          </h1>

          <form className="mt-6 space-y-6" onSubmit={handleLogin}>
            <div className="relative">
              <User className="absolute w-5 h-5 text-gray-400 top-3.5 left-4 z-10" />
              <input 
                type="text" 
                placeholder="Username or Email" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-3 pl-12 pr-4 text-gray-700 bg-gray-100 rounded-lg shadow-xl focus:shadow-2xl focus:scale-105 focus:outline-none  placeholder-placeholder-text transition-all duration-300"
              />
            </div>

            <div className="relative">
              <Lock className="absolute w-5 h-5 text-gray-400 top-3.5 left-4 z-10" />
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3 pl-12 pr-12 text-gray-700 bg-gray-100 rounded-lg shadow-xl focus:shadow-2xl focus:scale-105 focus:outline-none  placeholder-placeholder-text transition-all duration-300"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-600 cursor-pointer z-10"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {error && <p className="text-sm text-center text-red-500">{error}</p>}

            <div className="flex items-center text-sm cursor-pointer">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="w-4 h-4 border-gray-300 rounded focus:ring-0 text-[#0D3A25] cursor-pointer" />
                <label htmlFor="remember-me" className="block ml-2 text-gray-900 cursor-pointer">
                  Remember Me
                </label>
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                type="submit" 
                style={{ backgroundColor: '#0D3A25' }}
                className="w-full max-w-[200px] px-4 py-3 font-semibold text-white transition-all duration-300 transform rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-800 active:scale-95 cursor-pointer disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>

          <p className="mt-8 text-xs text-center text-gray-600">
            © 2025 Aura Bussiness Solution | All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}