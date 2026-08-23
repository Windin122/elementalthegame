import { GameState } from './types';

type SyncMode = 'sse';

export class SyncManager {
  code: string;
  playerId: string | null;
  onState: (state: GameState, mode: SyncMode) => void;
  version: number = 0;
  isHost: boolean = false;
  active: boolean = true;
  mode: SyncMode = 'sse';
  
  eventSource: EventSource | null = null;
  
  constructor(code: string, playerId: string | null, isHost: boolean, onState: (state: GameState, mode: SyncMode) => void) {
    this.code = code;
    this.playerId = playerId;
    this.isHost = isHost;
    this.onState = onState;
    
    this.startSSE();
  }

  stop() {
    this.active = false;
    if (this.eventSource) this.eventSource.close();
  }
  
  updateHostState(state: GameState) {
    // With SSE, the server handles broadcast, so we don't need P2P broadcast anymore
  }

  startSSE() {
    if (!this.active) return;
    this.eventSource = new EventSource(`/api/room/${this.code}/sse`);
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.success && data.state) {
          if (data.version > this.version) {
            this.version = data.version;
            this.onState(data.state, 'sse');
          }
        }
      } catch (err) {}
    };

    this.eventSource.onerror = () => {
      if (this.eventSource) this.eventSource.close();
      if (this.active) {
        setTimeout(() => this.startSSE(), 2000);
      }
    };
  }
}
