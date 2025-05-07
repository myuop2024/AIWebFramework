import { useEffect, useRef, useState } from 'react';
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
  enabled?: boolean; // New prop to enable/disable 3D rendering
}

// Fallback 2D chart when 3D is disabled
const TwoDBarChart = ({ data, width = 500, height = 300, title }: Omit<ThreeBarChartProps, 'enabled'>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate bar dimensions
    const maxValue = Math.max(...data.map(d => d.value));
    const barCount = data.length;
    const chartHeight = height - 60; // Leave space for labels
    const barWidth = (width - 60) / barCount * 0.8;
    const barGap = (width - 60) / barCount * 0.2;
    const startX = 30;
    
    // Draw bars
    data.forEach((dataPoint, index) => {
      const barHeight = (dataPoint.value / maxValue) * chartHeight;
      const x = startX + index * (barWidth + barGap);
      const y = height - barHeight - 40;
      
      // Draw bar
      ctx.fillStyle = dataPoint.color;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Draw border
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);
      
      // Draw label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(dataPoint.label, x + barWidth / 2, height - 25);
      ctx.fillText(dataPoint.value.toString(), x + barWidth / 2, height - 10);
    });
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(20, height - 40);
    ctx.lineTo(width - 20, height - 40);
    ctx.stroke();
    
  }, [data, width, height]);

  return (
    <div className="flex flex-col items-center">
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
};

export function ThreeBarChart({ 
  data, 
  width = 500, 
  height = 300,
  title,
  enabled = true // Default to enabled for backwards compatibility
}: ThreeBarChartProps) {
  // Use 2D fallback if 3D is disabled
  if (!enabled) {
    return <TwoDBarChart data={data} width={width} height={height} title={title} />;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);
  const frameIdRef = useRef<number | null>(null);
  const [isLowPerfDevice, setIsLowPerfDevice] = useState(false);
  
  // Check device performance once
  useEffect(() => {
    // Simple performance detection - could be enhanced
    const isLowPerf = window.navigator.hardwareConcurrency <= 4;
    setIsLowPerfDevice(isLowPerf);
  }, []);
  
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
      
      const pixelRatio = Math.min(window.devicePixelRatio, 1.5); // Cap pixel ratio
      const renderer = new THREE.WebGLRenderer({ 
        antialias: !isLowPerfDevice, // Disable antialiasing on low-perf devices
        powerPreference: 'low-power'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(pixelRatio);
      
      // Only enable shadows on high-performance devices
      if (!isLowPerfDevice) {
        renderer.shadowMap.enabled = true;
      }
      
      containerRef.current.appendChild(renderer.domElement);
      
      // Add lighting to the scene
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      // Use simple lighting on low-perf devices
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7);
      
      if (!isLowPerfDevice) {
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.mapSize.width = 512; // Reduced shadow map size
        directionalLight.shadow.mapSize.height = 512;
      }
      
      scene.add(directionalLight);
      
      // Add orbit controls with reduced sensitivity
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.enableZoom = true;
      controls.enablePan = false;
      controls.maxPolarAngle = Math.PI / 2.2;
      controls.rotateSpeed = 0.5; // Slower rotation for smoother performance
      
      // Create a floor plane (simpler on low-perf devices)
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
      
      if (!isLowPerfDevice) {
        floor.receiveShadow = true;
      }
      
      scene.add(floor);
      
      // Add grid helper (only for high-perf devices)
      if (!isLowPerfDevice) {
        const gridHelper = new THREE.GridHelper(30, 15, 0xaaaaaa, 0xdedede); // Fewer grid lines
        gridHelper.position.y = 0;
        scene.add(gridHelper);
      }
      
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
        if (bar.geometry) bar.geometry.dispose();
        if (bar.material) {
          if (Array.isArray(bar.material)) {
            bar.material.forEach(m => m.dispose());
          } else {
            bar.material.dispose();
          }
        }
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
    
    // Shared geometries for better performance
    const barGeometry = new THREE.BoxGeometry(barWidth, 1, barDepth);
    
    data.forEach((dataPoint, index) => {
      const normalizedValue = dataPoint.value / maxValue * 7; // Scale height to max 7 units
      const barHeight = Math.max(normalizedValue, 0.1); // Minimum height for visibility
      
      // Create material with color
      const barMaterial = new THREE.MeshStandardMaterial({
        color: dataPoint.color || Math.random() * 0xffffff,
        roughness: 0.5,
        metalness: 0.2,
      });
      
      // Create mesh and position
      const barMesh = new THREE.Mesh(barGeometry, barMaterial);
      barMesh.scale.y = barHeight; // Scale instead of creating new geometry
      barMesh.position.x = startX + index * (barWidth + barGap);
      barMesh.position.y = barHeight / 2; // Position from bottom to center
      
      if (!isLowPerfDevice) {
        barMesh.castShadow = true;
        barMesh.receiveShadow = true;
      }
      
      // Add to scene and store reference
      scene.add(barMesh);
      barsRef.current.push(barMesh);
      
      // Add simplified label for the bar (shared plane geometry)
      const textCanvas = document.createElement('canvas');
      const ctx = textCanvas.getContext('2d');
      if (ctx) {
        textCanvas.width = 64; // Smaller canvas
        textCanvas.height = 32;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
        ctx.font = '12px Arial'; // Smaller font
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(dataPoint.label, textCanvas.width / 2, 14);
        ctx.fillText(dataPoint.value.toString(), textCanvas.width / 2, 28);
        
        const texture = new THREE.CanvasTexture(textCanvas);
        const labelMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
        
        // Reuse geometry for better performance
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
    
    // Frame timing variables for throttling
    const frameInterval = isLowPerfDevice ? 1000 / 24 : 1000 / 30; // 24fps for low-perf, 30fps for others
    let lastFrameTime = 0;
    
    // Animation loop to render the scene (with throttling)
    const animate = (currentTime: number) => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) {
        return;
      }
      
      // Throttle frame rate
      if (currentTime - lastFrameTime < frameInterval) return;
      lastFrameTime = currentTime;
      
      controlsRef.current.update();
      
      // Animate bars slightly (only if not a low-perf device)
      if (!isLowPerfDevice) {
        barsRef.current.forEach((bar, i) => {
          if (i % 2 === 0) { // Only actual bars, not labels
            bar.rotation.y += 0.002; // Slower rotation
          }
        });
      }
      
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    animate(0);
    
    // Cleanup on unmount
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [data, width, height, isLowPerfDevice]);
  
  // Handle window resize with debouncing
  useEffect(() => {
    let resizeTimeout: number | null = null;
    
    const handleResize = () => {
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      
      resizeTimeout = window.setTimeout(() => {
        if (!rendererRef.current || !cameraRef.current) return;
        
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }, 200); // Debounce for better performance
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height]);
  
  // Cleanup resources when component unmounts
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      if (barsRef.current.length > 0) {
        barsRef.current.forEach(bar => {
          if (bar.geometry) bar.geometry.dispose();
          if (bar.material) {
            if (Array.isArray(bar.material)) {
              bar.material.forEach(m => m.dispose());
            } else {
              bar.material.dispose();
            }
          }
        });
      }
    };
  }, []);
  
  return (
    <div className="flex flex-col items-center">
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <div ref={containerRef} style={{ width, height }} />
    </div>
  );
}