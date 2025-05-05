import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, RotateCcw, CheckCircle, AlertTriangle } from "lucide-react";
import YouTube, { YouTubePlayer, YouTubeProps, YouTubeEvent } from "react-youtube";

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
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [minWatchTimeReached, setMinWatchTimeReached] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Minimum watch time required (75% of the video or a fixed value)
  const minWatchTime = Math.min(duration * 0.75, duration - 30);
  
  // Setup the YouTube player
  const onReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    setPlayerReady(true);
  };
  
  // Handle player state changes
  const onStateChange = (event: YouTubeEvent) => {
    // 1 = playing, 2 = paused
    setIsPlaying(event.data === 1);
    
    // When video ends
    if (event.data === 0) {
      handleVideoComplete();
    }
  };
  
  // Setup video progress tracking
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isPlaying && playerReady) {
      timer = setInterval(() => {
        if (playerRef.current) {
          const current = Math.floor(playerRef.current.getCurrentTime());
          setCurrentTime(current);
          const progressPercent = Math.min(Math.floor((current / duration) * 100), 100);
          setProgress(progressPercent);
          
          // Check if minimum watch time has been reached
          if (current >= minWatchTime && !minWatchTimeReached) {
            setMinWatchTimeReached(true);
            toast({
              title: "Almost there!",
              description: "You've watched enough to receive credit. Finish the video to complete the module.",
            });
          }
        }
      }, 1000);
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isPlaying, playerReady, duration, minWatchTime, minWatchTimeReached, toast]);
  
  // Setup intersection observer to pause video when not visible
  useEffect(() => {
    if (videoRef.current) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(entry.isIntersecting);
          
          // Automatically pause video when scrolled out of view
          if (!entry.isIntersecting && playerRef.current && isPlaying) {
            playerRef.current.pauseVideo();
          }
        },
        { threshold: 0.5 }
      );
      
      observerRef.current.observe(videoRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isPlaying]);
  
  // Format seconds to mm:ss
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Handle play/pause
  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  };
  
  // Handle restart
  const handleRestart = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
    }
  };
  
  // Handle video completion
  const handleVideoComplete = () => {
    if (minWatchTimeReached && !isCompleted) {
      toast({
        title: "Module Completed!",
        description: "You've successfully completed this training module.",
      });
      onComplete();
    } else if (!minWatchTimeReached && !isCompleted) {
      toast({
        title: "Watch more of the video",
        description: `You need to watch at least ${Math.floor(minWatchTime / 60)} minutes to complete this module.`,
        variant: "destructive",
      });
    }
  };
  
  // Video player options
  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '450',
    playerVars: {
      // Add player parameters
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      fs: 1,
    },
  };
  
  // If the module is already completed, show a different UI
  if (isCompleted) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            {description && <p className="text-gray-600 mb-4">{description}</p>}
            
            <p className="text-green-600 font-medium mb-6">You have successfully completed this video module</p>
            
            <div className="max-w-xl mx-auto">
              <YouTube
                videoId={videoId}
                opts={opts}
                onReady={onReady}
                onStateChange={onStateChange}
              />
              
              <div className="mt-4 flex justify-center space-x-4">
                <Button variant="outline" onClick={togglePlay}>
                  {isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Play
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleRestart}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6" ref={videoRef}>
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        {description && <p className="text-gray-600 mb-4">{description}</p>}
        
        <div className="max-w-xl mx-auto">
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={onReady}
            onStateChange={onStateChange}
          />
          
          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            
            <div className="text-sm font-medium">
              {progress}% complete
            </div>
          </div>
          
          <Progress value={progress} className="h-2 mb-4" />
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button variant="outline" onClick={togglePlay}>
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restart
              </Button>
            </div>
            
            {!isVisible && (
              <div className="flex items-center text-amber-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span className="text-sm">Video paused because it's not in view</span>
              </div>
            )}
            
            <Button 
              disabled={!minWatchTimeReached}
              onClick={handleVideoComplete}
            >
              Complete Module
            </Button>
          </div>
          
          {!minWatchTimeReached && (
            <p className="text-sm text-gray-500 mt-4">
              You need to watch at least {Math.floor(minWatchTime / 60)} minutes of this video to complete the module.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}