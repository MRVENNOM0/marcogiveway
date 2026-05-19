import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Giveaway } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, CheckCircle2, AlertCircle, ArrowLeft, Send, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function CustomJoinPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user, openLogin } = useAuth();
  const [ga, setGa] = useState<Giveaway | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // Auto-join when user becomes available if they were trying to join
  useEffect(() => {
    if (user && ga && joining && !success && !hasJoined) {
      handleSubmit();
    }
  }, [user, ga, joining, hasJoined]);

  useEffect(() => {
    async function checkEntry() {
      if (user && ga) {
        const entryRef = doc(db, 'giveaways', ga.id, 'entries', user.uid);
        const entrySnap = await getDoc(entryRef);
        if (entrySnap.exists()) {
          setHasJoined(true);
          setSuccess(true);
          setError('');
        }
      }
    }
    checkEntry();
  }, [user, ga]);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        const q = query(collection(db, 'giveaways'), where('slug', '==', slug), where('status', '==', 'active'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setGa({ id: snap.docs[0].id, ...snap.docs[0].data() } as Giveaway);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (hasJoined) return;

    if (!user) {
      setJoining(true); // Flag that we want to join after login
      openLogin();
      return;
    }

    if (!user.emailVerified) {
      setError('Please verify your email address to participate. We sent you a link — check your inbox!');
      showNotification('Verify your email to unlock access.', 'warning', 'ACTION REQUIRED');
      return;
    }

    if (!ga) return;

    setJoining(true);
    setError('');
    const gaPath = `giveaways/${ga.id}`;
    
    try {
      await runTransaction(db, async (transaction) => {
        const giveawayRef = doc(db, 'giveaways', ga.id);
        const entryRef = doc(db, 'giveaways', ga.id, 'entries', user.uid);
        
        const giveawaySnap = await transaction.get(giveawayRef);
        const entrySnap = await transaction.get(entryRef);

        if (entrySnap.exists()) {
          throw new Error('ALREADY_JOINED');
        }

        if (!giveawaySnap.exists()) {
          throw new Error('GIVEAWAY_NOT_FOUND');
        }

        // 1. Create Entry
        transaction.set(entryRef, {
          userId: user.uid,
          email: user.email,
          discordUsername: user.displayName || 'Anonymous Guest',
          joinedAt: serverTimestamp(),
          giveawayId: ga.id
        });

        // 2. Increment entryCount
        const currentCount = giveawaySnap.data().entryCount || 0;
        transaction.update(giveawayRef, {
          entryCount: currentCount + 1,
          updatedAt: serverTimestamp()
        });
      });

      // 3. Notify Discord
      try {
        console.log("Sending Discord notification...");
        const response = await fetch('/api/discord-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discordUsername: user.displayName || user.email || 'Anonymous',
            giveawayTitle: ga.title
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Discord notification failed", errorData);
        } else {
          console.log("Discord notification sent successfully");
        }
      } catch (err) {
        console.error("Discord notify network error", err);
      }
      
      showNotification('Welcome to the giveaway! Your entry has been securely logged.', 'success', 'ACCESS GRANTED');

      setSuccess(true);
      // Home navigation after a short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      const errMessage = err?.message || String(err);
      const isAlreadyJoined = errMessage.includes('ALREADY_JOINED') || 
                               errMessage.includes('already-exists') ||
                               errMessage.includes('permission-denied');

      if (isAlreadyJoined) {
        setError('Verification failed. You may have already joined.');
        showNotification('We detected a previous entry or system conflict.', 'warning', 'ENTRY RESTRICTED');
        setSuccess(true);
        setTimeout(() => navigate('/'), 1500);
      } else {
        console.error("Join error:", err);
        try {
          handleFirestoreError(err, OperationType.UPDATE, gaPath);
        } catch (e) {
          setError('Verification failed. System error.');
        }
      }
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-orange-500">
          <Trophy size={32} />
        </motion.div>
      </div>
    );
  }

  if (!ga) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] px-4 text-center">
        <AlertCircle size={48} className="text-gray-700 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Giveaway Expired or Not Found</h1>
        <p className="text-gray-500 mb-8">This link is no longer valid or has been moved.</p>
        <button onClick={() => navigate('/')} className="text-orange-500 font-bold flex items-center space-x-2">
          <ArrowLeft size={16} />
          <span>Home</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg bg-[#121212] border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl"
      >
        {!success ? (
          <>
            <div className="text-center mb-10">
              <div className="inline-flex p-4 bg-orange-500 rounded-2xl mb-6 shadow-lg shadow-orange-500/20">
                <Trophy size={32} className="text-black" />
              </div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">{ga.title}</h1>
              <p className="text-gray-400 mb-4">{ga.description}</p>
              <div className="flex items-center justify-center space-x-2 text-orange-500 font-mono text-xs uppercase tracking-widest">
                <Users size={14} />
                <span>{ga.entryCount || 0} Participants</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-sm flex items-start space-x-3">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={joining}
                  className={cn(
                    "w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-5 rounded-2xl flex items-center justify-center space-x-3 transition-all shadow-xl shadow-orange-500/20 transform hover:-translate-y-1 active:translate-y-0",
                    joining && "opacity-50 cursor-not-allowed grayscale"
                  )}
                >
                  {!user ? (
                    <>
                      <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale invert" alt="Google" />
                      <span>SIGN IN & JOIN GIVEAWAY</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      <span>{joining ? 'PROCESSING ENTRY...' : 'JOIN NOW & CLAIM REWARD'}</span>
                    </>
                  )}
                </button>
                
                {user && (
                  <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest">
                    Signed in as <span className="text-gray-300">{user.email}</span>
                  </p>
                )}
              </div>
            </form>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10"
          >
            <div className="inline-flex p-6 bg-green-500/20 text-green-500 rounded-full mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black uppercase mb-2">
              {hasJoined ? 'ALREADY JOINED' : 'ENTRY SUCCESS!'}
            </h2>
            <p className="text-gray-400">
              {hasJoined 
                ? 'You have already participated in this giveaway.' 
                : 'Entry logged successfully. Returning home...'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
