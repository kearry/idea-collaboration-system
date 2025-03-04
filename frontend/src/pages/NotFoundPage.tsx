import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center">
            <div className="max-w-md mx-auto text-center">
                <h1 className="text-9xl font-extrabold text-indigo-600">404</h1>
                <h2 className="text-2xl font-bold text-gray-900 mt-4">Page Not Found</h2>
                <p className="mt-3 text-gray-600">
                    Sorry, we couldn't find the page you're looking for.
                </p>
                <div className="mt-6">
                    <Link
                        to="/"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Go back home
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;