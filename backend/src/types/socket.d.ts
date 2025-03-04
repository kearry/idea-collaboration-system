import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

// Declare module augmentation for Socket.io
declare module 'socket.io' {
    // Add custom properties to Socket
    interface Socket {
        user?: {
            id: string;
            username: string;
            role: string;
        };
    }

    // Add custom properties to RemoteSocket after fetchSockets()
    interface RemoteSocket<EmitEvents = DefaultEventsMap, SocketData = any> {
        user?: {
            id: string;
            username: string;
            role: string;
        };
    }
}