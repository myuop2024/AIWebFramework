import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ThreeBarChartProps {
  data: DataPoint[];
  height?: number;
  width?: number;
  title?: string;
}

export function ThreeBarChart({ 
  data, 
  height = 300, 
  width = 600,
  title = 'Statistics'
}: ThreeBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const barsRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number | null>(null);
  
  // Default colors for bars
  const defaultColors = ['#4F46E5', '#0EA5E9', '#10B981', '#EC4899', '#8B5CF6', '#F59E0B'];
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Add directional light to create shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 1);
    scene.add(directionalLight);
    
    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      40,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 3, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Create a group for all bars
    const barsGroup = new THREE.Group();
    scene.add(barsGroup);
    barsRef.current = barsGroup;
    
    // Create a floor plane
    const floorGeometry = new THREE.PlaneGeometry(6, 3);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Lay flat
    floor.position.y = -0.01; // Just below the base
    scene.add(floor);
    
    // Add grid lines to the floor
    const gridHelper = new THREE.GridHelper(6, 12, 0xcccccc, 0xdddddd);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    
    // Animation function
    const animate = () => {
      // Rotate the entire scene slightly for 3D effect
      if (barsRef.current) {
        barsRef.current.rotation.y += 0.002;
      }
      
      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    };
    
    // Handle window resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Start animation
    animate();
    
    // Cleanup
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current) {
        if (containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }
      
      // Clean up objects from the scene
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) {
            object.geometry.dispose();
          }
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => {
                material.dispose();
              });
            } else {
              object.material.dispose();
            }
          }
        }
      });
    };
  }, [height, width]);
  
  // Update bars when data changes
  useEffect(() => {
    if (!barsRef.current || !sceneRef.current) return;
    
    // Clear existing bars
    while (barsRef.current.children.length > 0) {
      const bar = barsRef.current.children[0];
      if ((bar as THREE.Mesh).geometry) {
        ((bar as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
      }
      if ((bar as THREE.Mesh).material) {
        ((bar as THREE.Mesh).material as THREE.Material).dispose();
      }
      barsRef.current.remove(bar);
    }
    
    // Find maximum value for normalization
    const maxValue = Math.max(...data.map(item => item.value), 1);
    
    // Calculate total width needed
    const barWidth = 0.4;
    const spacing = 0.2;
    const totalWidth = data.length * (barWidth + spacing) - spacing;
    
    // Create bars for each data point
    data.forEach((item, index) => {
      // Calculate normalized height (1-2 range)
      const normalizedHeight = (item.value / maxValue) * 2 + 0.05;
      
      // Calculate x position to center the bars
      const x = index * (barWidth + spacing) - totalWidth / 2;
      
      // Get color (either provided or from defaults)
      const color = item.color || defaultColors[index % defaultColors.length];
      
      // Create bar geometry and material
      const barGeometry = new THREE.BoxGeometry(barWidth, normalizedHeight, barWidth);
      const barMaterial = new THREE.MeshPhongMaterial({ 
        color: new THREE.Color(color),
        shininess: 80
      });
      
      // Create mesh and position it
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.set(x, normalizedHeight / 2, 0);
      
      // Add to bars group
      barsRef.current.add(bar);
      
      // Add label (not implemented here, would need text sprites)
    });
    
  }, [data]);
  
  return (
    <div className="flex flex-col">
      {title && (
        <h3 className="text-center font-medium text-lg mb-2">{title}</h3>
      )}
      <div 
        ref={containerRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          margin: '0 auto',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      />
      
      {/* Simple legend */}
      <div className="flex flex-wrap justify-center mt-4 gap-3">
        {data.map((item, i) => (
          <div key={item.label} className="flex items-center">
            <div 
              className="w-3 h-3 mr-1 rounded-sm" 
              style={{ backgroundColor: item.color || defaultColors[i % defaultColors.length] }} 
            />
            <span className="text-sm text-gray-700">{item.label}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}