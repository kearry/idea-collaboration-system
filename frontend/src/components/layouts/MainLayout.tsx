import React from 'react';
import Header from '../layouts/Header';
import Footer from '../layouts/Footer';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow">
                {children}
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;