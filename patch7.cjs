const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');

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

const lastClosingTagsIndex = code.lastIndexOf('</div>');
const firstPart = code.substring(0, lastClosingTagsIndex - 6);
const lastPart = code.substring(lastClosingTagsIndex - 6);

fs.writeFileSync('src/views/PlayerView.tsx', firstPart + cropperModal + lastPart);

console.log("Success patch7");
