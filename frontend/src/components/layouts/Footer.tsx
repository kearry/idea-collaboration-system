import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                    <div className="mb-4 md:mb-0">
                        <h3 className="text-lg font-bold text-indigo-600">Idea Collaboration System</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            A platform for structured debates and idea exchange.
                        </p>
                    </div>
                    <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-6">
                        <Link to="/" className="text-sm text-gray-600 hover:text-indigo-600">
                            Home
                        </Link>
                        <Link to="/debates/create" className="text-sm text-gray-600 hover:text-indigo-600">
                            Create Debate
                        </Link>
                        <a href="https://github.com/yourusername/idea-collaboration-system"
                            className="text-sm text-gray-600 hover:text-indigo-600"
                            target="_blank"
                            rel="noopener noreferrer">
                            GitHub
                        </a>
                    </div>
                </div>
                <div className="mt-6 border-t border-gray-200 pt-6">
                    <p className="text-sm text-gray-500 text-center">
                        &copy; {new Date().getFullYear()} Idea Collaboration System. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;