const fs = require('fs');
let code = fs.readFileSync('src/views/PlayerView.tsx', 'utf8');

const regex = /if \(assignment && target && !player\.uploadedPhoto\) \{[\s\S]*?(?=if \(player\.uploadedPhoto\)|return\s*\(\s*<div className="w-full flex flex-col items-center gap-4">\s*<div className="bg-purple-900\/50 p-6 rounded-xl border border-purple-500 w-full mb-4">)/;

const newJSX = `if (assignment && target && !player.uploadedPhoto) {
                 return (
                   <div className="w-full flex flex-col items-center gap-4">
                     {/* Window 1: Camera or Taken Photo */}
                     <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border-2 border-purple-500 relative">
                       {!photoDataUrl ? (
                         <>
                           <video ref={photoVideoRef} autoPlay playsInline muted className={\`w-full h-full object-cover \${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}\`} />
                           <canvas ref={photoCanvasRef} className="hidden" />
                         </>
                       ) : (
                         <img src={photoDataUrl} className={\`w-full h-full object-cover \${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}\`} />
                       )}
                     </div>
                     
                     {/* Window 2: Info & Controls */}
                     <div className="bg-gray-800/80 border border-gray-600 rounded-2xl p-4 w-full relative text-center">
                        {/* Toggle camera button */}
                        {!photoDataUrl && (
                          <button onClick={toggleCamera} className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-full transition-colors z-10">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                        <p className="text-sm text-gray-400 mb-1">Сфотографируй:</p>
                        <p className="text-2xl font-black text-purple-300 uppercase">{target.name}</p>
                        <p className="text-sm text-gray-400 mt-2">в роли</p>
                        <p className="text-xl font-bold text-yellow-400">«{assignment.role}»</p>
                        <p className="text-xs text-red-400 mt-2 font-bold uppercase tracking-wider">Называть игроку роль нельзя!</p>
                     </div>

                     {/* Actions */}
                     <div className="flex flex-col gap-3 w-full mt-2">
                       {!photoDataUrl ? (
                         <>
                           <button onClick={takeRoundPhoto} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-colors w-full tracking-[0.1em]">
                             СДЕЛАТЬ СНИМОК
                           </button>
                           <div className="relative w-full">
                             <input type="file" accept="image/*" onChange={handleRoundPhotoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                             <div className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-xl transition-colors w-full text-center text-sm tracking-wider">
                               ЗАГРУЗИТЬ ИЗ ГАЛЕРЕИ
                             </div>
                           </div>
                         </>
                       ) : (
                         <div className="flex gap-4 w-full">
                           <button onClick={() => setPhotoDataUrl(null)} className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-4 px-4 rounded-xl transition-colors text-sm">
                             ПЕРЕСНЯТЬ
                           </button>
                           <button onClick={submitRoundPhoto} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-4 rounded-xl transition-colors text-sm">
                             ОТПРАВИТЬ
                           </button>
                         </div>
                       )}
                     </div>
                   </div>
                 );
               }

`;

if (regex.test(code)) {
    code = code.replace(regex, newJSX);
    fs.writeFileSync('src/views/PlayerView.tsx', code);
    console.log("Success");
} else {
    console.log("Regex didn't match!");
    console.log(code.substring(code.indexOf('if (assignment && target && !player.uploadedPhoto) {'), code.indexOf('if (assignment && target && !player.uploadedPhoto) {') + 500));
}
