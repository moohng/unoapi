export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="UnoAPI" className="w-6 h-6 grayscale opacity-50" />
            <span className="text-secondary text-sm">
              © 2025 UnoAPI. Open source under MIT License.
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-secondary">
            <a href="https://github.com/moohng/unoapi" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://github.com/moohng/unoapi/issues" className="hover:text-white transition-colors">Issues</a>
            <a href="https://marketplace.visualstudio.com/items?itemName=qianduanxh.unoapi-vscode-extension" className="hover:text-white transition-colors">Marketplace</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
