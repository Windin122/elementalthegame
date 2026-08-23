const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');

code = code.replace("import React, { useState, useRef, useEffect } from 'react';", "import React, { useState, useRef, useEffect, useCallback } from 'react';");
code = code.replace("import { motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';\nimport Cropper from 'react-easy-crop';");

fs.writeFileSync('src/views/PlayerView.tsx', code);
