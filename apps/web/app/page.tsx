'use client';

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { 
  AcademicCapIcon, 
  ChatBubbleLeftRightIcon, 
  TrophyIcon,
  ChartBarIcon,
  StarIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";
import { Button } from "@repo/ui";

export default function Home() {
  const { isSignedIn, user } = useUser();

  const features = [
    {
      icon: AcademicCapIcon,
      title: "AI-Powered Quizzes",
      description: "Interactive quizzes with real-time feedback and adaptive learning"
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: "Personal AI Tutor",
      description: "Get instant help and explanations from your dedicated AI tutor"
    },
    {
      icon: TrophyIcon,
      title: "Gamified Learning",
      description: "Earn XP, badges, and compete on leaderboards while learning"
    },
    {
      icon: ChartBarIcon,
      title: "Progress Tracking",
      description: "Detailed analytics to track your learning journey and improvement"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
                  <AcademicCapIcon className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-3xl font-bold text-gradient-gold">Classmos</span>
              </div>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Learn Smarter with
              <span className="text-gradient-gold block mt-2">AI-Powered Education</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Transform your learning experience with personalized AI tutoring, 
              interactive quizzes, and gamified progress tracking.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {isSignedIn ? (
                <Button asChild size="lg" className="text-lg px-8 py-4 h-auto gold-glow">
                  <Link href="/auth-redirect">
                    Go to Dashboard
                    <ArrowRightIcon className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="text-lg px-8 py-4 h-auto gold-glow">
                    <Link href="/auth/sign-up">
                      Get Started Free
                      <ArrowRightIcon className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4 h-auto">
                    <Link href="/auth/sign-in">
                      Sign In
                    </Link>
                  </Button>
                </>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <StarIcon className="w-4 h-4 text-primary fill-current" />
                <span>AI-Powered</span>
              </div>
              <div className="w-1 h-1 bg-muted rounded-full" />
              <div className="flex items-center space-x-1">
                <TrophyIcon className="w-4 h-4 text-primary" />
                <span>Gamified</span>
              </div>
              <div className="w-1 h-1 bg-muted rounded-full" />
              <span>Real-time Progress</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform combines the best of AI technology with proven 
              educational methodologies to accelerate your learning.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="bg-card rounded-2xl p-8 h-full border border-border card-hover">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
          >
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Students Learning</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50K+</div>
              <div className="text-muted-foreground">Quizzes Completed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">95%</div>
              <div className="text-muted-foreground">Success Rate</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <AcademicCapIcon className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient-gold">Classmos</span>
            </div>
            <p className="text-muted-foreground">
              &copy; 2024 Classmos. Empowering education through AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}