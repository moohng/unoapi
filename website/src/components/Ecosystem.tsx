import { motion } from 'framer-motion';
import { Box, Terminal, Code2, ArrowRight } from 'lucide-react';

const packages = [
  {
    icon: <Code2 className="w-8 h-8 text-blue-400" />,
    title: "VS Code Extension",
    description: "The preferred way for most developers. Visual interface, right-click generation, and status bar integration.",
    link: "https://marketplace.visualstudio.com/items?itemName=qianduanxh.unoapi-vscode-extension",
    cta: "Install Extension"
  },
  {
    icon: <Terminal className="w-8 h-8 text-green-400" />,
    title: "CLI Tool",
    description: "Perfect for CI/CD pipelines and terminal power users. Initialize, download, and generate with simple commands.",
    link: "https://www.npmjs.com/package/@unoapi/cli",
    cta: "View on NPM"
  },
  {
    icon: <Box className="w-8 h-8 text-purple-400" />,
    title: "Core SDK",
    description: "The engine behind UnoAPI. Use it to build your own custom API generation tools or plugins.",
    link: "https://www.npmjs.com/package/@unoapi/core",
    cta: "View Documentation"
  }
];

export default function Ecosystem() {
  return (
    <section id="ecosystem" className="py-24 bg-black/20">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The <span className="text-gradient">Ecosystem</span>
          </h2>
          <p className="text-secondary max-w-2xl mx-auto">
            A complete suite of tools to cover every aspect of your API development workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass p-8 rounded-2xl border border-white/10 relative group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                <div className="mb-6">{pkg.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{pkg.title}</h3>
                <p className="text-secondary mb-8 min-h-[80px]">
                  {pkg.description}
                </p>
                <a
                  href={pkg.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {pkg.cta} <ArrowRight size={16} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
