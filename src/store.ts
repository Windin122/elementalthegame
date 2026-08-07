import { create } from 'zustand';
import { GameState } from './types';

interface AppState {
  currentView: 'main' | 'player' | 'screen' | 'admin';
  roomCode: string | null;
  playerId: string | null;
  adminToken: string | null;
  gameState: GameState | null;
  syncMode: string;
  
  setView: (view: 'main' | 'player' | 'screen' | 'admin') => void;
  setRoomCode: (code: string | null) => void;
  setPlayerId: (id: string | null) => void;
  setAdminToken: (token: string | null) => void;
  setGameState: (state: GameState | null) => void;
  setSyncMode: (mode: string) => void;
}

export const useStore = create<AppState>((set) => ({
  currentView: 'main',
  roomCode: null,
  playerId: null,
  adminToken: null,
  gameState: null,
  syncMode: "polling",
  
  setView: (view) => set({ currentView: view }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPlayerId: (id) => set({ playerId: id }),
  setAdminToken: (token) => set({ adminToken: token }),
  setGameState: (state) => set({ gameState: state }),
  setSyncMode: (mode) => set({ syncMode: mode }),
}));
