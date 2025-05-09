import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface BackgroundAnimationProps {
  color?: string;
  intensity?: number;
  speed?: number;
  count?: number;
  enabled?: boolean; // Prop to control if animation is running
  quality?: 'low' | 'medium' | 'high'; // Quality setting for performance
}

export function BackgroundAnimation({
  color = '#4F46E5',
  intensity = 0.2,
  speed = 0.5,
  count = 25, // Reduced default count
  enabled = true, // Default to enabled
  quality = 'medium' // Default quality
}: BackgroundAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameIdRef = useRef<number | null>(null);
  
  // Quality-based settings
  const qualitySettings = useMemo(() => {
    switch(quality) {
      case 'low':
        return {
          pixelRatio: Math.min(window.devicePixelRatio, 1),
          particleCount: Math.max(10, Math.floor(count * 0.5)),
          antialias: false,
          updateEveryNthFrame: 2,
          skipAnimation: window.innerWidth < 768 // Skip on mobile for low quality
        };
      case 'high':
        return {
          pixelRatio: window.devicePixelRatio,
          particleCount: count,
          antialias: true,
          updateEveryNthFrame: 1,
          skipAnimation: false
        };
      case 'medium':
      default:
        return {
          pixelRatio: Math.min(window.devicePixelRatio, 1.5),
          particleCount: Math.floor(count * 0.8),
          antialias: false,
          updateEveryNthFrame: 1,
          skipAnimation: false
        };
    }
  }, [quality, count]);

  // Only initialize if enabled
  useEffect(() => {
    if (!containerRef.current || !enabled || (qualitySettings.skipAnimation)) return;
    
    // Convert hex color to THREE.Color
    const threeColor = new THREE.Color(color);
    
    // Setup
    const scene = new THREE.Scene();
    
    // Create a camera with a wider field of view
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 20;
    
    // Setup renderer with transparency and quality-based pixel ratio
    const pixelRatio = qualitySettings.pixelRatio; 
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: qualitySettings.antialias,
      powerPreference: 'low-power' // Request low-power mode for better performance
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent background
    
    // Add canvas to container
    containerRef.current.appendChild(renderer.domElement);
    
    // Create particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesMaterial = new THREE.PointsMaterial({
      color: threeColor,
      size: 0.1,
      transparent: true,
      opacity: intensity,
      sizeAttenuation: true
    });
    
    // Create particle positions
    const particleCount = count;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      // Spread particles across the scene
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 50; // x
      positions[i3 + 1] = (Math.random() - 0.5) * 50; // y
      positions[i3 + 2] = (Math.random() - 0.5) * 25; // z (smaller range for better performance)
      
      // Set random velocities (slower for better performance)
      velocities[i3] = (Math.random() - 0.5) * 0.03 * speed;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.03 * speed;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.03 * speed;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    // Create the particle system
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    // Store references
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    particlesRef.current = particles;
    
    // Define a lower frame rate for the animation (30fps target)
    const frameInterval = 1000 / 30; // ~33ms for 30fps
    let lastFrameTime = 0;
    
    // Animation function with throttling
    const animate = (currentTime: number) => {
      if (!particlesRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
        return;
      }
      
      frameIdRef.current = requestAnimationFrame(animate);
      
      // Skip frames to maintain target FPS
      if (currentTime - lastFrameTime < frameInterval) return;
      lastFrameTime = currentTime;
      
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      const velocities = particlesRef.current.geometry.attributes.velocity.array as Float32Array;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Update position based on velocity
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];
        
        // Boundary check and reverse direction if needed
        if (Math.abs(positions[i]) > 25) velocities[i] *= -1;
        if (Math.abs(positions[i + 1]) > 25) velocities[i + 1] *= -1;
        if (Math.abs(positions[i + 2]) > 25) velocities[i + 2] *= -1;
      }
      
      // Flag the positions for update
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
      
      // Slower rotation for better performance
      particlesRef.current.rotation.x += 0.0005;
      particlesRef.current.rotation.y += 0.0005;
      
      // Render the scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    animate(0);
    
    // Handle window resize with debouncing
    let resizeTimeout: number | null = null;
    const handleResize = () => {
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      
      resizeTimeout = window.setTimeout(() => {
        if (!cameraRef.current || !rendererRef.current) return;
        
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }, 200); // Debounce resize events
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup on unmount
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      if (particlesRef.current) {
        particlesRef.current.geometry.dispose();
        (particlesRef.current.material as THREE.Material).dispose();
      }
      
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
    };
  }, [color, intensity, speed, count, enabled]);

  return enabled ? (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  ) : null;
}