import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { SyncManager } from '../SyncManager';
import { api } from '../api';

export function ScreenView() {
  const { setView, setRoomCode, roomCode, gameState, setGameState } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

    const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!gameState?.phaseEndTime) return;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((gameState.phaseEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateTimer();
    const int = setInterval(updateTimer, 500);
    return () => clearInterval(int);
  }, [gameState?.phaseEndTime]);

useEffect(() => {
    let interval: any;
    if (roomCode) {
      interval = setInterval(async () => {
        const res = await api.getGameState(roomCode);
        if (res.success && res.state) {
          setGameState(res.state);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [roomCode, setGameState]);
  
  const handleConnect = async () => {
    const res = await api.joinScreen(code);
    if (res.success) {
      setRoomCode(code);
    } else {
      setError('Комната не найдена');
    }
  };

  if (!roomCode || !gameState) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-8 font-sans flex flex-col items-center justify-center relative">
        <button onClick={() => setView('main')} className="absolute top-8 left-8 text-gray-500 hover:text-white transition-colors">← Назад</button>
        <div className="flex flex-col items-center w-full max-w-sm">
          <h1 className="text-3xl font-bold mb-8 tracking-[0.2em] font-serif text-center">РЕЖИМ ЭКРАНА</h1>
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <input 
            type="text" 
            value={code || ""}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl text-white mb-6 w-full text-center text-3xl tracking-[0.5em] focus:border-blue-500 outline-none transition-colors uppercase placeholder:text-gray-600"
            placeholder="КОД КОМНАТЫ"
            maxLength={4}
          />
          <button onClick={handleConnect} disabled={!code || code.length < 4} className="bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl tracking-[0.2em] transition-colors w-full font-bold">ПОДКЛЮЧИТЬСЯ</button>
        </div>
      </div>
    );
  }

  const currentRound = gameState.config.rounds[gameState.round];
  const currentQuestion = currentRound?.questions[gameState.questionIndex];
  
  // Format question text (replace "этот игрок" with player name + avatar)
  const renderQuestionText = () => {
    if (currentRound?.type === "paparazzi") return <span className="text-center">Кто на фото и какую роль изображает?</span>;
    if (!currentQuestion) return null;
    let text = currentQuestion.text;
    if (currentRound.type === 'fish' && currentQuestion.targetPlayerId) {
      const targetPlayer = gameState.players[currentQuestion.targetPlayerId];
      if (targetPlayer && text.toLowerCase().includes('этот игрок')) {
        const parts = text.split(new RegExp('этот игрок', 'i'));
        return (
          <span className="flex items-center justify-center flex-wrap gap-2 text-center">
            {parts[0]}
            <span className="inline-flex items-center gap-2 bg-blue-900/40 px-3 py-1 rounded-full border border-blue-500/50">
               {targetPlayer.avatar && <img src={targetPlayer.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />}
               <span className="text-blue-300 font-bold">{targetPlayer.name}</span>
            </span>
            {parts[1]}
          </span>
        );
      }
    }
    return <span className="text-center">{text}</span>;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #050505 100%)' }}>
      
      {/* Background decorations */}
      {currentRound?.bgImage && (
        <div 
          className="absolute inset-0 z-0 opacity-30 mix-blend-screen bg-cover bg-center"
          style={{ backgroundImage: `url(${currentRound.bgImage})`, filter: 'sepia(1) hue-rotate(180deg) saturate(3) blur(2px)' }} 
        />
      )}
      
      {!currentRound?.bgImage && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen"></div>
        </>
      )}

      {/* Header Info */}
      {gameState.status === 'playing' && gameState.phase !== 'round_end' && (
        <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-20">
           <div className="text-xl font-bold tracking-[0.2em] text-blue-300">
             РАУНД {gameState.round + 1}: {currentRound?.name}
           </div>
           {gameState.phaseEndTime > 0 && (
             <div className="text-3xl font-mono text-gray-400 border border-gray-600 bg-gray-900/50 px-4 py-2 rounded-xl backdrop-blur-sm">
                00:{timeLeft.toString().padStart(2, '0')}
             </div>
           )}
        </div>
      )}

      {gameState.status === 'lobby' && (
        <div className="z-10 flex flex-col items-center">
           <div className="bg-blue-900/50 border border-blue-500 rounded-2xl px-8 py-4 mb-8">
             <h2 className="text-xl text-blue-300 font-bold mb-2 uppercase text-center">ПЕРВЫЙ РАУНД:</h2>
             <h3 className="text-4xl font-black text-white text-center tracking-widest">{gameState.config.rounds[0]?.name}</h3>
           </div>
           <h2 className="text-2xl text-blue-400 tracking-[0.5em] font-bold mb-4 uppercase">Подключение к игре</h2>
           <h1 className="text-8xl font-black tracking-widest mb-12 text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">{roomCode}</h1>
           
           <div className="flex flex-wrap gap-6 justify-center max-w-4xl">
             {Object.values(gameState.players).map(player => (
               <div key={player.id} className="flex flex-col items-center gap-3 animate-fade-in">
                 <div className="relative">
                   <div className="w-24 h-24 rounded-full border-4 border-blue-500/50 overflow-hidden bg-gray-900 relative">
                      {player.avatar && <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />}
                   </div>
                   {gameState.config.birthdayBoyId === player.id && (
                     <div className="absolute -top-6 -left-4 text-5xl transform -rotate-12 drop-shadow-lg z-20">🥳</div>
                   )}
                 </div>
                 <span className="font-bold tracking-wider">{player.name}</span>
               </div>
             ))}
           </div>
           
           {Object.keys(gameState.players).length === 0 && (
             <p className="text-gray-500 mt-8 tracking-widest">Ожидаем игроков...</p>
           )}
        </div>
      )}

      {gameState.status === 'playing' && (
        <div className="z-10 flex flex-col items-center w-full max-w-6xl px-8">
           
           {gameState.phase === 'reading' && (
             <div className="flex flex-col items-center gap-8 animate-fade-in text-center">
               <h2 className="text-5xl md:text-6xl font-bold leading-tight max-w-4xl">{renderQuestionText()}</h2>
             </div>
           )}

           {gameState.phase === 'guessing' && (
             <div className="flex flex-col items-center gap-12 animate-fade-in w-full text-center">
               <h2 className="text-4xl md:text-5xl font-bold leading-tight max-w-4xl">{renderQuestionText()}</h2>
               <div className="bg-blue-900/30 border border-blue-500/50 px-8 py-4 rounded-2xl animate-pulse">
                 <p className="text-2xl font-bold tracking-widest text-blue-200">ВВЕДИТЕ СВОЁ ПРЕДПОЛОЖЕНИЕ У СЕБЯ НА ПУЛЬТЕ</p>
               </div>
             </div>
           )}

           {gameState.phase === 'photo' && (
             <div className="flex flex-col items-center gap-12 animate-fade-in w-full text-center">
               <h2 className="text-5xl font-bold mb-4">ВРЕМЯ ДЕЛАТЬ ФОТО!</h2>
               <p className="text-2xl text-gray-300">Смотрите в свои телефоны, чтобы узнать свою роль и кто вас фотографирует.</p>
             </div>
           )}

           {gameState.phase === 'answering' && (
             <div className="flex flex-col items-center gap-12 animate-fade-in w-full">
               <h2 className="text-4xl font-bold text-center mb-8">{renderQuestionText()}</h2>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full">
                 {/* This would map over generated options. For now, we mock based on players */}
                 {currentRound.type !== 'paparazzi' && Object.values(gameState.players).map((player, idx) => (
                   <div key={idx} className="bg-gray-800/80 border border-gray-600 rounded-2xl p-6 flex flex-col items-center gap-4">
                     {currentRound.type === 'fish' ? (
                       <p className="text-xl font-bold text-center">"{player.currentGuess || 'Вариант ответа'}"</p>
                     ) : (
                       <>
                         <div className="relative">
                           <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-500">
                             {player.avatar && <img src={player.avatar} alt="" className="w-full h-full object-cover" />}
                           </div>
                           {gameState.config.birthdayBoyId === player.id && (
                             <div className="absolute -top-6 -left-4 text-4xl transform -rotate-12 drop-shadow-lg z-20">🥳</div>
                           )}
                         </div>
                         <span className="text-xl font-bold">{player.name}</span>
                       </>
                     )}
                   </div>
                 ))}
                 
                 {currentRound.type === 'paparazzi' && Object.values(gameState.players).map((player, idx) => (
                   <div key={idx} className="bg-gray-800/80 border border-gray-600 rounded-2xl p-4 flex flex-col items-center gap-2">
                     <div className="w-full h-48 bg-gray-900 rounded-xl overflow-hidden mb-2">
                       {player.uploadedPhoto && <img src={player.uploadedPhoto} alt="" className="w-full h-full object-cover" />}
                     </div>
                     <span className="text-lg font-bold">Роль: {player.roleDescription || 'Неизвестно'}</span>
                     <span className="text-sm text-gray-400">от {player.name}</span>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {gameState.phase === 'results' && (
             <div className="flex flex-col items-center gap-8 animate-fade-in w-full">
               <h2 className="text-4xl font-bold tracking-widest text-blue-400 mb-2">ИТОГИ ВОПРОСА</h2>
               
               <div className="flex flex-wrap justify-center gap-6 w-full mb-8">
                 {Object.values(gameState.players).map(optionPlayer => {
                   // Find players who voted for this option
                   const voters = Object.values(gameState.players).filter(p => p.currentVote === optionPlayer.id);
                   if (voters.length === 0) return null;
                   if (currentRound.type === 'paparazzi' && !optionPlayer.uploadedPhoto) return null;
                   
                   return (
                     <div key={optionPlayer.id} className="bg-gray-800 border border-gray-600 rounded-xl p-4 flex flex-col items-center min-w-[200px]">
                       <span className="text-sm text-gray-400 mb-2">Вариант:</span>
                       {currentRound.type === 'paparazzi' ? (
                          <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-500 mb-4">
                            <img src={optionPlayer.uploadedPhoto} className="w-full h-full object-cover" />
                          </div>
                       ) : (
                          <span className="font-bold text-xl mb-4 text-center">
                            {currentRound.type === 'fish' ? optionPlayer.currentGuess : optionPlayer.name}
                          </span>
                       )}
                       <div className="flex flex-wrap justify-center gap-2">
                         {voters.map(voter => (
                           <div key={voter.id} className="relative w-10 h-10 rounded-full border-2 border-green-500 overflow-visible" title={voter.name}>
                             <div className="w-full h-full rounded-full overflow-hidden">
                               {voter.avatar && <img src={voter.avatar} className="w-full h-full object-cover" />}
                             </div>
                             {voter.usedHatThisRound && (
                               <div className="absolute -top-3 -right-2 text-xl drop-shadow-md pointer-events-none">🎩</div>
                             )}
                           </div>
                         ))}
                       </div>
                       <div className="mt-2 text-green-400 font-bold">+{voters.length > 1 ? voters.length * 100 : 0}</div>
                     </div>
                   );
                 })}
               </div>

               <h2 className="text-2xl font-bold tracking-widest text-gray-400 mb-4">ТАБЛИЦА ЛИДЕРОВ</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 w-full max-w-5xl">
                 {/* Sort players by score */}
                 {Object.values(gameState.players).sort((a, b) => b.score - a.score).map((player, idx) => {
                   // Calculate points gained this round
                   let gained = 0;
                   if (player.currentVote) {
                     const votersForSame = Object.values(gameState.players).filter(p => p.currentVote === player.currentVote);
                     if (votersForSame.length > 1) {
                       gained = votersForSame.length * 100 * (player.usedHatThisRound ? 2 : 1);
                     }
                   }
                   
                   return (
                     <div key={player.id} className="flex items-center gap-4 bg-gray-900/80 border border-gray-700 rounded-xl p-4 transform transition-all duration-500">
                       <div className="text-3xl font-black text-gray-500 w-8 text-center">{idx + 1}</div>
                       <div className="relative">
                         <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-500 bg-gray-800">
                           {player.avatar && <img src={player.avatar} alt="" className="w-full h-full object-cover" />}
                         </div>
                         {player.usedHatThisRound && (
                           <div className="absolute -top-3 -right-2 text-2xl" title="Использовал шляпу">🎩</div>
                         )}
                          {gameState.config.birthdayBoyId === player.id && (
                            <div className="absolute -top-4 -left-3 text-3xl transform -rotate-12 drop-shadow-lg z-20">🥳</div>
                          )}
                       </div>
                       <div className="flex-1">
                         <div className="text-xl font-bold">{player.name}</div>
                       </div>
                       <div className="text-right">
                         <div className="text-2xl font-black text-blue-400">{player.score}</div>
                         {gained > 0 && (
                           <div className="text-sm font-bold text-green-400">+{gained}</div>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}

           {gameState.phase === 'round_end' && (
             <div className="flex flex-col items-center justify-center h-full animate-fade-in text-center w-full max-w-4xl mx-auto">
               <h1 className="text-6xl font-black tracking-widest text-white mb-12">ИТОГИ РАУНДА</h1>
               
               <div className="flex justify-center items-end gap-6 w-full h-[400px] mb-12">
                 {Object.values(gameState.players)
                   .sort((a, b) => b.score - a.score)
                   .slice(0, 3)
                   .map((p, i) => {
                     const heights = ["h-[350px]", "h-[250px]", "h-[200px]"];
                     const colors = ["bg-yellow-500", "bg-gray-400", "bg-orange-600"];
                     const orderIndex = i === 0 ? 1 : i === 1 ? 0 : 2; // to place 1st in middle, 2nd on left, 3rd on right
                     
                     // If we just map normally it's 1, 2, 3 left to right. We can just use flex order.
                     const order = i === 0 ? "order-2" : i === 1 ? "order-1" : "order-3";
                     
                     return (
                       <div key={p.id} className={"flex flex-col items-center " + order}>
                         <div className="text-3xl font-black mb-2">{p.score}</div>
                         <img src={p.avatar} className="w-20 h-20 rounded-full border-4 border-white mb-2 object-cover" />
                         <div className="text-xl font-bold mb-2">{p.name}</div>
                         <div className={"w-32 rounded-t-lg flex justify-center pt-4 text-4xl font-black " + heights[i] + " " + colors[i]}>
                           {i + 1}
                         </div>
                       </div>
                     );
                 })}
               </div>
               
               {gameState.config.rounds[gameState.round + 1] && (
                 <div className="mt-8 bg-blue-900/50 p-6 rounded-2xl border-2 border-blue-500 animate-pulse">
                   <h2 className="text-2xl text-blue-300 font-bold mb-2">Следующий раунд:</h2>
                   <h3 className="text-5xl font-black text-white">{gameState.config.rounds[gameState.round + 1].name}</h3>
                 </div>
               )}
             </div>
           )}
        </div>
      )}
    </div>
  );
}

