import React, { useState, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Play, BookOpen, Monitor, ShieldAlert, X } from 'lucide-react';
import { useStore } from '../store';

export function MainMenu() {
  const setView = useStore((state) => state.setView);
  const [showLegend, setShowLegend] = useState(false);
  const controls = useAnimation();
  const particles = Array.from({ length: 25 });
  const orbs = Array.from({ length: 15 });

  useEffect(() => {
    controls.start("float");

    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.acceleration) {
        const { x, y, z } = event.acceleration;
        const acceleration = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
        
        if (acceleration > 15) { 
          controls.start("fall").then(() => {
            controls.start("rise").then(() => {
              controls.start("float");
            });
          });
        }
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [controls]);

  return (
    <div className="relative min-h-screen bg-[#050505] flex flex-col items-center justify-between py-12 overflow-hidden text-[#e0e0e0] select-none" style={{ background: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #050505 100%)', fontFamily: 'Georgia, serif' }}>
      
      {/* Decorative Frame Corners */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t border-l border-gray-800 pointer-events-none z-20"></div>
      <div className="absolute top-8 right-8 w-12 h-12 border-t border-r border-gray-800 pointer-events-none z-20"></div>
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b border-l border-gray-800 pointer-events-none z-20"></div>
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b border-r border-gray-800 pointer-events-none z-20"></div>

      {/* --- Ambient Background Effects --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[4000ms]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[5000ms]"></div>
        
        {/* Interactive Blue Orbs */}
        {orbs.map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full bg-gradient-to-tr from-blue-600/40 to-cyan-400/20 mix-blend-screen blur-[8px]"
            style={{
              width: Math.random() * 40 + 20,
              height: Math.random() * 40 + 20,
              left: `${Math.random() * 100}%`,
              bottom: -100,
            }}
            variants={{
              float: {
                y: [0, (typeof window !== 'undefined' ? -window.innerHeight - 100 : -1000)],
                x: [0, (Math.random() - 0.5) * 200],
                transition: {
                  duration: Math.random() * 15 + 10,
                  repeat: Infinity,
                  ease: "linear",
                  delay: Math.random() * -15
                }
              },
              fall: {
                y: 50,
                x: 0,
                transition: { type: "spring", stiffness: 150, damping: 15, mass: Math.random() * 2 + 1 }
              },
              rise: {
                y: [50, 0],
                transition: { duration: 2, ease: "easeOut", delay: Math.random() * 1.5 }
              }
            }}
            initial="float"
            animate={controls}
          />
        ))}

        {/* Floating Magic Dust */}
        {particles.map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              scale: Math.random() * 2,
              opacity: Math.random() * 0.5 + 0.1,
            }}
            animate={{
              y: [null, Math.random() * -200 - 50],
              opacity: [null, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="z-10 flex flex-col items-center w-full max-w-md px-6 flex-1">
        
        {/* --- Logo Area --- */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mt-12 mb-16 flex flex-col items-center text-center w-full min-h-[160px] justify-center relative"
        >
          <div className="relative flex items-center justify-center">
            {/* Animated glowing shadow behind the logo */}
            <motion.div
              className="absolute w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-full blur-[30px] opacity-70 z-0"
              animate={{
                background: [
                  "radial-gradient(circle, rgba(234,179,8,0.5) 0%, rgba(249,115,22,0.4) 50%, rgba(59,130,246,0.3) 100%)",
                  "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(234,179,8,0.5) 50%, rgba(249,115,22,0.4) 100%)",
                  "radial-gradient(circle, rgba(249,115,22,0.4) 0%, rgba(59,130,246,0.3) 50%, rgba(234,179,8,0.5) 100%)",
                  "radial-gradient(circle, rgba(234,179,8,0.5) 0%, rgba(249,115,22,0.4) 50%, rgba(59,130,246,0.3) 100%)",
                ],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            {/* Logo Image */}
            <img
              src="/logo.png"
              alt="ЭЛЕМЕНТАЛЬ"
              className="relative z-10 w-full max-w-[360px] sm:max-w-[460px] max-h-56 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            />
          </div>
          <div className="h-[1px] w-64 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent mt-6 relative z-10"></div>
        </motion.div>

        {/* --- Main Action Buttons --- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="w-full sm:w-[280px] flex flex-col gap-4 mb-20"
        >
          <MainMenuButton icon={<Play size={20} className="ml-1" />} text="Играть" variant="primary" onClick={() => setView('player')} />
          <MainMenuButton icon={<BookOpen size={18} />} text="Легенда" onClick={() => setShowLegend(true)} />
        </motion.div>
      </div>

      {/* --- Footer Admin / Utility Buttons --- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="z-10 flex flex-col items-center gap-8 mb-4 mt-auto w-full px-6 max-w-5xl"
      >
        <div className="flex gap-6 sm:gap-12 justify-center w-full">
          <SecondaryButton icon={<ShieldAlert size={16} />} text="Войти в админ-панель" onClick={() => setView('admin')} />
          <SecondaryButton icon={<Monitor size={16} />} text="Режим экрана" onClick={() => setView('screen')} />
        </div>
        <div className="text-[9px] font-sans text-gray-700 tracking-[0.5em] uppercase text-center">
          v0.1b от 24 августа 2026г
        </div>
      </motion.div>

      {/* Legend Modal */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md overflow-y-auto font-sans"
            onClick={() => setShowLegend(false)}
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 sm:p-10 max-w-3xl w-full text-gray-300 relative my-auto shadow-2xl shadow-blue-900/20"
            >
              <button 
                onClick={() => setShowLegend(false)}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-gray-800"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-3xl font-bold tracking-[0.2em] mb-2 text-white font-serif uppercase">Легенда</h2>
              <p className="text-blue-400 mb-8 italic">ЭЛЕМЕНТАЛЬ — Игра, в которой вам нужно знать лишь друг друга. Проверьте свою дружбу, ответив на каверзные вопросы на знание своих близких.</p>
              
              <div className="space-y-6 text-sm sm:text-base leading-relaxed">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">▶ Раунды (их целых 5!)</h3>
                  <p className="mb-2"><strong className="text-yellow-400">• Раунды 1, 2, 4: О ком идёт речь?</strong></p>
                  <p className="mb-4">Вы находитесь в определенных условиях (ситуация, локация). Ваша задача — выбрать, кто из игроков лучше всех вписывается в этот бред на экране. Варианты ответа — это вы! И да, голосовать за себя любимого тоже можно, если у вас всё в порядке с самооценкой.</p>
                  
                  <p className="mb-2"><strong className="text-yellow-400">• Раунд 3: Рыбка на удочке</strong></p>
                  <p className="mb-4">Мы выбираем случайных игроков и задаём о них вопросы. Ваша задача: ВЫДВИНУТЬ самое подходящее, смешное или абсурдное предположение, как бы этот человек поступил. А потом все голосуют, чей ответ самый-самый.</p>

                  <p className="mb-2"><strong className="text-yellow-400">• Раунд 5: Ох уж эти папарацци</strong></p>
                  <p>Внутри каждого живёт тайная сущность. Мы не знаем какая, но знаете ВЫ! Вам назначается жертва и её «роль». Вам придется объяснить игроку кто он, не используя прямое название (никаких слов с корнем «олень», если он олень!). А он должен отыграть это на камеру. Смешно, таинственно или просто странно. В конце маски сброшены, и все оценивают фото и ваши навыки пантомимы.</p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">▶ Система подсчёта баллов</h3>
                  <p>Всё просто, если вы осилили хотя бы 3 класса. А если нет? Ну... всё впереди. Вы должны угадать, как проголосует большинство, НЕ переговариваясь и НЕ подсказывая! Если все проголосовали кто в лес, кто по дрова — получаете круглый 0. Если мнения совпали — баллы растут! А впрочем, не забивайте голову, компьютер всё сам посчитает... обленились со своими технологиями.</p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">▶ Победитель</h3>
                  <p>Поздравляю, ты всех угощаешь пиццей и роллами за свой счёт! Шутка! На самом деле ты узнаешь ВЕЛИКУЮ ТАЙНУ из Свитка, которой сможешь поделиться (и это уже не секрет) либо зажмотить и строить коварный план господства над миром в одиночку.</p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">▶ Бонусы</h3>
                  <p><strong className="text-blue-300">🎩 Карточка «Снять шляпу»</strong> — если ты самоуверен до безобразия, жми на шляпу возле своей аватарки. Если угадаешь ответ большинства, твои баллы за раунд удвоятся!</p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2 tracking-wide uppercase">▶ Сколько это длится?</h3>
                  <p>Зависит от темпа, но в среднем 45-60 минут. Но вы же люди талантливые, мы-то знаем...</p>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-700 text-gray-500 text-xs">
                  <p><strong className="text-gray-400">История игры:</strong> Элементаль родился в марте 2026 года как учебный проект, разработанный человеком под псевдонимом Infa, чтобы проверить, можно ли из группы людей создать команду, и как они представляют себе друг друга. Отлично подходит как для знакомства, так и для давних друзей.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MainMenuButton({ icon, text, variant = "secondary", onClick }: { icon: React.ReactNode, text: string, variant?: "primary" | "secondary", onClick?: () => void }) {
  const isPrimary = variant === "primary";
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative px-6 py-4 border transition-all duration-300 w-full flex items-center justify-center gap-3
        ${isPrimary
          ? "border-blue-400/30 bg-blue-950/20 hover:bg-blue-400/10 backdrop-blur-sm"
          : "border-gray-700 bg-black/40 hover:border-gray-400"
        }
      `}
    >
      {isPrimary && (
        <div className="absolute inset-0 border border-blue-400/0 group-hover:border-blue-400/100 scale-105 opacity-0 group-hover:opacity-100 transition-all pointer-events-none"></div>
      )}
      
      <span className={`transition-colors duration-300 flex items-center gap-3 ${isPrimary ? "text-white" : "text-gray-300 group-hover:text-white"}`}>
        <span className={isPrimary ? "text-blue-300" : "text-gray-400"}>{icon}</span>
        <span className={`font-sans font-light tracking-[0.2em] sm:tracking-[0.3em] uppercase ${isPrimary ? "text-lg sm:text-xl" : "text-base sm:text-lg"}`}>{text}</span>
      </span>
    </motion.button>
  );
}

function SecondaryButton({ icon, text, onClick }: { icon: React.ReactNode, text: string, onClick?: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col sm:flex-row items-center gap-2 group"
    >
      <span className="text-gray-600 group-hover:text-blue-400 transition-colors">
        {icon}
      </span>
      <span className="text-[10px] font-sans uppercase tracking-[0.2em] text-gray-500 group-hover:text-gray-300 transition-colors text-center">
        {text}
      </span>
    </motion.button>
  );
}
