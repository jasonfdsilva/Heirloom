import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function usePhotos() {
  const [allPhotos, setAllPhotos] = useState([]);
  const [photosGrouping, setPhotosGrouping] = useState('time');
  const [photosLightboxIndex, setPhotosLightboxIndex] = useState(null);

  const loadAllPhotos = async () => {
    const photos = await api.get('/api/photos');
    setAllPhotos(photos);
  };

  useEffect(() => {
    if (photosLightboxIndex === null) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight') setPhotosLightboxIndex(i => Math.min(i + 1, allPhotos.length - 1));
      if (e.key === 'ArrowLeft')  setPhotosLightboxIndex(i => Math.max(i - 1, 0));
      if (e.key === 'Escape')     setPhotosLightboxIndex(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photosLightboxIndex, allPhotos.length]);

  return {
    allPhotos, setAllPhotos,
    photosGrouping, setPhotosGrouping,
    photosLightboxIndex, setPhotosLightboxIndex,
    loadAllPhotos,
  };
}
