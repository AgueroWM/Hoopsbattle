import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { HighlightVideo } from '../types';
import { Trash2, Heart } from 'lucide-react';

const Highlights: React.FC = () => {
  const [videos, setVideos] = useState<HighlightVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const videoRefs = React.useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    fetchVideos();
    const adminAuth = sessionStorage.getItem('hoops_admin_auth');
    if (adminAuth === 'true') {
        setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          // Si la vidéo est visible à >50% et que c'est une vidéo HTML5 (pas iframe Youtube)
          if (entry.intersectionRatio > 0.6) {
             video.play().catch(() => {}); 
          } else {
             video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    // Observe all video elements
    Object.values(videoRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [videos]);

  const fetchVideos = async () => {
        const data = await api.content.getHighlights();
        // Filtrer les URLs vides
        setVideos(data.filter(v => v.videoUrl));
        setLoading(false);
  };

  const handleRef = (id: string) => (el: HTMLVideoElement | null) => {
    videoRefs.current[id] = el;
  };

  const toggleMute = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const video = videoRefs.current[id];
      if (video) {
          video.muted = !video.muted;
      }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      
      if(window.confirm("Voulez-vous vraiment supprimer cette vidéo du feed ?")) {
          // Optimistic update
          setVideos(prev => prev.filter(v => v.id !== id));
          
          // CORRECTION: On passe l'ID directement sans parseInt pour supporter les UUIDs ou formats mixtes
          const { error } = await supabase.from('highlights').delete().eq('id', id);
          
          if (error) {
              alert("Erreur de suppression (DB): " + error.message);
              // Revert if error
              fetchVideos();
          }
      }
  };

  const isVideoFile = (url?: string) => {
      if (!url) return false;
      const u = url.toLowerCase();
      return u.includes('.mp4') || u.includes('.mov') || u.includes('.webm') || u.includes('blob:');
  }

  const isYoutube = (url?: string) => {
      if (!url) return false;
      const u = url.toLowerCase();
      return u.includes('youtube') || u.includes('youtu.be');
  }

  const getYoutubeId = (url: string) => {
      return url.replace('https://youtu.be/','')
                .replace('https://www.youtube.com/watch?v=','')
                .replace('https://youtube.com/shorts/','')
                .split('?')[0]
                .split('&')[0];
  }

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Chargement du feed...</div>;

  return (
    // Utilisation de 100dvh pour le mobile et padding bottom pour éviter le dock
    <div className="fixed inset-0 top-16 z-10 bg-black">
      <div className="h-[calc(100dvh-64px)] w-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar pb-20">
        {videos.map((video) => (
          <div key={video.id} className="h-full w-full snap-start relative flex items-center justify-center bg-gray-900 border-b border-white/10 group">
            
            {isAdmin && (
              <button 
                  onClick={(e) => handleDelete(e, video.id)}
                  className="absolute top-24 right-4 z-[9999] bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-xl pointer-events-auto cursor-pointer border-2 border-white/20"
                  title="Supprimer la vidéo (Admin)"
                  type="button"
              >
                  <Trash2 size={24} />
              </button>
            )}

            <div className="relative w-full h-full max-w-md mx-auto bg-black flex items-center justify-center">
                {isYoutube(video.videoUrl) ? (
                    <div className="w-full aspect-video pointer-events-auto z-30">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src={`https://www.youtube.com/embed/${getYoutubeId(video.videoUrl)}?autoplay=0&controls=1&modestbranding=1&rel=0&playsinline=1`}
                            title={video.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            referrerPolicy="no-referrer"
                        ></iframe>
                    </div>
                ) : isVideoFile(video.videoUrl) ? (
                   <>
                       <video 
                          ref={handleRef(video.id)}
                          src={video.videoUrl} 
                          className="w-full h-full object-contain bg-black"
                          loop 
                          muted={true}
                          playsInline
                          controls
                          preload="metadata"
                        />
                   </>
                ) : (
                    <img 
                        src={video.videoUrl} 
                        className="w-full h-full object-cover" 
                        alt={video.title}
                        onError={(e) => e.currentTarget.style.display = 'none'} 
                    />
                )}
                
                {/* Overlay UI (Non-clickable pour laisser la place aux contrôles Youtube si besoin) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none flex flex-col justify-end p-6 z-20">
                   
                   <div className="flex flex-col items-end absolute right-4 bottom-20 gap-6 pointer-events-auto">
                      <button className="flex flex-col items-center gap-1 group/btn cursor-default">
                          <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm group-hover/btn:bg-red-500 transition-colors">
                              <Heart className="w-6 h-6 text-white" fill="white" />
                          </div>
                          <span className="text-xs font-bold text-white">{video.likes}</span>
                      </button>
                   </div>

                   <div className="pr-16 mb-8 md:mb-0 pointer-events-none">
                       <h3 className="text-white font-bold text-lg mb-2 leading-tight drop-shadow-md">{video.title}</h3>
                       <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-hoops-yellow flex items-center justify-center text-[10px] text-black font-bold uppercase">
                              {video.author.substring(0,2)}
                           </div>
                           <span className="text-sm font-bold text-hoops-yellow">{video.author}</span>
                       </div>
                   </div>
                </div>
            </div>
          </div>
        ))}
        {videos.length === 0 && (
            <div className="flex h-full items-center justify-center text-gray-500 flex-col gap-4">
                <p>Aucune vidéo disponible.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Highlights;