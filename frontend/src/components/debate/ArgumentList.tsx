import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { Argument } from '../../store/slices/debateSlice';
import { socketService } from '../../services/socketService';
import ArgumentCard from './ArgumentCard';

interface ArgumentsListProps {
    currentUser: {
        id: string;
        username: string;
    } | null;
}

const ArgumentsList: React.FC<ArgumentsListProps> = ({ currentUser }) => {
    const { id: debateId } = useParams<{ id: string }>();
    const [filter, setFilter] = useState<'all' | 'pro' | 'con'>('all');
    const darguments = useSelector((state: RootState) => state.debate.darguments);

    // Apply filter to arguments
    const filteredArguments = darguments.filter((arg) => {
        if (filter === 'all') return true;
        return arg.type === filter;
    });

    return (
        <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex space-x-4 mb-4">
                <button
                    className={`flex-1 py-2 px-4 border rounded-md shadow-sm text-sm font-medium ${filter === 'all'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    onClick={() => setFilter('all')}
                >
                    All Arguments
                </button>
                <button
                    className={`flex-1 py-2 px-4 border rounded-md shadow-sm text-sm font-medium ${filter === 'pro'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    onClick={() => setFilter('pro')}
                >
                    Supporting
                </button>
                <button
                    className={`flex-1 py-2 px-4 border rounded-md shadow-sm text-sm font-medium ${filter === 'con'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    onClick={() => setFilter('con')}
                >
                    Opposing
                </button>
            </div>

            {/* Arguments */}
            {filteredArguments.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                    <p className="text-gray-600">
                        {filter === 'all'
                            ? 'No arguments have been added to this debate yet.'
                            : filter === 'pro'
                                ? 'No supporting arguments have been added yet.'
                                : 'No opposing arguments have been added yet.'}
                    </p>
                    {currentUser && (
                        <button
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                            onClick={() => {
                                // Open new argument form
                                document.getElementById('new-argument-form')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            Add the First Argument
                        </button>
                    )}
                </div>
            ) : (
                filteredArguments.map((argument) => (
                    <ArgumentCard
                        key={argument.id}
                        argument={argument}
                        currentUser={currentUser}
                        debateId={debateId || ''}
                    />
                ))
            )}
        </div>
    );
};

export default ArgumentsList;