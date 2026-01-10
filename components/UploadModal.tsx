import React, { useState, useRef } from 'react';
import { Upload, X, Smile, User, Calendar } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Player } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  matches: any[];
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ 
  isOpen, 
  onClose, 
  players, 
  matches, 
  onUploadSuccess 
}) => {
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [videoTitle, setVideoTitle] = useState('');
  const [userName, setUserName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStep('details');
    }
  };

  const handleReset = () => {
    setStep('select');
    setFile(null);
    setVideoTitle('');
    setUserName('');
    setSelectedPlayerId('');
    setSelectedMatchId('');
  };

  const handleUpload = async () => {
    try {
      if (!isSupabaseConfigured()) {
        alert("Mode hors ligne : Upload impossible.");
        return;
      }
      if (!file) return;
      if (!videoTitle.trim()) {
        alert("Veuillez donner un titre à votre vidéo.");
        return;
      }

      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `fan_${Date.now()}.${fileExt}`;
      const filePath = `fan_uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('hoops-media').upload(filePath, file);
      if (uploadError) throw new Error("Erreur Storage: " + uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from('hoops-media').getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('highlights').insert({
        title: videoTitle,
        media_url: publicUrl,
        media_type: file.type.startsWith('video') ? 'video' : 'image',
        status: 'pending', 
        user_name: userName.trim() || 'Fan Anonyme',
        player_id: selectedPlayerId ? parseInt(selectedPlayerId) : null,
        match_id: selectedMatchId ? parseInt(selectedMatchId) : null
      });

      if (dbError) throw new Error("Erreur DB: " + dbError.message);

      alert("✅ Contenu envoyé ! Il sera visible après validation.");
      onUploadSuccess();
      handleReset();
      onClose();
    } catch (error: any) {
      alert("❌ Erreur : " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-hoops-card border border-white/20 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={24}/>
        </button>

        <div className="p-6">
          <h2 className="text-xl font-display font-bold uppercase italic mb-6">Poster sur le Feed</h2>
          
          {step === 'select' ? (
            <div 
              className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:bg-white/5 transition-colors cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="text-hoops-yellow w-8 h-8"/>
              </div>
              <p className="font-bold text-white mb-2">Cliquez pour choisir</p>
              <p className="text-xs text-gray-400">Vidéo ou Photo (Max 50Mo)</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="video/*,image/*" 
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-4">
               <div className="bg-white/5 px-4 py-2 rounded text-xs text-gray-400 truncate border border-white/10 flex items-center gap-2">
                <Upload size={12}/> {file?.name}
               </div>

               <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Titre de l'action</label>
                <input 
                  type="text" 
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Ex: Dunk monstrueux de..." 
                  className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-hoops-primary focus:outline-none"
                  autoFocus
                />
               </div>

               <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-2">
                  <Smile size={12}/> Votre Nom (Optionnel)
                </label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Pseudo / Nom" 
                  className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-hoops-primary focus:outline-none"
                />
               </div>

               <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-2">
                  <User size={12}/> Mentionner un joueur (Optionnel)
                </label>
                <select 
                  value={selectedPlayerId} 
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-hoops-primary focus:outline-none appearance-none"
                >
                  <option value="">-- Aucun --</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                  ))}
                </select>
               </div>

               <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-2">
                  <Calendar size={12}/> Mentionner un match (Optionnel)
                </label>
                <select 
                  value={selectedMatchId} 
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded p-3 text-white focus:border-hoops-primary focus:outline-none appearance-none"
                >
                  <option value="">-- Aucun --</option>
                  {matches.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.team_a?.name || '?'} vs {m.team_b?.name || '?'} ({new Date(m.start_time).toLocaleDateString()})
                    </option>
                  ))}
                </select>
               </div>

               <button 
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-hoops-primary text-white font-bold uppercase py-4 rounded-xl hover:bg-blue-600 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                {uploading ? 'Envoi en cours...' : 'Publier'}
               </button>
               
               <button 
                onClick={handleReset}
                className="w-full text-xs text-gray-500 hover:text-white mt-2"
               >
                Choisir un autre fichier
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};