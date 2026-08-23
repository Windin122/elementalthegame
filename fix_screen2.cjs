const fs = require('fs');
let code = fs.readFileSync('src/views/ScreenView.tsx', 'utf8');

// answering phase
code = code.replace(
  'className="flex flex-wrap justify-center gap-4 w-full max-h-[70vh] overflow-y-auto px-4"',
  'className="flex flex-wrap justify-center items-stretch gap-4 w-full px-4"'
);

code = code.replace(
  'className="bg-gray-800/80 border border-gray-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-2"',
  'className="bg-gray-800/80 border border-gray-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 flex-1 min-w-[120px] max-w-[200px]"'
);

code = code.replace(
  'className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 flex flex-col items-center gap-1 w-48"',
  'className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 flex flex-col items-center gap-1 w-48 flex-1 max-w-[200px]"'
);

// game_over phase
code = code.replace(
  'className="flex flex-wrap justify-center gap-4 mb-8 w-full max-w-5xl shrink-0 mx-auto overflow-y-auto pb-4"',
  'className="flex flex-wrap justify-center items-stretch gap-4 mb-8 w-full max-w-6xl shrink-0 mx-auto pb-4"'
);

code = code.replace(
  'className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 px-6 flex items-center gap-4 shadow-lg min-w-[220px]"',
  'className="bg-gray-800/80 border border-gray-600 rounded-2xl p-3 px-6 flex items-center gap-4 shadow-lg min-w-[200px] max-w-[280px] flex-1"'
);

fs.writeFileSync('src/views/ScreenView.tsx', code);
