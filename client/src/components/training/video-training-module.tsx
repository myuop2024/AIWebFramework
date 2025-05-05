import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';

interface VideoTrainingModuleProps {
  videoId: string;
  title: string;
  description?: string;
  duration: number; // in seconds
  onComplete: () => void;
  isCompleted?: boolean;
}

export function VideoTrainingModule({
  videoId,
  title,
  description,
  duration,
  onComplete,
  isCompleted = false
}: VideoTrainingModuleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isInView, setIsInView] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Options for YouTube player
  const opts: YouTubeProps['opts'] = {
    height: '390',
    width: '100%',
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      controls: 1, // Show controls, but we'll enforce complete viewing
      disablekb: 1, // Disable keyboard controls to prevent skipping
    },
  };

  // Set up intersection observer to detect when video is out of view
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      setIsInView(entry.isIntersecting);
      
      // If video is playing but scrolled out of view, pause it
      if (!entry.isIntersecting && isPlaying && playerRef.current) {
        playerRef.current.pauseVideo();
        
        toast({
          title: "Video paused",
          description: "You must keep the video visible to continue training",
          variant: "destructive"
        });
      }
    }, {
      threshold: 0.7 // 70% of the video must be visible
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isPlaying, toast]);

  // Track progress and handle completion
  useEffect(() => {
    if (isCompleted) {
      setProgress(100);
      return;
    }

    if (isPlaying && isInView) {
      // Start progress tracking interval
      progressInterval.current = setInterval(() => {
        if (playerRef.current) {
          const currentTime = Math.floor(playerRef.current.getCurrentTime());
          setCurrentTime(currentTime);
          
          // Calculate progress percentage
          const progressPercent = Math.min(Math.floor((currentTime / duration) * 100), 100);
          setProgress(progressPercent);
          
          // Check if video is near completion (95% or more)
          if (progressPercent >= 95 && !isCompleting) {
            setIsCompleting(true);
          }
        }
      }, 1000);
    } else {
      // Clear interval when paused or not in view
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, isInView, duration, isCompleted, isCompleting]);

  // Handle module completion
  useEffect(() => {
    if (isCompleting && progress >= 95) {
      onComplete();
      setIsCompleting(false);
      
      toast({
        title: "Training completed",
        description: "You have completed this training module",
      });
    }
  }, [isCompleting, progress, onComplete, toast]);

  // YouTube player event handlers
  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
  };

  const onPlay = () => {
    setIsPlaying(true);
    setHasStarted(true);
    
    // If not in view, force pause
    if (!isInView) {
      playerRef.current?.pauseVideo();
      
      toast({
        title: "Cannot play video",
        description: "You must keep the video visible during training",
        variant: "destructive"
      });
    }
  };

  const onPause = () => {
    setIsPlaying(false);
  };

  const onEnd = () => {
    setIsPlaying(false);
    if (!isCompleted) {
      onComplete();
    }
  };

  // Prevent fast-forwarding
  const onStateChange = (event: YouTubeEvent) => {
    const player = event.target;
    
    // YouTube state 3 is buffering
    if (event.data === 3) {
      const currentTime = Math.floor(player.getCurrentTime());
      
      // If user tries to skip ahead (beyond what they've watched + buffer margin)
      if (hasStarted && currentTime > currentTime + 10) {
        player.seekTo(currentTime, true);
        
        toast({
          title: "Skipping not allowed",
          description: "You must watch the entire video",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div ref={containerRef} className="mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            {description && <p className="text-gray-600 mb-4">{description}</p>}
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-sm font-medium">
                  {Math.floor(currentTime / 60)}:{String(currentTime % 60).padStart(2, '0')} / 
                  {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
                </span>
              </div>
              
              {isCompleted ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-sm font-medium">{progress}% complete</span>
                </div>
              )}
            </div>
            
            <Progress value={progress} className="h-2 mb-4" />
            
            {!isInView && isPlaying && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                <div>
                  <p className="text-yellow-700 font-medium">Video paused</p>
                  <p className="text-yellow-600 text-sm">You must keep the video visible to continue training</p>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 border rounded-md">
              <YouTube
                videoId={videoId}
                opts={opts}
                onReady={onReady}
                onPlay={onPlay}
                onPause={onPause}
                onEnd={onEnd}
                onStateChange={onStateChange}
                className="w-full rounded-md overflow-hidden"
              />
            </div>
            
            {!isCompleted && progress < 95 && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 mb-2">
                  You must watch at least 95% of the video to complete this module
                </p>
                <Button disabled={true} className="opacity-50">
                  Mark as Complete ({progress}%)
                </Button>
              </div>
            )}
            
            {isCompleted && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => playerRef.current?.playVideo()}>
                  Review Video
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}