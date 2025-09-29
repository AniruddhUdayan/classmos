'use client';

import { SignUp, useAuth, useClerk } from '@clerk/nextjs';
import AuthLoader from '../../components/AuthLoader';
import { useState, useEffect } from 'react';

export default function SignUpPage() {
  const { isLoaded: authLoaded } = useAuth();
  const { loaded: clerkLoaded } = useClerk();
  const [showLoader, setShowLoader] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing authentication...');

  useEffect(() => {
    // Show loader until both Clerk and Auth are fully loaded
    if (!clerkLoaded) {
      setLoadingMessage('Loading Clerk authentication...');
      setShowLoader(true);
    } else if (!authLoaded) {
      setLoadingMessage('Preparing sign-up form...');
      setShowLoader(true);
    } else {
      // Both are loaded, hide loader after a brief delay for smooth transition
      setTimeout(() => setShowLoader(false), 500);
    }
  }, [clerkLoaded, authLoaded]);

  // Add timeout fallback - if loading takes more than 10 seconds, show manual options
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (showLoader) {
        setLoadingMessage('Loading is taking longer than expected. Please wait or try refreshing...');
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [showLoader]);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (showLoader) {
    return (
      <AuthLoader 
        title="Preparing Sign Up"
        subtitle={loadingMessage}
        showRefreshButton={loadingMessage.includes('longer than expected')}
        onRefresh={handleRefresh}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Classmos
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account to start learning with AI-powered education.
          </p>
        </div>
        <div className="flex justify-center">
          <SignUp 
            routing="hash"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg"
              }
            }}
            redirectUrl="/auth-redirect"
          />
        </div>
      </div>
    </div>
  );
}

