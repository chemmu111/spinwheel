import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Sparkles, Zap } from 'lucide-react';
import type { Student } from '../lib/types';

export function LuckyDraw() {
  const [students, setStudents] = useState<Student[]>([]);
  const [winners, setWinners] = useState<Student[]>([]);
  const [currentWinner, setCurrentWinner] = useState<Student | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [totalSpins, setTotalSpins] = useState(0);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const { data: allStudents } = await supabase
      .from('students')
      .select('*')
      .order('coupon_number', { ascending: true });

    if (allStudents) {
      setStudents(allStudents);
      const winnersList = allStudents.filter(s => s.is_winner);
      setWinners(winnersList);
      setTotalSpins(winnersList.length);
    }
  };

  const createConfetti = () => {
    const confettiPieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5
    }));
    setConfetti(confettiPieces);
    setTimeout(() => setConfetti([]), 3000);
  };

  const handleSpin = async () => {
    if (totalSpins >= 10 || spinning) return;

    const nonWinners = students.filter(s => !s.is_winner);
    if (nonWinners.length === 0) return;

    setSpinning(true);
    setCurrentWinner(null);

    const spinDuration = 3000;
    const interval = 80;
    let elapsed = 0;

    const spinInterval = setInterval(() => {
      const randomStudent = nonWinners[Math.floor(Math.random() * nonWinners.length)];
      setCurrentWinner(randomStudent);
      elapsed += interval;

      if (elapsed >= spinDuration) {
        clearInterval(spinInterval);
        selectWinner(nonWinners);
      }
    }, interval);
  };

  const selectWinner = async (nonWinners: Student[]) => {
    const winner = nonWinners[Math.floor(Math.random() * nonWinners.length)];

    const { error } = await supabase
      .from('students')
      .update({
        is_winner: true,
        won_at: new Date().toISOString()
      })
      .eq('id', winner.id);

    if (!error) {
      setCurrentWinner(winner);
      setSpinning(false);
      setCelebrating(true);
      createConfetti();

      setTimeout(() => {
        setCelebrating(false);
      }, 5000);

      loadData();
    }
  };

  const remainingSpins = 10 - totalSpins;
  const canSpin = totalSpins < 10 && !spinning;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-orange-900 p-4">
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="fixed pointer-events-none text-3xl animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-50px',
            animationDelay: `${piece.delay}s`
          }}
        >
          {['✨', '🎉', '⭐', '🎊', '💫'][piece.id % 5]}
        </div>
      ))}

      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center animate-slide-in-top">
          <h1 className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-200 to-orange-300 drop-shadow-2xl mb-2">
            THE GRAND FINALE
          </h1>
          <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
            Academy Admission Lucky Draw Event
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md border-2 border-yellow-400 rounded-2xl p-6 text-center transform hover:scale-105 transition-transform">
            <p className="text-yellow-200 text-sm font-semibold mb-2">TOTAL STUDENTS</p>
            <p className="text-5xl font-black text-yellow-300">{students.length}</p>
          </div>

          <div className={`bg-white/10 backdrop-blur-md border-2 border-purple-400 rounded-2xl p-6 text-center transform transition-transform ${celebrating ? 'animate-bounce-scale' : ''}`}>
            <p className="text-purple-200 text-sm font-semibold mb-2">WINNERS SELECTED</p>
            <p className="text-5xl font-black text-purple-300">{totalSpins} / 10</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border-2 border-orange-400 rounded-2xl p-6 text-center transform hover:scale-105 transition-transform">
            <p className="text-orange-200 text-sm font-semibold mb-2">SPINS REMAINING</p>
            <p className="text-5xl font-black text-orange-300">{remainingSpins}</p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-gray-900 to-black rounded-3xl shadow-2xl p-8 mb-8 border-4 border-yellow-400">
          {currentWinner ? (
            <div className={`${celebrating ? 'animate-bounce-scale' : ''}`}>
              <div className="bg-gradient-to-br from-yellow-400 via-orange-300 to-purple-400 rounded-2xl p-1 mb-6">
                <div className="bg-gray-950 rounded-2xl p-8">
                  {celebrating && (
                    <div className="text-center mb-6">
                      <p className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300 animate-pulse">
                        🎉 WINNER! 🎉
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl blur-xl opacity-75"></div>
                        <img
                          src={currentWinner.photo_url}
                          alt={currentWinner.name}
                          className={`relative w-64 h-64 rounded-2xl object-cover border-4 border-yellow-300 ${celebrating ? 'animate-vending-drop' : ''}`}
                        />
                      </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="mb-6">
                        <p className="text-sm md:text-base text-orange-300 font-bold mb-2 tracking-widest">COUPON NUMBER</p>
                        <p className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                          #{currentWinner.coupon_number}
                        </p>
                      </div>

                      <div className="mb-6">
                        <p className="text-sm md:text-base text-purple-300 font-bold mb-2 tracking-widest">WINNER NAME</p>
                        <p className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">
                          {currentWinner.name}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm md:text-base text-yellow-300 font-bold mb-2 tracking-widest">PHONE NUMBER</p>
                        <p className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                          {currentWinner.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <Zap className="w-24 h-24 text-yellow-400 mx-auto mb-4 animate-pulse" />
                <p className="text-3xl text-yellow-200 font-bold">Ready to Spin!</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mb-8">
          <button
            onClick={handleSpin}
            disabled={!canSpin}
            className={`px-12 py-6 md:px-20 md:py-8 rounded-2xl font-black text-3xl md:text-4xl shadow-2xl transition-all transform ${
              canSpin
                ? 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-gray-900 hover:scale-110 active:scale-95 border-4 border-yellow-600 animate-pulse-glow'
                : 'bg-gray-500 text-gray-700 cursor-not-allowed opacity-50'
            }`}
          >
            {spinning ? (
              <span className="animate-spin-blur inline-block">SPINNING...</span>
            ) : totalSpins >= 10 ? (
              '✓ DRAW COMPLETE'
            ) : (
              '🎰 SPIN NOW 🎰'
            )}
          </button>

          {canSpin && !spinning && (
            <div className="mt-6 text-2xl md:text-3xl font-bold text-white">
              <p className="text-yellow-300">Spin {totalSpins + 1} of 10</p>
            </div>
          )}
        </div>

        {winners.length > 0 && (
          <div className="bg-gray-900/80 backdrop-blur-md border-2 border-purple-400 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-center gap-3 mb-8">
              <Trophy className="w-10 h-10 text-yellow-400" />
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                WINNERS CIRCLE
              </h2>
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {winners.map((winner, index) => (
                <div
                  key={winner.id}
                  className="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl p-1 transform hover:scale-105 transition-transform"
                >
                  <div className="bg-gray-950 rounded-lg p-3 h-full flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center font-black text-lg text-gray-900 mb-2">
                      {index + 1}
                    </div>
                    <img
                      src={winner.photo_url}
                      alt={winner.name}
                      className="w-16 h-16 rounded-lg object-cover mb-2 border-2 border-yellow-300"
                    />
                    <p className="font-bold text-gray-200 text-sm">#{winner.coupon_number}</p>
                    <p className="text-xs text-gray-300 truncate mt-1">{winner.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
