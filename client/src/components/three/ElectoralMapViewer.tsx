import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface StationData {
  id: number;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: string;
  issueCount: number;
}

interface ElectoralMapViewerProps {
  stationData?: StationData[];
  height?: number;
  width?: number;
}

export function ElectoralMapViewer({ 
  stationData = [], 
  height = 300, 
  width = 600 
}: ElectoralMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const mapRef = useRef<THREE.Mesh | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      45,
      width / height,
      0.1,
      1000
    );
    camera.position.set(0, 4, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Create base map (simplified model of a country/region)
    const mapGeometry = new THREE.PlaneGeometry(5, 3);
    const mapMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b,
      side: THREE.DoubleSide,
      metalness: 0.2,
      roughness: 0.8
    });
    const map = new THREE.Mesh(mapGeometry, mapMaterial);
    map.rotation.x = -Math.PI / 2; // Lay flat
    scene.add(map);
    mapRef.current = map;
    
    // Create a group to hold all markers
    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersRef.current = markersGroup;
    
    // Animation function
    const animate = () => {
      // Slowly rotate the map
      if (mapRef.current) {
        mapRef.current.rotation.z += 0.002;
      }
      
      // Render the scene
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
      
      if (mapRef.current) {
        if (mapRef.current.geometry) {
          mapRef.current.geometry.dispose();
        }
        if (mapRef.current.material) {
          (mapRef.current.material as THREE.Material).dispose();
        }
        sceneRef.current?.remove(mapRef.current);
      }
    };
  }, [height, width]);
  
  // Update markers when station data changes
  useEffect(() => {
    if (!markersRef.current || !sceneRef.current) return;
    
    // Clear existing markers
    while (markersRef.current.children.length > 0) {
      const marker = markersRef.current.children[0];
      if (marker.geometry) {
        (marker as any).geometry.dispose();
      }
      if (marker.material) {
        ((marker as any).material as THREE.Material).dispose();
      }
      markersRef.current.remove(marker);
    }
    
    // Add markers for each station
    stationData.forEach((station) => {
      // Simplified coordinate conversion to fit our map
      // In a real implementation, this would use proper geo projection
      const x = (station.coordinates.lng / 180) * 2.5;
      const z = (station.coordinates.lat / 90) * 1.5;
      
      // Determine color based on status/issues
      let color;
      if (station.status === "issue" || station.issueCount > 0) {
        color = 0xff3a30; // Red for stations with issues
      } else if (station.status === "active") {
        color = 0x34c759; // Green for active stations
      } else {
        color = 0x8e8e93; // Gray for inactive stations
      }
      
      // Create marker geometry (sphere)
      const markerGeometry = new THREE.SphereGeometry(
        0.05 + (station.issueCount * 0.01), // Size based on issues
        16,
        16
      );
      const markerMaterial = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      
      // Position the marker
      marker.position.set(x, 0.1, z);
      
      // Add to markers group
      markersRef.current.add(marker);
      
      // Add station label (not implemented here, would require text sprites)
    });
    
  }, [stationData]);
  
  return (
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
  );
}