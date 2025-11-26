import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Ecosystem from './components/Ecosystem';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-primary text-primary selection:bg-blue-500/30">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Ecosystem />
      </main>
      <Footer />
    </div>
  );
}

export default App;
