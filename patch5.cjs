const fs = require('fs');

// Patch ScreenView.tsx
let screenCode = fs.readFileSync('src/views/ScreenView.tsx', 'utf8');

// 1. renderQuestionText
screenCode = screenCode.replace(
  'return <span className="text-center">Кто на фото и какую роль изображает?</span>;',
  'return <span className="text-center">Кто самый лучший подражатель?</span>;'
);

// 2. paparazzi cards in answering phase
const oldCard = `{currentRound.type === 'paparazzi' && Object.values(gameState.players).map((player, idx) => (
                   <div key={idx} className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 flex flex-col items-center gap-1">
                     <div className="w-full h-32 bg-gray-900 rounded-xl overflow-hidden mb-1">
                       {player.uploadedPhoto && <img src={player.uploadedPhoto} alt="" className="w-full h-full object-cover" />}
                     </div>
                     <span className="text-sm font-bold text-center leading-tight">Роль: {player.roleDescription || 'Неизвестно'}</span>
                     <span className="text-xs text-gray-400">от {player.name}</span>
                   </div>
                 ))}`;

const newCard = `{currentRound.type === 'paparazzi' && Object.values(gameState.players).map((player, idx) => {
                   if (!player.uploadedPhoto) return null;
                   const assignment = gameState.config.paparazziAssignments?.find(a => a.photographerId === player.id);
                   const target = assignment ? gameState.players[assignment.targetId] : null;
                   return (
                   <div key={idx} className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 flex flex-col items-center gap-1 w-48">
                     <div className="w-full h-40 bg-gray-900 rounded-xl overflow-hidden mb-1 border-2 border-purple-500">
                       {player.uploadedPhoto && <img src={player.uploadedPhoto} alt="" className="w-full h-full object-cover" />}
                     </div>
                     <span className="text-sm font-bold text-center leading-tight text-white">{target?.name}</span>
                     <span className="text-xs font-bold text-yellow-400 text-center leading-tight">{assignment?.role}</span>
                     <span className="text-[10px] text-gray-400 mt-1">Фотограф: {player.name}</span>
                   </div>
                 ) })}`;

screenCode = screenCode.replace(oldCard, newCard);

// 3. round_end title
screenCode = screenCode.replace(
  '<h3 className="text-xs font-bold text-gray-400 mb-2 uppercase text-center border-b border-gray-700 pb-2 shrink-0">Итоги 5 вопроса</h3>',
  '<h3 className="text-xs font-bold text-gray-400 mb-2 uppercase text-center border-b border-gray-700 pb-2 shrink-0">{currentRound.type === \'paparazzi\' ? \'Выбор игроков\' : \'Итоги 5 вопроса\'}</h3>'
);

fs.writeFileSync('src/views/ScreenView.tsx', screenCode);


// Patch PlayerView.tsx
let playerCode = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');

// 1. renderQuestionText
playerCode = playerCode.replace(
  'return <span className="text-center text-white leading-relaxed">Кто на фото и какую роль изображает?</span>;',
  'return <span className="text-center text-white leading-relaxed text-xl">Кто самый лучший подражатель?</span>;'
);

// 2. ensure question is shown
playerCode = playerCode.replace(
  '{currentQuestion?.text && (',
  '{(currentQuestion?.text || currentRound?.type === \'paparazzi\') && ('
);

fs.writeFileSync('src/views/PlayerView.tsx', playerCode);

console.log("Success patch5");
