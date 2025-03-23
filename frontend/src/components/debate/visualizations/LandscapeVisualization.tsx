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
    const hasInitializedRef = useRef<boolean>(false);
    const mountedRef = useRef<boolean>(true);
    const isDraggingRef = useRef<boolean>(false);

    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(450);
    const [selectedArgument, setSelectedArgument] = useState<Argument | null>(null);
    const [highlightedPoint, setHighlightedPoint] = useState<THREE.Mesh | null>(null);
    const [argumentPoints, setArgumentPoints] = useState<ArgumentPoint[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    // Get debate data from Redux
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

    // Check for WebGL support
    const checkWebGLSupport = useCallback((): boolean => {
        try {
            const canvas = document.createElement('canvas');
            return !!(
                window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch (e) {
            return false;
        }
    }, []);

    // Clean up Three.js resources
    const cleanupThreeJS = useCallback(() => {
        // Cancel animation frame
        if (frameIdRef.current !== null) {
            cancelAnimationFrame(frameIdRef.current);
            frameIdRef.current = null;
        }

        // Clean up controls
        if (controlsRef.current) {
            controlsRef.current.dispose();
            controlsRef.current = null;
        }

        // Clean up scene objects
        if (sceneRef.current) {
            // Dispose of all geometries and materials
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
            // Clear the scene
            sceneRef.current = null;
        }

        // Dispose of the renderer
        if (rendererRef.current) {
            rendererRef.current.dispose();
            if (rendererRef.current.domElement) {
                try {
                    rendererRef.current.forceContextLoss();
                } catch (e) {
                    console.warn("Could not force context loss:", e);
                }
            }
            rendererRef.current = null;
        }

        // Clear terrain reference
        terrainRef.current = null;

        // Reset initialization flag
        hasInitializedRef.current = false;
    }, []);

    // Set up mounted ref for checking if component is still mounted
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupThreeJS();
        };
    }, [cleanupThreeJS]);

    // Update dimensions based on container size
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const newWidth = containerRef.current.clientWidth;
                setWidth(newWidth);
                setHeight(450);

                if (rendererRef.current && cameraRef.current) {
                    rendererRef.current.setSize(newWidth, 450);
                    cameraRef.current.aspect = newWidth / 450;
                    cameraRef.current.updateProjectionMatrix();
                }
            }
        };

        updateDimensions();

        const handleResize = () => {
            updateDimensions();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Initialize and manage the 3D scene
    useEffect(() => {
        if (!containerRef.current || hasInitializedRef.current) return;

        console.log("Initializing Three.js scene");
        setIsInitializing(true);

        // Check WebGL support first
        if (!checkWebGLSupport()) {
            setErrorMessage('Your browser does not support WebGL, which is required for the 3D visualization.');
            setIsInitializing(false);
            return;
        }

        try {
            // Set up scene
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf3f4f6);
            sceneRef.current = scene;

            // Set up camera
            const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
            camera.position.set(0, 25, 25);
            camera.lookAt(0, 0, 0);
            cameraRef.current = camera;

            // Create canvas element
            const canvas = document.createElement('canvas');
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = '100%';

            // Set up renderer with new canvas
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                canvas: canvas,
                alpha: true
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            rendererRef.current = renderer;

            // Clear container and append canvas
            while (containerRef.current.firstChild) {
                containerRef.current.removeChild(containerRef.current.firstChild);
            }

            // Important: Append canvas to container
            containerRef.current.appendChild(canvas);
            console.log("Canvas appended to container");

            // Set up lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(30, 50, 30);
            directionalLight.castShadow = true;
            scene.add(directionalLight);

            // Add a hemisphere light for more natural lighting
            const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
            scene.add(hemisphereLight);

            // Set up controls - THIS IS CRITICAL FOR MOUSE INTERACTION
            const controls = new OrbitControls(camera, canvas);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.maxPolarAngle = Math.PI / 2 - 0.1;
            controls.minDistance = 5;
            controls.maxDistance = 50;
            controls.enablePan = true;
            controls.enableZoom = true;
            controls.enableRotate = true;
            controls.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            };
            controlsRef.current = controls;
            console.log("OrbitControls initialized");

            // Event listeners
            const handleMouseMove = (event: MouseEvent) => {
                // Calculate normalized device coordinates (-1 to +1) for raycasting
                const rect = canvas.getBoundingClientRect();
                mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            };

            // Track mouse down/up to detect dragging
            const handleMouseDown = () => {
                isDraggingRef.current = false;
            };

            const handleMouseMove2 = () => {
                isDraggingRef.current = true;
            };

            const handleClick = () => {
                // Don't process click if it was a drag operation
                if (isDraggingRef.current) {
                    isDraggingRef.current = false;
                    return;
                }

                const currentHighlightedPoint = highlightedPoint;
                if (!currentHighlightedPoint) {
                    setSelectedArgument(null);
                    return;
                }

                // Find the argument that corresponds to the highlighted point
                const pointData = argumentPoints.find(p =>
                    p.id === (currentHighlightedPoint as any)?.userData?.id
                );

                if (pointData) {
                    setSelectedArgument(pointData.argument);
                }
            };

            // Add event listeners to the canvas
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mousemove', handleMouseMove2);
            canvas.addEventListener('click', handleClick);
            console.log("Event listeners added");

            // Create the terrain and markers
            const points = mapArgumentsToPoints();
            setArgumentPoints(points);

            // Create terrain
            if (points.length > 0 && sceneRef.current) {
                console.log("Creating terrain with", points.length, "arguments");

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

                // Color the terrain based on height
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

                scene.add(terrain);
                terrainRef.current = terrain;
                console.log("Terrain added to scene");

                // Add marker points for each argument
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

                    // Add the marker to the scene
                    scene.add(marker);
                });
                console.log("Markers added to scene");
            }

            // Animation loop
            const animate = () => {
                if (!mountedRef.current) return;

                frameIdRef.current = requestAnimationFrame(animate);

                if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
                    return;
                }

                if (controlsRef.current) {
                    controlsRef.current.update();
                }

                // Handle raycasting for mouse interaction
                raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

                // Find intersected objects (only marker points, not the terrain)
                const intersects = raycasterRef.current.intersectObjects(
                    sceneRef.current.children.filter(obj =>
                        obj.userData && obj.userData.isMarker
                    )
                );

                // Reset previously highlighted point
                if (highlightedPoint && (!intersects.length || intersects[0].object !== highlightedPoint)) {
                    if ((highlightedPoint as any).userData?.originalMaterial) {
                        (highlightedPoint as THREE.Mesh).material = (highlightedPoint as any).userData.originalMaterial;
                    }
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

                // Render scene
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            };

            // Start animation
            animate();

            // Set flag to avoid re-initialization
            hasInitializedRef.current = true;
            setIsInitializing(false);
            setErrorMessage(null);
            console.log("Three.js initialization complete");

            // Return cleanup function
            return () => {
                console.log("Cleaning up Three.js resources");
                canvas.removeEventListener('mousemove', handleMouseMove);
                canvas.removeEventListener('mousedown', handleMouseDown);
                canvas.removeEventListener('mousemove', handleMouseMove2);
                canvas.removeEventListener('click', handleClick);

                // Only clean up if still mounted to avoid errors
                if (mountedRef.current) {
                    cleanupThreeJS();
                }
            };
        } catch (err) {
            console.error('Error initializing Three.js scene:', err);
            setErrorMessage(`Failed to initialize 3D visualization: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsInitializing(false);
            cleanupThreeJS();
        }
    }, [width, height, checkWebGLSupport, cleanupThreeJS, mapArgumentsToPoints, darguments, argumentPoints, highlightedPoint]);

    return (
        <div className="relative w-full">
            {/* Container div for Three.js canvas */}
            <div
                ref={containerRef}
                className="border border-gray-200 rounded-lg bg-white w-full"
                style={{ height: `${height}px`, position: 'relative' }}
            />

            {/* Loading indicator */}
            {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-70 z-10">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
                        <p className="mt-3 text-gray-600">Initializing 3D view...</p>
                    </div>
                </div>
            )}

            {/* Error message */}
            {errorMessage && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="text-center p-6 max-w-md">
                        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                            <p>{errorMessage}</p>
                        </div>
                        <p className="text-gray-600">
                            Try using a different visualization type or check console for more details.
                        </p>
                    </div>
                </div>
            )}

            {/* Selected argument detail panel */}
            {selectedArgument && (
                <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-4 w-64 z-20">
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