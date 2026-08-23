const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');

const oldCameraFuncs = `  const startPhotoCamera = async () => {
    setIsPhotoCameraActive(true);
    setPhotoDataUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1024 }, height: { ideal: 1024 } } });
      const attachStream = () => {
        if (photoVideoRef.current) {
          photoVideoRef.current.srcObject = stream;
          photoVideoRef.current.play().catch(e => console.error("Play error:", e));
        } else {
          setTimeout(attachStream, 50);
        }
      };
      attachStream();
    } catch (err) {
      console.warn('Camera not available', err);
    }
  };

  const stopPhotoCamera = () => {
    setIsPhotoCameraActive(false);
    if (photoVideoRef.current && photoVideoRef.current.srcObject) {
      const stream = photoVideoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  };`;

const newCameraFuncs = `  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startPhotoCamera = async (mode = facingMode) => {
    setIsPhotoCameraActive(true);
    try {
      if (photoVideoRef.current && photoVideoRef.current.srcObject) {
         const oldStream = photoVideoRef.current.srcObject as MediaStream;
         oldStream.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode, width: { ideal: 1024 }, height: { ideal: 1024 } } });
      const attachStream = () => {
        if (photoVideoRef.current) {
          photoVideoRef.current.srcObject = stream;
          photoVideoRef.current.play().catch(e => console.error("Play error:", e));
        } else {
          setTimeout(attachStream, 50);
        }
      };
      attachStream();
    } catch (err) {
      console.warn('Camera not available', err);
    }
  };

  const toggleCamera = () => {
     const newMode = facingMode === 'user' ? 'environment' : 'user';
     setFacingMode(newMode);
     startPhotoCamera(newMode);
  };

  const stopPhotoCamera = () => {
    setIsPhotoCameraActive(false);
    if (photoVideoRef.current && photoVideoRef.current.srcObject) {
      const stream = photoVideoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
  };
  
  useEffect(() => {
    if (gameState?.phase === 'photo' && !player?.uploadedPhoto && !photoDataUrl) {
      startPhotoCamera(facingMode);
    } else {
      stopPhotoCamera();
    }
    return () => stopPhotoCamera();
  }, [gameState?.phase, player?.uploadedPhoto, photoDataUrl]); // auto-start/stop camera based on phase
`;

code = code.replace(oldCameraFuncs, newCameraFuncs);
fs.writeFileSync('src/views/PlayerView.tsx', code);
