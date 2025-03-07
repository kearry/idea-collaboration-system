import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Argument } from '../../../store/slices/debateSlice';

interface Coordinate {
    x: number;
    z: number;
}

interface ArgumentPoint {
    id: string;
    height: number;
    type: 'pro' | 'con';
    position: Coordinate;
    argument: Argument;
}

const LandscapeVisualization: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const terrainRef = useRef<THREE.Mesh | null>(null);
    const frameIdRef = useRef<number | null>(null);
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(450);
    const [selectedArgument, setSelectedArgument] = useState<Argument | null>(null);
    const [highlightedPoint, setHighlightedPoint] = useState<THREE.Mesh | null>(null);
    const [argumentPoints, setArgumentPoints] = useState<ArgumentPoint[]>([]);

    // Get debate data from Redux
    const debate = useSelector((state: RootState) => state.debate.currentDebate);
    const darguments = useSelector((state: RootState) => state.debate.darguments);

    // Map arguments to terrain points
    const mapArgumentsToPoints = useCallback(() => {
        if (!darguments.length) return [];

        const points: ArgumentPoint[] = [];
        const gridSize = Math.ceil(Math.sqrt(darguments.length * 2)); // Ensure enough space

        // Helper to get a pseudo-random but stable position
        const getStablePosition = (id: string, index: number): Coordinate => {
            // Use a hash function to get stable positions
            const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const hashFactor = hash / 1000;

            // Create a grid layout with some randomness
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;

            return {
                x: (col - gridSize / 2) * 5 + hashFactor * 2,
                z: (row - gridSize / 2) * 5 + (hash % 10) / 2
            };
        };

        // Add top-level arguments
        darguments.forEach((arg, index) => {
            // Calculate height based on votes - more votes = higher terrain
            const height = 2 + (arg.votes / 10);

            points.push({
                id: arg.id,
                height,
                type: arg.type,
                position: getStablePosition(arg.id, index),
                argument: arg
            });

            // Add replies as smaller hills/valleys nearby
            if (arg.replies && arg.replies.length > 0) {
                arg.replies.forEach((reply, replyIndex) => {
                    const replyHeight = 1 + (reply.votes / 15);
                    const angle = (replyIndex / arg.replies!.length) * Math.PI * 2;
                    const parentPos = getStablePosition(arg.id, index);

                    // Position replies in a circle around the parent
                    const replyPos: Coordinate = {
                        x: parentPos.x + Math.cos(angle) * 2.5,
                        z: parentPos.z + Math.sin(angle) * 2.5
                    };

                    points.push({
                        id: reply.id,
                        height: replyHeight,
                        type: reply.type,
                        position: replyPos,
                        argument: reply
                    });
                });
            }
        });

        return points;
    }, [darguments]);

    // Initialize and manage the 3D scene
    useEffect(() => {
        if (!containerRef.current) return;

        // Set up scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf3f4f6); // Light gray background
        sceneRef.current = scene;

        // Set up camera
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(0, 25, 25);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Set up renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        rendererRef.current = renderer;
        containerRef.current.appendChild(renderer.domElement);

        // Set up lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(30, 50, 30);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        scene.add(directionalLight);

        // Set up controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below the terrain
        controlsRef.current = controls;

        // Event listeners
        const handleMouseMove = (event: MouseEvent) => {
            // Calculate mouse position in normalized device coordinates
            const rect = renderer.domElement.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / width) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / height) * 2 + 1;
        };

        const handleClick = () => {
            if (!highlightedPoint) {
                setSelectedArgument(null);
                return;
            }

            // Find the argument that corresponds to the highlighted point
            const pointData = argumentPoints.find(p =>
                p.id === (highlightedPoint as any).userData.id
            );

            if (pointData) {
                setSelectedArgument(pointData.argument);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        renderer.domElement.addEventListener('click', handleClick);

        // Animation loop
        const animate = () => {
            frameIdRef.current = requestAnimationFrame(animate);

            if (controlsRef.current) {
                controlsRef.current.update();
            }

            // Handle raycasting for mouse interaction
            if (cameraRef.current && sceneRef.current) {
                raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

                // Find intersected objects (only marker points, not the terrain)
                const intersects = raycasterRef.current.intersectObjects(
                    sceneRef.current.children.filter(obj =>
                        obj.userData && obj.userData.isMarker
                    )
                );

                // Reset previously highlighted point
                if (highlightedPoint && (!intersects.length || intersects[0].object !== highlightedPoint)) {
                    (highlightedPoint as THREE.Mesh).material = (highlightedPoint as any).userData.originalMaterial;
                    setHighlightedPoint(null);
                }

                // Highlight newly intersected point
                if (intersects.length > 0 && intersects[0].object !== highlightedPoint) {
                    const point = intersects[0].object as THREE.Mesh;
                    setHighlightedPoint(point);

                    // Create highlight material
                    const highlightMaterial = new THREE.MeshStandardMaterial({
                        color: 0xFFFFFF,
                        emissive: 0xFFFFFF,
                        emissiveIntensity: 0.5
                    });

                    // Store original material if not already stored
                    if (!(point as any).userData.originalMaterial) {
                        (point as any).userData.originalMaterial = point.material;
                    }

                    // Apply highlight material
                    point.material = highlightMaterial;
                }
            }

            if (rendererRef.current && cameraRef.current && sceneRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };

        // Start animation
        animate();

        // Clean up
        return () => {
            if (frameIdRef.current !== null) {
                cancelAnimationFrame(frameIdRef.current);
            }

            if (rendererRef.current && rendererRef.current.domElement && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }

            window.removeEventListener('mousemove', handleMouseMove);
            if (rendererRef.current) {
                rendererRef.current.domElement.removeEventListener('click', handleClick);
            }

            // Clean up scene
            if (sceneRef.current) {
                sceneRef.current.traverse((object) => {
                    if (object instanceof THREE.Mesh) {
                        if (object.geometry) {
                            object.geometry.dispose();
                        }

                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => material.dispose());
                            } else {
                                object.material.dispose();
                            }
                        }
                    }
                });
            }
        };
    }, [width, height, argumentPoints]);

    // Update dimensions based on container size
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.clientWidth);
                setHeight(450);

                if (rendererRef.current && cameraRef.current) {
                    rendererRef.current.setSize(containerRef.current.clientWidth, 450);
                    cameraRef.current.aspect = containerRef.current.clientWidth / 450;
                    cameraRef.current.updateProjectionMatrix();
                }
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        return () => {
            window.removeEventListener('resize', updateDimensions);
        };
    }, []);

    // Process argument data and create the 3D landscape
    useEffect(() => {
        if (!sceneRef.current || !darguments.length) return;

        // Map arguments to points
        const points = mapArgumentsToPoints();
        setArgumentPoints(points);

        // Clear existing terrain and markers
        if (terrainRef.current) {
            sceneRef.current.remove(terrainRef.current);
        }

        if (sceneRef.current) {
            sceneRef.current.children = sceneRef.current.children.filter(
                obj => !(obj.userData && obj.userData.isMarker)
            );
        }

        // Create a base terrain
        const terrainSize = 50;
        const resolution = 128;
        const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, resolution - 1, resolution - 1);
        geometry.rotateX(-Math.PI / 2); // Make horizontal

        // Create height data for the terrain
        const vertices = geometry.attributes.position.array as Float32Array;

        // Initialize with a flat plane
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 1] = 0; // Y is height in this orientation
        }

        // Add hills/valleys for each argument
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];

            // Accumulate height influence from all points
            let totalHeight = 0;

            for (const point of points) {
                // Calculate distance-based influence
                const dx = x - point.position.x;
                const dz = z - point.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                // Create a bell curve falloff
                const influence = Math.exp(-(distance * distance) / 10);

                // Pro arguments create hills, con arguments create valleys
                const directedHeight = point.type === 'pro' ? point.height : -point.height;

                totalHeight += directedHeight * influence;
            }

            // Apply height to the vertex
            vertices[i + 1] = totalHeight;
        }

        // Update the geometry
        geometry.computeVertexNormals();

        // Create material
        const terrainMaterial = new THREE.MeshStandardMaterial({
            vertexColors: false,
            roughness: 0.8,
        });

        // Create the terrain mesh
        const terrain = new THREE.Mesh(geometry, terrainMaterial);
        terrain.receiveShadow = true;
        terrain.castShadow = true;

        if (sceneRef.current) {
            sceneRef.current.add(terrain);
            terrainRef.current = terrain;
        }

        // Color the terrain based on height
        const applyTerrainColors = () => {
            // Create a new color attribute
            const colors = new Float32Array(vertices.length);
            const colorAttribute = new THREE.BufferAttribute(colors, 3);
            geometry.setAttribute('color', colorAttribute);

            // Set colors based on height
            for (let i = 0; i < vertices.length; i += 3) {
                const height = vertices[i + 1];

                // Green for hills (pro arguments)
                // Red for valleys (con arguments)
                // Neutral gray for flat areas
                let r, g, b;

                if (height > 0.2) {
                    // Pro territory - green hues
                    const intensity = Math.min(1, height / 4);
                    r = 0.2;
                    g = 0.5 + intensity * 0.5;
                    b = 0.2;
                } else if (height < -0.2) {
                    // Con territory - red hues
                    const intensity = Math.min(1, -height / 4);
                    r = 0.5 + intensity * 0.5;
                    g = 0.2;
                    b = 0.2;
                } else {
                    // Neutral territory - light gray
                    r = g = b = 0.8;
                }

                colors[i] = r;
                colors[i + 1] = g;
                colors[i + 2] = b;
            }

            // Update the material to use vertex colors
            terrainMaterial.vertexColors = true;
            terrainMaterial.needsUpdate = true;
        };

        applyTerrainColors();

        // Add marker points for each argument
        if (sceneRef.current) { // Add null check here
            points.forEach(point => {
                // Calculate world position on the terrain
                const markerHeight = point.type === 'pro' ? point.height + 0.5 : -point.height + 0.5;

                // Create a marker geometry
                const markerGeometry = new THREE.SphereGeometry(0.4, 16, 16);

                // Create material based on argument type
                const markerMaterial = new THREE.MeshStandardMaterial({
                    color: point.type === 'pro' ? 0x10B981 : 0xEF4444,
                    roughness: 0.5,
                    metalness: 0.5,
                    emissive: point.type === 'pro' ? 0x10B981 : 0xEF4444,
                    emissiveIntensity: 0.2
                });

                // Create the marker mesh
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(point.position.x, markerHeight, point.position.z);
                marker.castShadow = true;
                marker.receiveShadow = true;

                // Add metadata for raycasting
                marker.userData = {
                    isMarker: true,
                    id: point.id,
                    type: point.type,
                    originalMaterial: markerMaterial
                };

                if (sceneRef.current) {
                    sceneRef.current.add(marker);
                }
            });
        }

    }, [darguments, mapArgumentsToPoints]);

    // Helper function to truncate text
    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <div className="relative">
            <div
                ref={containerRef}
                className="border border-gray-200 rounded-lg bg-white"
                style={{ height: `${height}px` }}
            />

            {/* Selected argument detail panel */}
            {selectedArgument && (
                <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-4 w-64">
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-gray-900">
                            {selectedArgument.type === 'pro' ? 'Supporting Argument' : 'Opposing Argument'}
                        </h3>
                        <button
                            onClick={() => setSelectedArgument(null)}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-2">
                        <p className="text-sm text-gray-600">{selectedArgument.content}</p>

                        <div className="mt-2">
                            <div className="flex items-center text-xs text-gray-500">
                                <span>By {selectedArgument.author.username}</span>
                                <span className="mx-1">•</span>
                                <span>Votes: {selectedArgument.votes}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="text-center text-sm text-gray-500 mt-2">
                <p>3D Debate Landscape - drag to rotate, scroll to zoom</p>
                <p>Green hills represent supporting arguments, red valleys represent opposing arguments</p>
                <p>Click on a colored sphere to view the argument details</p>
            </div>
        </div>
    );
};

export default LandscapeVisualization;