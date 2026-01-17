import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SmoothImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  fallbackText?: string;
  src?: string;
  alt?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down'; 
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

export default function SmoothImage({ src, alt, className, fallbackText, objectFit = 'cover', onLoad, onError, ...props }: SmoothImageProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setHasError(true);
      if (onError) onError(e);
  };

  if (!src) {
      return (
        <div className={`flex items-center justify-center bg-gray-900 text-gray-700 ${className}`}>
             <ImageIcon size={16} className="opacity-50" />
        </div>
      );
  }

  if (hasError) {
      return (
        <div className={`flex flex-col items-center justify-center bg-gray-900 text-gray-600 text-[10px] font-bold uppercase p-1 text-center ${className}`}>
           <span className="opacity-50 mb-1 scale-75"><ImageIcon size={16}/></span>
           {fallbackText || alt?.substring(0, 2) || '?'}
        </div>
      );
  }

  return (
    <div className={`relative bg-gray-900 overflow-hidden ${className}`}>
       <img
          src={src}
          alt={alt}
          className={`w-full h-full object-${objectFit}`}
          onError={handleError}
          onLoad={onLoad}
          {...props}
        />
    </div>
  );
}