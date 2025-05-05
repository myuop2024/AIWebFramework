import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Data point structure for charts
export interface DataPoint {
  label: string;
  value: number;
  color: string;
}

interface ThreeBarChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  title?: string;
}

export function ThreeBarChart({ 
  data, 
  width = 500, 
  height = 300,
  title
}: ThreeBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);
  const frameIdRef = useRef<number | null>(null);
  
  // Initialize the chart when the component mounts or data changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize scene if it doesn't exist
    if (!sceneRef.current) {
      // Create Three.js scene, camera, renderer
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf8f9fa);
      
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 5, 15);
      
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      containerRef.current.appendChild(renderer.domElement);
      
      // Add lighting to the scene
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7);
      directionalLight.castShadow = true;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      scene.add(directionalLight);
      
      // Add orbit controls for interactive rotation
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.enableZoom = true;
      controls.enablePan = false;
      controls.maxPolarAngle = Math.PI / 2.2;
      
      // Create a floor plane
      const floorGeometry = new THREE.PlaneGeometry(30, 30);
      const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xf0f0f0,
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.1;
      floor.receiveShadow = true;
      scene.add(floor);
      
      // Add grid helper
      const gridHelper = new THREE.GridHelper(30, 30, 0xaaaaaa, 0xdedede);
      gridHelper.position.y = 0;
      scene.add(gridHelper);
      
      // Store references
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      controlsRef.current = controls;
    }
    
    // Clear any existing bars
    if (barsRef.current.length > 0) {
      barsRef.current.forEach(bar => {
        if (sceneRef.current) sceneRef.current.remove(bar);
      });
      barsRef.current = [];
    }
    
    if (!data.length || !sceneRef.current) return;
    
    // Find the maximum value for normalization
    const maxValue = Math.max(...data.map(d => d.value));
    
    // Create and position bars
    const scene = sceneRef.current;
    const barWidth = 1.5;
    const barGap = 0.5;
    const barDepth = 1;
    const totalWidth = data.length * (barWidth + barGap) - barGap;
    const startX = -totalWidth / 2 + barWidth / 2;
    
    data.forEach((dataPoint, index) => {
      const normalizedValue = dataPoint.value / maxValue * 7; // Scale height to max 7 units
      const barHeight = Math.max(normalizedValue, 0.1); // Minimum height for visibility
      
      // Create bar geometry
      const barGeometry = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
      
      // Create material with color and shininess
      const barMaterial = new THREE.MeshStandardMaterial({
        color: dataPoint.color || Math.random() * 0xffffff,
        roughness: 0.5,
        metalness: 0.2,
      });
      
      // Create mesh and position
      const barMesh = new THREE.Mesh(barGeometry, barMaterial);
      barMesh.position.x = startX + index * (barWidth + barGap);
      barMesh.position.y = barHeight / 2; // Position from bottom to center
      barMesh.castShadow = true;
      barMesh.receiveShadow = true;
      
      // Add to scene and store reference
      scene.add(barMesh);
      barsRef.current.push(barMesh);
      
      // Add label for the bar
      const textCanvas = document.createElement('canvas');
      const ctx = textCanvas.getContext('2d');
      if (ctx) {
        textCanvas.width = 128;
        textCanvas.height = 64;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(dataPoint.label, textCanvas.width / 2, 20);
        ctx.fillText(dataPoint.value.toString(), textCanvas.width / 2, 40);
        
        const texture = new THREE.CanvasTexture(textCanvas);
        const labelMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
        
        const labelGeometry = new THREE.PlaneGeometry(2, 1);
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.set(
          barMesh.position.x,
          -0.05, // Just below floor level
          barMesh.position.z + 1.5 // In front of the bar
        );
        labelMesh.rotation.x = -Math.PI / 2;
        scene.add(labelMesh);
        barsRef.current.push(labelMesh); // Add to reference for cleanup
      }
    });
    
    // Animation loop to render the scene
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) {
        return;
      }
      
      controlsRef.current.update();
      
      // Animate bars slightly (optional)
      barsRef.current.forEach((bar, i) => {
        if (i % 2 === 0) { // Only actual bars, not labels
          bar.rotation.y += 0.005;
        }
      });
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      frameIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Cleanup on unmount
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [data, width, height]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      
      rendererRef.current.setSize(width, height);
      if (cameraRef.current) {
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height]);
  
  return (
    <div className="flex flex-col items-center">
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <div ref={containerRef} style={{ width, height }} />
    </div>
  );
}