import { Github } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="UnoAPI" className="w-8 h-8" />
          <span className="font-bold text-xl tracking-tight">UnoAPI</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-secondary">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#ecosystem" className="hover:text-white transition-colors">Ecosystem</a>
          <a href="#docs" className="hover:text-white transition-colors">Docs</a>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/moohng/unoapi"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Github size={20} />
          </a>
          <a
            href="https://marketplace.visualstudio.com/items?itemName=qianduanxh.unoapi-vscode-extension"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            Install Extension
          </a>
        </div>
      </div>
    </nav>
  );
}
