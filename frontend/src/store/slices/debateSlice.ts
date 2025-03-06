import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { User } from './authSlice';

export interface Argument {
    id: string;
    content: string;
    type: 'pro' | 'con';
    author: {
        id: string;
        username: string;
        profileImage?: string;
    };
    parentId?: string;
    replies?: Argument[];
    votes: number;
    createdAt: Date;
}

export interface Debate {
    id: string;
    topic: string;
    description: string;
    creator: {
        id: string;
        username: string;
        profileImage?: string;
    };
    status: 'active' | 'closed';
    viewMode: 'text' | 'visual';
    createdAt: Date;
    updatedAt: Date;
}

interface OnlineUser {
    userId: string;
    username: string;
}

interface TypingUser {
    userId: string;
    username: string;
}

interface DebateState {
    currentDebate: Debate | null;
    darguments: Argument[];
    onlineUsers: OnlineUser[];
    typingUsers: TypingUser[];
    isLoading: boolean;
    error: string | null;
}

const initialState: DebateState = {
    currentDebate: null,
    darguments: [],
    onlineUsers: [],
    typingUsers: [],
    isLoading: false,
    error: null
};

// Fetch debate by ID
export const fetchDebate = createAsyncThunk(
    'debate/fetchDebate',
    async (debateId: string, { rejectWithValue }) => {
        try {
            const debateResponse = await api.get(`/debates/${debateId}`);
            const argumentsResponse = await api.get(`/debates/${debateId}/arguments`);

            // Add viewMode property to debate (will be controlled locally)
            const debate = {
                ...debateResponse.data.debate,
                viewMode: 'text' as 'text' | 'visual'
            };

            return {
                debate,
                arguments: argumentsResponse.data || []
            };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch debate');
        }
    }
);

// Create a new debate
export const createDebate = createAsyncThunk(
    'debate/createDebate',
    async (
        debateData: { topic: string; description: string },
        { rejectWithValue }
    ) => {
        try {
            const response = await api.post('/debates', debateData);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create debate');
        }
    }
);

const debateSlice = createSlice({
    name: 'debate',
    initialState,
    reducers: {
        toggleViewMode(state, action: PayloadAction<'text' | 'visual'>) {
            if (state.currentDebate) {
                state.currentDebate.viewMode = action.payload;
            }
        },

        addArgument(state, action: PayloadAction<Argument>) {
            const newArgument = action.payload;

            // If this is a reply to another argument
            if (newArgument.parentId) {
                // Find the parent argument
                const parentIndex = state.darguments.findIndex(arg => arg.id === newArgument.parentId);

                if (parentIndex !== -1) {
                    // Initialize replies array if it doesn't exist
                    if (!state.darguments[parentIndex].replies) {
                        state.darguments[parentIndex].replies = [];
                    }

                    // Add to replies
                    state.darguments[parentIndex].replies!.push(newArgument);
                } else {
                    // If parent not found, add it to the main list (fallback)
                    state.darguments.push(newArgument);
                }
            } else {
                // Add as a top-level argument
                state.darguments.push(newArgument);
            }
        },

        updateArgument(state, action: PayloadAction<{ id: string, data: Partial<Argument> }>) {
            const { id, data } = action.payload;

            // First check top-level arguments
            const argIndex = state.darguments.findIndex(arg => arg.id === id);

            if (argIndex !== -1) {
                // Update the top-level argument
                state.darguments[argIndex] = { ...state.darguments[argIndex], ...data };
            } else {
                // Look for the argument in replies
                for (let i = 0; i < state.darguments.length; i++) {
                    if (state.darguments[i].replies) {
                        const replyIndex = state.darguments[i].replies!.findIndex(reply => reply.id === id);

                        if (replyIndex !== -1) {
                            // Update the reply
                            state.darguments[i].replies![replyIndex] = {
                                ...state.darguments[i].replies![replyIndex],
                                ...data
                            };
                            break;
                        }
                    }
                }
            }
        },

        deleteArgument(state, action: PayloadAction<string>) {
            const id = action.payload;

            // Delete from top-level arguments
            state.darguments = state.darguments.filter(arg => arg.id !== id);

            // Delete from replies
            for (let i = 0; i < state.darguments.length; i++) {
                if (state.darguments[i].replies) {
                    state.darguments[i].replies = state.darguments[i].replies!.filter(reply => reply.id !== id);
                }
            }
        },

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        addReply(_state, _action: PayloadAction<{
            parentId: string;
            content: string;
            type: 'pro' | 'con';
            author: User;
        }>) {
            // This is just a helper action that prepares arguments for socketService
            // The actual addition is handled by the addArgument action after the server responds
        },

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        voteOnArgument(_state, _action: PayloadAction<{ argumentId: string, value: 1 | 0 | -1 }>) {
            // This is just a helper action that prepares arguments for socketService
            // The actual update is handled by the updateArgument action after the server responds
        },

        addOnlineUser(state, action: PayloadAction<OnlineUser>) {
            const existingUser = state.onlineUsers.find(user => user.userId === action.payload.userId);
            if (!existingUser) {
                state.onlineUsers.push(action.payload);
            }
        },

        removeOnlineUser(state, action: PayloadAction<string>) {
            state.onlineUsers = state.onlineUsers.filter(user => user.userId !== action.payload);
        },

        setOnlineUsers(state, action: PayloadAction<OnlineUser[]>) {
            state.onlineUsers = action.payload;
        },

        setTypingUsers(state, action: PayloadAction<TypingUser[]>) {
            state.typingUsers = action.payload;
        },

        clearDebate(state) {
            state.currentDebate = null;
            state.darguments = [];
            state.onlineUsers = [];
            state.typingUsers = [];
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDebate.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchDebate.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentDebate = action.payload.debate;
                state.darguments = action.payload.arguments;
            })
            .addCase(fetchDebate.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(createDebate.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createDebate.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(createDebate.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    }
});

export const {
    toggleViewMode,
    addArgument,
    updateArgument,
    deleteArgument,
    addReply,
    voteOnArgument,
    addOnlineUser,
    removeOnlineUser,
    setOnlineUsers,
    setTypingUsers,
    clearDebate
} = debateSlice.actions;

export default debateSlice.reducer;