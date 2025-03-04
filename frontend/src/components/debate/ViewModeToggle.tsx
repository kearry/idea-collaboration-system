// components/debate/ViewModeToggle.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleViewMode } from '../../store/slices/debateSlice';
import { RootState } from '../../store/store';

const ViewModeToggle: React.FC = () => {
    const dispatch = useDispatch();
    const viewMode = useSelector((state: RootState) =>
        state.debate.currentDebate?.viewMode || 'text'
    );

    return (
        <div className="flex items-center bg-gray-100 p-1 rounded-md shadow-sm">
            <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2
          ${viewMode === 'text'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'}`}
                onClick={() => dispatch(toggleViewMode('text'))}
                aria-label="Switch to text view"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2h1v1H4v-1h1v-2H4v-1h16v1h-1z" clipRule="evenodd" />
                </svg>
                <span>Text View</span>
            </button>

            <button
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2
          ${viewMode === 'visual'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'}`}
                onClick={() => dispatch(toggleViewMode('visual'))}
                aria-label="Switch to visual view"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
                <span>Visual View</span>
            </button>
        </div>
    );
};

export default ViewModeToggle;