import { motion } from 'framer-motion';
import { Wand2, ShieldCheck, Settings, Search, FileCode } from 'lucide-react';

const features = [
  {
    icon: <Wand2 className="w-6 h-6 text-blue-400" />,
    title: "Automated Generation",
    description: "Generate TypeScript API clients and interfaces directly from OpenAPI/Swagger specs in seconds."
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-green-400" />,
    title: "Type Safety",
    description: "Get full TypeScript support with auto-generated types for requests, responses, and models."
  },
  {
    icon: <Settings className="w-6 h-6 text-purple-400" />,
    title: "Highly Configurable",
    description: "Customize output paths, templates, and type mappings to fit your project's architecture."
  },
  {
    icon: <Search className="w-6 h-6 text-yellow-400" />,
    title: "Smart Search",
    description: "Quickly find and generate specific API endpoints using fuzzy search in VS Code."
  },
  {
    icon: <FileCode className="w-6 h-6 text-cyan-400" />,
    title: "Multi-Platform",
    description: "Available as a VS Code extension for GUI lovers and a CLI tool for automation pipelines."
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose <span className="text-gradient">UnoAPI</span>?
          </h2>
          <p className="text-secondary max-w-2xl mx-auto">
            Built for modern frontend development, designed to eliminate boilerplate and runtime errors.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass p-6 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-secondary text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
