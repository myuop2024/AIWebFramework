import React, { useEffect, useRef, useState } from 'react';
import ringtoneSrc from '@assets/sounds/ringtone.mp3';

interface AudioPlayerProps {
  play: boolean;
  loop?: boolean;
  src?: string;
}

/**
 * Component that plays a sound
 * Uses HTML Audio API to play sounds with control for looping and play/pause
 */
const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  play, 
  loop = false, 
  src = ringtoneSrc // Default to the imported ringtone
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);

  // Create audio element on component mount
  useEffect(() => {
    try {
      // Create audio element
      const audio = new Audio(src);
      audio.loop = loop;
      audio.preload = 'auto';

      // Handle audio load events
      audio.oncanplaythrough = () => {
        setAudioLoaded(true);
        console.debug('Audio loaded successfully');
      };

      audio.onerror = (e) => {
        console.error('Audio loading error:', e);
        setAudioLoaded(false);
      };

      audioRef.current = audio;

      // Clean up on unmount
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.oncanplaythrough = null;
          audioRef.current.onerror = null;
          audioRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing audio:', error);
      setAudioLoaded(false);
    }
  }, [src, loop]);

  // Handle play state changes
  useEffect(() => {
    if (!audioRef.current || !audioLoaded) return;

    if (play && !isPlaying) {
      // Try to play the sound
      const playPromise = audioRef.current.play();
      
      // Modern browsers return a promise from play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            console.debug('Audio playback started successfully');
          })
          .catch(error => {
            console.warn('Audio playback failed:', error);
            setIsPlaying(false);
          });
      } else {
        // Older browsers don't return a promise
        setIsPlaying(true);
      }
    } else if (!play && isPlaying) {
      // Pause the sound
      audioRef.current.pause();
      if (!loop) {
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      console.debug('Audio playback stopped');
    }
  }, [play, isPlaying, loop, audioLoaded]);

  // This component doesn't render anything visible
  return null;
};

export default AudioPlayer;