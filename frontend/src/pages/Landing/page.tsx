import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Code, Zap, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function LandingPage() {
  
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="container max-w-6xl mx-auto px-4 py-12 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center space-y-8"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative"
        >
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 opacity-75 blur-xl" />
          <div className="relative bg-background rounded-full p-4">
            <Zap className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-4xl md:text-6xl font-bold tracking-tight"
        >
          Vite v6 + TailwindCSS v3 + ShadcnUI v0.8
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-xl text-muted-foreground max-w-3xl"
        >
          A beautifully designed starter template with everything you need to build your Vite project. Includes light
          and dark mode, animations, and a clean, elegant design.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <a href="https://github.com/StyNW7/Vite-React-TypeScript-ShadcnUI-Template" target="_blank">
            <Button size="lg" className="rounded-full">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.7 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
          >
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-primary/10">{feature.icon}</div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-24 text-center"
      >
        <div className="relative h-[300px] md:h-[400px] w-full rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background/50 backdrop-blur-sm flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
              className="bg-background/80 backdrop-blur-md p-8 rounded-xl max-w-xl"
            >
              <h2 className="text-2xl font-bold mb-4">Ready to build something amazing?</h2>
              <p className="text-muted-foreground mb-6">
                This template gives you everything you need to create beautiful, animated, and responsive web
                applications.
              </p>
              <a href="/about">
                <Button variant="outline" className="rounded-full">
                  Learn More
                </Button>
              </a>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const features = [
  {
    title: "Light & Dark Mode",
    description: "Seamlessly switch between light and dark themes with a beautiful transition effect.",
    icon: <Palette className="h-6 w-6 text-primary" />,
  },
  {
    title: "Modern Stack",
    description: "Built with Vite React.js v18, Tailwind CSS v3, ShadcnUI v0.8, and Framer Motion for the best developer experience.",
    icon: <Code className="h-6 w-6 text-primary" />,
  },
  {
    title: "Animations",
    description: "Smooth, elegant animations that enhance the user experience without being distracting.",
    icon: <Zap className="h-6 w-6 text-primary" />,
  },
]
