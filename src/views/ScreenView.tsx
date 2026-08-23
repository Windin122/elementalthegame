import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { SyncManager } from '../SyncManager';
import { api } from '../api';
import { formatTime, getTimerClasses } from '../utils';


import { motion, animate, AnimatePresence } from "motion/react";
import { useRef } from "react";

const globalPrevScores: Record<string, number> = {};

function AnimatedNumber({ value, playerId, showDiff, className }: { value: number, playerId: string, showDiff?: boolean, className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const diffRef = useRef<HTMLSpanElement>(null);
  const prev = globalPrevScores[playerId] || 0;
  

  useEffect(() => {
    if (ref.current) {
      const controls = animate(prev, value, {
        duration: 3,
        ease: "easeOut",
        onUpdate: (v) => {
          if (ref.current) ref.current.textContent = Math.round(v).toString();
        },
        onComplete: () => {
          if (showDiff && diffRef.current) {
            const diff = value - prev;
            if (diff > 0) {
              diffRef.current.textContent = `+${diff}`;
              diffRef.current.style.opacity = "1";
              diffRef.current.style.transform = "translateY(0)";
            }
          }
        }
      });
      return () => controls.stop();
    }
  }, [value, prev, showDiff]);

  return (
    <div className={`flex items-center gap-2 justify-center ${className || ""}`}>
      <span ref={ref}>{prev}</span>
      {showDiff && <span ref={diffRef} className="text-green-400 text-lg opacity-0 -translate-y-2 transition-all duration-500 font-bold drop-shadow-md"></span>}
    </div>
  );
}


const getDelay = (idx: number) => {
  if (idx >= 5) return 0.2;
  if (idx === 4) return 0.8;
  if (idx === 3) return 1.4;
  if (idx === 2) return 2.0;
  if (idx === 1) return 2.6;
  if (idx === 0) return 3.2;
  return 0;
};

export function ScreenView() {
  const { setView, setRoomCode, roomCode, gameState, setGameState } = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

    const [timeLeft, setTimeLeft] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current && gameState?.bgm) {
      audioRef.current.volume = gameState.bgm.volume ?? 0.1;
      if (gameState.bgm.trackUrl && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [gameState?.bgm]);

  useEffect(() => {
    const handleInteraction = () => {
      if (audioRef.current && audioRef.current.paused && gameState?.bgm?.trackUrl) {
        audioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener("click", handleInteraction);
    return () => document.removeEventListener("click", handleInteraction);
  }, [gameState?.bgm?.trackUrl]);


  useEffect(() => {
    if (gameState && !["results", "round_end", "game_over"].includes(gameState.phase)) {
      Object.values(gameState.players).forEach(p => {
        globalPrevScores[p.id] = p.score;
      });
    }
  }, [gameState]);

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
    if (currentRound?.type === "paparazzi") {
      if (gameState.phase === "reading" || gameState.phase === "photo") {
        return <span className="text-center">Узнайте роль другого игрока и сфотографируйте этого игрока в этой роли на своём устройстве, не раскрывая его роли</span>;
      }
      return <span className="text-center">Кто самый лучший подражатель?</span>;
    }
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
    <>
      {gameState.bgm?.trackUrl && (
        <audio src={gameState.bgm.trackUrl} autoPlay loop ref={audioRef} />
      )}
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-sans">
      <div className="w-full aspect-video max-h-screen max-w-[177.78vh] bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden shadow-2xl" style={{ background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #050505 100%)' }}>

      {/* Game Logo and Header Info */}
      <div className="absolute top-6 left-6 right-8 z-50 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-6 opacity-80">
          <img src="/logo.png" alt="Интуиция" className="h-12 object-contain drop-shadow-lg" />
          {gameState.status === 'playing' && gameState.phase !== 'round_end' && gameState.phase !== 'game_over' && (
            <div className="text-xl font-bold tracking-[0.2em] text-blue-300 pt-1">
              РАУНД {gameState.round + 1}: {currentRound?.name}
            </div>
          )}
        </div>
        {gameState.status === 'playing' && gameState.phase !== 'round_end' && gameState.phase !== 'game_over' && gameState.phaseEndTime > 0 && (
           <div className={"text-3xl font-mono border border-gray-600 bg-gray-900/50 px-4 py-2 rounded-xl backdrop-blur-sm transition-all " + (getTimerClasses(timeLeft) || 'text-gray-400')}>
              {formatTime(timeLeft)}
           </div>
        )}
      </div>

      
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
        <div className="z-10 flex flex-col items-center justify-center w-full h-full max-w-6xl px-8 relative">
          <AnimatePresence mode="wait">
           
           {gameState.phase === 'reading' && (
             <motion.div className="flex flex-col items-center justify-center gap-8 text-center w-full h-full absolute inset-0" key="reading" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }}>
               <h2 className="text-5xl md:text-6xl font-bold leading-tight max-w-4xl">{renderQuestionText()}</h2>
             </motion.div>
           )}

           {gameState.phase === 'guessing' && (
             <motion.div className="flex flex-col items-center justify-center gap-12 w-full text-center h-full absolute inset-0" key={gameState.phase} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }}>
               <h2 className="text-4xl md:text-5xl font-bold leading-tight max-w-4xl">{renderQuestionText()}</h2>
               <div className="bg-blue-900/30 border border-blue-500/50 px-8 py-4 rounded-2xl animate-pulse">
                 <p className="text-2xl font-bold tracking-widest text-blue-200">ВВЕДИТЕ СВОЁ ПРЕДПОЛОЖЕНИЕ У СЕБЯ НА ПУЛЬТЕ</p>
               </div>
             </motion.div>
           )}

           {gameState.phase === 'photo' && (
             <motion.div className="flex flex-col items-center justify-center gap-12 w-full text-center h-full absolute inset-0" key={gameState.phase} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }}>
               <h2 className="text-5xl font-bold mb-4">ВРЕМЯ ДЕЛАТЬ ФОТО!</h2>
               <p className="text-2xl text-gray-300">Посмотрите на экран устройства и узнайте игрока, которого вам необходимо сфотографировать и его роль.</p>
             </motion.div>
           )}

           {gameState.phase === 'answering' && (
             <motion.div className="flex flex-col items-center justify-center gap-4 w-full h-full absolute inset-0 py-8" key="answering" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }}>
               <h2 className="text-3xl font-bold text-center mb-2 px-8">{renderQuestionText()}</h2>
               <div className="flex flex-wrap justify-center items-stretch gap-4 w-full px-4">
                 {/* This would map over generated options. For now, we mock based on players */}
                 {currentRound.type !== 'paparazzi' && Object.values(gameState.players).map((player, idx) => (
                   <div key={idx} className="bg-gray-800/80 border border-gray-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 flex-1 min-w-[120px] max-w-[200px]">
                     {currentRound.type === 'fish' ? (
                       <p className="text-lg font-bold text-center">"{player.currentGuess || 'Вариант ответа'}"</p>
                     ) : (
                       <>
                         <div className="relative">
                           <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-500">
                             {player.avatar && <img src={player.avatar} alt="" className="w-full h-full object-cover" />}
                           </div>
                           {gameState.config.birthdayBoyId === player.id && (
                             <div className="absolute -top-4 -left-2 text-2xl transform -rotate-12 drop-shadow-lg z-20">🥳</div>
           )}
                         </div>
                         <span className="text-lg font-bold">{player.name}</span>
                       </>
                     )}
                   </div>
                 ))}
                 
                 {currentRound.type === 'paparazzi' && Object.values(gameState.players).map((player, idx) => {
                   if (!player.uploadedPhoto) return null;
                   const assignment = gameState.config.paparazziAssignments?.find(a => a.photographerId === player.id);
                   const target = assignment ? gameState.players[assignment.targetId] : null;
                   return (
                   <div key={idx} className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 flex flex-col items-center gap-1 w-48 flex-1 max-w-[200px]">
                     <div className="w-full aspect-square bg-gray-900 rounded-xl overflow-hidden mb-1 border-2 border-purple-500">
                       {player.uploadedPhoto && <img src={player.uploadedPhoto} alt="" className="w-full h-full object-cover" />}
                     </div>
                     <span className="text-sm font-bold text-center leading-tight text-white">{target?.name}</span>
                     <span className="text-xs font-bold text-yellow-400 text-center leading-tight">{assignment?.role}</span>
                     <span className="text-[10px] text-gray-400 mt-1">Фотограф: {player.name}</span>
                   </div>
                 ) })}
               </div>
             </motion.div>
           )}

           {gameState.phase === 'results' && (
             <motion.div className="flex flex-col items-center justify-center gap-4 w-full h-full absolute inset-0 py-4" key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }}>
               <h2 className="text-3xl font-bold tracking-widest text-blue-400 mb-0">ИТОГИ ВОПРОСА</h2>
               
               <div className="flex flex-wrap justify-center gap-3 w-full mb-4 shrink-0">
                 {Object.values(gameState.players).map(optionPlayer => {
                   // Find players who voted for this option
                   const voters = Object.values(gameState.players).filter(p => p.currentVote === optionPlayer.id);
                   if (voters.length === 0) return null;
                   if (currentRound.type === 'paparazzi' && !optionPlayer.uploadedPhoto) return null;
                   
                   return (
                     <div key={optionPlayer.id} className="bg-gray-800 border border-gray-600 rounded-xl p-2 px-4 flex flex-col items-center min-w-[120px]">
                       <span className="text-xs text-gray-400 mb-1">Вариант:</span>
                       {currentRound.type === 'paparazzi' ? (
                          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-500 mb-2">
                            <img src={optionPlayer.uploadedPhoto} className="w-full h-full object-cover" />
                          </div>
                       ) : (
                          <span className="font-bold text-lg mb-2 text-center leading-tight">
                            {currentRound.type === 'fish' ? optionPlayer.currentGuess : optionPlayer.name}
                          </span>
                       )}
                       <div className="flex flex-wrap justify-center gap-1">
                         {voters.map(voter => (
                           <div key={voter.id} className="relative w-8 h-8 rounded-full border-2 border-green-500 overflow-visible" title={voter.name}>
                             <div className="w-full h-full rounded-full overflow-hidden">
                               {voter.avatar && <img src={voter.avatar} className="w-full h-full object-cover" />}
                             </div>
                             {voter.usedHatThisRound && (
                               <div className="absolute -top-2 -right-1 text-sm drop-shadow-md pointer-events-none">🎩</div>
           )}
                           </div>
                         ))}
                       </div>
                       <div className="mt-1 text-green-400 font-bold text-sm">+{voters.length > 1 ? voters.length * 100 : 0}</div>
                     </div>
                   );
                 })}
               </div>

               <h2 className="text-xl font-bold tracking-widest text-gray-400 mb-2 mt-auto">ТАБЛИЦА ЛИДЕРОВ</h2>
               <div className="flex flex-wrap justify-center items-stretch gap-4 w-full px-4 pb-4">
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
                     <div key={player.id} className="flex flex-col items-center justify-between bg-gray-900/80 border border-gray-700 rounded-xl p-3 relative transform transition-all duration-500 min-w-[100px] max-w-[140px] flex-1">
                       <div className="absolute top-1 left-2 text-lg font-black text-gray-600">{idx + 1}</div>
                       
                       <div className="text-base font-bold truncate w-full text-center px-6 mb-1">{player.name}</div>
                       
                       <div className="relative my-1">
                         <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-500 bg-gray-800">
                           {player.avatar && <img src={player.avatar} alt="" className="w-full h-full object-cover" />}
                         </div>
                         {player.usedHatThisRound && (
                           <div className="absolute -top-2 -right-2 text-xl" title="Использовал шляпу">🎩</div>
                         )}
                         {gameState.config.birthdayBoyId === player.id && (
                            <div className="absolute -top-3 -left-3 text-2xl transform -rotate-12 drop-shadow-lg z-20">🥳</div>
                         )}
                       </div>
                       
                       <div className="mt-1 flex items-center justify-center w-full">
                         <AnimatedNumber value={player.score} playerId={player.id} showDiff={true} className="text-xl font-black text-blue-400" />
                       </div>
                     </div>
                   );
                 })}
               </div>
             </motion.div>
           )}


          {gameState.phase === 'round_end' && (
             <motion.div className="flex flex-col h-full w-full max-w-6xl mx-auto py-6 px-8 absolute inset-0" key="round_end" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }}>
               {/* 5th question results corner window */}
               <div className="absolute top-4 right-4 bg-gray-900/90 border border-gray-600 rounded-xl p-3 w-64 shadow-2xl z-50 max-h-[50vh] flex flex-col">
                 <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase text-center border-b border-gray-700 pb-2 shrink-0">{currentRound.type === 'paparazzi' ? 'Выбор игроков' : 'Итоги 5 вопроса'}</h3>
                 <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
                   {Object.values(gameState.players).map(optionPlayer => {
                     const voters = Object.values(gameState.players).filter(p => p.currentVote === optionPlayer.id);
                     if (voters.length === 0) return null;
                     if (currentRound.type === 'paparazzi' && !optionPlayer.uploadedPhoto) return null;
                     
                     return (
                       <div key={optionPlayer.id} className="bg-gray-800 rounded-lg p-2 flex flex-col items-center">
                         {currentRound.type === 'paparazzi' ? (
                           <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-500 mb-1">
                             <img src={optionPlayer.uploadedPhoto} className="w-full h-full object-cover" />
                           </div>
                         ) : (
                           <span className="text-xs text-blue-300 font-bold mb-1 truncate max-w-full text-center">
                             {currentRound.type === 'fish' ? optionPlayer.currentGuess : optionPlayer.name}
                           </span>
                         )}
                         <div className="flex flex-wrap justify-center gap-1">
                           {voters.map(v => (
                             <div key={v.id} className="w-5 h-5 rounded-full overflow-hidden border border-gray-500 relative" title={v.name}>
                               {v.avatar && <img src={v.avatar} className="w-full h-full object-cover" /> }
                               {v.usedHatThisRound && <div className="absolute -top-1 -right-1 text-[8px] drop-shadow-md">🎩</div>}
                             </div>
                           ))}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>

               <h1 className="text-4xl md:text-5xl font-black tracking-widest text-center text-white mb-6 uppercase drop-shadow-lg shrink-0">ИТОГИ РАУНДА</h1>
               
               {/* Top 3 Podium */}
               <div className="flex justify-center items-center gap-4 w-full mb-6 shrink-0">
                 {Object.values(gameState.players)
                   .sort((a, b) => b.score - a.score)
                   .slice(0, 3)
                   .map((p, i) => {
                     const colors = ["from-yellow-400 to-yellow-600", "from-gray-300 to-gray-500", "from-orange-600 to-orange-800"];
                     const borders = ["border-yellow-400", "border-gray-300", "border-orange-600"];
                     const shadow = ["shadow-[0_0_30px_rgba(250,204,21,0.5)]", "shadow-[0_0_30px_rgba(209,213,219,0.5)]", "shadow-[0_0_30px_rgba(234,88,12,0.5)]"];
                     const order = i === 0 ? "order-2" : i === 1 ? "order-1" : "order-3";
                     const delay = getDelay(i);
                     return (
                       <motion.div 
                         key={p.id} 
                         initial={{ opacity: 0, y: 50, scale: 0.8 }} 
                         animate={{ opacity: 1, y: 0, scale: i === 0 ? 1.1 : 1 }} 
                         transition={{ delay, type: "spring", bounce: 0.4 }}
                         className={`flex flex-col items-center p-4 bg-gradient-to-b ${colors[i]} border-2 ${borders[i]} rounded-3xl ${shadow[i]} w-40 md:w-48 ${order} z-10`}
                       >
                         <div className="text-lg md:text-xl font-black mb-2 text-white/90 drop-shadow-md">
                            {i === 0 ? "👑 1 МЕСТО" : `${i + 1} МЕСТО`}
                         </div>
                         <img src={p.avatar} className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white mb-3 object-cover shadow-xl shrink-0" />
                         <div className="text-lg md:text-xl font-bold mb-2 truncate w-full text-center text-white drop-shadow-md">{p.name}</div>
                         <div className="bg-black/30 w-full py-1.5 rounded-xl flex justify-center items-center">
                           <AnimatedNumber value={p.score} playerId={p.id} showDiff={true} className="text-2xl md:text-3xl font-black text-white drop-shadow-md" />
                         </div>
                       </motion.div>
                     );
                 })}
               </div>

               {/* Other Players (4-10) */}
               {Object.values(gameState.players).length > 3 && (
                 <div className="flex flex-wrap justify-center gap-3 mb-6 w-full max-w-6xl mx-auto">
                   {Object.values(gameState.players)
                     .sort((a, b) => b.score - a.score)
                     .slice(3)
                     .map((p, i) => {
                       const idx = i + 3;
                       const delay = getDelay(idx);
                       return (
                         <motion.div 
                           key={p.id} 
                           initial={{ opacity: 0, scale: 0.8 }} 
                           animate={{ opacity: 1, scale: 1 }} 
                           transition={{ delay, type: "spring" }}
                           className="bg-gray-800/80 border border-gray-600 rounded-2xl p-2 px-4 flex items-center gap-3 shadow-lg min-w-[200px] max-w-[280px] flex-1"
                         >
                           <div className="text-gray-400 font-bold text-xl w-6 text-center">{idx + 1}</div>
                           <img src={p.avatar} className="w-10 h-10 rounded-full border-2 border-gray-500 object-cover shrink-0" />
                           <div className="text-lg font-bold truncate max-w-[120px]">{p.name}</div>
                           <AnimatedNumber value={p.score} playerId={p.id} showDiff={true} className="text-blue-300 font-black text-xl ml-auto" />
                         </motion.div>
                       );
                   })}
                 </div>
               )}
               
               {/* Next Round (Bottom half) */}
               {gameState.config.rounds[gameState.round + 1] ? (
                 <div className="mt-auto bg-blue-900/40 p-4 rounded-3xl border-2 border-blue-500/50 flex flex-col items-center justify-center shrink-0">
                   <h2 className="text-lg text-blue-300 font-bold mb-1 uppercase tracking-wider">Следующий раунд</h2>
                   <h3 className="text-3xl font-black text-white text-center drop-shadow-lg">{gameState.config.rounds[gameState.round + 1].name}</h3>
                 </div>
               ) : (
                 <div className="mt-auto flex justify-center shrink-0">
                   <div className="bg-purple-900/60 p-4 px-12 rounded-full border-2 border-purple-500/50 animate-pulse text-2xl font-black tracking-widest">ФИНАЛ</div>
                 </div>
               )}
             </motion.div>
           )}

          {gameState.phase === 'game_over' && (
             <motion.div className="flex flex-col items-center h-full w-full max-w-6xl mx-auto py-6 px-4 absolute inset-0 z-20" key="game_over" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6 }}>
               <h1 className="text-4xl md:text-5xl font-black tracking-widest text-center text-purple-400 mb-8 uppercase drop-shadow-2xl shrink-0">ИТОГИ ИГРЫ</h1>
               
               {/* Top 3 Podium */}
               <div className="flex justify-center items-center gap-8 w-full mb-12 shrink-0 mt-4">
                 {Object.values(gameState.players)
                   .sort((a, b) => b.score - a.score)
                   .slice(0, 3)
                   .map((p, i) => {
                     const colors = ["from-yellow-400 to-yellow-600", "from-gray-300 to-gray-500", "from-orange-600 to-orange-800"];
                     const borders = ["border-yellow-400", "border-gray-300", "border-orange-600"];
                     const shadow = ["shadow-[0_0_50px_rgba(250,204,21,0.6)]", "shadow-[0_0_30px_rgba(209,213,219,0.5)]", "shadow-[0_0_30px_rgba(234,88,12,0.5)]"];
                     const order = i === 0 ? "order-2" : i === 1 ? "order-1" : "order-3";
                     const delay = getDelay(i);
                     return (
                       <motion.div 
                         key={p.id} 
                         initial={{ opacity: 0, y: 100, scale: 0.8 }} 
                         animate={{ opacity: 1, y: 0, scale: i === 0 ? 1.25 : 1.05 }} 
                         transition={{ delay, type: "spring", bounce: 0.4 }}
                         className={`relative flex flex-col items-center p-6 bg-gradient-to-b ${colors[i]} border-2 ${borders[i]} rounded-3xl ${shadow[i]} w-56 ${order} z-10 mx-2 md:mx-6`}
                       >
                         {i === 0 && (
                           <>
                             <div className="absolute -top-12 text-6xl drop-shadow-md animate-bounce">👑</div>
                             <div className="absolute -left-12 top-0 text-6xl animate-ping" style={{animationDuration: "2s"}}>🎆</div>
                             <div className="absolute -right-12 top-12 text-6xl animate-ping" style={{animationDuration: "2.5s", animationDelay: "0.5s"}}>🎇</div>
                           </>
                         )}
                         <div className="text-2xl font-black mb-3 text-white/90 drop-shadow-md">
                            {i === 0 ? "ПОБЕДИТЕЛЬ" : `${i + 1} МЕСТО`}
                         </div>
                         <img src={p.avatar} className="w-28 h-28 rounded-full border-4 border-white mb-4 object-cover shadow-2xl shrink-0" />
                         <div className="text-2xl font-bold mb-4 truncate w-full text-center text-white drop-shadow-md">{p.name}</div>
                         <div className="bg-black/40 w-full py-3 rounded-2xl flex justify-center items-center">
                           <AnimatedNumber value={p.score} playerId={p.id} className="text-5xl font-black text-white drop-shadow-md" />
                         </div>
                       </motion.div>
                     );
                 })}
               </div>

               {/* Other Players (4-10) */}
               {Object.values(gameState.players).length > 3 && (
                 <div className="flex flex-wrap justify-center items-stretch gap-4 mb-8 w-full max-w-6xl shrink-0 mx-auto pb-4">
                   {Object.values(gameState.players)
                     .sort((a, b) => b.score - a.score)
                     .slice(3)
                     .map((p, i) => {
                       const idx = i + 3;
                       const delay = getDelay(idx);
                       return (
                         <motion.div 
                           key={p.id} 
                           initial={{ opacity: 0, scale: 0.8 }} 
                           animate={{ opacity: 1, scale: 1 }} 
                           transition={{ delay, type: "spring" }}
                           className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 px-6 flex items-center gap-4 shadow-lg min-w-[200px] max-w-[280px] flex-1"
                         >
                           <div className="text-gray-400 font-bold text-xl w-6 text-center">{idx + 1}</div>
                           <img src={p.avatar} className="w-12 h-12 rounded-full border-2 border-gray-500 object-cover shrink-0" />
                           <div className="text-lg font-bold truncate max-w-[120px]">{p.name}</div>
                           <AnimatedNumber value={p.score} playerId={p.id} className="text-blue-300 font-black text-xl ml-auto" />
                         </motion.div>
                       );
                   })}
                 </div>
               )}
             </motion.div>
           )}

          </AnimatePresence>
        </div>
      )}
      </div>
    </div>
    </>
  );
}