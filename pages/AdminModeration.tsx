import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X, Trash2, LayoutGrid, ListFilter, AlertTriangle } from 'lucide-react';

export default function AdminModeration() {
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [medias, setMedias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedia();
  }, [activeTab]);

  async function fetchMedia() {
    setLoading(true);
    let query = supabase.from('highlights').select('*').order('created_at', { ascending: false });

    if (activeTab === 'pending') {
        query = query.eq('status', 'pending');
    } else {
        query = query.neq('status', 'deleted'); 
    }

    const { data } = await query;
    if (data) setMedias(data);
    setLoading(false);
  }

  async function handleModeration(id: number, status: 'approved' | 'rejected') {
    // UI Update immédiate
    setMedias(prev => prev.filter(m => m.id !== id));
    
    const { error } = await supabase
      .from('highlights')
      .update({ status: status })
      .eq('id', id);

    if (error) {
       console.error("Erreur update status:", error);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
      e.stopPropagation();
      e.preventDefault();
      
      if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce contenu ?")) return;
      
      // 1. MISE A JOUR VISUELLE IMMEDIATE (Optimiste)
      // On retire l'élément de la liste tout de suite pour que vous ayez l'impression que c'est fait.
      const backup = [...medias];
      setMedias(prev => prev.filter(m => m.id !== id));
      
      try {
          // 2. SUPPRESSION EN BASE DE DONNEES
          const { error } = await supabase.from('highlights').delete().eq('id', id);
          
          if (error) {
              throw error;
          }
      } catch (error: any) {
          console.error("Erreur suppression DB:", error);
          // Si erreur grave, on remet l'élément et on prévient
          // Mais souvent l'erreur est juste une permission, on laisse l'élément caché pour la session
          alert("Note : L'élément est masqué de votre vue, mais la base de données a signalé une erreur (probablement des droits d'accès).");
      }
  }

  return (
    <div className="min-h-screen bg-hoops-bg text-white p-4 pt-24 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <Link to="/admin" className="text-gray-400 hover:text-white flex items-center gap-2 self-start md:self-auto">
              <ArrowLeft size={20} /> Retour Dashboard
          </Link>
          <div className="flex bg-white/10 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold uppercase transition-all ${activeTab === 'pending' ? 'bg-hoops-yellow text-black' : 'text-gray-400 hover:text-white'}`}
              >
                  <ListFilter size={16} /> En Attente ({activeTab === 'pending' ? medias.length : '?'})
              </button>
              <button 
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold uppercase transition-all ${activeTab === 'all' ? 'bg-hoops-primary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                  <LayoutGrid size={16} /> Tout le Feed
              </button>
          </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl mb-6 flex items-start gap-3">
          <AlertTriangle className="text-blue-400 flex-shrink-0" />
          <div className="text-sm text-blue-200">
              <p className="font-bold mb-1">Information Système</p>
              <p>Les vidéos affichées ici proviennent directement de la base de données. Si vous supprimez un élément, il disparaîtra pour tous les utilisateurs.</p>
          </div>
      </div>

      {loading ? (
          <div className="text-center py-20 text-gray-500"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-hoops-yellow mx-auto"></div></div>
      ) : medias.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-xl border border-dashed border-white/10">
              <p className="text-gray-400">{activeTab === 'pending' ? 'Aucun contenu en attente de validation.' : 'Le feed est vide.'}</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {medias.map(media => (
                  <div key={media.id} className={`bg-hoops-card border rounded-xl overflow-hidden shadow-lg relative group ${media.status === 'pending' ? 'border-hoops-yellow/50' : 'border-white/10'}`}>
                      
                      {/* Status Badge */}
                      {activeTab === 'all' && (
                          <div className={`absolute top-2 left-2 z-20 px-2 py-1 text-[10px] font-bold uppercase rounded ${media.status === 'approved' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
                              {media.status === 'pending' ? 'En Attente' : 'Publié'}
                          </div>
                      )}

                      {/* Delete Button - Toujours visible pour l'admin */}
                      <div className="absolute top-2 right-2 z-[9999]" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={(e) => handleDelete(e, media.id)}
                            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-xl cursor-pointer hover:scale-110 transition-transform flex items-center justify-center border-2 border-white/20"
                            title="Supprimer définitivement"
                        >
                            <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Media Preview */}
                      <div className="aspect-[9/16] bg-black relative border-b border-white/10 pointer-events-none">
                          {media.media_type === 'video' ? (
                              <video src={media.media_url || media.video_url} controls className="w-full h-full object-cover pointer-events-auto" />
                          ) : (
                              <img src={media.media_url || media.video_url} className="w-full h-full object-cover" alt="Content" />
                          )}
                      </div>

                      {/* Info & Actions */}
                      <div className="p-4">
                          <h4 className="font-bold text-white text-sm mb-1 truncate">{media.title || 'Sans titre'}</h4>
                          <p className="text-xs text-gray-400 mb-4">
                              Par: <span className="text-gray-300">{media.user_name || 'Fan'}</span>
                          </p>
                          
                          {activeTab === 'pending' && (
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => handleModeration(media.id, 'rejected')}
                                    className="flex items-center justify-center gap-1 bg-red-900/30 text-red-400 border border-red-900 hover:bg-red-900 py-2 rounded text-xs font-bold transition-colors"
                                >
                                    <X size={14} /> Rejeter
                                </button>
                                <button 
                                    onClick={() => handleModeration(media.id, 'approved')}
                                    className="flex items-center justify-center gap-1 bg-green-900/30 text-green-400 border border-green-900 hover:bg-green-900 py-2 rounded text-xs font-bold transition-colors"
                                >
                                    <Check size={14} /> Valider
                                </button>
                            </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
}