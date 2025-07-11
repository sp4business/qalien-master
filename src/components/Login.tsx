'use client';

import { useState } from 'react';
import { signIn, signUp, confirmSignUp, resetPassword, confirmResetPassword, signOut } from '../lib/auth-stubs';
import { useRouter } from 'next/navigation';
import { clearAllAuthState, clearAuthCookies } from '@/utils/authCleanup';
import QAlienLoadingScreen from './QAlienLoadingScreen';

type AuthMode = 'login' | 'signup' | 'confirm' | 'forgotPassword' | 'resetPassword';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const clearErrors = () => {
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setNameError('');
    setCodeError('');
    setGeneralError('');
    setSuccessMessage('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    let hasError = false;

    if (!email || !validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    }

    if (!password || password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      await signIn({ username: email, password });
      router.replace('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle the specific case where user is already logged in
      if (error.name === 'UserAlreadyAuthenticatedException') {
        console.log('User already authenticated, performing cleanup and retry...');
        try {
          // Force signout with global flag
          await signOut({ global: true });
          
          // Clear all auth state using utility
          await clearAllAuthState();
          clearAuthCookies();
          
          // Wait for cleanup to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Now try to sign in again
          await signIn({ username: email, password });
          router.replace('/');
          
        } catch (retryError: any) {
          console.error('Retry error:', retryError);
          if (retryError.name === 'UserNotFoundException' || retryError.name === 'NotAuthorizedException') {
            setGeneralError('Invalid email or password.');
          } else {
            setGeneralError('Authentication state cleared. Please try again or refresh the page.');
          }
        }
      } else if (error.name === 'UserNotFoundException' || error.name === 'NotAuthorizedException') {
        setGeneralError('Invalid email or password.');
      } else {
        setGeneralError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    let hasError = false;

    if (!name || name.trim().length < 2) {
      setNameError('Please enter your full name.');
      hasError = true;
    }

    if (!email || !validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    }

    if (!password || password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      hasError = true;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
          },
        },
      });
      setMode('confirm');
      setSuccessMessage('Account created! Please check your email for a confirmation code.');
    } catch (error: any) {
      console.error('SignUp error:', error);
      if (error.name === 'UsernameExistsException') {
        setGeneralError('An account with this email already exists.');
      } else {
        setGeneralError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!confirmationCode || confirmationCode.length !== 6) {
      setCodeError('Please enter a valid 6-digit code.');
      return;
    }

    setIsLoading(true);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode,
      });
      setSuccessMessage('Email confirmed! You can now log in.');
      setMode('login');
      setPassword('');
    } catch (error: any) {
      console.error('Confirm error:', error);
      setGeneralError(error.message || 'Invalid confirmation code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!email || !validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword({ username: email });
      setMode('resetPassword');
      setSuccessMessage('Password reset code sent! Please check your email.');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setGeneralError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    let hasError = false;

    if (!confirmationCode || confirmationCode.length !== 6) {
      setCodeError('Please enter a valid 6-digit code.');
      hasError = true;
    }

    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode,
        newPassword,
      });
      setSuccessMessage('Password reset successful! You can now log in with your new password.');
      setMode('login');
      setPassword('');
    } catch (error: any) {
      console.error('Reset password error:', error);
      setGeneralError(error.message || 'Invalid code or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => {
    switch (mode) {
      case 'signup':
        return (
          <form onSubmit={handleSignUp} className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError('');
                }}
                placeholder="Enter your full name"
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  nameError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {nameError && (
                <p className="mt-2 text-sm text-gray-400">{nameError}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="Enter your email"
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  emailError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {emailError && (
                <p className="mt-2 text-sm text-gray-400">{emailError}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Create a password (min 8 characters)"
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  passwordError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {passwordError && (
                <p className="mt-2 text-sm text-gray-400">{passwordError}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmPasswordError('');
                }}
                placeholder="Confirm your password"
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  confirmPasswordError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {confirmPasswordError && (
                <p className="mt-2 text-sm text-gray-400">{confirmPasswordError}</p>
              )}
            </div>

            {/* Error/Success Messages */}
            {generalError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{generalError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#4C9BF5] hover:bg-[#3A89E3] disabled:bg-[#4C9BF5]/50 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Switch to Login */}
            <div className="text-center">
              <span className="text-gray-400 text-sm">Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearErrors();
                }}
                className="text-[#4C9BF5] hover:text-[#3A89E3] text-sm font-medium transition-colors"
              >
                Log in
              </button>
            </div>
          </form>
        );

      case 'confirm':
        return (
          <form onSubmit={handleConfirmSignUp} className="space-y-6">
            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-400">{successMessage}</p>
              </div>
            )}

            {/* Confirmation Code Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Confirmation Code
              </label>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => {
                  setConfirmationCode(e.target.value);
                  setCodeError('');
                }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  codeError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {codeError && (
                <p className="mt-2 text-sm text-gray-400">{codeError}</p>
              )}
            </div>

            {generalError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{generalError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#4C9BF5] hover:bg-[#3A89E3] disabled:bg-[#4C9BF5]/50 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Confirming...' : 'Confirm Email'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearErrors();
                }}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Back to login
              </button>
            </div>
          </form>
        );

      case 'forgotPassword':
        return (
          <form onSubmit={handleForgotPassword} className="space-y-6">
            <p className="text-gray-400 text-sm mb-4">
              Enter your email and we'll send you a code to reset your password.
            </p>

            {/* Email Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="Enter your email"
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  emailError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {emailError && (
                <p className="mt-2 text-sm text-gray-400">{emailError}</p>
              )}
            </div>

            {generalError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{generalError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#4C9BF5] hover:bg-[#3A89E3] disabled:bg-[#4C9BF5]/50 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearErrors();
                }}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Back to login
              </button>
            </div>
          </form>
        );

      case 'resetPassword':
        return (
          <form onSubmit={handleResetPassword} className="space-y-6">
            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-400">{successMessage}</p>
              </div>
            )}

            {/* Confirmation Code Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Reset Code
              </label>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => {
                  setConfirmationCode(e.target.value);
                  setCodeError('');
                }}
                placeholder="Enter 6-digit code from email"
                maxLength={6}
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  codeError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {codeError && (
                <p className="mt-2 text-sm text-gray-400">{codeError}</p>
              )}
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter new password (min 8 characters)"
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  passwordError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {passwordError && (
                <p className="mt-2 text-sm text-gray-400">{passwordError}</p>
              )}
            </div>

            {generalError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{generalError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#4C9BF5] hover:bg-[#3A89E3] disabled:bg-[#4C9BF5]/50 text-white font-medium rounded-lg transition-colors duration-200"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearErrors();
                }}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Back to login
              </button>
            </div>
          </form>
        );

      default: // login
        return (
          <form onSubmit={handleLogin} className="space-y-6">
            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-400">{successMessage}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                  setGeneralError('');
                }}
                placeholder="Enter your email"
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  emailError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {emailError && (
                <p className="mt-2 text-sm text-gray-400">{emailError}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                  setGeneralError('');
                }}
                placeholder="Enter your password"
                className={`w-full px-4 py-3 bg-[#2A3142] text-white placeholder-gray-500 rounded-lg border ${
                  passwordError ? 'border-red-500' : 'border-transparent'
                } focus:outline-none focus:border-blue-500 transition-colors`}
              />
              {passwordError && (
                <p className="mt-2 text-sm text-gray-400">{passwordError}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setMode('forgotPassword');
                  clearErrors();
                }}
                className="text-[#4C9BF5] hover:text-[#3A89E3] text-sm font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* General Error */}
            {generalError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{generalError}</p>
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

            {/* Sign Up Link */}
            <div className="text-center">
              <span className="text-gray-400 text-sm">Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  clearErrors();
                }}
                className="text-[#4C9BF5] hover:text-[#3A89E3] text-sm font-medium transition-colors"
              >
                Create account
              </button>
            </div>
          </form>
        );
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup':
        return 'Create Account';
      case 'confirm':
        return 'Confirm Email';
      case 'forgotPassword':
        return 'Reset Password';
      case 'resetPassword':
        return 'Set New Password';
      default:
        return 'Login';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signup':
        return 'Join QAlien to start managing brand compliance';
      case 'confirm':
        return 'Enter the confirmation code sent to your email';
      case 'forgotPassword':
        return 'We\'ll help you reset your password';
      case 'resetPassword':
        return 'Enter your reset code and new password';
      default:
        return 'Enter your email and password to log in';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
      {/* Header */}
      <div className="bg-white px-8 py-6">
        <h1 className="text-2xl font-semibold text-black">QAlien</h1>
      </div>

      {/* Form Container */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#1A1F2E] rounded-2xl p-8 shadow-xl">
          <h2 className="text-3xl font-semibold text-white text-center mb-2">{getTitle()}</h2>
          <p className="text-gray-400 text-center mb-8">{getSubtitle()}</p>

          {renderForm()}
        </div>
      </div>

      {/* QAlien Loading Screen - Only show when loading */}
      {isLoading && (
        <QAlienLoadingScreen
          isVisible={isLoading}
          type="auth"
          message="Establishing secure alien connection..."
          duration={1000}
        />
      )}
    </div>
  );
}