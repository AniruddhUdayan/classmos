'use client';

import { useUser, useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Button } from '@repo/ui';
import RoleGuard from '../components/RoleGuard';

export default function TestRoleAccessPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (isLoaded && user) {
        try {
          const token = await getToken();
          if (!token) return;

          const response = await fetch('http://165.22.212.124:4000/api/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setUserData(data.data);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
  }, [isLoaded, user, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Role-Based Access Control Test</h1>
        
        {userData && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Current User Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name:</p>
                <p className="font-medium">{userData.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email:</p>
                <p className="font-medium">{userData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Role:</p>
                <p className="font-medium text-blue-600">{userData.role}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">XP:</p>
                <p className="font-medium">{userData.xp}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Dashboard Test */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Student Dashboard Access</h3>
            <p className="text-gray-600 mb-4">
              Test access to student dashboard. Should only work for students.
            </p>
            <RoleGuard allowedRoles={['student']} fallbackPath="/dashboard/educator">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">✅ Access Granted</p>
                <p className="text-green-600 text-sm">You can access the student dashboard</p>
              </div>
            </RoleGuard>
          </div>

          {/* Educator Dashboard Test */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Educator Dashboard Access</h3>
            <p className="text-gray-600 mb-4">
              Test access to educator dashboard. Should only work for educators.
            </p>
            <RoleGuard allowedRoles={['educator', 'admin']} fallbackPath="/dashboard/student">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">✅ Access Granted</p>
                <p className="text-green-600 text-sm">You can access the educator dashboard</p>
              </div>
            </RoleGuard>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Navigation Tests</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              onClick={() => window.location.href = '/dashboard/student'}
              className="w-full"
            >
              Student Dashboard
            </Button>
            <Button 
              onClick={() => window.location.href = '/dashboard/educator'}
              className="w-full"
            >
              Educator Dashboard
            </Button>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
            >
              General Dashboard
            </Button>
            <Button 
              onClick={() => window.location.href = '/leaderboard'}
              className="w-full"
            >
              Leaderboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

