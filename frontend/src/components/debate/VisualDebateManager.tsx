import React from 'react';
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

    // Render the selected visualization
    const renderVisualization = () => {
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