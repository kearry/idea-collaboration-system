import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import VisualizationSelector from './VisualizationSelector';
import ForceDirectedGraph from './visualizations/ForceDirectedGraph';
import HierarchicalTree from './visualizations/HierarchicalTree';
import RadialSunburst from './visualizations/RadialSunburst';
import ArgumentFlow from './visualizations/ArgumentFlow';
import ConceptMap from './visualizations/ConceptMap';
import DebateTimeline from './visualizations/DebateTimeline';
import LandscapeVisualization from './visualizations/LandscapeVisualization';

const VisualDebateManager: React.FC = () => {
    const { visualizationType } = useSelector((state: RootState) => state.debate);
    const [activeVisualization, setActiveVisualization] = useState<string>(visualizationType);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Track visualization type changes for loading states
    useEffect(() => {
        if (visualizationType !== activeVisualization) {
            setIsLoading(true);
            setErrorMessage(null);

            const timer = setTimeout(() => {
                setActiveVisualization(visualizationType);
                setIsLoading(false);
            }, 100); // Small delay to allow for clean unmounting

            return () => clearTimeout(timer);
        }
    }, [visualizationType, activeVisualization]);

    // Handle visualization errors
    const handleVisualizationError = (error: string) => {
        setErrorMessage(error);
    };

    // Render the selected visualization
    const renderVisualization = () => {
        // Show loading state while switching visualizations
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-64 w-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
                        <p className="mt-3 text-gray-600">Loading {activeVisualization} visualization...</p>
                    </div>
                </div>
            );
        }

        // Show error message if there was a problem
        if (errorMessage) {
            return (
                <div className="flex items-center justify-center h-64 w-full">
                    <div className="text-center bg-red-50 p-6 rounded-lg max-w-md">
                        <p className="text-red-600 mb-2">Visualization Error</p>
                        <p className="text-gray-700">{errorMessage}</p>
                        <p className="mt-4 text-sm text-gray-500">Try selecting a different visualization type.</p>
                    </div>
                </div>
            );
        }

        switch (visualizationType) {
            case 'hierarchical':
                return <HierarchicalTree />;
            case 'radial':
                return <RadialSunburst />;
            case 'flow':
                return <ArgumentFlow />;
            case 'concept-map':
                return <ConceptMap />;
            case 'timeline':
                return <DebateTimeline />;
            case '3d-landscape':
                return <LandscapeVisualization />;
            case 'force-directed':
            default:
                return <ForceDirectedGraph />;
        }
    };

    return (
        <div className="visual-debate-container">
            <VisualizationSelector />
            <div className="visualization-wrapper">
                {renderVisualization()}
            </div>
        </div>
    );
};

export default VisualDebateManager;