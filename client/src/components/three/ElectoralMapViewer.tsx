import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'; // Keep commented if types are missing
// For OrbitControls, if types are missing and it's loaded via script, use (THREE as any).OrbitControls or window.THREE.OrbitControls

// Polling station data type
interface PollingStation {
  id: number;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  status: 'active' | 'issue' | 'closed';
  issueCount: number;
}

interface ElectoralMapViewerProps {
  stationData: PollingStation[];
  width?: number;
  height?: number;
  onStationSelect?: (station: PollingStation) => void;
}

export function ElectoralMapViewer({ 
  stationData, 
  width = 600, 
  height = 400,
  onStationSelect
}: ElectoralMapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const mapRef = useRef<THREE.Mesh | null>(null);
  const markersRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const controlsRef = useRef<any | null>(null); // Changed OrbitControls to any
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const frameIdRef = useRef<number | null>(null);
  const [hoveredStation, setHoveredStation] = useState<PollingStation | null>(null);

  // Jamaica map bounds (approximate)
  const mapBounds = {
    north: 18.5,
    south: 17.7,
    east: -76.2,
    west: -78.4
  };

  const mapWidth = mapBounds.east - mapBounds.west;
  const mapHeight = mapBounds.north - mapBounds.south;
  const mapAspect = mapWidth / mapHeight;

  // Setup scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize scene if it doesn't exist
    if (!sceneRef.current) {
      // Create Three.js scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f8ff);

      // Create perspective camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 10, 12);

      // Add hemisphere light for better ambient lighting
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      scene.add(hemiLight);

      // Add directional light for shadows
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(5, 8, 7);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      scene.add(dirLight);


      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      containerRef.current.appendChild(renderer.domElement);

      // Create orbit controls for interactive view
      // Assuming OrbitControls is available on THREE object if imported globally or via addons
      const OrbitControls = (THREE as any).OrbitControls || (window as any).THREE?.OrbitControls;
      if (OrbitControls) {
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 5;
        controls.maxDistance = 20;
        controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent seeing below ground
        controls.target.set(0, 0, 0);
        controlsRef.current = controls;
      }

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      // Create detailed Jamaica map shape
      const jamaicaShape = new THREE.Shape();

      // Starting from western point
      jamaicaShape.moveTo(-5, 0);
      // North coast (west to east)
      jamaicaShape.bezierCurveTo(-4, 1, -2, 1.5, 0, 1.2);
      jamaicaShape.bezierCurveTo(2, 1, 4, 0.8, 5, 0.5);
      // East coast
      jamaicaShape.bezierCurveTo(5.2, 0, 5.1, -0.5, 4.8, -1);
      // South coast (east to west)
      jamaicaShape.bezierCurveTo(3, -1.2, 1, -1.5, -1, -1.3);
      jamaicaShape.bezierCurveTo(-3, -1, -4.5, -0.8, -5, -0.5);
      // Close the shape
      jamaicaShape.closePath();

      const extrudeSettings = {
        depth: 0.2,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 2,
        bevelSize: 0.1,
        bevelThickness: 0.1
      };

      const mapGeometry = new THREE.ExtrudeGeometry(jamaicaShape, extrudeSettings);
      const mapMaterial = new THREE.MeshStandardMaterial({ // Changed to MeshStandardMaterial
        color: 0x2E7D32, // Forest green
        metalness: 0.1,
        roughness: 0.8,
        side: THREE.DoubleSide
      });

      const map = new THREE.Mesh(mapGeometry, mapMaterial);
      map.rotation.x = -Math.PI / 2;
      map.receiveShadow = true;
      map.castShadow = true;
      scene.add(map);

      // Add water plane
      const waterGeometry = new THREE.PlaneGeometry(20, 20);
      const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x0288D1,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const water = new THREE.Mesh(waterGeometry, waterMaterial);
      water.rotation.x = -Math.PI / 2;
      water.position.y = -0.2;
      scene.add(water);

      // Store references
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      mapRef.current = map;

      // Add mouse event listeners
      renderer.domElement.addEventListener('mousemove', handleMouseMove);
      renderer.domElement.addEventListener('click', handleMouseClick);
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      if (sceneRef.current) {
        sceneRef.current.remove(marker);
      }
    });
    markersRef.current.clear();

    // Add polling station markers
    if (sceneRef.current && mapRef.current) {
      stationData.forEach(station => {
        // Convert geo coordinates to the scene coordinates
        const markerPos = geoToSceneCoords(station.coordinates.lat, station.coordinates.lng);

        // Create marker with color based on status
        const markerGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16);
        const markerColor = getMarkerColor(station.status, station.issueCount);
        const markerMaterial = new THREE.MeshStandardMaterial({ color: markerColor, metalness: 0.3, roughness: 0.4 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);

        // Position marker
        marker.position.set(markerPos.x, 0.25, markerPos.z); // y is half height of cylinder
        marker.userData = { stationId: station.id };
        marker.castShadow = true;

        // Add to scene and keep reference
        if (sceneRef.current) { // Added null check
          sceneRef.current.add(marker);
        }
        markersRef.current.set(station.id, marker);
      });
    }

    // Animation loop to render the scene
    const animate = () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !controlsRef.current) {
        return;
      }

      controlsRef.current.update();

      // Make markers pulse/rotate on hover
      markersRef.current.forEach((marker, stationId) => {
        if (hoveredStation && hoveredStation.id === stationId) {
          marker.rotation.y += 0.03;

          // Pulse effect
          const scale = 1 + 0.1 * Math.sin(Date.now() * 0.005);
          marker.scale.set(scale, 1, scale);
        } else {
          // Reset rotation and scale
          marker.rotation.y = 0;
          marker.scale.set(1, 1, 1);
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }

      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
        rendererRef.current.domElement.removeEventListener('click', handleMouseClick);
      }
    };
  }, [stationData, width, height, mapAspect, onStationSelect]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;

      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height]);

  // Mouse move handler for hover effects
  const handleMouseMove = (event: MouseEvent) => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / height) * 2 + 1;

    // Find intersections
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(Array.from(markersRef.current.values()), false);

    // Update hover state
    if (intersects.length > 0) {
      const stationId = intersects[0].object.userData.stationId;
      const station = stationData.find(s => s.id === stationId) || null;
      setHoveredStation(station);

      // Change cursor
      if (rendererRef.current.domElement) {
        rendererRef.current.domElement.style.cursor = 'pointer';
      }
    } else {
      setHoveredStation(null);

      // Reset cursor
      if (rendererRef.current?.domElement) {
        rendererRef.current.domElement.style.cursor = 'auto';
      }
    }
  };

  // Mouse click handler
  const handleMouseClick = (event: MouseEvent) => {
    if (!onStationSelect || !hoveredStation) return;
    onStationSelect(hoveredStation);
  };

  // Convert geographic coordinates to scene coordinates
  const geoToSceneCoords = (lat: number, lng: number) => {
    // Normalize coordinates to scene space
    const normalizedLng = (lng - mapBounds.west) / mapWidth - 0.5;
    const normalizedLat = (lat - mapBounds.south) / mapHeight - 0.5;

    // Scale to map size and flip z-axis (north is negative z)
    const x = normalizedLng * 10 * mapAspect;
    const z = -normalizedLat * 10;

    return { x, z };
  };

  // Get marker color based on status
  const getMarkerColor = (status: string, issueCount: number) => {
    switch (status) {
      case 'issue':
        // Color intensity based on issue count
        return issueCount > 3 ? 0xff0000 : 0xff7700; // Red or orange
      case 'closed':
        return 0x888888; // Gray
      case 'active':
      default:
        return 0x00cc00; // Green
    }
  };


  const createMapTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Background
      ctx.fillStyle = '#e0f0ff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Simplified Jamaica outline (very basic approximation)
      ctx.fillStyle = '#74c278';
      ctx.beginPath();

      // Draw simplified shape
      const points = [
        [122, 170], [150, 150], [200, 150], [280, 170],
        [380, 200], [420, 240], [400, 300], [350, 330],
        [250, 350], [180, 330], [130, 280], [110, 220]
      ];

      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.closePath();
      ctx.fill();

      // Add some detail lines (rivers, roads)
      ctx.strokeStyle = '#3080b0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(200, 200);
      ctx.lineTo(280, 250);
      ctx.lineTo(320, 290);
      ctx.stroke();

      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(150, 200);
      ctx.lineTo(230, 220);
      ctx.lineTo(320, 250);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  return (
    <div className="relative">
      <div ref={containerRef} style={{ width, height }} />

      {/* Hover info display */}
      {hoveredStation && (
        <div 
          className="absolute top-0 left-0 bg-white/90 border rounded shadow-md p-3"
          style={{ 
            maxWidth: '40%',
            pointerEvents: 'none'
          }}
        >
          <h3 className="font-bold text-sm">{hoveredStation.name}</h3>
          <div className="text-xs flex space-x-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full ${
              hoveredStation.status === 'issue' 
                ? 'bg-red-100 text-red-700' 
                : hoveredStation.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
            }`}>
              {hoveredStation.status === 'issue' 
                ? `${hoveredStation.issueCount} Issue${hoveredStation.issueCount !== 1 ? 's' : ''}` 
                : hoveredStation.status.charAt(0).toUpperCase() + hoveredStation.status.slice(1)}
            </span>
            <span className="text-gray-500">
              ({hoveredStation.coordinates.lat.toFixed(4)}, {hoveredStation.coordinates.lng.toFixed(4)})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}