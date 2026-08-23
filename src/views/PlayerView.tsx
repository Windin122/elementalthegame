import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { SyncManager } from '../SyncManager';
import { api } from '../api';
import { BookOpen, X, PartyPopper } from 'lucide-react';
import { formatTime, getTimerClasses } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';

export function PlayerView() {
  const { setView, setPlayerId, setRoomCode, playerId, roomCode, gameState, setGameState } = useStore();
  const [code, setCode] = useState(roomCode || '');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'code' | 'name' | 'avatar' | 'waiting' | 'playing' | 'reconnect'>(roomCode ? 'name' : 'code');
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
    if (!roomCode || roomCode.length < 4) return;
    setError('');
    try {
      const res = await api.getGameState(roomCode);
      if (res.success && res.state) {
        setGameState(res.state);
        // If the game has already started (playing), allow them to choose a profile
        if (res.state.status === 'playing') {
          setStep('reconnect');
        } else {
          setStep('name');
        }
      } else {
        setError(res.message || 'Комната не найдена');
      }
    } catch (err) {
      setError('Ошибка сети');
    }
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
        canvasRef.current.width = 250;
        canvasRef.current.height = 250;
        const size = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight);
        const startX = (videoRef.current.videoWidth - size) / 2;
        const startY = (videoRef.current.videoHeight - size) / 2;
        context.drawImage(videoRef.current, startX, startY, size, size, 0, 0, 250, 250);
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
        setCropImageSrc(ev.target?.result as string);
        setCropTarget('avatar');
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSaveAvatar = async () => {
    if (avatarDataUrl && playerId && roomCode) {
      await api.uploadAvatar(roomCode, playerId, avatarDataUrl);
      setStep('waiting');
    }
  };
  
  const [guessInput, setGuessInput] = useState('');
  const [selectedVote, setSelectedVote] = useState<string | null>(null);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [cropTarget, setCropTarget] = useState<'avatar' | 'roundPhoto' | null>(null);
  
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  const handleSaveCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const size = cropTarget === 'avatar' ? 250 : 750;
      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        size,
        size
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      if (cropTarget === 'avatar') {
        setAvatarDataUrl(dataUrl);
      } else {
        setPhotoDataUrl(dataUrl);
      }
      
      setCropImageSrc(null);
      setCropTarget(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    img.src = cropImageSrc;
  };

  
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

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startPhotoCamera = async (mode = facingMode) => {
    setIsPhotoCameraActive(true);
    try {
      if (photoVideoRef.current && photoVideoRef.current.srcObject) {
         const oldStream = photoVideoRef.current.srcObject as MediaStream;
         oldStream.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1024 }, height: { ideal: 1024 } } });
      const attachStream = () => {
        if (photoVideoRef.current) {
          photoVideoRef.current.srcObject = stream;
          photoVideoRef.current.play().catch(e => console.error("Play error:", e));
        } else {
          setTimeout(attachStream, 50);
        }
      };
      attachStream();
    } catch (err) {
      console.warn('Camera not available', err);
    }
  };

  const toggleCamera = () => {
     const newMode = facingMode === 'user' ? 'environment' : 'user';
     setFacingMode(newMode);
     startPhotoCamera(newMode);
  };

  const stopPhotoCamera = () => {
    setIsPhotoCameraActive(false);
    if (photoVideoRef.current && photoVideoRef.current.srcObject) {
      const stream = photoVideoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  };
  
  useEffect(() => {
    if (gameState?.phase === 'photo' && !gameState?.players[playerId]?.uploadedPhoto && !photoDataUrl) {
      startPhotoCamera(facingMode);
    } else {
      stopPhotoCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.phase, gameState?.players[playerId]?.uploadedPhoto, photoDataUrl]); // auto-start/stop camera based on phase


  const takeRoundPhoto = () => {
    if (photoVideoRef.current && photoCanvasRef.current) {
      const context = photoCanvasRef.current.getContext('2d');
      if (context) {
        photoCanvasRef.current.width = 750;
        photoCanvasRef.current.height = 750;
        const size = Math.min(photoVideoRef.current.videoWidth, photoVideoRef.current.videoHeight);
        const startX = (photoVideoRef.current.videoWidth - size) / 2;
        const startY = (photoVideoRef.current.videoHeight - size) / 2;
        context.drawImage(photoVideoRef.current, startX, startY, size, size, 0, 0, 750, 750);
        const dataUrl = photoCanvasRef.current.toDataURL('image/jpeg', 0.8);
        setPhotoDataUrl(dataUrl);
        
        const stream = photoVideoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleRoundPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPhotoCameraActive) {
      stopPhotoCamera();
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCropImageSrc(ev.target?.result as string);
        setCropTarget('roundPhoto');
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
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

    const renderQuestionText = () => {
      if (currentRound?.type === "paparazzi") {
        if (gameState.phase === "reading" || gameState.phase === "photo" || gameState.phase === "guessing") {
          return <span className="text-center text-white leading-relaxed">Узнайте роль другого игрока и сфотографируйте этого игрока в этой роли на своём устройстве, не раскрывая его роли</span>;
        }
        return <span className="text-center text-white leading-relaxed text-xl">Кто самый лучший подражатель?</span>;
      }
      if (!currentQuestion) return null;
      let text = currentQuestion.text;
      if (currentRound.type === 'fish' && currentQuestion.targetPlayerId) {
        const targetPlayer = gameState.players[currentQuestion.targetPlayerId];
        if (targetPlayer && text.toLowerCase().includes('этот игрок')) {
          const parts = text.split(new RegExp('этот игрок', 'i'));
          return (
            <span className="flex items-center justify-center flex-wrap gap-2 text-center text-white">
              {parts[0]}
              <span className="inline-flex items-center gap-1 bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-500/50">
                 {targetPlayer.avatar && <img src={targetPlayer.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />}
                 <span className="text-blue-300 font-bold text-sm">{targetPlayer.name}</span>
              </span>
              {parts[1]}
            </span>
          );
        }
      }
      return <span className="text-center text-white">{text}</span>;
    };

    
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 font-sans flex flex-col items-center relative">
         <div className="w-full max-w-sm mb-6 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="relative">
               <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500">
                 <img src={player.avatar} alt="" className="w-full h-full object-cover" />
               </div>

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
         <div className="w-full max-w-sm flex justify-between items-center mb-2 px-2 z-10">
           {gameState.phaseEndTime > 0 ? (
             <div className={`bg-gray-800 border border-gray-700 px-5 py-1.5 rounded-full text-xl font-mono font-bold shadow-lg transition-all ${getTimerClasses(timeLeft) || 'text-white'}`}>
               ⏱ {formatTime(timeLeft)}
             </div>
           ) : <div></div>}
           <button onClick={() => setShowHelp(true)} className="bg-gray-800 border border-gray-600 rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg" title="Подсказка">
             <BookOpen size={18} className="text-gray-300" />
           </button>
         </div>
         
         {gameState.phase === 'reading' && (
           <div className="text-center mt-12 animate-fade-in w-full max-w-sm">
             <h2 className="text-xl text-gray-400 mb-4">РАУНД {gameState.round + 1}</h2>
             <p className="text-2xl font-bold">Смотри на главный экран!</p>
           </div>
         )}
         
         {gameState.phase === 'guessing' && (
           <div className="text-center mt-8 animate-fade-in w-full max-w-sm flex flex-col items-center">

             {(currentQuestion?.text || currentRound?.type === 'paparazzi') && (
               <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4 shadow-lg w-full">
                 <p className="text-lg font-bold text-white text-center leading-relaxed">
                   {renderQuestionText()}
                 </p>
               </div>
             )}
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
               
               if (assignment && target) {
                 if (player.uploadedPhoto) {
                    return (
                      <div className="w-full flex flex-col items-center gap-4">
                        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border-2 border-green-500 relative">
                          <img src={player.uploadedPhoto} className="w-full h-full object-cover" />
                        </div>
                        <div className="w-full py-4 text-green-400 text-center font-bold border border-green-500/50 rounded-xl bg-green-900/20">ФОТО ОТПРАВЛЕНО ✓</div>
                        <p className="text-gray-400 text-sm text-center">Ожидайте других игроков</p>
                      </div>
                    );
                 }

                 return (
                   <div className="w-full flex flex-col items-center gap-4">
                     {/* Window 1: Camera or Taken Photo */}
                     <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border-2 border-purple-500 relative">
                       {!photoDataUrl ? (
                         <>
                           <video ref={photoVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} />
                           <canvas ref={photoCanvasRef} className="hidden" />
                         </>
                       ) : (
                         <img src={photoDataUrl} className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} />
                       )}
                     </div>
                     
                     {/* Window 2: Info & Controls */}
                     <div className="bg-gray-800/80 border border-gray-600 rounded-2xl p-4 w-full relative text-center">
                        {/* Toggle camera button */}
                        {!photoDataUrl && (
                          <button onClick={toggleCamera} className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-colors z-10">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        <p className="text-sm text-gray-400 mb-1">Сфотографируй:</p>
                        <p className="text-2xl font-black text-purple-300 uppercase">{target.name}</p>
                        <p className="text-sm text-gray-400 mt-2">в роли</p>
                        <p className="text-xl font-bold text-yellow-400">«{assignment.role}»</p>
                        <p className="text-xs text-red-400 mt-2 font-bold uppercase tracking-wider">Называть игроку роль нельзя!</p>
                     </div>

                     {/* Actions */}
                     <div className="flex flex-col gap-3 w-full mt-2">
                       {!photoDataUrl ? (
                         <>
                           <button onClick={takeRoundPhoto} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-colors w-full tracking-[0.1em]">
                             СДЕЛАТЬ СНИМОК
                           </button>
                           <div className="relative w-full">
                             <input type="file" accept="image/*" onChange={handleRoundPhotoUpload} className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer" />
                             <div className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-xl transition-colors w-full text-center text-sm tracking-wider">
                               ЗАГРУЗИТЬ ИЗ ГАЛЕРЕИ
                             </div>
                           </div>
                         </>
                       ) : (
                         <div className="flex gap-4 w-full">
                           <button onClick={() => setPhotoDataUrl(null)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-4 px-4 rounded-xl transition-colors text-sm">
                             ПЕРЕСНЯТЬ
                           </button>
                           <button onClick={submitRoundPhoto} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-4 rounded-xl transition-colors text-sm">
                             ОТПРАВИТЬ
                           </button>
                         </div>
                       )}
                    </div>
                  </div>
                 );
               }
               return <p className="text-gray-400">Смотри на экран</p>;
               
})()}
           </div>
         )}
         
         {gameState.phase === 'answering' && (
           <div className="text-center mt-4 animate-fade-in w-full max-w-sm flex flex-col items-center">
             {currentQuestion?.text && (
               <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4 shadow-lg w-full">
                 <p className="text-lg font-bold text-white text-center leading-relaxed">
                   {renderQuestionText()}
                 </p>
               </div>
             )}
             {!player.currentVote ? (
               <>
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
                 
                 {player.usedHatThisRound ? (
                   <div className="bg-gray-800 text-blue-400 font-bold py-3 px-8 rounded-xl w-full mb-3 flex items-center justify-center gap-2 border border-blue-500/30">
                     <span className="text-xl">🎩</span> ШЛЯПА ИСПОЛЬЗОВАНА
                   </div>
                 ) : (
                   <button 
                     onClick={() => api.useHat(roomCode, playerId)} 
                     disabled={player.hats === 0}
                     className={`font-bold py-3 px-8 rounded-xl w-full transition-colors mb-3 flex items-center justify-center gap-2 ${player.hats > 0 ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                   >
                     <span className="text-xl ${player.hats === 0 ? 'opacity-50' : ''}">🎩</span> 
                     СНЯТЬ ШЛЯПУ (x2 очки) {player.hats > 0 ? `(${player.hats} шт)` : ''}
                   </button>
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
                     <p>Твоя задача — сделать фото назначенного игрока. В нижнем окне указано, кого и в какой роли нужно сфотографировать. ВНИМАНИЕ: называть игроку роль напрямую строго запрещено, объясняй только намеками!</p>
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

         {/* Cropper Modal for playing phase */}
         <AnimatePresence>
           {cropImageSrc && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md"
             >
               <div className="relative flex-1 w-full mt-4">
                 <Cropper
                   image={cropImageSrc}
                   crop={crop}
                   zoom={zoom}
                   aspect={1}
                   onCropChange={setCrop}
                   onCropComplete={onCropComplete}
                   onZoomChange={setZoom}
                   classes={{ containerClassName: 'bg-transparent' }}
                 />
               </div>
               
               <div className="p-6 bg-gray-900/80 border-t border-gray-800 flex flex-col gap-4">
                 <div className="flex items-center gap-4">
                   <span className="text-sm text-gray-400">Масштаб</span>
                   <input
                     type="range"
                     value={zoom}
                     min={1}
                     max={3}
                     step={0.1}
                     aria-labelledby="Zoom"
                     onChange={(e) => {
                       setZoom(Number(e.target.value))
                     }}
                     className="w-full"
                   />
                 </div>
                 
                 <div className="flex gap-4">
                   <button
                     onClick={() => {
                       setCropImageSrc(null);
                       setCropTarget(null);
                       setCrop({ x: 0, y: 0 });
                       setZoom(1);
                     }}
                     className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold"
                   >
                     ОТМЕНА
                   </button>
                   <button
                     onClick={handleSaveCrop}
                     className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold"
                   >
                     СОХРАНИТЬ
                   </button>
                 </div>
               </div>
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
            <button onClick={handleJoinCode} disabled={!roomCode || roomCode.length < 4} className="bg-blue-600/80 hover:bg-blue-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl tracking-[0.2em] transition-colors w-full font-bold">ДАЛЕЕ</button>
          </motion.div>
        )}
        
        {step === "reconnect" && gameState && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Игра уже идет! Выбери свой профиль, чтобы вернуться:</p>
            <div className="flex flex-col gap-4 justify-center w-full max-w-sm mb-6 max-h-[50vh] overflow-y-auto pr-2">
              {Object.values(gameState.players).map(p => (
                <button 
                  key={p.id}
                  onClick={() => {
                    if (window.confirm(`Вернуться как ${p.name}?`)) {
                      setPlayerId(p.id);
                      setStep('playing');
                    }
                  }}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-700 p-3 rounded-xl flex items-center gap-4 w-full transition-colors"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-500 shrink-0">
                    {p.avatar && <img src={p.avatar} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="font-bold text-lg text-white">{p.name}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('code')} className="text-gray-500 hover:text-white transition-colors">Отмена</button>
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
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer" />
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
      {/* Cropper Modal */}
      <AnimatePresence>
        {cropImageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md"
          >
            <div className="relative flex-1 w-full mt-4">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                classes={{ containerClassName: 'bg-transparent' }}
              />
            </div>
            
            <div className="p-6 bg-gray-900/80 border-t border-gray-800 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">Масштаб</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => {
                    setZoom(Number(e.target.value))
                  }}
                  className="w-full"
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCropImageSrc(null);
                    setCropTarget(null);
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                  className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold"
                >
                  ОТМЕНА
                </button>
                <button
                  onClick={handleSaveCrop}
                  className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold"
                >
                  СОХРАНИТЬ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
