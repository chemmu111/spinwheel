import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Zap } from 'lucide-react';
import type { Student } from '../lib/types';

export function LuckyDraw() {
  const [students, setStudents] = useState<Student[]>([]);
  const [winners, setWinners] = useState<Student[]>([]);
  const [currentWinner, setCurrentWinner] = useState<Student | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [totalSpins, setTotalSpins] = useState(0);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number }>>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load data from Supabase
  const loadData = async () => {
    const { data: allStudents } = await supabase
      .from('students')
      .select('*')
      .order('coupon_number', { ascending: true });

    if (allStudents) {
      setStudents(allStudents);
      const winnersList = allStudents
        .filter(s => s.is_winner && s.win_spin_number)
        .sort((a, b) => (a.win_spin_number || 0) - (b.win_spin_number || 0));

      setWinners(winnersList);
      setTotalSpins(winnersList.length);
    }
  };

  const createConfetti = () => {
    const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3
    }));
    setConfetti(confettiPieces);

    // Stop confetti after 5 seconds to match celebration time
    setTimeout(() => setConfetti([]), 5000);
  };

  const handleSpin = async () => {
    // Prevent spin if max reached or already spinning or celebrating
    if (totalSpins >= 10 || spinning || celebrating || isCelebrating) return;

    // Check strict DB state before spinning
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .filter('is_winner', 'eq', true);

    if (count !== null && count >= 10) {
      setTotalSpins(count); // Sync state
      return;
    }

    const nonWinners = students.filter(s => !s.is_winner);
    if (nonWinners.length === 0) return;

    setSpinning(true);
    setCurrentWinner(null);

    const spinDuration = 3000; // 3 seconds spin
    const interval = 80;
    let elapsed = 0;

    const spinInterval = setInterval(() => {
      const randomStudent = nonWinners[Math.floor(Math.random() * nonWinners.length)];
      setCurrentWinner(randomStudent);
      elapsed += interval;

      if (elapsed >= spinDuration) {
        clearInterval(spinInterval);
        performWinnerSelection();
      }
    }, interval);
  };

  const performWinnerSelection = async () => {
    // refetch to ensure we don't pick a winner who just won in another session (race condition check)
    const { data: latestStudents } = await supabase
      .from('students')
      .select('*');

    if (!latestStudents) {
      setSpinning(false);
      return;
    }

    const availableCandidates = latestStudents.filter(s => !s.is_winner);
    if (availableCandidates.length === 0) {
      setSpinning(false);
      return;
    }

    const winner = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];

    // Get current max spin number from DB to ensure sequence
    const { data: currentWinners } = await supabase
      .from('students')
      .select('win_spin_number')
      .eq('is_winner', true)
      .order('win_spin_number', { ascending: false })
      .limit(1);

    const nextSpinNumber = (currentWinners?.[0]?.win_spin_number || 0) + 1;

    if (nextSpinNumber > 10) {
      setSpinning(false);
      return;
    }

    const { error } = await supabase
      .from('students')
      .update({
        is_winner: true,
        won_at: new Date().toISOString(),
        win_spin_number: nextSpinNumber
      } as any)
      .eq('id', winner.id);

    if (!error) {
      setCurrentWinner(winner);
      setSpinning(false);
      setCelebrating(true);
      setIsCelebrating(true);
      createConfetti();

      // Refresh local data to show new winner in list
      loadData();

      // Celebration timer - 5 seconds
      setTimeout(() => {
        setCelebrating(false);
        setIsCelebrating(false);
        // Auto-trigger next spin if not finished
        if (nextSpinNumber < 10) {
          // We use a small timeout to allow state to settle
          setTimeout(() => document.getElementById('spin-button')?.click(), 500);
        }
      }, 5000);
    } else {
      setSpinning(false);
      console.error("Error updating winner", error);
    }
  };

  const remainingSpins = 10 - totalSpins;
  const canSpin = totalSpins < 10 && !spinning;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-orange-900 p-6">
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="fixed pointer-events-none text-2xl animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            animationDelay: `${piece.delay}s`
          }}
        >
          {['✨', '🎉', '⭐', '🎊', '💫'][piece.id % 5]}
        </div>
      ))}

      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-200 to-orange-300 mb-1">
            THE GRAND FINALE
          </h1>
          <p className="text-lg md:text-xl font-semibold text-white/80">
            Academy Admission Lucky Draw
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md border border-yellow-400/50 rounded-lg p-4 text-center">
            <p className="text-yellow-200 text-xs font-semibold mb-1">STUDENTS</p>
            <p className="text-4xl font-bold text-yellow-300">{students.length}</p>
          </div>

          <div className={`bg-white/10 backdrop-blur-md border border-purple-400/50 rounded-lg p-4 text-center transition-transform ${celebrating ? 'animate-bounce-scale' : ''}`}>
            <p className="text-purple-200 text-xs font-semibold mb-1">WINNERS</p>
            <p className="text-4xl font-bold text-purple-300">{totalSpins}/10</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-orange-400/50 rounded-lg p-4 text-center">
            <p className="text-orange-200 text-xs font-semibold mb-1">REMAINING</p>
            <p className="text-4xl font-bold text-orange-300">{remainingSpins}</p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl p-6 mb-8 border border-yellow-400/30">
          {currentWinner ? (
            <div className={`${celebrating ? 'animate-bounce-scale' : ''}`}>
              <div className="bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-purple-500/20 rounded-xl p-1 mb-4">
                <div className="bg-gray-950 rounded-lg p-6">
                  {celebrating && (
                    <div className="text-center mb-4">
                      <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                        🎉 WINNER! 🎉
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg blur opacity-40"></div>
                        <img
                          src={currentWinner.photo_url}
                          alt={currentWinner.name}
                          className={`relative w-48 h-48 rounded-lg object-cover border-2 border-yellow-300 ${celebrating ? 'animate-vending-drop' : ''}`}
                        />
                      </div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="mb-4">
                        <p className="text-xs text-orange-300 font-bold mb-1 uppercase tracking-wide">Coupon #</p>
                        <p className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                          {currentWinner.coupon_number}
                        </p>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-purple-300 font-bold mb-1 uppercase tracking-wide">
                          Winner #{currentWinner.win_spin_number}
                        </p>
                        <p className="text-3xl md:text-4xl font-black text-white">
                          {currentWinner.name}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-yellow-300 font-bold mb-1 uppercase tracking-wide">Phone</p>
                        <p className="text-2xl font-bold text-white/90">
                          {currentWinner.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Zap className="w-16 h-16 text-yellow-400 mx-auto mb-2 animate-subtle-pulse" />
                <p className="text-2xl text-yellow-200 font-bold">Ready to Spin!</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mb-8">
          <button
            id="spin-button"
            onClick={handleSpin}
            disabled={!canSpin || celebrating}
            className={`px-12 py-4 rounded-xl font-bold text-2xl transition-all transform ${!canSpin || celebrating
              ? 'bg-gray-500 text-gray-700 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-gray-900 hover:shadow-lg active:scale-95 border border-yellow-600/50 animate-pulse-glow'
              }`}
          >
            {spinning ? (
              <span className="animate-spin-blur inline-block">SPINNING...</span>
            ) : totalSpins >= 10 ? (
              'All winners selected 🎉'
            ) : (
              '🎰 SPIN'
            )}
          </button>

          {canSpin && !spinning && (
            <div className="mt-4 text-lg font-semibold text-white">
              <p className="text-yellow-300">Spin {totalSpins + 1} of 10</p>
            </div>
          )}
        </div>

        {winners.length > 0 && (
          <div className="bg-gray-900/60 backdrop-blur-md border border-purple-400/30 rounded-2xl p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                WINNERS
              </h2>
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {winners.map((winner) => (
                <div
                  key={winner.id}
                  className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-2 border border-yellow-300/50"
                >
                  <div className="flex items-center justify-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center font-bold text-xs text-gray-900 mb-2">
                      {winner.win_spin_number}
                    </div>
                  </div>
                  <img
                    src={winner.photo_url}
                    alt={winner.name}
                    className="w-full h-20 rounded-md object-cover mb-1 border border-yellow-300/50"
                  />
                  <p className="font-bold text-gray-200 text-xs text-center">
                    #{winner.coupon_number}
                  </p>
                  <p className="text-xs text-gray-300 truncate text-center">{winner.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
