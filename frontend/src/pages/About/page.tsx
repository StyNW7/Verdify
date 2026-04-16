import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Github, Instagram, Linkedin, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AboutPage() {

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12 md:py-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative mb-8"
        >
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 opacity-75 blur-xl" />
          <div className="relative rounded-full overflow-hidden border-4 border-background">
            <img
              src="/Images/stanley.png"
              alt="Profile"
              width={200}
              height={200}
              className="rounded-full object-cover"
            />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold text-center mb-4"
        >
          About the Creator
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center mb-8"
        >
          <p className="text-xl text-muted-foreground mb-6">
            Hi there! I'm a passionate web developer who loves creating beautiful, accessible, and performant web
            applications. This template is my way of sharing my knowledge and experience with the community.
          </p>
          <p className="text-xl text-muted-foreground">
            With over 5 years of experience in frontend development, I've worked with various technologies and
            frameworks. My goal is to make web development more accessible and enjoyable for everyone.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex space-x-4 mb-12"
        >
          {socialLinks.map((link, index) => (
            <motion.a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
              className="p-3 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              {link.icon}
              <span className="sr-only">{link.name}</span>
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="w-full space-y-8"
        >

          <div className="bg-card rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">My Journey</h2>
            <div className="space-y-6">
              {journey.map((item, index) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                  className="flex"
                >
                  <div className="mr-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-bold">{item.year}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="bg-card rounded-xl p-8 shadow-lg"
          >
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <p className="text-muted-foreground mb-6">
              Have questions about this template or want to collaborate on a project? Feel free to reach out!
            </p>
            <a href="https://www.linkedin.com/in/stanley-nathanael-wijaya" target="_blank">
              <Button className="w-full sm:w-auto rounded-full">
                <Mail className="mr-2 h-4 w-4" />
                Contact Me
              </Button>
            </a>
          </motion.div>

        </motion.div>

      </motion.div>

    </div>

  )

}

const socialLinks = [
  {
    name: "GitHub",
    href: "https://github.com/StyNW7",
    icon: <Github className="h-5 w-5" />,
  },
  {
    name: "Twitter",
    href: "https://instagram.com/snw.77",
    icon: <Instagram className="h-5 w-5" />,
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/stanley-nathanael-wijaya",
    icon: <Linkedin className="h-5 w-5" />,
  },
]

const journey = [
  {
    year: "2018",
    title: "Started Web Development",
    description: "Began my journey into web development with HTML, CSS, and JavaScript.",
  },
  {
    year: "2019",
    title: "Discovered React",
    description: "Fell in love with React and started building single-page applications.",
  },
  {
    year: "2025",
    title: "Tailwind Update to v4.1",
    description: "I don't like that much then I make this template :)",
  },
]
