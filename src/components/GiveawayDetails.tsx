import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Giveaway } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, Users, ArrowLeft, CheckCircle2, Plus, PieChart, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import WinnerWheel from './WinnerWheel';

export default function GiveawayDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ga, setGa] = useState<Giveaway | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [showWheel, setShowWheel] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const path = `giveaways/${id}`;
      try {
        const ref = doc(db, 'giveaways', id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setGa({ id: snap.id, ...snap.data() } as Giveaway);
          
          // Check if user has joined
          if (user) {
            const entryRef = doc(db, 'giveaways', id, 'entries', user.uid);
            const entrySnap = await getDoc(entryRef);
            setHasJoined(entrySnap.exists());
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
      setLoading(false);
    }
    load();
  }, [id, user]);

  const isEnded = ga ? new Date(ga.endsAt).getTime() < Date.now() : false;
  const isCancelled = isEnded && (ga?.entryCount || 0) < (ga?.minParticipants || 0);
  const isAdmin = user?.email === 'qadeerahmed235x@gmail.com';

  const handleJoin = async () => {
    if (!ga) return;
    
    if (ga.redirectUrl) {
      window.open(ga.redirectUrl, '_blank');
    } else if (ga.slug) {
      navigate(`/join/${ga.slug}`);
    }
  };

  if (loading) return null;
  if (!ga) return <div className="py-20 text-center">Giveaway not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center space-x-2 text-gray-500 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Back to List</span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {ga.imageUrl && (
            <div className="rounded-3xl overflow-hidden border border-white/10 mb-6 bg-white/5">
              <img src={ga.imageUrl} alt={ga.title} className="w-full aspect-square object-cover" />
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col justify-center"
        >
          <div className="flex items-center space-x-2 text-sm text-orange-500 mb-4 font-mono">
            <Trophy size={16} />
            <span>EXCLUSIVE GIVEAWAY</span>
          </div>
          <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter">{ga.title}</h1>
          <p className="text-gray-400 text-lg mb-8 whitespace-pre-wrap">{ga.description}</p>

          <div className="flex items-center space-x-4 mb-10">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-widest mb-1">Status</span>
              <span className={cn(
                "font-bold flex items-center space-x-1",
                isCancelled ? "text-gray-500" : isEnded ? "text-red-500" : "text-green-400"
              )}>
                {isCancelled ? <X size={14} /> : isEnded ? <Timer size={14} /> : <CheckCircle2 size={14} />}
                <span>{isCancelled ? 'Cancelled' : isEnded ? 'Ended' : 'Active'}</span>
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-widest mb-1">Participants</span>
              <span className="text-orange-500 font-bold flex items-center space-x-1">
                <Users size={14} />
                <span>{ga.entryCount || 0} / {ga.minParticipants || 0}</span>
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 uppercase tracking-widest mb-1">Ends At</span>
              <span className="text-gray-300 font-mono">{new Date(ga.endsAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-4">
            {ga.winnerUsername ? (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-6 rounded-2xl text-center space-y-2">
                <Trophy className="mx-auto mb-2 text-orange-500" size={48} />
                <h3 className="text-2xl font-black uppercase italic">WE HAVE A WINNER!</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 mt-4">
                  <p className="text-white text-3xl font-black uppercase">{ga.winnerUsername}</p>
                  <p className="text-gray-500 font-mono text-xs mt-1 uppercase tracking-tighter">ID: {ga.winnerId}</p>
                </div>
              </div>
            ) : isCancelled ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl text-center space-y-2">
                <X className="mx-auto mb-2" size={32} />
                <h3 className="text-xl font-black uppercase italic">GIVEAWAY CANCELLED</h3>
                <p className="font-bold text-sm tracking-widest uppercase">Minimum participants requirement not met</p>
              </div>
            ) : isEnded ? (
              <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 p-6 rounded-2xl text-center space-y-2">
                <Trophy className="mx-auto mb-2" size={32} />
                <h3 className="text-xl font-black uppercase italic">GIVEAWAY CLOSED</h3>
                <p className="font-bold text-sm tracking-widest uppercase">WAITING FOR ADMIN RESPONSE TO ANNOUNCE WINNER</p>
              </div>
            ) : hasJoined ? (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-2xl flex items-center justify-center space-x-2 font-bold uppercase tracking-wider">
                <CheckCircle2 size={20} />
                <span>You already joined this giveaway</span>
              </div>
            ) : (
              <button
                onClick={handleJoin}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={20} />
                <span>JOIN GIVEAWAY</span>
              </button>
            )}

            <button
              onClick={() => setShowWheel(true)}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-2 border border-white/5 transition-all"
            >
              <PieChart size={20} />
              <span>VIEW PARTICIPANT WHEEL</span>
            </button>
          </div>

          <WinnerWheel 
            giveawayId={id || ''} 
            giveawayTitle={ga.title}
            isOpen={showWheel} 
            isAdmin={isAdmin}
            onClose={() => setShowWheel(false)} 
          />
        </motion.div>
      </div>

      <AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
