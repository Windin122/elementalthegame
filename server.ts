

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { v4 as uuidv4 } from 'uuid';
import { GameState, Player, Round, Question } from './src/types.js';

function updateRoom(room: GameState) {
  room.version = (room.version || 0) + 1;
  if (room.listeners) {
    room.listeners.forEach(l => l(room));
    room.listeners = [];
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase limit for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

import fsSync from "fs";
const BGM_DIR = path.join(process.cwd(), "data", "bgm");
if (!fsSync.existsSync(BGM_DIR)) {
  fsSync.mkdirSync(BGM_DIR, { recursive: true });
}

app.use("/bgm", express.static(BGM_DIR));

const LOGO_PATH = path.join(process.cwd(), "data", "logo.png");
app.get("/logo.png", (req, res, next) => {
  if (fsSync.existsSync(LOGO_PATH)) {
    res.sendFile(LOGO_PATH);
  } else {
    next();
  }
});

app.post("/api/logo", (req, res) => {
  const { dataUrl } = req.body;
  if (!dataUrl) return res.status(400).json({ success: false });
  const parts = dataUrl.split(",");
  if (parts.length !== 2) return res.status(400).json({ success: false });
  const buffer = Buffer.from(parts[1], "base64");
  fsSync.writeFileSync(LOGO_PATH, buffer);
  res.json({ success: true });
});

app.get("/api/bgm", (req, res) => {
  const files = fsSync.readdirSync(BGM_DIR);
  res.json({ success: true, tracks: files.map(f => ({ name: f, url: `/bgm/${f}` })) });
});

app.post("/api/bgm", (req, res) => {
  const { name, dataUrl } = req.body;
  if (!name || !dataUrl) return res.status(400).json({ success: false });
  const parts = dataUrl.split(",");
  if (parts.length !== 2) {
    return res.status(400).json({ success: false, error: "Invalid data URL" });
  }
  const buffer = Buffer.from(parts[1], "base64");
  const safeName = name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = Date.now() + "_" + safeName;
  fsSync.writeFileSync(path.join(BGM_DIR, fileName), buffer);
  res.json({ success: true, track: { name: fileName, url: `/bgm/${fileName}` } });
});

app.delete("/api/bgm/:filename", (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(BGM_DIR, safeFilename);
  if (fsSync.existsSync(filePath)) {
    fsSync.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: "Not found" });
  }
});


// In-memory store for rooms
const rooms: Record<string, GameState> = {};

