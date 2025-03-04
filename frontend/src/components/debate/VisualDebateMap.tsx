import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import * as d3 from 'd3';
import { Argument } from '../../store/slices/debateSlice';

interface Node extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    type: 'topic' | 'pro' | 'con';
    votes?: number;
    radius?: number;
    x?: number; // Add x property
    y?: number; // Add y property
    fx?: number; // Add fx property
    fy?: number; // Add fy property
}

interface Link extends d3.SimulationLinkDatum<Node> {
    source: string | Node;
    target: string | Node;
    type: 'pro' | 'con';
}

const VisualDebateMap: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const debate = useSelector((state: RootState) => state.debate.currentDebate);
    const darguments = useSelector((state: RootState) => state.debate.darguments);

    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(600);

    // Update width and height based on container size
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setWidth(containerRef.current.clientWidth);
                setHeight(450); // Fixed height
            }
        };

        // Initial dimensions
        updateDimensions();

        // Update on window resize
        window.addEventListener('resize', updateDimensions);

        return () => {
            window.removeEventListener('resize', updateDimensions);
        };
    }, []);

    // Prepare data for D3
    const prepareGraph = () => {
        if (!debate) return { nodes: [], links: [] };

        // Create center node for the topic
        const nodes: Node[] = [
            { id: 'center', label: debate.topic, type: 'topic' }
        ];

        const links: Link[] = [];

        // Add top-level arguments
        darguments.forEach(arg => {
            // Add node for the argument
            nodes.push({
                id: arg.id,
                label: arg.content,
                type: arg.type,
                votes: arg.votes,
                radius: calculateRadius(arg.votes)
            });

            // Connect to center
            links.push({
                source: 'center',
                target: arg.id,
                type: arg.type
            });

            // Process replies if any
            if (arg.replies) {
                arg.replies.forEach(reply => {
                    // Add node for the reply
                    nodes.push({
                        id: reply.id,
                        label: reply.content,
                        type: reply.type,
                        votes: reply.votes,
                        radius: calculateRadius(reply.votes)
                    });

                    // Connect to parent
                    links.push({
                        source: arg.id,
                        target: reply.id,
                        type: reply.type
                    });
                });
            }
        });

        return { nodes, links };
    };

    // Calculate radius based on votes (min 20, max 40)
    const calculateRadius = (votes: number) => {
        return Math.max(20, Math.min(40, 20 + votes / 2));
    };

    // D3 Visualization
    useEffect(() => {
        if (!svgRef.current || !debate) return;

        // Clear previous visualization
        d3.select(svgRef.current).selectAll('*').remove();

        const { nodes, links } = prepareGraph();

        // Skip if no nodes
        if (nodes.length === 0) return;

        const svg = d3.select(svgRef.current);

        // Create container group with zoom behavior
        const g = svg.append('g');

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 2])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Initialize simulation
        const simulation = d3.forceSimulation<Node, Link>(nodes)
            .force('link', d3.forceLink<Node, Link>(links)
                .id(d => d.id)
                .distance(100)
            )
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => (d.radius || 30) + 10));

        // Create links
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke', d => d.type === 'pro' ? '#10B981' : '#EF4444')
            .attr('stroke-width', 2);

        // Create nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .call(d3.drag<SVGGElement, Node>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended)
            )
            .on('click', (event, d) => {
                setSelectedNode(d);
                event.stopPropagation();
            });

        // Background circles for nodes
        node.append('circle')
            .attr('r', d => d.id === 'center' ? 50 : (d.radius || 30))
            .attr('fill', d => {
                if (d.id === 'center') return '#EEF2FF';
                return d.type === 'pro' ? '#D1FAE5' : '#FEE2E2';
            })
            .attr('stroke', d => {
                if (d.id === 'center') return '#6366F1';
                return d.type === 'pro' ? '#10B981' : '#EF4444';
            })
            .attr('stroke-width', 2);

        // Text labels
        node.append('text')
            .text(d => truncateText(d.label, d.id === 'center' ? 30 : 20))
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .attr('font-size', d => d.id === 'center' ? '14px' : '12px')
            .attr('fill', d => {
                if (d.id === 'center') return '#4F46E5';
                return d.type === 'pro' ? '#065F46' : '#991B1B';
            });

        // Add vote count for arguments
        node.filter(d => d.id !== 'center')
            .append('text')
            .text(d => `${d.votes}`)
            .attr('text-anchor', 'middle')
            .attr('dy', d => (d.radius || 30) + 15)
            .attr('font-size', '10px')
            .attr('fill', '#6B7280');

        // Update positions on each tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as Node).x!)
                .attr('y1', d => (d.source as Node).y!)
                .attr('x2', d => (d.target as Node).x!)
                .attr('y2', d => (d.target as Node).y!);

            node
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Drag functions
        function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = undefined;
            d.fy = undefined;
        }

        // Clear selected node when clicking on the background
        svg.on('click', () => {
            setSelectedNode(null);
        });

        // Cleanup
        return () => {
            simulation.stop();
        };
    }, [debate, darguments, width, height]);

    // Helper function to truncate text
    const truncateText = (text: string, maxLength: number) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Find the corresponding argument for selected node
    const findArgument = (nodeId: string): Argument | null => {
        if (nodeId === 'center') return null;

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
            {selectedNode && selectedNode.id !== 'center' && (
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
                        <p className="text-sm text-gray-600">{selectedNode.label}</p>

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
                <p>Interactive map - drag nodes to rearrange, click to see details</p>
                <p>Green connections support the central idea, red connections oppose it</p>
            </div>
        </div>
    );
};

export default VisualDebateMap;
