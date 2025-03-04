// types/debateTypes.ts
interface User {
    id: string;
    username: string;
    profileImage?: string;
}

interface Argument {
    id: string;
    content: string;
    type: 'pro' | 'con';
    author: User;
    parentId?: string;
    replies?: Argument[];
    votes: number;
    createdAt: Date;
}

interface Debate {
    id: string;
    topic: string;
    description: string;
    creator: User;
    status: 'active' | 'closed';
    viewMode: 'text' | 'visual';
    createdAt: Date;
    updatedAt: Date;
}