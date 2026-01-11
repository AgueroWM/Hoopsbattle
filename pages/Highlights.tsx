import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { HighlightVideo } from '../types';
import { Trash2, Volume2, VolumeX } from 'lucide-react';

const Highlights: React.FC = () => {
  const [videos, setVideos] = useState<HighlightVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchVideos();
    const adminAuth = sessionStorage.getItem('hoops_admin_auth');
    if (adminAuth === 'true') {
        setIsAdmin(true);
    }
  }, []);

  const fetchVideos = async () => {
        const data = await api.content.getHighlights();
        setVideos(data.filter(v => v.videoUrl));
        setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if(window.confirm("Voulez-vous vraiment supprimer cette vidéo du feed ?")) {
          setVideos(prev => prev.filter(v => v.id !== id));
          const { error } = await supabase.from('highlights').delete().eq('id', id);
          if (error) fetchVideos();
      }
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white">Chargement du feed...</div>;

  return (
    <div className="fixed inset-0 top-16 bottom-16 z-10 bg-black">
      <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory bg-black no-scrollbar pb-0">
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
                <MediaItem video={video} />
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

// Sous-composant avec INTERSECTION OBSERVER pour gérer lecture unique
const MediaItem = ({ video }: { video: HighlightVideo }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.6 // Doit être 60% visible pour jouer
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (videoRef.current) {
                    if (entry.isIntersecting) {
                        videoRef.current.play().catch(() => {
                            // Autoplay failed (user needs to interact)
                            setIsMuted(true); 
                        });
                        videoRef.current.muted = false; // Tente d'activer le son
                        setIsMuted(false);
                    } else {
                        videoRef.current.pause();
                        videoRef.current.currentTime = 0;
                    }
                }
            });
        }, options);

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            if (containerRef.current) observer.unobserve(containerRef.current);
        };
    }, []);

    const isVideo = (url?: string) => {
        if (!url) return false;
        const u = url.toLowerCase();
        return u.includes('.mp4') || u.includes('.mov') || u.includes('.webm') || u.includes('blob:');
    }

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    if (!isVideo(video.videoUrl)) {
        return (
            <>
                <img 
                    src={video.videoUrl} 
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    alt={video.title}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => { setHasError(true); setIsLoaded(true); }}
                />
                <OverlayInfo video={video} />
            </>
        )
    }

    return (
        <div ref={containerRef} className="w-full h-full relative">
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-gray-900 z-10 flex flex-col items-center justify-center gap-4">
                     <div className="w-12 h-12 border-4 border-hoops-yellow border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            <video 
                ref={videoRef}
                src={video.videoUrl} 
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                loop 
                playsInline
                preload="auto"
                onLoadedData={() => setIsLoaded(true)}
                onError={() => { setHasError(true); setIsLoaded(true); }}
                onClick={toggleMute}
            />

            <button 
                onClick={toggleMute}
                className="absolute top-4 left-4 z-30 bg-black/50 p-2 rounded-full text-white backdrop-blur-sm"
            >
                {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
            </button>

            <OverlayInfo video={video} />
            
            {hasError && (
                 <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-black z-0">
                     Vidéo indisponible
                 </div>
            )}
        </div>
    );
}

const OverlayInfo = ({ video }: { video: HighlightVideo }) => (
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none flex flex-col justify-end p-6 z-20">
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
);

export default Highlights;