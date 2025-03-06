import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { setVisualizationType } from '../../store/slices/debateSlice';

// Visualization options
export type VisualizationType =
    'force-directed' |
    'hierarchical' |
    'radial' |
    'flow' |
    'concept-map' |
    'timeline' |
    '3d-landscape';

const VisualizationSelector: React.FC = () => {
    const dispatch = useDispatch();
    const visualizationType = useSelector(
        (state: RootState) => state.debate.visualizationType || 'force-directed'
    );

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch(setVisualizationType(e.target.value as VisualizationType));
    };

    return (
        <div className="mb-4 flex items-center">
            <label htmlFor="visualization-type" className="mr-2 text-sm font-medium text-gray-700">
                Visualization Type:
            </label>
            <select
                id="visualization-type"
                value={visualizationType}
                onChange={handleChange}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
                <option value="force-directed">Force-Directed Graph</option>
                <option value="hierarchical">Hierarchical Tree</option>
                <option value="radial">Radial/Sunburst</option>
                <option value="flow">Argument Flow</option>
                <option value="concept-map">Concept Map</option>
                <option value="timeline">Timeline</option>
                <option value="3d-landscape">3D Landscape</option>
            </select>
        </div>
    );
};

export default VisualizationSelector;