import { GameState } from './types';

type SyncMode = 'polling' | 'long-polling' | 'p2p';

export class SyncManager {
  code: string;
  playerId: string | null;
  onState: (state: GameState, mode: SyncMode) => void;
  version: number = 0;
  isHost: boolean = false;
  active: boolean = true;
  mode: SyncMode = 'long-polling';
  
  // P2P State
  peerConnection: RTCPeerConnection | null = null;
  dataChannel: RTCDataChannel | null = null;
  playersPeers: { [id: string]: { pc: RTCPeerConnection, dc: RTCDataChannel } } = {};
  
  constructor(code: string, playerId: string | null, isHost: boolean, onState: (state: GameState, mode: SyncMode) => void) {
    this.code = code;
    this.playerId = playerId;
    this.isHost = isHost;
    this.onState = onState;
    
    this.startLongPolling();
    this.initP2P();
  }

  stop() {
    this.active = false;
    if (this.peerConnection) this.peerConnection.close();
    Object.values(this.playersPeers).forEach(p => p.pc.close());
  }
  
  updateHostState(state: GameState) {
    // Host broadcasts state to all connected P2P peers
    const payload = JSON.stringify({ state, version: this.version });
    let sentP2P = false;
    Object.values(this.playersPeers).forEach(p => {
      if (p.dc.readyState === 'open') {
        try {
          p.dc.send(payload);
          sentP2P = true;
        } catch (e) {}
      }
    });
    if (sentP2P && this.mode !== 'p2p') {
      this.mode = 'p2p';
      this.onState(state, 'p2p');
    }
  }

  async startLongPolling() {
    while (this.active) {
      try {
        const res = await fetch(`/api/room/${this.code}/sync?version=${this.version}`);
        const data = await res.json();
        
        if (data.success && data.state) {
          if (data.version > this.version) {
            this.version = data.version;
            
            // Only update via long-polling if not currently receiving via P2P
            if (this.mode !== 'p2p' || this.isHost) {
              if (this.mode === 'polling') this.mode = 'long-polling';
              this.onState(data.state, this.mode);
            }
            if (this.isHost) {
              this.updateHostState(data.state);
            }
          }
        }
        
        if (!data.success && data.message === "Room not found") {
          await new Promise(r => setTimeout(r, 5000));
        }
        
      } catch (e) {
        this.mode = 'polling';
        await new Promise(r => setTimeout(r, 2000)); // fallback delay
      }
    }
  }

  // Basic WebRTC setup
  async initP2P() {
    // Only attempt P2P if browser supports it
    if (typeof RTCPeerConnection === 'undefined') return;
    
    if (this.isHost) {
      // Host listens for offers via signaling
      setInterval(async () => {
        if (!this.active) return;
        try {
          const res = await fetch(`/api/room/${this.code}`);
          const data = await res.json();
          if (data.state && data.state.signals) {
            const signals = data.state.signals;
            for (const sig of signals) {
              if (sig.to === 'host' && sig.type === 'offer' && !this.playersPeers[sig.from]) {
                await this.handleOfferFromPlayer(sig.from, sig.sdp);
              }
            }
          }
        } catch(e){}
      }, 3000);
    } else if (this.playerId) {
      // Player creates offer to host
      try {
        this.peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        this.dataChannel = this.peerConnection.createDataChannel('sync');
        
        this.dataChannel.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.state && data.version > this.version) {
              this.version = data.version;
              this.mode = 'p2p';
              this.onState(data.state, 'p2p');
            }
          } catch(e){}
        };
        
        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            // send candidate
          }
        };

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        await fetch('/api/signaling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: this.code, to: 'host', from: this.playerId, type: 'offer', sdp: offer })
        });
        
        // Wait for answer
        const checkAnswer = setInterval(async () => {
          if (!this.active || this.peerConnection?.connectionState === 'connected') {
            clearInterval(checkAnswer);
            return;
          }
          try {
            const res = await fetch(`/api/room/${this.code}`);
            const data = await res.json();
            if (data.state && data.state.signals) {
              const answer = data.state.signals.find((s: any) => s.to === this.playerId && s.type === 'answer');
              if (answer && this.peerConnection?.signalingState !== 'stable') {
                await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(answer.sdp));
                clearInterval(checkAnswer);
              }
            }
          } catch(e){}
        }, 2000);
      } catch(e) {}
    }
  }

  async handleOfferFromPlayer(playerId: string, offerSdp: any) {
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      this.playersPeers[playerId] = { pc, dc: null as any };
      
      pc.ondatachannel = (event) => {
        this.playersPeers[playerId].dc = event.channel;
        this.mode = 'p2p'; // host also knows p2p is active
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await fetch('/api/signaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: this.code, to: playerId, from: 'host', type: 'answer', sdp: answer })
      });
    } catch(e) {}
  }
}
