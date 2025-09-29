'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthRedirectPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState('Checking your account...');
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!isLoaded) {
        setStatus('Loading authentication...');
        return;
      }
      
      if (!user) {
        setStatus('No user found. Redirecting to sign in...');
        setTimeout(() => router.push('/auth/sign-in'), 1000);
        return;
      }

      try {
        setStatus('Checking if you have an account...');
        
        // Get token for API call
        const token = await getToken();
        if (!token) {
          setStatus('Authentication failed. Redirecting to sign in...');
          setTimeout(() => router.push('/auth/sign-in'), 1000);
          return;
        }

        // Check if user exists in our database
        const response = await fetch('http://165.22.212.124:4000/api/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const debugData = {
          userId: user.id,
          userEmail: user.primaryEmailAddress?.emailAddress,
          apiStatus: response.status,
          apiOk: response.ok
        };
        setDebugInfo(debugData);

        if (response.ok) {
          // User exists in database, go to dashboard
          setStatus('Welcome back! Redirecting to dashboard...');
          setTimeout(() => router.push('/dashboard'), 1000);
        } else if (response.status === 401) {
          // Auth issue, go to sign in
          setStatus('Authentication issue. Please sign in again...');
          setTimeout(() => router.push('/auth/sign-in'), 1000);
        } else if (response.status === 404) {
          // User doesn't exist in database, needs onboarding
          setStatus('Welcome! Setting up your account...');
          setTimeout(() => router.push('/onboarding'), 1000);
        } else {
          // Other error, try onboarding as fallback
          setStatus('Setting up your account...');
          setTimeout(() => router.push('/onboarding'), 1000);
        }
      } catch (error) {
        console.error('Redirect error:', error);
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
        // On error, assume new user needs onboarding
        setStatus('Setting up your account...');
        setTimeout(() => router.push('/onboarding'), 1000);
      }
    };

    handleRedirect();
  }, [isLoaded, user, router, getToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="text-xl font-semibold text-gray-900">
          {status}
        </h2>
        <p className="text-gray-600">
          Please wait while we redirect you...
        </p>
        
        {/* Debug information */}
        {debugInfo && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Debug Information
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}
        
        {/* Manual navigation options */}
        <div className="mt-6 space-y-2">
          <p className="text-sm text-gray-500">If you&apos;re stuck, try:</p>
          <div className="flex flex-col space-y-1">
            <a href="/onboarding" className="text-blue-600 hover:text-blue-800 text-sm">
              Go to Onboarding
            </a>
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800 text-sm">
              Go to Dashboard
            </a>
            <a href="/debug-auth" className="text-blue-600 hover:text-blue-800 text-sm">
              Debug Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
