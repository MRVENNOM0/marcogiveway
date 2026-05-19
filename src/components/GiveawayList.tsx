import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Giveaway } from '../types';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Timer, Trophy, Users, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export default function GiveawayList() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'giveaways';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setGiveaways(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Giveaway)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, []);

  if (loading) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-5xl font-black mb-4 uppercase italic tracking-tighter">
          MARCOXITERS <span className="text-orange-500">GIVEWAY</span>
        </h1>
        <p className="text-gray-400 max-w-2xl text-lg">Premium giveaways for our elite community. Join now and claim your epic rewards!</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {giveaways.map((ga, idx) => {
          const isEnded = new Date(ga.endsAt).getTime() < Date.now();
          const isCancelled = isEnded && (ga.entryCount || 0) < (ga.minParticipants || 0);
          return (
            <motion.div
              key={ga.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "group relative bg-[#121212] border border-white/10 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all",
                (isEnded || isCancelled) && "opacity-75 grayscale-[0.5]"
              )}
            >
              {ga.imageUrl && (
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={ga.imageUrl} 
                    alt={ga.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {ga.winnerUsername && (
                    <div className="absolute inset-0 bg-orange-500/10 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
                      <Trophy size={48} className="text-orange-500 mb-2" />
                      <span className="text-white font-black uppercase text-center leading-tight"> Winner:<br/>{ga.winnerUsername} </span>
                    </div>
                  )}
                  {!ga.winnerUsername && isCancelled ? (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="text-red-500 font-black uppercase text-sm tracking-widest border-2 border-red-500 px-3 py-1 -rotate-12">CANCELLED</span>
                    </div>
                  ) : isEnded && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="text-white font-black uppercase text-sm tracking-widest border-2 border-white px-3 py-1 -rotate-12">CLOSED</span>
                    </div>
                  )}
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    "flex items-center space-x-2 text-xs font-mono uppercase tracking-widest",
                    isCancelled ? "text-red-900" : isEnded ? "text-gray-500" : "text-orange-500"
                  )}>
                    <Timer size={14} />
                    <span>{isCancelled ? 'Cancelled' : isEnded ? 'Ended' : 'Active'}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 font-mono">
                    <Users size={12} />
                    <span>{ga.entryCount || 0}</span>
                  </div>
                </div>
                <h2 className="text-xl font-bold mb-2 group-hover:text-orange-500 transition-colors uppercase">{ga.title}</h2>
                <p className="text-gray-400 text-sm line-clamp-2 mb-6">{ga.description}</p>
                
                <div className="flex flex-col space-y-2">
                  <Link 
                    to={`/giveaway/${ga.id}`}
                    className="w-full inline-flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl text-sm font-bold transition-all group/btn"
                  >
                    <span>{isEnded ? 'See Results' : 'View Details'}</span>
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>

                  {!isEnded && (
                    <>
                      {ga.redirectUrl ? (
                        <a 
                          href={ga.redirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-black px-4 py-3 rounded-xl text-sm font-black uppercase transition-all"
                        >
                          <span>Join Giveaway</span>
                        </a>
                      ) : ga.slug ? (
                        <Link 
                          to={`/join/${ga.slug}`}
                          className="w-full inline-flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-black px-4 py-3 rounded-xl text-sm font-black uppercase transition-all"
                        >
                          <span>Join Giveaway</span>
                        </Link>
                      ) : null}
                    </>
                  )}
                  
                  {isEnded && !isCancelled && !ga.winnerUsername && (
                    <div className="text-center py-2">
                      <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest animate-pulse">Waiting for Winner Selection</p>
                    </div>
                  )}

                  {ga.winnerUsername && (
                    <div className="text-center py-2">
                      <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Winner Announced</p>
                    </div>
                  )}
                  {isCancelled && (
                    <div className="text-center py-2">
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Requirement Not Met</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {giveaways.length === 0 && (
          <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-2xl">
            <Trophy className="mx-auto text-gray-700 mb-4" size={48} />
            <p className="text-gray-500">No active giveaways at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
