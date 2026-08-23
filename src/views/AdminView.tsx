import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { SyncManager } from '../SyncManager';
import { api } from '../api';
import { GameState, RoundType, GamePhase } from '../types';
import { HelpCircle, Shuffle, Save, Info, Copy, Check, Music, Upload, Play, Pause, Volume2, X, Trash2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatTime, getTimerClasses } from '../utils';

function getStatusText(state: GameState) {
  if (state.status === 'lobby') return 'Ожидание игроков';
  const round = state.config.rounds[state.round];
  let text = `Раунд ${state.round + 1}: ${round.name} - `;
  if (state.phase === 'reading') text += state.round === 4 ? 'чтение задачи' : `чтение вопроса ${state.questionIndex + 1}`;
  else if (state.phase === 'guessing') text += 'игроки вводят предположение';
  else if (state.phase === 'photo') text += 'игроки делают фото';
  else if (state.phase === 'answering') text += 'игроки выбирают ответ';
  else if (state.phase === 'results') text += 'промежуточный итог';
  else if (state.phase === 'round_end') text = `итоги раунда`;
  return text;
}

function getRoundSubtitle(type: RoundType) {
  if (type === 'standard') return 'КТО-ТО сделал... а что он сделал?';
  if (type === 'fish') return 'Рыбка на удочке';
  if (type === 'paparazzi') return 'Ох уж эти папарации';
  return '';
}

