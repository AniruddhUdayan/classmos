'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<'student' | 'educator'>('student');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelection = async () => {
    setIsLoading(true);
    try {
      // Check if user and Clerk are fully loaded
      if (!isLoaded) {
        console.log('❌ Clerk not loaded yet');
        alert('Please wait for the page to load completely');
        return;
      }

      if (!user) {
        console.log('❌ No user found');
        alert('User not found. Please sign in again.');
        router.push('/auth/sign-in');
        return;
      }

      console.log('🔍 Starting onboarding for user:', user.id);
      console.log('🔍 User data:', {
        fullName: user.fullName,
        firstName: user.firstName,
        email: user.primaryEmailAddress?.emailAddress,
        selectedRole: role
      });

      // Note: We'll update the role in the backend when creating the user
      // Frontend doesn't directly update Clerk metadata
      console.log('✅ Role selected:', role);

      // Get token for API call using useAuth hook
      console.log('🔍 Getting authentication token...');
      const token = await getToken();
      console.log('🔍 Got token:', token ? 'Token exists' : 'No token');

      if (!token) {
        console.log('❌ Failed to get authentication token');
        alert('Authentication failed. Please try signing in again.');
        router.push('/auth/sign-in');
        return;
      }

      // Create user in database
      const requestData = {
        name: user.fullName || user.firstName || 'Unknown',
        email: user.primaryEmailAddress?.emailAddress,
        role: role
      };
      console.log('🔍 Sending request data:', requestData);

      const response = await fetch(`http://165.22.212.124:4000/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('🔍 API Response status:', response.status);
      const responseData = await response.text();
      console.log('🔍 API Response data:', responseData);

      if (response.ok) {
        console.log('✅ User created successfully, redirecting to dashboard');
        router.push('/dashboard');
      } else {
        console.error('❌ Failed to create user. Status:', response.status);
        console.error('❌ Response:', responseData);
        
        let errorMessage = 'Failed to create user account';
        try {
          const errorData = JSON.parse(responseData);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use the raw response
          errorMessage = responseData || errorMessage;
        }
        
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ Error during onboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error during onboarding: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Redirect if no user
  if (!user) {
    router.push('/auth/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Welcome to Classmos!
          </h2>
          <p className="mt-2 text-gray-600">
            Tell us about yourself to get started
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-base font-medium text-gray-900">
              I am a...
            </label>
            <div className="mt-4 space-y-4">
              <div className="flex items-center">
                <input
                  id="student"
                  name="role"
                  type="radio"
                  checked={role === 'student'}
                  onChange={() => setRole('student')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="student" className="ml-3 block text-sm font-medium text-gray-700">
                  Student
                  <p className="text-gray-500">I want to take quizzes and learn</p>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="educator"
                  name="role"
                  type="radio"
                  checked={role === 'educator'}
                  onChange={() => setRole('educator')}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="educator" className="ml-3 block text-sm font-medium text-gray-700">
                  Educator
                  <p className="text-gray-500">I want to create quizzes and teach</p>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={handleRoleSelection}
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
