import React, { useEffect } from 'react';
import { useStore } from './store';
import { MainMenu } from './views/MainMenu';
import { AdminView } from './views/AdminView';
import { PlayerView } from './views/PlayerView';
import { ScreenView } from './views/ScreenView';

export default function App() {
  const { currentView, setView, setRoomCode } = useStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setRoomCode(code.toUpperCase());
      setView('player');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setView, setRoomCode]);

  switch (currentView) {
    case 'admin':
      return <AdminView />;
    case 'player':
      return <PlayerView />;
    case 'screen':
      return <ScreenView />;
    case 'main':
    default:
      return <MainMenu />;
  }
}

