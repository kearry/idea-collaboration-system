import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import debateReducer from './slices/debateSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        debate: debateReducer,
        notification: notificationReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these field paths in all actions
                ignoredActionPaths: ['payload.createdAt', 'payload.updatedAt'],
                // Ignore these paths in the state
                ignoredPaths: ['auth.user.createdAt', 'auth.user.updatedAt']
            }
        })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;