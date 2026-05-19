import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Giveaway, Entry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit3, Save, X, Users, LayoutDashboard, ChevronRight, Download, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'stats'>('listings');
  const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);
  const [viewingEntries, setViewingEntries] = useState<{ga: Giveaway, entries: any[]} | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [minParticipants, setMinParticipants] = useState('0');

  useEffect(() => {
    const path = 'giveaways';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setGiveaways(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Giveaway)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = editingGiveaway ? `giveaways/${editingGiveaway.id}` : 'giveaways';
    const formattedSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    try {
      if (editingGiveaway) {
        await updateDoc(doc(db, 'giveaways', editingGiveaway.id), {
          title,
          slug: formattedSlug,
          description,
          redirectUrl,
          imageUrl,
          endsAt: new Date(endsAt).toISOString(),
          minParticipants: parseInt(minParticipants) || 0,
          updatedAt: serverTimestamp()
        });
        showNotification('Giveaway updated successfully!', 'success', 'CAMPAIGN UPDATED');
      } else {
        await addDoc(collection(db, 'giveaways'), {
          title,
          slug: formattedSlug,
          description,
          redirectUrl,
          imageUrl,
          endsAt: new Date(endsAt).toISOString(),
          minParticipants: parseInt(minParticipants) || 0,
          status: 'active',
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });

        // Announce new giveaway to Discord
        try {
          console.log("Announcing new giveaway to Discord...");
          const response = await fetch('/api/announce-giveaway', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              description,
              slug: formattedSlug,
              endsAt: new Date(endsAt).toISOString(),
              imageUrl
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Giveaway announcement failed:", errorData);
          } else {
            console.log("Giveaway announced successfully");
          }
        } catch (announceErr) {
          console.error("Failed to announce giveaway (network error):", announceErr);
        }

        showNotification('Giveaway launched successfully!', 'success', 'CAMPAIGN READY');
      }
      setShowAdd(false);
      setEditingGiveaway(null);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingGiveaway ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleEdit = (ga: Giveaway) => {
    setEditingGiveaway(ga);
    setTitle(ga.title);
    setSlug(ga.slug);
    setDescription(ga.description);
    setRedirectUrl(ga.redirectUrl);
    setImageUrl(ga.imageUrl || '');
    // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
    const date = new Date(ga.endsAt);
    const formattedDate = date.toISOString().slice(0, 16);
    setEndsAt(formattedDate);
    setMinParticipants(ga.minParticipants?.toString() || '0');
    setShowAdd(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this giveaway?')) {
      const path = `giveaways/${id}`;
      try {
        await deleteDoc(doc(db, 'giveaways', id));
        showNotification('Giveaway deleted successfully.', 'info', 'SYSTEM UPDATE');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
    setRedirectUrl('');
    setImageUrl('');
    setEndsAt('');
    setMinParticipants('0');
    setEditingGiveaway(null);
  };

  const exportEntries = async (giveawayId: string, title: string) => {
    const entriesRef = collection(db, 'giveaways', giveawayId, 'entries');
    const snap = await getDocs(entriesRef);
    const data = snap.docs.map(d => ({
      discord: d.data().discordUsername,
      email: d.data().email,
      joinedAt: d.data().joinedAt?.toDate()?.toLocaleString() || 'N/A'
    }));

    const csvRows = [
      ['Discord/Username', 'Email', 'Joined At'],
      ...data.map(row => [`"${row.discord}"`, `"${row.email}"`, `"${row.joinedAt}"`])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `entries_${title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadEntries = async (ga: Giveaway) => {
    const entriesRef = collection(db, 'giveaways', ga.id, 'entries');
    const snap = await getDocs(entriesRef);
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setViewingEntries({ ga, entries });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">Admin <span className="text-orange-500">Panel</span></h1>
          <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-mono">Control your rewards & monitor participation</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 rounded-xl font-black uppercase text-sm flex items-center space-x-2 transition-all shadow-lg shadow-orange-500/20"
        >
          <Plus size={18} />
          <span>New Giveaway</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="space-y-2">
          <button 
            onClick={() => setActiveTab('listings')}
            className={cn(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              activeTab === 'listings' ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
            )}
          >
            <LayoutDashboard size={18} />
            <span>Listings Management</span>
          </button>
          {/* Stats & Logs could be here */}
        </aside>

        <div className="lg:col-span-3">
          <AnimatePresence mode='wait'>
            {activeTab === 'listings' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {giveaways.map(ga => (
                  <div key={ga.id} className="bg-[#121212] border border-white/10 p-6 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center space-x-6">
                      {ga.imageUrl ? (
                        <img src={ga.imageUrl} className="w-16 h-16 rounded-xl object-cover border border-white/10" alt="" />
                      ) : (
                        <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                          <Trophy size={24} className="text-gray-700" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold uppercase tracking-tight">{ga.title}</h3>
                        <p className="text-gray-500 text-sm font-mono mt-1">/join/{ga.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => loadEntries(ga)}
                        className="p-3 text-gray-400 hover:text-orange-500 transition-colors"
                        title="View Participants"
                      >
                        <Users size={18} />
                      </button>
                      <button 
                        onClick={() => exportEntries(ga.id, ga.title)}
                        className="p-3 text-gray-400 hover:text-green-500 transition-colors"
                        title="Export Entries"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => handleEdit(ga)}
                        className="p-3 text-gray-400 hover:text-white transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ga.id)}
                        className="p-3 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                {giveaways.length === 0 && (
                  <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl">
                    <p className="text-gray-500">No giveaways created yet.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 overflow-y-auto pt-20 pb-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAdd(false);
                setEditingGiveaway(null);
                resetForm();
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#1a1a1a] border border-white/10 p-8 rounded-3xl w-full max-w-2xl shadow-2xl my-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">
                  {editingGiveaway ? 'Edit' : 'Create New'} <span className="text-orange-500">Giveaway</span>
                </h3>
                <button 
                  onClick={() => {
                    setShowAdd(false);
                    setEditingGiveaway(null);
                    resetForm();
                  }}
                  className="p-2 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1 tracking-widest">Title</label>
                      <input 
                        type="text" required value={title} onChange={e => setTitle(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1 tracking-widest">Custom Slug (Link URL)</label>
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-orange-500 transition-colors">
                        <span className="text-gray-500 text-sm mr-2">/join/</span>
                        <input 
                          type="text" required value={slug} onChange={e => setSlug(e.target.value)}
                          placeholder="pro-giveaway"
                          className="w-full bg-transparent outline-none text-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1 tracking-widest">Redirect URL (Link)</label>
                      <input 
                        type="url" required value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1 tracking-widest">End Date</label>
                      <input 
                        type="datetime-local" required value={endsAt} onChange={e => setEndsAt(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1 tracking-widest">Min Participants</label>
                      <input 
                        type="number" required value={minParticipants} onChange={e => setMinParticipants(e.target.value)} min="0"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1 tracking-widest">Image URL (Optional)</label>
                      <input 
                        type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1 tracking-widest">Description</label>
                      <textarea 
                        rows={5} required value={description} onChange={e => setDescription(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAdd(false);
                      setEditingGiveaway(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-black uppercase tracking-widest text-xs"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] px-4 py-4 bg-orange-500 hover:bg-orange-600 text-black rounded-xl transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20"
                  >
                    {editingGiveaway ? 'Update Giveaway' : 'Launch Giveaway'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {viewingEntries && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 overflow-y-auto pt-20 pb-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingEntries(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#1a1a1a] border border-white/10 p-8 rounded-3xl w-full max-w-2xl shadow-2xl my-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">Participants List</h3>
                  <p className="text-gray-500 text-xs uppercase tracking-widest mt-1">{viewingEntries.ga.title}</p>
                </div>
                <button 
                  onClick={() => setViewingEntries(null)}
                  className="p-2 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {viewingEntries.entries.length > 0 ? (
                  viewingEntries.entries.map((entry, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-200">{entry.email}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{entry.discordUsername}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 font-mono">
                          {entry.joinedAt?.toDate().toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-gray-500 italic">
                    No entries yet.
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setViewingEntries(null)}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-black uppercase tracking-widest text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
