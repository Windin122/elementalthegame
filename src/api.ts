import { GameState } from './types';

const API_BASE = '/api';

export const api = {
  uploadLogo: async (dataUrl: string) => {
    const res = await fetch("/api/logo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl })
    });
    return res.json();
  },
  getBgmTracks: async () => {
    const res = await fetch("/api/bgm");
    return res.json();
  },
  uploadBgmTrack: async (name: string, dataUrl: string) => {
    const res = await fetch("/api/bgm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dataUrl })
    });
    return res.json();
  },
  deleteBgmTrack: async (filename: string) => {
    const res = await fetch(`/api/bgm/${filename}`, { method: "DELETE" });
    return res.json();
  },
  adminLogin: async (login: string) => {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login })
    });
    return res.json();
  },
  
  createRoom: async () => {
    const res = await fetch(`${API_BASE}/room/create`, { method: 'POST' });
    return res.json();
  },
  
  getGameState: async (code: string): Promise<{ success: boolean; state?: GameState; message?: string }> => {
    const res = await fetch(`${API_BASE}/room/${code}?t=${Date.now()}`, { cache: 'no-store' });
    return res.json();
  },
  
  joinPlayer: async (code: string, name: string) => {
    const res = await fetch(`${API_BASE}/player/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, name })
    });
    return res.json();
  },
  
  uploadAvatar: async (code: string, playerId: string, avatarBase64: string) => {
    const res = await fetch(`${API_BASE}/player/avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, playerId, avatar: avatarBase64 })
    });
    return res.json();
  },
  
  joinScreen: async (code: string) => {
    const res = await fetch(`${API_BASE}/screen/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return res.json();
  },

  updateRoomConfig: async (code: string, config: any) => {
    const res = await fetch(`${API_BASE}/admin/update-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, config })
    });
    return res.json();
  },

  updateGameState: async (code: string, updates: Partial<GameState>) => {
    const res = await fetch(`${API_BASE}/admin/update-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, updates })
    });
    return res.json();
  },

  nextPhase: async (code: string) => {
    const res = await fetch(`${API_BASE}/admin/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    return res.json();
  },

  submitGuess: async (code: string, playerId: string, guess: string) => {
    const res = await fetch(`${API_BASE}/player/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, playerId, guess })
    });
    return res.json();
  },

  submitVote: async (code: string, playerId: string, targetId: string) => {
    const res = await fetch(`${API_BASE}/player/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, playerId, targetId })
    });
    return res.json();
  },

  submitPhoto: async (code: string, playerId: string, photo: string) => {
    const res = await fetch(`${API_BASE}/player/photo-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, playerId, photo })
    });
    return res.json();
  },

  useHat: async (code: string, playerId: string) => {
    const res = await fetch(`${API_BASE}/player/use-hat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, playerId })
    });
    return res.json();
  }
};
