import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import * as d3 from 'd3';
import { Argument } from '../../../store/slices/debateSlice';

interface SunburstNode {
    name: string;
    id: string;
    type: 'topic' | 'pro' | 'con';
    votes?: number;
    children?: SunburstNode[];
    value?: number;
    data?: any; // For storing original argument data
}

// Type for d3.hierarchy nodes after partition layout is applied
interface PartitionHierarchyNode extends d3.HierarchyRectangularNode<SunburstNode> {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
}

const RadialSunburst: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const debate = useSelector((state: RootState) => state.debate.currentDebate);
    const darguments = useSelector((state: RootState) => state.debate.darguments);

    const [selectedNode, setSelectedNode] = useState<SunburstNode | null>(null);
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);

    // Update dimensions based on container size
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.clientWidth);
                setHeight(450);
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);

        return () => {
            window.removeEventListener('resize', updateDimensions);
        };
    }, []);

    // Prepare hierarchical data for sunburst chart
    const prepareSunburstData = useCallback(() => {
        if (!debate) return null;

        // Create root node for topic
        const rootNode: SunburstNode = {
            id: 'center',
            name: debate.topic,
            type: 'topic',
            children: [],
            value: 0
        };

        // Function to get base value for an argument (used for sizing)
        const getBaseValue = (arg: Argument) => {
            // Base size plus votes
            return 1 + (arg.votes || 0);
        };

        // Add top-level pro arguments
        const proArguments = darguments.filter(arg => arg.type === 'pro');
        if (proArguments.length > 0) {
            const proNode: SunburstNode = {
                id: 'pro-group',
                name: 'Supporting',
                type: 'pro',
                children: []
            };

            proArguments.forEach(arg => {
                const argNode: SunburstNode = {
                    id: arg.id,
                    name: arg.content,
                    type: 'pro',
                    votes: arg.votes,
                    data: arg,
                    value: getBaseValue(arg)
                };

                // Add replies as children
                if (arg.replies && arg.replies.length > 0) {
                    argNode.children = [];
                    arg.replies.forEach(reply => {
                        argNode.children!.push({
                            id: reply.id,
                            name: reply.content,
                            type: reply.type,
                            votes: reply.votes,
                            data: reply,
                            value: getBaseValue(reply)
                        });
                    });
                }

                proNode.children!.push(argNode);
            });

            rootNode.children!.push(proNode);
        }

        // Add top-level con arguments
        const conArguments = darguments.filter(arg => arg.type === 'con');
        if (conArguments.length > 0) {
            const conNode: SunburstNode = {
                id: 'con-group',
                name: 'Opposing',
                type: 'con',
                children: []
            };

            conArguments.forEach(arg => {
                const argNode: SunburstNode = {
                    id: arg.id,
                    name: arg.content,
                    type: 'con',
                    votes: arg.votes,
                    data: arg,
                    value: getBaseValue(arg)
                };

                // Add replies as children
                if (arg.replies && arg.replies.length > 0) {
                    argNode.children = [];
                    arg.replies.forEach(reply => {
                        argNode.children!.push({
                            id: reply.id,
                            name: reply.content,
                            type: reply.type,
                            votes: reply.votes,
                            data: reply,
                            value: getBaseValue(reply)
                        });
                    });
                }

                conNode.children!.push(argNode);
            });

            rootNode.children!.push(conNode);
        }

        return rootNode;
    }, [debate, darguments]);

    // Create the sunburst visualization
    useEffect(() => {
        if (!svgRef.current || !debate) return;

        // Clear previous visualization
        d3.select(svgRef.current).selectAll('*').remove();

        const sunburstData = prepareSunburstData();
        if (!sunburstData) return;

        const svg = d3.select(svgRef.current);
        const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

        // Radius of the sunburst
        const radius = Math.min(width, height) / 2 - 20;

        // Create partition layout
        const partition = d3.partition<SunburstNode>()
            .size([2 * Math.PI, radius * radius]);

        // Color scale for arcs
        const colorScale = d3.scaleOrdinal<string>()
            .domain(['topic', 'pro', 'con'])
            .range(['#EEF2FF', '#D1FAE5', '#FEE2E2']);

        // Create hierarchy from data and compute values for each node
        const root = d3.hierarchy(sunburstData)
            .sum(d => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        // Compute arc data
        partition(root);

        // Arc generator for the partitioned hierarchy nodes
        const arc = d3.arc<PartitionHierarchyNode>()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .innerRadius(d => Math.sqrt(d.y0))
            .outerRadius(d => Math.sqrt(d.y1));

        // Create path elements for each node - not using variable to avoid ESLint unused var warning
        g.selectAll('path')
            .data(root.descendants().slice(1) as PartitionHierarchyNode[]) // Skip the root node
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', d => colorScale(d.data.type))
            .attr('stroke', d => {
                if (d.data.type === 'pro') return '#10B981';
                if (d.data.type === 'con') return '#EF4444';
                return '#6366F1';
            })
            .attr('stroke-width', 1)
            .attr('opacity', 0.9)
            .on('mouseover', function () {
                d3.select(this).attr('opacity', 1);
            })
            .on('mouseout', function () {
                d3.select(this).attr('opacity', 0.9);
            })
            .on('click', (event, d) => {
                setSelectedNode(d.data);
                event.stopPropagation();
            });

        // Add labels to the arcs
        g.selectAll('text')
            .data(root.descendants().slice(1).filter(d => {
                const node = d as PartitionHierarchyNode;
                return (node.x1 - node.x0) > 0.05;
            }) as PartitionHierarchyNode[]) // Only add text to larger arcs
            .enter()
            .append('text')
            .attr('transform', function (d) {
                const x = (d.x0 + d.x1) / 2;
                const y = Math.sqrt(d.y0 + d.y1) / 2;
                const angle = x - Math.PI / 2;
                const rotate = angle * 180 / Math.PI;
                // Position text along the arc
                return `rotate(${rotate}) translate(${y},0) ${Math.abs(rotate) > 90 ? 'rotate(180)' : ''}`;
            })
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('dy', '.35em')
            .text(d => truncateText(d.data.name, 15))
            .attr('fill', 'black')
            .attr('pointer-events', 'none'); // Don't interfere with mouse events

        // Add central label for the topic
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .attr('fill', '#4F46E5')
            .attr('dy', '0em')
            .text(truncateText(debate.topic, 20));

        // Add central circle for the topic
        g.append('circle')
            .attr('r', 40)
            .attr('fill', '#EEF2FF')
            .attr('stroke', '#6366F1')
            .attr('stroke-width', 2)
            .attr('opacity', 0.9);

        // Clear selected node when clicking on the background
        svg.on('click', () => {
            setSelectedNode(null);
        });

    }, [debate, darguments, width, height, prepareSunburstData]);

    // Helper function to truncate text
    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Find the corresponding argument for selected node
    const findArgument = (nodeId: string): Argument | null => {
        if (nodeId === 'center' || nodeId === 'pro-group' || nodeId === 'con-group') return null;

        // Search in top-level arguments
        let argument = darguments.find(arg => arg.id === nodeId);
        if (argument) return argument;

        // Search in replies
        for (const arg of darguments) {
            if (arg.replies) {
                const reply = arg.replies.find(r => r.id === nodeId);
                if (reply) return reply;
            }
        }

        return null;
    };

    return (
        <div ref={containerRef} className="relative">
            <svg
                ref={svgRef}
                width={width}
                height={height}
                className="border border-gray-200 rounded-lg bg-white"
            />

            {/* Selected node detail panel */}
            {selectedNode && !['center', 'pro-group', 'con-group'].includes(selectedNode.id) && (
                <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-4 w-64">
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-gray-900">
                            {selectedNode.type === 'pro' ? 'Supporting Argument' : 'Opposing Argument'}
                        </h3>
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-2">
                        <p className="text-sm text-gray-600">{selectedNode.name}</p>

                        {/* Get full argument details */}
                        {(() => {
                            const arg = findArgument(selectedNode.id);
                            if (arg) {
                                return (
                                    <div className="mt-2">
                                        <div className="flex items-center text-xs text-gray-500">
                                            <span>By {arg.author.username}</span>
                                            <span className="mx-1">•</span>
                                            <span>Votes: {arg.votes}</span>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            )}

            <div className="text-center text-sm text-gray-500 mt-2">
                <p>Radial sunburst visualization - click segments to see details</p>
                <p>Segment size represents argument importance based on votes</p>
            </div>
        </div>
    );
};

export default RadialSunburst;