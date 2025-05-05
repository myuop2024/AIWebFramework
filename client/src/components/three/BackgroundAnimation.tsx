import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BackgroundAnimationProps {
  color?: string;
  intensity?: number;
  speed?: number;
  count?: number;
}

export function BackgroundAnimation({
  color = '#4F46E5',
  intensity = 0.2,
  speed = 0.5,
  count = 50
}: BackgroundAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
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
    
    // Setup renderer with transparency
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
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
      positions[i3 + 2] = (Math.random() - 0.5) * 50; // z
      
      // Set random velocities
      velocities[i3] = (Math.random() - 0.5) * 0.05 * speed;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.05 * speed;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.05 * speed;
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
    
    // Animation function
    const animate = () => {
      if (!particlesRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
        return;
      }
      
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
      
      // Rotate the entire particle system slightly
      particlesRef.current.rotation.x += 0.001;
      particlesRef.current.rotation.y += 0.001;
      
      // Render the scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Continue the animation loop
      frameIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup on unmount
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      window.removeEventListener('resize', handleResize);
    };
  }, [color, intensity, speed, count]);

  return (
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
  );
}