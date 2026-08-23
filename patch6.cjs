const fs = require('fs');

let code = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  "import { AnimatePresence, motion } from 'motion/react';",
  "import { AnimatePresence, motion } from 'motion/react';\nimport Cropper from 'react-easy-crop';"
);
code = code.replace(
  "import { useCallback } from 'react';",
  "import { useCallback } from 'react';"
);

// 2. Add states inside PlayerView component
const stateHook = `  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [cropTarget, setCropTarget] = useState<'avatar' | 'roundPhoto' | null>(null);
  
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);
  
  const handleSaveCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const size = cropTarget === 'avatar' ? 150 : 300;
      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        size,
        size
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      if (cropTarget === 'avatar') {
        setAvatarDataUrl(dataUrl);
      } else {
        setPhotoDataUrl(dataUrl);
      }
      
      setCropImageSrc(null);
      setCropTarget(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    img.src = cropImageSrc;
  };
`;

code = code.replace(
  "  const [selectedVote, setSelectedVote] = useState<string | null>(null);",
  "  const [selectedVote, setSelectedVote] = useState<string | null>(null);\n\n" + stateHook
);

// 3. Update handleFileUpload
const oldHandleFileUpload = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
             const context = canvasRef.current.getContext('2d');
             if(context) {
               canvasRef.current.width = 150;
               canvasRef.current.height = 150;
               context.drawImage(img, 0, 0, 150, 150);
               setAvatarDataUrl(canvasRef.current.toDataURL('image/jpeg', 0.7));
             }
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };`;

const newHandleFileUpload = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCropImageSrc(ev.target?.result as string);
        setCropTarget('avatar');
      };
      reader.readAsDataURL(file);
    }
  };`;

code = code.replace(oldHandleFileUpload, newHandleFileUpload);


// 4. Update handleRoundPhotoUpload
const oldHandleRoundPhotoUpload = `  const handleRoundPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPhotoCameraActive) {
      stopPhotoCamera();
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          if (photoCanvasRef.current) {
             const context = photoCanvasRef.current.getContext("2d");
             if(context) {
               photoCanvasRef.current.width = 300;
               photoCanvasRef.current.height = 300;
               context.drawImage(img, 0, 0, 300, 300);
               setPhotoDataUrl(photoCanvasRef.current.toDataURL("image/jpeg", 0.6));
               
               if (photoVideoRef.current && photoVideoRef.current.srcObject) {
                 const stream = photoVideoRef.current.srcObject as MediaStream;
                 stream?.getTracks().forEach(track => track.stop());
               }
             }
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };`;

const newHandleRoundPhotoUpload = `  const handleRoundPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPhotoCameraActive) {
      stopPhotoCamera();
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCropImageSrc(ev.target?.result as string);
        setCropTarget('roundPhoto');
      };
      reader.readAsDataURL(file);
    }
  };`;

code = code.replace(oldHandleRoundPhotoUpload, newHandleRoundPhotoUpload);

// 5. Inject Cropper modal JSX just before final </div> of PlayerView
const cropperModal = `
      {/* Cropper Modal */}
      <AnimatePresence>
        {cropImageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md"
          >
            <div className="relative flex-1 w-full mt-4">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                classes={{ containerClassName: 'bg-transparent' }}
              />
            </div>
            
            <div className="p-6 bg-gray-900/80 border-t border-gray-800 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">Масштаб</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => {
                    setZoom(Number(e.target.value))
                  }}
                  className="w-full"
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCropImageSrc(null);
                    setCropTarget(null);
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                  className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold"
                >
                  ОТМЕНА
                </button>
                <button
                  onClick={handleSaveCrop}
                  className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold"
                >
                  СОХРАНИТЬ
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
`;

code = code.replace(/    <\/div>\s*<\/div>\s*\);\s*\}\s*$/m, cropperModal + "\n    </div>\n  </div>\n  );\n}");

fs.writeFileSync('src/views/PlayerView.tsx', code);

console.log("Success patch6");
