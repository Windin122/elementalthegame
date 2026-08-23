const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');
code = code.replace("    </div>\n  </div>\n  );\n}", "    </div>\n  );\n}");
fs.writeFileSync('src/views/PlayerView.tsx', code);
