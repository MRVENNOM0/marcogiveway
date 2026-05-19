import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

import { useAuth } from '../context/AuthContext';

interface Entry {
  id: string;
  discordUsername: string;
  userId: string;
}

interface WinnerWheelProps {
  giveawayId: string;
  giveawayTitle: string;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
}

export default function WinnerWheel({ giveawayId, giveawayTitle, isOpen, isAdmin, onClose }: WinnerWheelProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Entry | null>(null);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen && giveawayId) {
      loadEntries();
      setWinner(null);
    }
  }, [isOpen, giveawayId]);

  async function loadEntries() {
    try {
      const q = query(collection(db, 'giveaways', giveawayId, 'entries'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entry));
      setEntries(data);
    } catch (err: any) {
      console.error("Wheel loading failed:", err.code, err.message);
    }
  }

  const handleAnnounce = async () => {
    if (!winner || isAnnouncing) return;
    
    setIsAnnouncing(true);
    try {
      // 1. Update Firestore
      const gaRef = doc(db, 'giveaways', giveawayId);
      await updateDoc(gaRef, {
        winnerUsername: winner.discordUsername,
        winnerId: winner.userId,
        updatedAt: serverTimestamp()
      });

      // 2. Notify Discord via API
      console.log("Announcing winner to Discord...");
      const response = await fetch('/api/announce-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giveawayTitle,
          winnerName: winner.discordUsername,
          winnerId: winner.userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Discord winner notification failed:", errorData);
        throw new Error(errorData.message || "Failed to notify Discord");
      }

      console.log("Winner announced successfully");
      alert("Winner announced and saved successfully!");
      onClose();
    } catch (err) {
      console.error("Failed to announce winner:", err);
      alert("Error announcing winner. Please try again.");
    } finally {
      setIsAnnouncing(false);
    }
  };

  useEffect(() => {
    if (entries.length > 0 && canvasRef.current) {
      drawWheel();
    }
  }, [entries, rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const sliceAngle = (2 * Math.PI) / entries.length;

    ctx.clearRect(0, 0, size, size);

    entries.forEach((entry, i) => {
      const startAngle = i * sliceAngle + rotation;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      // Alternate colors
      ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#1a1a1a';
      ctx.fill();

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = i % 2 === 0 ? '#000' : '#fff';
      ctx.font = 'bold 12px Inter';
      
      const text = entry.discordUsername.length > 15 
        ? entry.discordUsername.substring(0, 12) + '...' 
        : entry.discordUsername;
      
      ctx.fillText(text, radius - 20, 5);
      ctx.restore();
    });

    // Pointer
    ctx.beginPath();
    ctx.moveTo(size - 30, center);
    ctx.lineTo(size, center - 15);
    ctx.lineTo(size, center + 15);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
  };

  const spin = () => {
    if (spinning || entries.length === 0) return;

    setSpinning(true);
    setWinner(null);

    const extraSpins = 5 + Math.random() * 5;
    const targetRotation = rotation + extraSpins * 2 * Math.PI;
    
    const startTime = performance.now();
    const duration = 4000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = rotation + (targetRotation - rotation) * easeOut;
      
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        const finalRotation = currentRotation % (2 * Math.PI);
        // Calculate winner
        // Pointer is at 0 radians (right side)
        // Normalize rotation to [0, 2PI]
        const normalizedRotation = (2 * Math.PI - (finalRotation % (2 * Math.PI))) % (2 * Math.PI);
        const sliceAngle = (2 * Math.PI) / entries.length;
        const winningIndex = Math.floor(normalizedRotation / sliceAngle);
        
        setWinner(entries[winningIndex]);
        setSpinning(false);
      }
    };

    requestAnimationFrame(animate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-[40px] p-8 shadow-2xl overflow-hidden"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Winner<span className="text-orange-500"> Wheel</span></h2>
            <p className="text-gray-500 text-sm uppercase tracking-widest font-bold">{entries.length} Entries Loaded</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="relative mb-10 group" ref={containerRef}>
            <canvas 
              ref={canvasRef} 
              width={400} 
              height={400} 
              className={cn(
                "max-w-full h-auto drop-shadow-[0_0_30px_rgba(249,115,22,0.2)]",
                (spinning || !isAdmin) && "cursor-default"
              )}
            />
            
            {isAdmin && (
              <button 
                onClick={spin}
                disabled={spinning || entries.length === 0}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-orange-500 hover:scale-110 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group-hover:rotate-12"
              >
                <RefreshCw className={cn("text-black", spinning && "animate-spin")} size={32} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {!user ? (
               <motion.div 
                 initial={{ y: 10, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 className="bg-red-500/10 border border-red-500/20 text-red-500 px-6 py-3 rounded-2xl font-black uppercase text-sm tracking-widest"
               >
                 LOGIN FIRST TO VIEW WINNER
               </motion.div>
            ) : winner ? (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center"
              >
                <div className="inline-flex items-center space-x-2 bg-orange-500 text-black font-black px-6 py-3 rounded-2xl mb-4 text-xl uppercase italic transform -rotate-1">
                  <Trophy size={24} />
                  <span>WINNER DETECTED</span>
                </div>
                <h3 className="text-4xl font-black uppercase text-white mb-2">{winner.discordUsername}</h3>
                <p className="text-gray-500 font-mono text-sm tracking-tighter mb-6">ID: {winner.userId}</p>

                {isAdmin && (
                  <button
                    onClick={handleAnnounce}
                    disabled={isAnnouncing}
                    className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-black font-black px-8 py-4 rounded-2xl text-lg uppercase italic transition-all mx-auto shadow-lg shadow-green-500/20 disabled:opacity-50"
                  >
                    {isAnnouncing ? <RefreshCw className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                    <span>Confirm & Announce Winner</span>
                  </button>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {!winner && !spinning && entries.length === 0 && (
            <div className="text-gray-500 text-center italic mt-4">
              No participants yet... Join to be added to the wheel!
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
