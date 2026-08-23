const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');

const search = `                                     </div>
                  );
                }`;

const replace = `                    </div>
                  </div>
                 );
               }`;

code = code.replace(search, replace);

fs.writeFileSync('src/views/PlayerView.tsx', code);
