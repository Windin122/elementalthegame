const fs = require('fs');
let code = fs.readFileSync('src/views/ScreenView.tsx', 'utf8');

// Fix 1: Phase 'results' voting results container
code = code.replace(
  'className="flex flex-wrap justify-center gap-3 w-full mb-4 max-h-[40vh] overflow-y-auto"',
  'className="flex flex-wrap justify-center gap-3 w-full mb-4"'
);

// Fix 2: Phase 'results' leaderboard container
code = code.replace(
  'className="flex flex-wrap justify-center gap-4 w-full px-4 pb-4 overflow-y-auto max-h-[35vh]"',
  'className="flex flex-wrap justify-center items-stretch gap-4 w-full px-4 pb-4"'
);

// Fix 3: Phase 'results' leaderboard card
code = code.replace(
  'className="flex flex-col items-center justify-between bg-gray-900/80 border border-gray-700 rounded-xl p-3 relative transform transition-all duration-500 min-w-0 h-full"',
  'className="flex flex-col items-center justify-between bg-gray-900/80 border border-gray-700 rounded-xl p-3 relative transform transition-all duration-500 min-w-[100px] max-w-[140px] flex-1"'
);

// Fix 4: Phase 'round_end' other players container
code = code.replace(
  'className="flex flex-wrap justify-center gap-3 mb-6 w-full max-w-5xl mx-auto overflow-y-auto max-h-[25vh]"',
  'className="flex flex-wrap justify-center gap-3 mb-6 w-full max-w-6xl mx-auto"'
);

// Fix 5: Phase 'round_end' other players card
code = code.replace(
  'className="bg-gray-800/80 border border-gray-600 rounded-2xl p-2 px-4 flex items-center gap-3 shadow-lg min-w-[200px]"',
  'className="bg-gray-800/80 border border-gray-600 rounded-2xl p-2 px-4 flex items-center gap-3 shadow-lg min-w-[200px] max-w-[280px] flex-1"'
);

fs.writeFileSync('src/views/ScreenView.tsx', code);
