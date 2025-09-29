'use client';

import { Button, Card, Badge } from '@repo/ui';
import { motion } from 'framer-motion';
import { 
  AcademicCapIcon,
  FireIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

export default function TestStylesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Test */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-bold text-foreground">Style Test Page</h1>
          <p className="text-xl text-muted-foreground">Testing LeetCode-inspired dark theme</p>
        </motion.div>

        {/* Color Test */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 leetcode-border card-hover">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <AcademicCapIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Primary Color</h3>
                <p className="text-sm text-muted-foreground">LeetCode Gold</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 leetcode-border card-hover">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <FireIcon className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Card Background</h3>
                <p className="text-sm text-muted-foreground">Dark Surface</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 leetcode-border card-hover">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <TrophyIcon className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Text Colors</h3>
                <p className="text-sm text-muted-foreground">High Contrast</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Button Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Button Variants</h2>
          <div className="flex flex-wrap gap-4">
            <Button>Default Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive Button</Button>
          </div>
        </div>

        {/* Badge Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Badge Variants</h2>
          <div className="flex flex-wrap gap-4">
            <Badge>Default Badge</Badge>
            <Badge variant="secondary">Secondary Badge</Badge>
            <Badge variant="outline">Outline Badge</Badge>
            <Badge variant="destructive">Destructive Badge</Badge>
          </div>
        </div>

        {/* Animation Test */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Custom Utilities</h2>
          <div className="space-y-4">
            <div className="text-gradient-gold text-2xl font-bold">
              Gold Gradient Text
            </div>
            <Button className="gold-glow">
              Button with Gold Glow
            </Button>
            <Card className="p-6 glass-effect-dark">
              <p className="text-foreground">Glass Effect Card</p>
            </Card>
          </div>
        </div>

        {/* Background Test */}
        <div className="p-6 bg-card rounded-2xl border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-2">Background Colors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-background rounded border">Background</div>
            <div className="p-3 bg-card rounded border">Card</div>
            <div className="p-3 bg-muted rounded border">Muted</div>
            <div className="p-3 bg-primary text-primary-foreground rounded">Primary</div>
          </div>
        </div>
      </div>
    </div>
  );
}


