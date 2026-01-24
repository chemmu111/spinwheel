import { useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { LuckyDraw } from './components/LuckyDraw';
import { Settings, Sparkles } from 'lucide-react';

function App() {
  const [view, setView] = useState<'draw' | 'admin'>('draw');

  return (
    <div className="min-h-screen">
      <nav className="bg-gradient-to-r from-purple-900 via-purple-800 to-orange-900 border-b-4 border-yellow-400 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                GRAND FINALE DRAW SYSTEM
              </h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('draw')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all transform ${
                  view === 'draw'
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 shadow-lg scale-105'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                Draw
              </button>
              <button
                onClick={() => setView('admin')}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all transform ${
                  view === 'admin'
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 shadow-lg scale-105'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Settings className="w-5 h-5" />
                Admin
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {view === 'draw' ? <LuckyDraw /> : <AdminPanel />}
      </main>
    </div>
  );
}

export default App;
