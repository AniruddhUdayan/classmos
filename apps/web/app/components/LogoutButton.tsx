'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Clear all Clerk data and redirect
      await signOut({ redirectUrl: '/' });
      
      // Additional cleanup (optional but thorough)
      localStorage.clear();
      sessionStorage.clear();
      
      // Force reload to ensure clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
    >
      Complete Logout
    </button>
  );
}

