import React, { useState, useEffect } from 'react';
import { db, auth } from './lib/firebase';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Giveaway } from './types';
import { Trophy, Shield, LogIn, LogOut, Plus, ExternalLink, Timer, AlertCircle, Youtube, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import AdminDashboard from './components/AdminDashboard';
import GiveawayList from './components/GiveawayList';
import GiveawayDetails from './components/GiveawayDetails';
import CustomJoinPage from './components/CustomJoinPage';

import { useNotification } from './context/NotificationContext';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { showNotification } = useNotification();
  const { user, loading, openLogin } = useAuth();

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-orange-500"
        >
          <Trophy size={48} />
        </motion.div>
      </div>
    );
  }

  const isAdmin = user?.email === 'qadeerahmed235x@gmail.com';

  return (
    <Router>
      <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-orange-500/30">
        <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="p-2 bg-orange-500 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-orange-500/20">
                  <Trophy className="text-black" size={24} />
                </div>
                <span className="font-black text-2xl tracking-tighter uppercase italic">MARCOXITERS<span className="text-orange-500"> GIVEWAY</span></span>
              </Link>

              <div className="flex items-center space-x-6">
                <div className="hidden md:flex items-center space-x-4 border-r border-white/10 pr-4">
                  <a 
                    href="https://www.youtube.com/@OnlyMARCO1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="YouTube"
                  >
                    <Youtube size={20} />
                  </a>
                  <a 
                    href="https://discord.gg/agreAryRHP" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-[#5865F2] transition-colors"
                    title="Discord"
                  >
                    <MessageSquare size={20} />
                  </a>
                </div>

                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="flex items-center space-x-1 text-sm text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    <Shield size={16} />
                    <span>Admin</span>
                  </Link>
                )}

                {user ? (
                  <div className="flex items-center space-x-4">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold text-xs">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={openLogin}
                    className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-lg font-medium transition-all"
                  >
                    <LogIn size={16} />
                    <span>Sign In</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>

        {user && !user.emailVerified && (
          <div className="bg-orange-500/10 border-b border-orange-500/20 py-2">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-center space-x-4">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                <AlertCircle size={14} />
                <span>Please verify your email address. Check your inbox.</span>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="text-[10px] font-black uppercase bg-orange-500 text-black px-2 py-1 rounded hover:bg-orange-600 transition-colors"
              >
                Refresh Status
              </button>
            </div>
          </div>
        )}

        <main>
          <Routes>
            <Route path="/" element={<GiveawayList />} />
            <Route path="/join/:slug" element={<CustomJoinPage />} />
            <Route path="/giveaway/:id" element={<GiveawayDetails />} />
            {isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
            <Route path="*" element={<div className="py-20 text-center">Page not found</div>} />
          </Routes>
        </main>

        <footer className="py-20 border-t border-white/5 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex justify-center space-x-6 mb-8">
              <a 
                href="https://www.youtube.com/@OnlyMARCO1" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-red-500 transition-colors bg-white/5 px-4 py-2 rounded-xl"
              >
                <Youtube size={18} />
                <span className="font-bold text-sm">YOUTUBE</span>
              </a>
              <a 
                href="https://discord.gg/agreAryRHP" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-[#5865F2] transition-colors bg-white/5 px-4 py-2 rounded-xl"
              >
                <MessageSquare size={18} />
                <span className="font-bold text-sm">DISCORD</span>
              </a>
            </div>
            <p className="text-gray-500 text-sm italic">Built with passion for the giveaway community.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
