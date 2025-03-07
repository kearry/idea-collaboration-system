declare module 'three/examples/jsm/controls/OrbitControls' {
    import { Camera, EventDispatcher, MOUSE, Renderer, Vector3 } from 'three';

    export class OrbitControls extends EventDispatcher {
        constructor(object: Camera, domElement?: HTMLElement);
        object: Camera;
        domElement: HTMLElement | Document;
        enabled: boolean;
        target: Vector3;
        minDistance: number;
        maxDistance: number;
        minZoom: number;
        maxZoom: number;
        minPolarAngle: number;
        maxPolarAngle: number;
        minAzimuthAngle: number;
        maxAzimuthAngle: number;
        enableDamping: boolean;
        dampingFactor: number;
        enableZoom: boolean;
        zoomSpeed: number;
        enableRotate: boolean;
        rotateSpeed: number;
        enablePan: boolean;
        panSpeed: number;
        screenSpacePanning: boolean;
        keyPanSpeed: number;
        autoRotate: boolean;
        autoRotateSpeed: number;
        enableKeys: boolean;
        keys: { LEFT: string; UP: string; RIGHT: string; BOTTOM: string };
        mouseButtons: { LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE };
        target0: Vector3;
        position0: Vector3;
        zoom0: number;
        update(): boolean;
        saveState(): void;
        reset(): void;
        dispose(): void;
        getPolarAngle(): number;
        getAzimuthalAngle(): number;
    }
}