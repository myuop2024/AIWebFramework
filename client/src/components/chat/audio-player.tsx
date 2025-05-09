import React, { useEffect, useRef, useState } from 'react';

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
  src = "/sounds/ringtone.ogg" 
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Create audio element on component mount
  useEffect(() => {
    // Create audio element
    const audio = new Audio(src);
    audio.loop = loop;
    audioRef.current = audio;

    // Clean up on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src, loop]);

  // Handle play state changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (play && !isPlaying) {
      // Try to play the sound
      const playPromise = audioRef.current.play();
      
      // Modern browsers return a promise from play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
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
    }
  }, [play, isPlaying, loop]);

  // This component doesn't render anything visible
  return null;
};

export default AudioPlayer;