// Helper to generate a room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// API Routes
app.post('/api/admin/login', (req, res) => {
  const { login } = req.body;
  if (login === 'admininfa') {
    res.json({ success: true, token: 'admin-token-123' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid login' });
  }
});

app.post('/api/room/create', (req, res) => {
  const code = generateRoomCode();
  
  // Initialize default rounds
  const defaultRounds: Round[] = [
    { name: 'Раунд 1', type: 'standard', questions: Array(5).fill({ text: '' }) },
    { name: 'Раунд 2', type: 'standard', questions: Array(5).fill({ text: '' }) },
    { name: 'Раунд 3', type: 'fish', questions: Array(5).fill({ text: '' }) },
    { name: 'Раунд 4', type: 'standard', questions: Array(5).fill({ text: '' }) },
    { name: 'Раунд 5', type: 'paparazzi', questions: [] }
  ];

  rooms[code] = {
    code,
    status: 'lobby',
    round: 0,
    questionIndex: 0,
    phase: 'lobby',
    phaseEndTime: 0,
    players: {},
    screenConnected: false,
    bgm: { trackUrl: null, volume: 0.1 },
    config: {
      rounds: defaultRounds,
      timers: { reading: 10, answering: 30, guessing: 40, photo: 300, results: 15 },
      paparazziAssignments: [],
      winnerScrollText: 'Ты узнал великую тайну... но мы тебе её не скажем!',
      birthdayBoyId: ''
    }
  };
  res.json({ success: true, code });
});


app.get("/api/room/:code/sync", (req, res) => {
  const room = rooms[req.params.code];
  if (!room) return res.status(404).json({ success: false, message: "Room not found" });

  const clientVersion = parseInt(req.query.version as string || "0", 10);
  
  if ((room.version || 0) > clientVersion) {
    return res.json({ success: true, state: room, version: room.version });
  }

  const listener = (updatedRoom) => {
    res.json({ success: true, state: updatedRoom, version: updatedRoom.version });
  };
  
  if (!room.listeners) room.listeners = [];
  room.listeners.push(listener);

  req.on("close", () => {
    room.listeners = room.listeners.filter(l => l !== listener);
  });

  setTimeout(() => {
    if (room.listeners.includes(listener)) {
      room.listeners = room.listeners.filter(l => l !== listener);
      res.json({ success: true, notModified: true });
    }
  }, 25000);
});

app.post("/api/signaling", (req, res) => {
  const { code, to, from, type, sdp, candidate } = req.body;
  const room = rooms[code];
  if (!room) return res.status(404).json({ success: false });
  
  if (!room.signals) room.signals = [];
  room.signals.push({ to, from, type, sdp, candidate, timestamp: Date.now() });
  
  updateRoom(room);
  res.json({ success: true });
});

app.get('/api/room/:code', (req, res) => {
  const room = rooms[req.params.code];
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }
  res.json({ success: true, state: room });
});

app.post('/api/player/join', (req, res) => {
  const { code, name } = req.body;
  const room = rooms[code];
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
  if (Object.keys(room.players).length >= 10) return res.status(400).json({ success: false, message: 'Room full' });

  const id = uuidv4();
  room.players[id] = {
    id,
    name,
    avatar: '',
    score: 0,
    hats: 1, // Start with 1 hat
    isConnected: true,
    usedHatThisRound: false
  };
  updateRoom(room);
  res.json({ success: true, playerId: id });
});

app.post('/api/player/avatar', (req, res) => {
  const { code, playerId, avatar } = req.body;
  const room = rooms[code];
  if (room && room.players[playerId]) {
    room.players[playerId].avatar = avatar;
    updateRoom(room);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.post('/api/admin/update-room', (req, res) => {
  const { code, config } = req.body;
  const room = rooms[code];
  if (room) {
    room.config = { ...room.config, ...config };
    updateRoom(room);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.post('/api/admin/next', (req, res) => {
  const { code } = req.body;
  const room = rooms[code];
  if (!room) return res.status(404).json({ success: false });

  if (room.status === 'lobby') {
    room.status = 'playing';
    room.round = 0;
    room.questionIndex = 0;
    room.phase = 'reading';
    for (const pId in room.players) {
      room.players[pId].hats = 1;
      room.players[pId].usedHatThisRound = false;
    }
    room.phaseEndTime = Date.now() + room.config.timers.reading * 1000;
    updateRoom(room);
    return res.json({ success: true });
  }

  advanceGamePhase(room);
  updateRoom(room);
  res.json({ success: true });
});

function advanceGamePhase(room: GameState) {
  const round = room.config.rounds[room.round];
  if (!round) return;

  if (room.phase === 'reading') {
    // Clear temporary state
    for (const pId in room.players) {
      room.players[pId].currentVote = undefined;
      room.players[pId].currentGuess = undefined;
    }

    if (round.type === 'fish') {
      room.phase = 'guessing';
      room.phaseEndTime = Date.now() + room.config.timers.guessing * 1000;
    } else if (round.type === 'paparazzi') {
      if (!room.config.paparazziAssignments || room.config.paparazziAssignments.length === 0) {
        const pIds = Object.keys(room.players);
        let valid = false;
        let shuffled: string[] = [];
        if (pIds.length >= 2) {
          while (!valid) {
            shuffled = [...pIds];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            valid = shuffled.every((val, i) => val !== pIds[i]);
          }
          room.config.paparazziAssignments = pIds.map((targetId, i) => ({
            targetId,
            photographerId: shuffled[i],
            role: 'Загадочная роль'
          }));
        }
      }
      room.phase = 'photo';
      room.phaseEndTime = Date.now() + room.config.timers.photo * 1000;
    } else {
      room.phase = 'answering';
      room.phaseEndTime = Date.now() + room.config.timers.answering * 1000;
    }
  } else if (room.phase === 'guessing' || room.phase === 'photo') {
    room.phase = 'answering';
    room.phaseEndTime = Date.now() + room.config.timers.answering * 1000;
  } else if (room.phase === 'answering') {
    // Tally scores
    // First, count votes for each target
    const voteCounts = {};
    for (const pId in room.players) {
      const vote = room.players[pId].currentVote;
      if (vote) {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
      }
    }
    
    // Distribute points to voters
    for (const pId in room.players) {
      const p = room.players[pId];
      if (p.currentVote) {
        const count = voteCounts[p.currentVote] || 0;
        // If count > 1, you matched with others.
        if (count > 1) {
          let points = count * 100;
          if (p.usedHatThisRound) {
            points *= 2;
          }
          p.score += points;
        }
      }
    }
    
    if (room.questionIndex >= round.questions.length - 1 || round.type === 'paparazzi') {
      room.phase = 'round_end';
      room.phaseEndTime = 0;
    } else {
      room.phase = 'results';
      room.phaseEndTime = Date.now() + room.config.timers.results * 1000;
    }
  } else if (room.phase === 'results') {
    // Clear hat usage for next question
    for (const pId in room.players) {
      room.players[pId].usedHatThisRound = false;
    }
    
    room.questionIndex++;
    room.phase = 'reading';
    room.phaseEndTime = Date.now() + room.config.timers.reading * 1000;
  } else if (room.phase === 'round_end') {
    // Clear hat usage for new round
    for (const pId in room.players) {
      room.players[pId].usedHatThisRound = false;
      room.players[pId].uploadedPhoto = undefined;
      room.players[pId].hats = (room.players[pId].hats || 0) + 1;
    }

    if (room.round < room.config.rounds.length - 1) {
      room.round++;
      room.questionIndex = 0;
      room.phase = 'reading';
      room.phaseEndTime = Date.now() + room.config.timers.reading * 1000;
    } else {
      room.status = 'playing'; // it's already playing, keep it that way
      room.phase = 'game_over';
      room.phaseEndTime = 0;
    }
  }
}

// Auto-advance loop
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    const room = rooms[code];
    if (room.status === 'playing' && room.phaseEndTime > 0 && now >= room.phaseEndTime) {
      advanceGamePhase(room);
      updateRoom(room);
    }
  }
}, 500);

app.post('/api/player/guess', (req, res) => {
  const { code, playerId, guess } = req.body;
  const room = rooms[code];
  if (room && room.players[playerId]) {
    room.players[playerId].currentGuess = guess;
    updateRoom(room);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.post('/api/player/vote', (req, res) => {
  const { code, playerId, targetId } = req.body;
  const room = rooms[code];
  if (room && room.players[playerId]) {
    room.players[playerId].currentVote = targetId;
    updateRoom(room);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.post('/api/player/photo-submit', (req, res) => {
  const { code, playerId, photo } = req.body;
  const room = rooms[code];
  if (room && room.players[playerId]) {
    room.players[playerId].uploadedPhoto = photo;
    updateRoom(room);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.post('/api/player/use-hat', (req, res) => {
  const { code, playerId } = req.body;
  const room = rooms[code];
  if (room && room.players[playerId] && room.players[playerId].hats > 0 && !room.players[playerId].usedHatThisRound) {
    room.players[playerId].hats--;
    room.players[playerId].usedHatThisRound = true;
    updateRoom(room);
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

app.post('/api/admin/update-game', (req, res) => {
  const { code, updates } = req.body;
  const room = rooms[code];
  if (room) {
    Object.assign(room, updates);
    updateRoom(room);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.post('/api/screen/join', (req, res) => {
  const { code } = req.body;
  const room = rooms[code];
  if (room) {
    room.screenConnected = true;
    updateRoom(room);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

// Start server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
