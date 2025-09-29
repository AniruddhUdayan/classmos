'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export default function AuthDebugPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const runDebugCheck = async () => {
    setIsLoading(true);
    const info: any = {};

    try {
      // Basic Clerk info
      info.clerkLoaded = isLoaded;
      info.userExists = !!user;
      
      if (user) {
        info.userId = user.id;
        info.userEmail = user.primaryEmailAddress?.emailAddress;
        info.userName = user.fullName || user.firstName;
      }

      // Test API connection
      if (isLoaded && user) {
        try {
          const token = await getToken();
          info.hasToken = !!token;
          
          if (token) {
            info.tokenLength = token.length;
            
            // Test /api/me endpoint
            const response = await fetch('http://165.22.212.124:4000/api/me', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            info.apiMeStatus = response.status;
            info.apiMeOk = response.ok;
            
            if (response.ok) {
              const data = await response.json();
              info.userInDatabase = true;
              info.userData = data.data;
            } else {
              info.userInDatabase = false;
              const errorText = await response.text();
              info.apiError = errorText;
            }
          }
        } catch (error) {
          info.apiError = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      // Determine next step
      if (!isLoaded) {
        info.nextStep = 'Wait for Clerk to load';
      } else if (!user) {
        info.nextStep = 'User not authenticated - should redirect to sign-in';
      } else if (!debugInfo.hasToken) {
        info.nextStep = 'No auth token - authentication issue';
      } else if (!info.userInDatabase) {
        info.nextStep = 'User not in database - should redirect to onboarding';
      } else {
        info.nextStep = 'User exists in database - should redirect to dashboard';
      }

    } catch (error) {
      info.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setDebugInfo(info);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoaded) {
      runDebugCheck();
    }
  }, [isLoaded, user]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Authentication Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Clerk Loaded:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${isLoaded ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isLoaded ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="font-medium">User Authenticated:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {user ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Debug Information</h2>
            <button
              onClick={runDebugCheck}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Checking...' : 'Refresh Debug Info'}
            </button>
          </div>
          
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/auth/sign-in" className="block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center">
              Go to Sign In
            </a>
            <a href="/auth/sign-up" className="block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-center">
              Go to Sign Up
            </a>
            <a href="/auth-redirect" className="block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-center">
              Go to Auth Redirect
            </a>
            <a href="/onboarding" className="block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-center">
              Go to Onboarding
            </a>
            <a href="/dashboard" className="block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-center">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

