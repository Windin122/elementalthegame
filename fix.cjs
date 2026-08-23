const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');
code = code.replace("</AnimatePresence>\n>    </div>", "</AnimatePresence>\n    </div>");
fs.writeFileSync('src/views/PlayerView.tsx', code);
