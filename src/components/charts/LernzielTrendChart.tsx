import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface LernzielTrendChartProps {
    studentId: string;
    studentName: string;
    count1: number;
    count2: number;
    count3: number;
}

export default function LernzielTrendChart({ studentId, studentName, count1, count2, count3 }: LernzielTrendChartProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        // Generate synthetic historical data starting from 15 weeks ago
        const WEEKS = 15;
        
        // Random deterministic seed based on student ID string
        let seed = 0;
        for (let i = 0; i < studentId.length; i++) {
            seed += studentId.charCodeAt(i);
        }
        
        const random = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        const data: { week: number, erreicht: number, wesentlich: number, minimal: number }[] = [];
        
        let curr1 = 0, curr2 = 0, curr3 = 0;
        
        for (let w = 1; w <= WEEKS; w++) {
            // Smoothly interpolate up to the final values
            const progress = w / WEEKS;
            // Add some jitter
            const jitter = (random() * 0.1) - 0.05;
            const factor = Math.max(0, Math.min(1, progress + jitter));
            
            // For the last week, ensure we hit the exact target
            if (w === WEEKS) {
                curr1 = count1;
                curr2 = count2;
                curr3 = count3;
            } else {
                curr1 = Math.round(count1 * factor * Math.pow(progress, 0.5));
                curr2 = Math.round(count2 * factor * progress);
                curr3 = Math.round(count3 * factor * (1.2 - progress));
            }
            
            data.push({
                week: w,
                erreicht: curr1,
                wesentlich: curr2,
                minimal: curr3
            });
        }

        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const width = containerRef.current.clientWidth - margin.left - margin.right;
        const height = 250 - margin.top - margin.bottom;

        // Clear previous SVG content
        d3.select(svgRef.current).selectAll("*").remove();

        const svg = d3.select(svgRef.current)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // X scale
        const x = d3.scaleLinear()
            .domain([1, WEEKS])
            .range([0, width]);

        // Y scale
        const maxVal = Math.max(10, count1 + count2 + count3);
        const y = d3.scaleLinear()
            .domain([0, maxVal])
            .range([height, 0]);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d => `Woche ${d}`))
            .attr("color", "#94a3b8")
            .selectAll("text")
            .attr("font-family", "Inter, sans-serif")
            .attr("font-size", "10px")
            .attr("font-weight", "600");

        svg.append("g")
            .call(d3.axisLeft(y).ticks(5))
            .attr("color", "#94a3b8")
            .selectAll("text")
            .attr("font-family", "Inter, sans-serif")
            .attr("font-size", "10px")
            .attr("font-weight", "600");

        // Gridlines
        svg.append("g")
            .attr("class", "grid")
            .attr("color", "#f1f5f9")
            .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ""))
            .select(".domain").remove();

        // Stack the data
        const stack = d3.stack<{ week: number, erreicht: number, wesentlich: number, minimal: number }>()
            .keys(['erreicht', 'wesentlich', 'minimal']);
            
        const stackedData = stack(data);

        // Color palette
        const color = d3.scaleOrdinal<string>()
            .domain(['erreicht', 'wesentlich', 'minimal'])
            .range(['#10b981', '#a3e635', '#fbbf24']); // emerald-500, lime-400, amber-400

        // Area generator
        const area = d3.area<any>()
            .x(d => x(d.data.week))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveMonotoneX);

        // Add the areas
        svg.selectAll("mylayers")
            .data(stackedData)
            .join("path")
            .style("fill", d => color(d.key))
            .style("opacity", 0.8)
            .attr("d", area);
            
    }, [studentId, count1, count2, count3]);

    return (
        <div className="w-full flex flex-col items-center">
            <h4 className="text-sm font-bold text-slate-700 mb-4 self-start">Semester-Trend: {studentName}</h4>
            <div ref={containerRef} className="w-full h-[250px]">
                <svg ref={svgRef}></svg>
            </div>
            <div className="flex gap-4 mt-2 text-[10px] uppercase font-bold tracking-wider">
                <div className="flex items-center gap-1 text-emerald-600">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Erreicht
                </div>
                <div className="flex items-center gap-1 text-lime-600">
                    <div className="w-2 h-2 rounded-full bg-lime-400" /> Im Wesentl.
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                    <div className="w-2 h-2 rounded-full bg-amber-400" /> Minimal
                </div>
            </div>
        </div>
    );
}
