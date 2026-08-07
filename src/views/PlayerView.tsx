import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { SyncManager } from '../SyncManager';
import { api } from '../api';
import { BookOpen, X, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PlayerView() {
  const { setView, setPlayerId, setRoomCode, playerId, roomCode, gameState, setGameState } = useStore();
  const [code, setCode] = useState(roomCode || '');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'code' | 'name' | 'avatar' | 'waiting' | 'playing'>(roomCode ? 'name' : 'code');
  const [error, setError] = useState('');
  
  const [showHelp, setShowHelp] = useState(false);
  const [isReadingScroll, setIsReadingScroll] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  
  // Game state sync
  useEffect(() => {
    if (!roomCode || !playerId || step === 'code' || step === 'name' || step === 'avatar') return;
    
    // Check state manually once immediately to catch up
    api.getGameState(roomCode).then(res => {
      if (res.success && res.state) {
        setGameState(res.state);
        if (res.state.status === 'playing' && step !== 'playing') {
          setStep('playing');
        } else if (res.state.status === 'lobby' && step === 'playing') {
          setStep('waiting');
        }
      }
    });

    const sync = new SyncManager(roomCode, playerId, false, (state, mode) => {
      setGameState(state);
      useStore.getState().setSyncMode(mode);
      // Wait for state updates to apply step transitions
      if (state.status === 'playing' && step !== 'playing') {
        setStep('playing');
      } else if (state.status === 'lobby' && step === 'playing') {
        setStep('waiting');
      }
    });

    return () => {
      sync.stop();
    };
  }, [roomCode, playerId, step]);

  const handleJoinCode = async () => {
    setRoomCode(code);
    setStep('name');
  };

  const handleJoinName = async () => {
    const res = await api.joinPlayer(roomCode || code, name);
    if (res.success) {
      setPlayerId(res.playerId);
      setStep('avatar');
      startCamera();
    } else {
      setError(res.message || 'Ошибка подключения');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera not available', err);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = 150;
        canvasRef.current.height = 150;
        const size = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight);
        const startX = (videoRef.current.videoWidth - size) / 2;
        const startY = (videoRef.current.videoHeight - size) / 2;
        context.drawImage(videoRef.current, startX, startY, size, size, 0, 0, 150, 150);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setAvatarDataUrl(dataUrl);
        
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
             const context = canvasRef.current.getContext('2d');
             if(context) {
               canvasRef.current.width = 150;
               canvasRef.current.height = 150;
               context.drawImage(img, 0, 0, 150, 150);
               setAvatarDataUrl(canvasRef.current.toDataURL('image/jpeg', 0.7));
             }
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = async () => {
    if (avatarDataUrl && playerId && roomCode) {
      await api.uploadAvatar(roomCode, playerId, avatarDataUrl);
      setStep('waiting');
    }
  };
  
  const [guessInput, setGuessInput] = useState('');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isPhotoCameraActive, setIsPhotoCameraActive] = useState(false);

  // Timer logic
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

  const submitGuess = async () => {
    if (!roomCode || !playerId || !guessInput) return;
    await api.submitGuess(roomCode, playerId, guessInput);
  };

  const submitVote = async () => {
    if (!roomCode || !playerId || !selectedVote) return;
    await api.submitVote(roomCode, playerId, selectedVote);
  };

  const startPhotoCamera = async () => {
    setIsPhotoCameraActive(true);
    setPhotoDataUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (photoVideoRef.current) {
        photoVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera not available', err);
    }
  };

  const takeRoundPhoto = () => {
    if (photoVideoRef.current && photoCanvasRef.current) {
      const context = photoCanvasRef.current.getContext('2d');
      if (context) {
        photoCanvasRef.current.width = 300;
        photoCanvasRef.current.height = 300;
        const size = Math.min(photoVideoRef.current.videoWidth, photoVideoRef.current.videoHeight);
        const startX = (photoVideoRef.current.videoWidth - size) / 2;
        const startY = (photoVideoRef.current.videoHeight - size) / 2;
        context.drawImage(photoVideoRef.current, startX, startY, size, size, 0, 0, 300, 300);
        const dataUrl = photoCanvasRef.current.toDataURL('image/jpeg', 0.8);
        setPhotoDataUrl(dataUrl);
        
        const stream = photoVideoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleRoundPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          if (photoCanvasRef.current) {
             const context = photoCanvasRef.current.getContext("2d");
             if(context) {
               photoCanvasRef.current.width = 300;
               photoCanvasRef.current.height = 300;
               context.drawImage(img, 0, 0, 300, 300);
               setPhotoDataUrl(photoCanvasRef.current.toDataURL("image/jpeg", 0.6));
               
               if (photoVideoRef.current && photoVideoRef.current.srcObject) {
                 const stream = photoVideoRef.current.srcObject as MediaStream;
                 stream?.getTracks().forEach(track => track.stop());
               }
             }
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const submitRoundPhoto = async () => {
    if (!roomCode || !playerId || !photoDataUrl) return;
    await api.submitPhoto(roomCode, playerId, photoDataUrl);
    setIsPhotoCameraActive(false);
  };

  if (step === 'playing' && gameState && playerId) {
    const player = gameState.players[playerId];
    const currentRound = gameState.config.rounds[gameState.round];
    const currentQuestion = currentRound?.questions[gameState.questionIndex];
    
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 font-sans flex flex-col items-center relative">
         <div className="w-full max-w-sm mb-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="relative">
               <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500">
                 <img src={player.avatar} alt="" className="w-full h-full object-cover" />
               </div>
               {player.hats > 0 && !player.usedHatThisRound && (
                 <div className="absolute -top-3 -right-3 text-2xl z-10 filter drop-shadow-md pointer-events-none">
                   🎩
                   <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-bold px-1 rounded-full">{player.hats}</span>
                 </div>
               )}
               {player.usedHatThisRound && (
                 <div className="absolute -top-3 -right-3 text-2xl filter drop-shadow-md pointer-events-none" title="Шляпа использована!">
                   🎩
                 </div>
               )}
               {gameState.config.birthdayBoyId === playerId && (
                 <div className="absolute -top-4 -left-3 text-3xl transform -rotate-12 pointer-events-none z-20">🥳</div>
               )}
             </div>
             <span className="font-bold">{player?.name}</span>
           </div>
           <div className="text-right">
             <div className="text-sm text-gray-400">Баллы</div>
             <div className="text-xl font-black text-blue-400">{player?.score || 0}</div>
           </div>
         </div>
         
         {/* Live Timer & Help Button */}
         {gameState.phaseEndTime > 0 && (
           <div className="fixed bottom-6 w-full max-w-sm flex justify-between items-center px-4 z-50">
             <button onClick={() => setShowHelp(true)} className="bg-gray-800 border border-gray-600 rounded-full w-12 h-12 flex items-center justify-center hover:bg-gray-700 transition-colors">
               <BookOpen size={20} className="text-gray-300" />
             </button>
             <div className="bg-black/80 border border-gray-700 px-6 py-2 rounded-full backdrop-blur-md text-2xl font-mono font-bold shadow-2xl shadow-blue-900/20">
               00:{timeLeft.toString().padStart(2, '0')}
             </div>
             <div className="w-12 h-12"></div> {/* Spacer for centering */}
           </div>
         )}
         
         {gameState.phase === 'reading' && (
           <div className="text-center mt-12 animate-fade-in w-full max-w-sm">
             <h2 className="text-xl text-gray-400 mb-4">РАУНД {gameState.round + 1}</h2>
             <p className="text-2xl font-bold">Смотри на главный экран!</p>
           </div>
         )}
         
         {gameState.phase === 'guessing' && (
           <div className="text-center mt-8 animate-fade-in w-full max-w-sm flex flex-col items-center">
             {!player.currentGuess ? (
               <>
                 <h2 className="text-2xl font-bold mb-6">Введи свой вариант</h2>
                 <textarea 
                   value={guessInput}
                   onChange={e => setGuessInput(e.target.value)}
                   className="bg-gray-800 border border-gray-700 rounded-xl p-4 w-full h-32 text-white outline-none focus:border-blue-500 resize-none mb-4"
                   placeholder="Твой невероятный ответ..."
                 />
                 <button onClick={submitGuess} disabled={!guessInput} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-xl w-full transition-colors">
                   ОТПРАВИТЬ
                 </button>
               </>
             ) : (
               <div className="w-full py-8 px-4 text-center">
                 <div className="text-blue-400 mb-4">
                   <svg className="w-16 h-16 mx-auto animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <h2 className="text-2xl font-bold mb-2 text-white">Отправили ваш ответ</h2>
                 <p className="text-gray-400">Ожидаем других игроков...</p>
               </div>
             )}
           </div>
         )}
         
         {gameState.phase === 'photo' && (
           <div className="text-center mt-8 animate-fade-in w-full max-w-sm flex flex-col items-center">
             <h2 className="text-2xl font-bold mb-4 text-purple-400">ВРЕМЯ ДЕЛАТЬ ФОТО</h2>
             {(() => {
               const assignment = gameState.config.paparazziAssignments.find(a => a.photographerId === playerId);
               const target = assignment ? gameState.players[assignment.targetId] : null;
               
               if (assignment && target && !player.uploadedPhoto) {
                 if (isPhotoCameraActive && !photoDataUrl) {
                   return (
                     <div className="w-full flex flex-col items-center gap-4">
                       <div className="bg-purple-900/80 p-4 rounded-xl border border-purple-500 w-full mb-2">
                         <p className="text-white text-center font-bold">Сними {target.name} в роли {assignment.role}</p>
                       </div>
                       <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border-2 border-purple-500 relative">
                         <video ref={photoVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                         <canvas ref={photoCanvasRef} className="hidden" />
                       </div>
                       <div className="flex flex-col gap-4 w-full">
                         <button onClick={takeRoundPhoto} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-colors w-full tracking-[0.1em]">
                           СДЕЛАТЬ СНИМОК
                         </button>
                         <div className="relative w-full">
                           <input type="file" accept="image/*" onChange={handleRoundPhotoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                           <div className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-colors w-full text-center tracking-[0.1em]">
                             ИЛИ ЗАГРУЗИТЬ
                           </div>
                         </div>
                         <button onClick={() => setIsPhotoCameraActive(false)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 px-8 rounded-xl transition-colors w-full border border-gray-600">
                           НАЗАД
                         </button>
                       </div>
                     </div>
                   );
                 }
                 
                 if (photoDataUrl && !player.uploadedPhoto) {
                   return (
                     <div className="w-full flex flex-col items-center gap-4">
                       <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-purple-500 relative">
                         <img src={photoDataUrl} className="w-full h-full object-cover transform scale-x-[-1]" />
                       </div>
                       <div className="flex gap-4 w-full">
                         <button onClick={() => setPhotoDataUrl(null)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-4 px-4 rounded-xl transition-colors">
                           ПЕРЕСНЯТЬ
                         </button>
                         <button onClick={submitRoundPhoto} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-4 rounded-xl transition-colors">
                           ОТПРАВИТЬ
                         </button>
                       </div>
                     </div>
                   );
                 }

                 return (
                   <div className="w-full flex flex-col items-center gap-4">
                     <div className="bg-purple-900/50 p-6 rounded-xl border border-purple-500 w-full mb-4">
                       <h3 className="text-lg text-purple-300 font-bold mb-2 text-center">Твоя цель:</h3>
                       <div className="flex items-center justify-center gap-4 mb-4">
                         <img src={target.avatar} className="w-16 h-16 rounded-full border-2 border-purple-400 object-cover" />
                         <span className="text-2xl font-black text-white">{target.name}</span>
                       </div>
                       <h3 className="text-lg text-purple-300 font-bold mb-2 text-center">В роли:</h3>
                       <p className="text-xl font-black text-white text-center">{assignment.role}</p>
                     </div>
                     <button onClick={() => setIsPhotoCameraActive(true)} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-colors w-full tracking-[0.1em]">
                       ОТКРЫТЬ КАМЕРУ
                     </button>
                     <div className="relative w-full mt-2">
                       <input type="file" accept="image/*" onChange={handleRoundPhotoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                       <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 px-8 rounded-xl transition-colors w-full border border-gray-600">
                         ИЛИ ЗАГРУЗИТЬ ИЗ ГАЛЕРЕИ
                       </button>
                     </div>
                   </div>
                 );
               }
               
               if (isPhotoCameraActive && !photoDataUrl) {
                 return (
                   <div className="w-full flex flex-col items-center gap-4">
                     <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border-2 border-purple-500 relative">
                       <video ref={photoVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                       <canvas ref={photoCanvasRef} className="hidden" />
                     </div>
                     
                     <div className="flex flex-col gap-4 w-full">
                       <button onClick={takeRoundPhoto} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-colors w-full tracking-[0.1em]">
                         СДЕЛАТЬ СНИМОК
                       </button>
                       <div className="relative w-full">
                         <input type="file" accept="image/*" onChange={handleRoundPhotoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                         <div className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-colors w-full text-center tracking-[0.1em]">
                           ИЛИ ЗАГРУЗИТЬ
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               }
               
               if (photoDataUrl) {
                 return (
                   <div className="w-full flex flex-col items-center gap-4">
                     <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border-2 border-green-500 relative">
                       <img src={photoDataUrl} className="w-full h-full object-cover" />
                     </div>
                     {(!player.uploadedPhoto || player.uploadedPhoto !== photoDataUrl) ? (
                       <div className="flex gap-2 w-full">
                         <button onClick={submitRoundPhoto} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors text-sm">ОТПРАВИТЬ ФОТО</button>
                         <button onClick={startPhotoCamera} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors text-sm">ПЕРЕДЕЛАТЬ</button>
                       </div>
                     ) : (
                       <div className="w-full flex flex-col items-center gap-4 mt-4">
                         <div className="w-full py-4 text-green-400 font-bold border border-green-500/50 rounded-xl bg-green-900/20">ФОТО ОТПРАВЛЕНО ✓</div>
                         <p className="text-gray-400 text-sm">Если вы хотите, можете его переснять</p>
                         <button onClick={startPhotoCamera} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-colors text-sm w-full">ПЕРЕСНЯТЬ</button>
                       </div>
                     )}
                   </div>
                 );
               }
               
               if (!target) return <p className="text-gray-400">Смотри на экран</p>;
               
               return (
                 <div className="bg-gray-900/80 border border-purple-500/50 p-6 rounded-2xl mb-6 w-full">
                    <p className="text-sm text-gray-400 mb-2">Твоя цель для фото:</p>
                    <div className="text-xl font-bold mb-2 flex items-center justify-center gap-3">
                       <img src={target.avatar} className="w-8 h-8 rounded-full" alt="" />
                       {target.name}
                    </div>
                    <p className="text-sm text-gray-400 mb-2 mt-4">Он должен изобразить:</p>
                    <div className="text-lg font-bold text-yellow-400">{assignment?.role}</div>
                    
                    {!player.uploadedPhoto && (
                      <button onClick={startPhotoCamera} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl w-full transition-colors mt-6">ОТКРЫТЬ КАМЕРУ</button>
                    )}
                 </div>
               );
             })()}
           </div>
         )}
         
         {gameState.phase === 'answering' && (
           <div className="text-center mt-4 animate-fade-in w-full max-w-sm">
             {!player.currentVote ? (
               <>
                 {currentQuestion?.text && (
                   <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4 shadow-lg">
                     <p className="text-lg font-bold text-white text-center leading-relaxed">
                       {currentQuestion.text}
                     </p>
                   </div>
                 )}
                 <h2 className="text-xl font-bold mb-6">Выбери ответ</h2>
                 <div className="flex flex-col gap-3 mb-6">
                    {Object.values(gameState.players).map(p => {
                      if (currentRound.type === 'paparazzi' && !p.uploadedPhoto) return null;
                      
                      return (
                        <button 
                          key={p.id} 
                          onClick={() => setSelectedVote(p.id)}
                          className={`border rounded-xl p-4 flex items-center gap-4 transition-all text-left ${selectedVote === p.id ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-gray-800 hover:bg-gray-700 border-gray-600'}`}
                        >
                          {currentRound.type === 'fish' ? (
                            <span className="font-bold flex-1">{p.currentGuess || 'Вариант'}</span>
                          ) : currentRound.type === 'paparazzi' ? (
                            (() => {
                              const assignment = gameState.config.paparazziAssignments.find(a => a.photographerId === p.id);
                              const target = assignment ? gameState.players[assignment.targetId] : null;
                              return (
                                <>
                                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-purple-500 flex-shrink-0">
                                     {p.uploadedPhoto && <img src={p.uploadedPhoto} className="w-full h-full object-cover" />}
                                  </div>
                                  <div className="flex flex-col flex-1 items-start text-left">
                                    <span className="font-black text-white">{target?.name}</span>
                                    <span className="text-sm font-bold text-purple-300 leading-tight">{assignment?.role}</span>
                                  </div>
                                </>
                              );
                            })()
                          ) : (
                            <>
                              <img src={p.avatar} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-900 border border-gray-700" />
                              <span className="font-bold flex-1">{p.name}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                 </div>
                 
                 {player.hats > 0 && !player.usedHatThisRound && (
                   <button 
                     onClick={() => api.useHat(roomCode, playerId)} 
                     className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl w-full transition-colors mb-3 flex items-center justify-center gap-2"
                   >
                     <span className="text-xl">🎩</span> СНЯТЬ ШЛЯПУ (x2 очки)
                   </button>
                 )}
                 {player.usedHatThisRound && (
                   <div className="bg-gray-800 text-blue-400 font-bold py-3 px-8 rounded-xl w-full mb-3 flex items-center justify-center gap-2 border border-blue-500/30">
                     <span className="text-xl">🎩</span> ШЛЯПА ИСПОЛЬЗОВАНА
                   </div>
                 )}
                 <button 
                    onClick={submitVote} 
                    disabled={!selectedVote} 
                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-xl w-full transition-colors"
                 >
                   ОТПРАВИТЬ ОТВЕТ
                 </button>

               </>
             ) : (
               <div className="w-full py-8 px-4 text-center mt-12">
                 <div className="text-green-400 mb-4">
                   <svg className="w-16 h-16 mx-auto animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <h2 className="text-2xl font-bold mb-2 text-white">Отправили ваш ответ</h2>
                 <p className="text-gray-400">Ожидаем других игроков...</p>
               </div>
             )}
           </div>
         )}
         
         {(gameState.phase === 'results' || gameState.phase === 'round_end') && (
           <div className="text-center mt-12 animate-fade-in w-full max-w-sm">
             <p className="text-2xl font-bold">Смотри результаты на главном экране!</p>
           </div>
         )}
         
         {gameState.phase === 'game_over' && (
           <div className="text-center mt-8 animate-fade-in w-full max-w-sm flex flex-col items-center">
             <h2 className="text-3xl font-bold mb-4 tracking-widest text-blue-400">ИГРА ОКОНЧЕНА</h2>
             
             {(() => {
               const sortedPlayers = Object.values(gameState.players).sort((a, b) => b.score - a.score);
               const maxScore = sortedPlayers[0]?.score || 0; const isWinner = player.score === maxScore && maxScore > 0;
               
               if (isReadingScroll) {
                 return (
                   <div className="bg-orange-950/40 border border-orange-500/50 rounded-2xl p-6 mb-6 w-full shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                     <h3 className="text-xl font-bold text-orange-400 mb-4 font-serif uppercase tracking-widest border-b border-orange-500/30 pb-2">СВИТОК ПОБЕДИТЕЛЯ</h3>
                     <p className="text-gray-200 text-lg leading-relaxed whitespace-pre-wrap font-serif italic">
                       {gameState.config.winnerScrollText || 'Великая тайна пуста...'}
                     </p>
                   </div>
                 );
               }
               
               return (
                 <div className="flex flex-col items-center w-full mb-8">
                   <p className="text-xl mb-8">Твой итоговый счёт: <span className="font-bold text-blue-400">{player.score}</span></p>
                   {isWinner ? (
                     <div className="flex flex-col items-center animate-pulse">
                       <PartyPopper size={48} className="text-yellow-400 mb-4" />
                       <p className="text-lg text-yellow-400 font-bold mb-6 text-center">ПОЗДРАВЛЯЕМ! ТЫ ПОБЕДИТЕЛЬ!</p>
                       <button onClick={() => setIsReadingScroll(true)} className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-bold py-4 px-8 rounded-xl w-full transition-colors shadow-lg shadow-orange-500/20 tracking-wider">
                         ОТКРЫТЬ СВИТОК ПОБЕДИТЕЛЯ
                       </button>
                     </div>
                   ) : (
                     <p className="text-gray-400 italic">Эх, в этот раз не повезло. Победил кто-то другой.</p>
                   )}
                 </div>
               );
             })()}
             
             <button onClick={() => setView('main')} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-xl w-full transition-colors mt-4">
               ВЕРНУТЬСЯ В МЕНЮ
             </button>
           </div>
         )}
         
         {/* Help Modal */}
         <AnimatePresence>
           {showHelp && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[100] flex justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
               onClick={() => setShowHelp(false)}
             >
               <motion.div
                 initial={{ y: 50, scale: 0.95 }}
                 animate={{ y: 0, scale: 1 }}
                 exit={{ y: 20, scale: 0.95 }}
                 onClick={e => e.stopPropagation()}
                 className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm text-gray-300 relative my-auto shadow-2xl"
               >
                 <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors">
                   <X size={24} />
                 </button>
                 <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider flex items-center gap-2">
                   <BookOpen size={20} className="text-blue-400" /> Подсказка
                 </h2>
                 <div className="space-y-3 text-sm">
                   {gameState.phase === 'guessing' && (
                     <p>В этом раунде тебе нужно придумать самое подходящее или смешное предположение о человеке, про которого задан вопрос. Потом мы выберем лучшее!</p>
                   )}
                   {gameState.phase === 'photo' && (
                     <p>Твоя задача — сфотографировать назначенного игрока так, чтобы он изобразил свою тайную роль. Не называй ему слово напрямую, объясняй намеками!</p>
                   )}
                                      {gameState.phase === "answering" && (
                     <p>Выбери вариант ответа, который по твоему мнению выберет большинство. Не переговаривайтесь! Если ты уверен — используй шляпу 🎩 для удвоения очков!</p>
                   )}
                   {gameState.phase === "reading" && (
                     <p>Смотри на главный экран, читай вопрос и готовься действовать.</p>
                   )}
                   {["results", "round_end"].includes(gameState.phase) && (
                     <p>Смотри на результаты на главном экране. Готовься к следующему этапу!</p>
                   )}
                 </div>
               </motion.div>
             </motion.div>
           )}
         </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans flex flex-col items-center justify-center relative">
      <button onClick={() => setView("main")} className="absolute top-8 left-8 text-gray-500 hover:text-white transition-colors">← Назад</button>
      
      <div className="flex flex-col items-center w-full max-w-sm">
        <h1 className="text-3xl font-bold mb-8 tracking-[0.2em] font-serif text-center">ИГРАТЬ</h1>
        
        {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
        
        {step === "code" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-center">
            <input 
              type="text" 
              value={roomCode || ""}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl text-white mb-6 w-full text-center text-3xl tracking-[0.5em] focus:border-blue-500 outline-none uppercase placeholder:text-gray-600"
              placeholder="КОД"
              maxLength={4}
            />
            <button onClick={() => {if(roomCode && roomCode.length >= 4) setStep("name")}} disabled={!roomCode || roomCode.length < 4} className="bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl tracking-[0.2em] transition-colors w-full font-bold">ДАЛЕЕ</button>
          </motion.div>
        )}
        
        {step === "name" && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full flex flex-col items-center">
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl text-white mb-6 w-full text-center text-xl focus:border-blue-500 outline-none placeholder:text-gray-600"
              placeholder="Твоё имя"
              maxLength={12}
            />
            <button onClick={handleJoinName} disabled={!name} className="bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl tracking-[0.2em] transition-colors w-full font-bold">ДАЛЕЕ</button>
          </motion.div>
        )}
        
        {step === "waiting" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">ОЖИДАНИЕ...</h2>
            <p className="text-gray-400">Скоро начнем. Смотрите на главный экран!</p>
          </motion.div>
        )}
        
        {step === "avatar" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Сделай селфи для аватарки</p>
            
            <div className="w-48 h-48 rounded-full overflow-hidden bg-gray-900 border-4 border-gray-700 mb-8 relative">
              {!avatarDataUrl ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
              ) : (
                <img src={avatarDataUrl} className="w-full h-full object-cover" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            {!avatarDataUrl ? (
              <div className="flex flex-col gap-4 w-full">
                <button onClick={takePhoto} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-colors w-full tracking-[0.1em]">
                  СДЕЛАТЬ ФОТО
                </button>
                <div className="relative w-full">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-colors w-full text-center tracking-[0.1em]">
                    ИЛИ ЗАГРУЗИТЬ
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 w-full">
                <button onClick={() => { setAvatarDataUrl(null); startCamera(); }} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl transition-colors w-1/2 text-sm">
                  ПЕРЕСНЯТЬ
                </button>
                <button onClick={handleSaveAvatar} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-colors w-1/2 tracking-[0.1em]">
                  ПРИСОЕДИНИТЬСЯ
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}