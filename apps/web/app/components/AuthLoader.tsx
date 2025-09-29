'use client';

import { motion } from 'framer-motion';
import { AcademicCapIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface AuthLoaderProps {
  title?: string;
  subtitle?: string;
  isLoading?: boolean;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
}

export default function AuthLoader({ 
  title = "Loading Authentication", 
  subtitle = "Please wait while we prepare your secure login experience...",
  isLoading = true,
  showRefreshButton = false,
  onRefresh
}: AuthLoaderProps) {
  if (!isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-8 max-w-md mx-auto px-6"
      >
        {/* Logo and Icon */}
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <AcademicCapIcon className="w-8 h-8 text-white" />
            </motion.div>
            
            {/* Pulsing ring */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 border-2 border-blue-300 rounded-2xl"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-gray-600 text-lg">
            {subtitle}
          </p>
        </motion.div>

        {/* Loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex justify-center space-x-2"
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2
              }}
              className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            />
          ))}
        </motion.div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "100%" }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
        >
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            style={{ width: "30%" }}
          />
        </motion.div>

        {/* Additional info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-sm text-gray-500 space-y-1"
        >
          <p>🔒 Secure authentication powered by Clerk</p>
          <p>⚡ Optimizing your experience...</p>
        </motion.div>

        {/* Refresh button for stuck loading */}
        {showRefreshButton && onRefresh && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="pt-4"
          >
            <button
              onClick={onRefresh}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh Page
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
