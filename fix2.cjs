const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');
const search = "</AnimatePresence>";
const i = code.lastIndexOf(search);
if (i !== -1) {
    code = code.substring(0, i + search.length) + "\n    </div>\n  </div>\n  );\n}\n";
    fs.writeFileSync('src/views/PlayerView.tsx', code);
}
