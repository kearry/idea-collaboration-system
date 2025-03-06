import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store/store';
import * as d3 from 'd3';
import { Argument } from '../../../store/slices/debateSlice';

interface TreeNode {
    id: string;
    name: string;
    type: 'topic' | 'pro' | 'con';
    votes?: number;
    children?: TreeNode[];
    data?: any; // For storing original argument data
}

const HierarchicalTree: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const debate = useSelector((state: RootState) => state.debate.currentDebate);
    const darguments = useSelector((state: RootState) => state.debate.darguments);

    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
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

    // Prepare hierarchical data for the tree
    const prepareHierarchicalData = useCallback(() => {
        if (!debate) return null;

        // Create root node for topic
        const rootNode: TreeNode = {
            id: 'center',
            name: debate.topic,
            type: 'topic',
            children: []
        };

        // Create separate groups for pro and con arguments
        const proNode: TreeNode = {
            id: 'pro-group',
            name: 'Supporting Arguments',
            type: 'pro',
            children: []
        };

        const conNode: TreeNode = {
            id: 'con-group',
            name: 'Opposing Arguments',
            type: 'con',
            children: []
        };

        // Add top-level pro arguments to the pro group
        darguments
            .filter(arg => arg.type === 'pro')
            .forEach(arg => {
                const argNode: TreeNode = {
                    id: arg.id,
                    name: arg.content,
                    type: arg.type,
                    votes: arg.votes,
                    data: arg,
                    children: []
                };

                // Add replies as children
                if (arg.replies && arg.replies.length > 0) {
                    arg.replies.forEach(reply => {
                        argNode.children!.push({
                            id: reply.id,
                            name: reply.content,
                            type: reply.type,
                            votes: reply.votes,
                            data: reply
                        });
                    });
                }

                proNode.children!.push(argNode);
            });

        // Add top-level con arguments to the con group
        darguments
            .filter(arg => arg.type === 'con')
            .forEach(arg => {
                const argNode: TreeNode = {
                    id: arg.id,
                    name: arg.content,
                    type: arg.type,
                    votes: arg.votes,
                    data: arg,
                    children: []
                };

                // Add replies as children
                if (arg.replies && arg.replies.length > 0) {
                    arg.replies.forEach(reply => {
                        argNode.children!.push({
                            id: reply.id,
                            name: reply.content,
                            type: reply.type,
                            votes: reply.votes,
                            data: reply
                        });
                    });
                }

                conNode.children!.push(argNode);
            });

        // Add pro and con groups to the root node
        if (proNode.children!.length > 0) {
            rootNode.children!.push(proNode);
        }

        if (conNode.children!.length > 0) {
            rootNode.children!.push(conNode);
        }

        return rootNode;
    }, [debate, darguments]);

    // Create the tree visualization
    useEffect(() => {
        if (!svgRef.current || !debate) return;

        // Clear previous visualization
        d3.select(svgRef.current).selectAll('*').remove();

        const hierarchicalData = prepareHierarchicalData();
        if (!hierarchicalData) return;

        const svg = d3.select(svgRef.current);
        const g = svg.append('g');

        // Set up zoom and pan functionality
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 2])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Set up tree layout
        // Using horizontal tree layout (left to right)
        const treeLayout = d3.tree<TreeNode>()
            .size([height - 40, width - 160])
            .nodeSize([40, 120]); // [y, x] spacing

        // Create hierarchy from data
        const root = d3.hierarchy(hierarchicalData) as d3.HierarchyNode<TreeNode>;

        // Compute node positions
        const treeData = treeLayout(root);

        // Create links - not using variable to avoid ESLint unused var warning
        g.append('g')
            .attr('class', 'links')
            .selectAll('path')
            .data(treeData.links())
            .enter()
            .append('path')
            .attr('d', (d) => {
                // Create custom path instead of using linkHorizontal to avoid TypeScript errors
                const sourceX = d.source.y;
                const sourceY = d.source.x;
                const targetX = d.target.y;
                const targetY = d.target.x;

                return `M${sourceX},${sourceY}
                        C${(sourceX + targetX) / 2},${sourceY}
                        ${(sourceX + targetX) / 2},${targetY}
                        ${targetX},${targetY}`;
            })
            .attr('fill', 'none')
            .attr('stroke', d => {
                const sourceType = d.source.data.type;
                // Color based on the source node type
                if (sourceType === 'pro') return '#10B981';
                if (sourceType === 'con') return '#EF4444';
                return '#6366F1'; // For the topic or group nodes
            })
            .attr('stroke-width', 1.5);

        // Create node groups
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(treeData.descendants())
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.y},${d.x})`)
            .on('click', (event, d) => {
                setSelectedNode(d.data);
                event.stopPropagation();
            });

        // Add node circles
        node.append('circle')
            .attr('r', d => {
                // Size based on node type
                if (d.data.id === 'center') return 20;
                if (d.data.id === 'pro-group' || d.data.id === 'con-group') return 15;
                return calculateNodeRadius(d.data.votes || 0);
            })
            .attr('fill', d => {
                // Color based on node type
                if (d.data.id === 'center') return '#EEF2FF';
                if (d.data.type === 'pro') return '#D1FAE5';
                if (d.data.type === 'con') return '#FEE2E2';
                return '#E5E7EB'; // Grey for group nodes
            })
            .attr('stroke', d => {
                // Border color based on node type
                if (d.data.id === 'center') return '#6366F1'; // Indigo for topic
                if (d.data.type === 'pro') return '#10B981'; // Green for pro
                if (d.data.type === 'con') return '#EF4444'; // Red for con
                return '#9CA3AF'; // Grey for group nodes
            })
            .attr('stroke-width', 2);

        // Add node text
        node.append('text')
            .attr('dy', d => {
                // Position text based on node type for readability
                if (d.data.id === 'center' || d.data.id === 'pro-group' || d.data.id === 'con-group') {
                    return -25; // Above node
                }
                return -10; // Above node for regular arguments
            })
            .attr('text-anchor', 'middle')
            .attr('font-size', d => {
                if (d.data.id === 'center') return '14px';
                if (d.data.id === 'pro-group' || d.data.id === 'con-group') return '12px';
                return '11px';
            })
            .text(d => truncateText(d.data.name, 30))
            .attr('fill', d => {
                if (d.data.id === 'center') return '#4F46E5';
                if (d.data.type === 'pro') return '#065F46';
                if (d.data.type === 'con') return '#991B1B';
                return '#4B5563';
            });
        // Remove the wrap function call to fix TypeScript error

        // Add vote count for argument nodes
        node.filter(d => d.data.votes !== undefined)
            .append('text')
            .attr('dy', '25px')
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text(d => `Votes: ${d.data.votes}`)
            .attr('fill', '#6B7280');

        // Center the tree in the available space
        const rootNode = treeData.descendants()[0];
        const initialTransform = d3.zoomIdentity
            .translate(width / 2 - rootNode.y, height / 2 - rootNode.x)
            .scale(0.8);

        svg.call(zoom.transform, initialTransform);

        // Clear selected node when clicking on the background
        svg.on('click', () => {
            setSelectedNode(null);
        });

        // Return cleanup function
        return () => {
            svg.on('.zoom', null);
        };
    }, [debate, darguments, width, height, prepareHierarchicalData]);

    // Helper function to calculate node radius based on votes
    const calculateNodeRadius = (votes: number) => {
        return Math.max(15, Math.min(30, 15 + votes / 3));
    };

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
                <p>Hierarchical tree visualization - click nodes to see details</p>
                <p>Showing arguments organized by type with supporting (green) and opposing (red) branches</p>
            </div>
        </div>
    );
};

export default HierarchicalTree;