export function AdminView() {
  const { setView, adminToken, setAdminToken, roomCode, setRoomCode, gameState, setGameState } = useStore();
  const [login, setLogin] = useState('');
  const [draftConfig, setDraftConfig] = useState<GameState['config'] | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showBgmModal, setShowBgmModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [bgmTracks, setBgmTracks] = useState<{name: string, url: string}[]>([]);


  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!gameState || gameState.phaseEndTime <= 0) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((gameState.phaseEndTime - Date.now()) / 1000);
      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 200);
    return () => clearInterval(interval);
  }, [gameState]);


  useEffect(() => {
    let interval: any;
    if (adminToken && roomCode) {
      interval = setInterval(async () => {
        const res = await api.getGameState(roomCode);
        if (res.success && res.state) {
          setGameState(res.state);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [adminToken, roomCode, setGameState]);

  useEffect(() => {
    if (gameState && !draftConfig) {
      setDraftConfig(gameState.config);
    }
  }, [gameState, draftConfig]);


  useEffect(() => {
    if (showBgmModal) {
      api.getBgmTracks().then(res => {
        if (res.success) setBgmTracks(res.tracks);
      });
    }
  }, [showBgmModal]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const res = await api.uploadBgmTrack(file.name, dataUrl);
      if (res.success) {
        setBgmTracks([...bgmTracks, res.track]);
      }
    };
    reader.readAsDataURL(file);
  };


  const handleDeleteTrack = async (track: {name: string, url: string}) => {
    if (confirm(`Удалить трек ${track.name}?`)) {
      const res = await api.deleteBgmTrack(track.name);
      if (res.success) {
        setBgmTracks(bgmTracks.filter(t => t.url !== track.url));
        if (gameState.bgm?.trackUrl === track.url) {
          api.updateGameState(roomCode, { bgm: { ...gameState.bgm, trackUrl: null } });
        }
      }
    }
  };

  const handleLogin = async () => {
    const res = await api.adminLogin(login);
    if (res.success) {
      setAdminToken(res.token);
    } else {
      alert('Неверный логин');
    }
  };

  const handleCreateRoom = async () => {
    const res = await api.createRoom();
    if (res.success) {
      setRoomCode(res.code);
      const stateRes = await api.getGameState(res.code);
      if (stateRes.success && stateRes.state) {
        setGameState(stateRes.state);
        setDraftConfig(stateRes.state.config);
      }
    }
  };

  const handleSaveConfig = async () => {
    if (draftConfig && roomCode) {
      await api.updateRoomConfig(roomCode, draftConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleStartGame = async () => {
    if (roomCode) {
      await api.nextPhase(roomCode);
    }
  };
  
  const handleNextPhase = async () => {
    if (roomCode) {
      await api.nextPhase(roomCode);
    }
  };

  const handleShufflePhotographers = () => {
    if (!gameState || !draftConfig) return;
    const pIds = Object.keys(gameState.players);
    if (pIds.length < 2) return alert('Нужно минимум 2 игрока');
    
    let valid = false;
    let shuffled: string[] = [];
    while (!valid) {
      shuffled = [...pIds];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      valid = shuffled.every((val, i) => val !== pIds[i]);
    }
    
    const newAssignments = pIds.map((targetId, i) => {
      const existing = draftConfig.paparazziAssignments.find(a => a.targetId === targetId);
      return {
        targetId,
        photographerId: shuffled[i],
        role: existing ? existing.role : ''
      };
    });
    setDraftConfig({ ...draftConfig, paparazziAssignments: newAssignments });
  };

  const updatePaparazziRole = (targetId: string, role: string) => {
    if (!draftConfig) return;
    const assignments = [...draftConfig.paparazziAssignments];
    const idx = assignments.findIndex(a => a.targetId === targetId);
    if (idx >= 0) {
      assignments[idx].role = role;
    } else {
      assignments.push({ targetId, photographerId: '', role });
    }
    setDraftConfig({ ...draftConfig, paparazziAssignments: assignments });
  };

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-8 font-sans flex flex-col items-center justify-center">
        <button onClick={() => setView('main')} className="absolute top-8 left-8 text-gray-500 hover:text-white transition-colors">← Назад</button>
        <h1 className="text-3xl font-bold mb-8 tracking-[0.2em] font-serif">АДМИН-ПАНЕЛЬ</h1>
        <input 
          type="text" 
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl text-white mb-4 w-80 text-center tracking-widest focus:border-blue-500 outline-none transition-colors"
          placeholder="ЛОГИН"
        />
        <button onClick={handleLogin} className="bg-blue-600/80 hover:bg-blue-500 text-white px-8 py-3 rounded-xl tracking-[0.2em] transition-colors w-80">ВОЙТИ</button>
      </div>
    );
  }

  if (!roomCode || !gameState || !draftConfig) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-8 font-sans flex flex-col items-center justify-center">
        <button onClick={() => setView('main')} className="absolute top-8 left-8 text-gray-500 hover:text-white transition-colors">← Назад</button>
        <h1 className="text-3xl font-bold mb-8 tracking-[0.2em] font-serif">СОЗДАНИЕ КОМНАТЫ</h1>
        <button onClick={handleCreateRoom} className="bg-blue-600/80 hover:bg-blue-500 text-white px-12 py-4 rounded-xl text-xl tracking-[0.2em] transition-colors">
          СОЗДАТЬ КОМНАТУ
        </button>
      </div>
    );
  }

  const playerCount = Object.keys(gameState.players).length;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans overflow-y-auto">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        
        
        {/* Public Access Link Box */}
        <div className="bg-gradient-to-r from-blue-900/60 to-purple-900/60 border-2 border-blue-500/80 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🌐</span>
              <h2 className="text-lg font-bold text-white tracking-wide">Прямая ссылка для игроков</h2>
            </div>
            <p className="text-xs text-blue-200 leading-relaxed">
              Отправь эту ссылку игрокам — она откроется в любом браузере и на любых телефонах с прямым входом в комнату <b>{roomCode}</b>!
            </p>
            <div className="mt-2 font-mono text-xs bg-black/50 px-3 py-1.5 rounded-lg border border-blue-500/30 text-blue-300 select-all inline-block">
              {window.location.origin}/?code={roomCode}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                const url = `${window.location.origin}/?code=${roomCode}`;
                navigator.clipboard.writeText(url);
                setCopiedPublic(true);
                setTimeout(() => setCopiedPublic(false), 2000);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30"
            >
              {copiedPublic ? <Check size={16} /> : <Copy size={16} />}
              {copiedPublic ? "Скопировано!" : "Скопировать ссылку игрокам"}
            </button>
            <a
              href={`${window.location.origin}/?code=${roomCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
            >
              Открыть ↗
            </a>
          </div>
        </div>

        

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-2xl font-bold tracking-widest text-center mb-6 text-blue-400 uppercase">Сканируй, чтобы играть</h2>
            
            <div className="bg-white p-4 rounded-xl flex items-center justify-center w-64 h-64 mx-auto mb-6">
              <QRCodeSVG value={`${window.location.origin}/?code=${roomCode}`} size={224} />
            </div>

            <div className="text-center font-bold text-gray-300">
              Или перейди по ссылке:<br/>
              <span className="text-blue-400 text-sm font-mono mt-2 inline-block">{`${window.location.origin}/?code=${roomCode}`}</span>
            </div>
          </div>
        </div>
      )}

      {showBgmModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowBgmModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-purple-400"><Music /> Фоновая музыка</h2>
            
            <div className="bg-black/50 p-4 rounded-xl border border-gray-700 mb-6">
              <h3 className="text-gray-400 text-sm mb-2 uppercase font-bold">Текущий трек</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => api.updateGameState(roomCode, { bgm: { ...gameState.bgm, trackUrl: gameState.bgm?.trackUrl ? null : (bgmTracks[0]?.url || null) } })}
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${gameState.bgm?.trackUrl ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
                >
                  {gameState.bgm?.trackUrl ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <div className="flex-1">
                  <div className="text-white font-bold truncate">{gameState.bgm?.trackUrl ? gameState.bgm.trackUrl.split('/').pop() : 'Выключено'}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Volume2 size={16} className="text-gray-400" />
                    <input 
                      type="range" 
                      min="0" max="1" step="0.05" 
                      value={gameState.bgm?.volume || 0.1}
                      onChange={(e) => api.updateGameState(roomCode, { bgm: { ...gameState.bgm, volume: parseFloat(e.target.value) } })}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">Библиотека</h3>
              <div className="flex gap-2">
                {gameState.bgm?.trackUrl && (
                  <button onClick={() => api.updateGameState(roomCode, { bgm: { ...gameState.bgm, trackUrl: null } })} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                    <Pause size={16} /> Выключить
                  </button>
                )}
                <label className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg cursor-pointer text-sm font-bold flex items-center gap-2 transition-colors">
                  <Upload size={16} /> Загрузить
                  <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {bgmTracks.length === 0 ? (
                <div className="text-gray-500 text-center py-8">Нет загруженных треков</div>
              ) : (
                bgmTracks.map((track, i) => (
                  <div key={i} className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg flex items-center justify-between border border-gray-700 transition-colors">
                    <div className="text-sm text-gray-200 truncate pr-4 flex-1" title={track.name}>{track.name}</div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => api.updateGameState(roomCode, { bgm: { trackUrl: track.url, volume: gameState.bgm?.volume || 0.1 } })}
                        className={`px-3 py-1 rounded text-xs font-bold ${gameState.bgm?.trackUrl === track.url ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-50'}`}
                      >
                        {gameState.bgm?.trackUrl === track.url ? 'ВЫБРАН' : 'ВЫБРАТЬ'}
                      </button>
                      <button
                        onClick={() => handleDeleteTrack(track)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

        {/* Header and Controls */}
        <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl sticky top-4 z-50 shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold tracking-widest text-blue-400">КОД: {roomCode}</h1>
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/?code=${roomCode}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg flex items-center gap-2 transition-colors border border-gray-600"
                  title="Скопировать ссылку на игру"
                >
                  {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                  <span className="text-xs font-bold uppercase tracking-wider">{copied ? 'Скопировано!' : 'Поделиться'}</span>
                </button>

                <button 
                  onClick={() => setShowQrModal(true)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg flex items-center gap-2 transition-colors border border-gray-600"
                  title="Показать QR-код"
                >
                  <QrCode size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">QR-Код</span>
                </button>


                <button 
                  onClick={() => setShowBgmModal(true)}
                  className="bg-purple-900/50 hover:bg-purple-800/80 text-purple-300 p-2 rounded-lg flex items-center gap-2 transition-colors border border-purple-500/50"
                  title="Фоновая музыка"
                >
                  <Music size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Музыка</span>
                </button>

              </div>
              <p className="text-gray-400 mt-2 text-sm">
                Игроков: <span className="text-white font-bold">{playerCount} / 10</span> | Экран: {gameState.screenConnected ? <span className="text-green-400 font-bold">Подключен</span> : <span className="text-red-400">Нет</span>}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-200">
                Статус: <span className="text-yellow-400">{getStatusText(gameState)}</span>
              </div>
              {gameState.status === 'lobby' ? (
                <button 
                  onClick={handleStartGame}
                  className="mt-3 bg-green-600/80 hover:bg-green-500 px-6 py-2 rounded-lg font-bold tracking-wider transition-colors text-sm"
                >
                  НАЧАТЬ ИГРУ
                </button>
              ) : (
                <div className="flex flex-wrap justify-end gap-2 mt-3">
                  <button 
                    onClick={handleNextPhase}
                    className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold tracking-wider transition-colors shadow-lg shadow-blue-500/20 text-sm"
                  >
                    ДАЛЕЕ →
                  </button>
                  <select 
                    value={gameState.round}
                    onChange={(e) => api.updateGameState(roomCode, { round: Number(e.target.value), questionIndex: 0 })}
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-400"
                  >
                    {draftConfig.rounds.map((r, i) => <option key={i} value={i}>Раунд {i+1}</option>)}
                  </select>
                </div>
              )}
              {gameState.status === 'lobby' && playerCount < 3 && <p className="text-xs text-red-400 mt-2">Минимум 3 игрока</p>}
              {gameState.status !== 'lobby' && gameState.phaseEndTime > 0 && (
                <div className={`mt-3 bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg text-2xl font-mono text-center ${getTimerClasses(timeLeft) || 'text-gray-400'}`}>
                  {formatTime(timeLeft)}
                </div>
              )}
            </div>
          </div>
          <button onClick={handleSaveConfig} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold tracking-widest transition-colors mt-2 ${saveSuccess ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
            {saveSuccess ? <Check size={18} /> : <Save size={18} />}
            {saveSuccess ? 'НАСТРОЙКИ СОХРАНЕНЫ ✓' : 'СОХРАНИТЬ ВСЕ НАСТРОЙКИ'}
          </button>
        </div>

        {/* Timers and Global Config Section */}
        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-bold mb-6 tracking-widest text-gray-300">ОБЩИЕ НАСТРОЙКИ</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Содержимое свитка победителя</label>
              <textarea 
                value={draftConfig.winnerScrollText || ''}
                onChange={(e) => setDraftConfig({ ...draftConfig, winnerScrollText: e.target.value })}
                className="bg-gray-800/80 border border-gray-700 p-3 rounded-lg text-white text-sm focus:border-blue-500 outline-none w-full h-24 resize-none"
                placeholder="Напишите тайное послание для победителя..."
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Режим именинника (Выбор игрока)</label>
              <select 
                value={draftConfig.birthdayBoyId || ''}
                onChange={(e) => setDraftConfig({ ...draftConfig, birthdayBoyId: e.target.value })}
                className="bg-gray-800/80 border border-gray-700 p-3 rounded-lg text-white font-bold focus:border-blue-500 outline-none w-full"
              >
                <option value="">-- Нет именинника --</option>
                {Object.values(gameState.players).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-6 tracking-widest text-gray-300">ТАЙМЕРЫ (В СЕКУНДАХ)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { key: 'reading', label: 'Чтение вопроса' },
              { key: 'answering', label: 'Выбор ответа (1-5)' },
              { key: 'guessing', label: 'Предположения (р3)' },
              { key: 'photo', label: 'Создание фото (р5)' },
              { key: 'results', label: 'Просмотр итогов' }
            ].map(timer => (
              <div key={timer.key} className="flex flex-col gap-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">{timer.label}</label>
                <input 
                  type="number"
                  value={draftConfig.timers[timer.key as keyof typeof draftConfig.timers]}
                  onChange={(e) => setDraftConfig({
                    ...draftConfig,
                    timers: { ...draftConfig.timers, [timer.key]: Number(e.target.value) }
                  })}
                  className="bg-gray-800/80 border border-gray-700 p-3 rounded-lg text-white font-mono text-lg focus:border-blue-500 outline-none w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rounds Configuration */}
        <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-6 tracking-widest text-gray-300">ВОПРОСЫ И РАУНДЫ</h2>
          <div className="flex flex-col gap-8">
            {draftConfig.rounds.map((round, rIndex) => (
              <div key={rIndex} className="bg-black/40 border border-gray-700 p-5 rounded-2xl">
                
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
                  <div className="w-full">
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider block mb-1">Название раунда</label>
                    <input 
                      type="text"
                      value={round.name}
                      onChange={(e) => {
                        const newRounds = [...draftConfig.rounds];
                        newRounds[rIndex].name = e.target.value;
                        setDraftConfig({ ...draftConfig, rounds: newRounds });
                      }}
                      className="bg-gray-800 border border-gray-600 p-2 rounded-lg text-white font-bold w-full max-w-sm"
                    />
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                    <span className="text-sm font-bold text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full border border-blue-800/50">
                      {getRoundSubtitle(round.type)}
                    </span>
                    <label className="bg-gray-800 hover:bg-gray-700 text-xs px-3 py-1.5 rounded cursor-pointer transition-colors border border-gray-600">
                      {round.bgImage ? 'Фон загружен ✓' : 'Загрузить фон'}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const newRounds = [...draftConfig.rounds];
                              newRounds[rIndex].bgImage = ev.target?.result as string;
                              setDraftConfig({ ...draftConfig, rounds: newRounds });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {round.type !== 'paparazzi' ? (
                  <div className="flex flex-col gap-4">
                    {round.type === 'fish' && (
                       <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-blue-200">
                         <div className="flex gap-3">
                           <Info className="flex-shrink-0 text-blue-400 mt-0.5" size={20} />
                           <p>
                             <b>Инструкция:</b> В вопросе используйте фразу <b>«этот игрок»</b>. При выводе на экран она автоматически заменится на аватарку и имя игрока, которого вы выберете из списка справа.
                           </p>
                         </div>
                         <button
                           onClick={() => {
                             if (!draftConfig || !gameState) return;
                             const pIds = Object.keys(gameState.players);
                             if (pIds.length === 0) return;
                             
                             let shuffled = [...pIds];
                             for (let i = shuffled.length - 1; i > 0; i--) {
                               const j = Math.floor(Math.random() * (i + 1));
                               [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                             }
                             
                             const newRounds = [...draftConfig.rounds];
                             newRounds[rIndex].questions.forEach((q, i) => {
                               q.targetPlayerId = shuffled[i % shuffled.length];
                             });
                             setDraftConfig({ ...draftConfig, rounds: newRounds });
                           }}
                           className="flex-shrink-0 flex items-center gap-2 bg-blue-600/80 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors w-full sm:w-auto justify-center"
                         >
                           <Shuffle size={16} />
                           Перемешать игроков
                         </button>
                       </div>
                    )}
                    {round.questions.map((q, qIndex) => (
                      <div key={qIndex} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <input 
                            type="text" 
                            placeholder={`Вопрос ${qIndex + 1}`}
                            value={q.text}
                            onChange={(e) => {
                              const newRounds = [...draftConfig.rounds];
                              newRounds[rIndex].questions[qIndex].text = e.target.value;
                              setDraftConfig({ ...draftConfig, rounds: newRounds });
                            }}
                            className="bg-gray-800/50 p-3 rounded-lg text-sm text-white outline-none w-full border border-gray-700 focus:border-blue-500 transition-colors"
                          />
                        </div>
                        {round.type === 'fish' && (
                          <div className="w-full sm:w-64 flex-shrink-0">
                            <select
                              value={q.targetPlayerId || ''}
                              onChange={(e) => {
                                const newRounds = [...draftConfig.rounds];
                                newRounds[rIndex].questions[qIndex].targetPlayerId = e.target.value;
                                setDraftConfig({ ...draftConfig, rounds: newRounds });
                              }}
                              className="bg-gray-800/50 p-3 rounded-lg text-sm text-white outline-none w-full border border-gray-700 focus:border-blue-500 h-full"
                            >
                              <option value="">Выберите игрока...</option>
                              {Object.values(gameState.players).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-gray-800/50 p-4 rounded-xl">
                      <p className="text-sm text-gray-400">
                        В этом раунде каждому игроку назначается роль, которую он должен отыграть на фото, и фотограф, который будет его снимать.
                      </p>
                      <button 
                        onClick={handleShufflePhotographers}
                        className="flex items-center gap-2 bg-purple-600/80 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                      >
                        <Shuffle size={16} />
                        Перемешать фотографов
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {Object.values(gameState.players).map(player => {
                        const assignment = draftConfig.paparazziAssignments.find(a => a.targetId === player.id) || { targetId: player.id, photographerId: '', role: '' };
                        const photographer = gameState.players[assignment.photographerId];
                        return (
                          <div key={player.id} className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-gray-800/30 border border-gray-700/50 p-4 rounded-xl">
                            
                            <div className="flex items-center gap-3 w-full md:w-1/4">
                              <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-600">
                                {player.avatar && <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />}
                              </div>
                              <span className="font-bold text-gray-200 truncate">{player.name}</span>
                            </div>
                            
                            <div className="flex-1 w-full">
                              <input 
                                type="text"
                                placeholder="Введи роль (например: злой босс, вампир)"
                                value={assignment.role}
                                onChange={(e) => updatePaparazziRole(player.id, e.target.value)}
                                className="bg-gray-900/80 border border-gray-600 p-3 rounded-lg text-white w-full focus:border-purple-500 outline-none text-sm"
                              />
                            </div>

                            <div className="w-full md:w-1/3 flex items-center gap-2 text-sm">
                              <span className="text-gray-500">Фотограф:</span>
                              {photographer ? (
                                <div className="flex items-center gap-2 bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700 flex-1">
                                  <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                    {photographer.avatar && <img src={photographer.avatar} alt="" className="w-full h-full object-cover" />}
                                  </div>
                                  <span className="text-gray-300 truncate font-medium">{photographer.name}</span>
                                </div>
                              ) : (
                                <span className="text-yellow-500/70 italic text-xs">Не назначен</span>
                              )}
                            </div>

                          </div>
                        )
                      })}
                      {Object.keys(gameState.players).length === 0 && (
                        <p className="text-center text-gray-500 py-8 italic">Игроки еще не присоединились</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
