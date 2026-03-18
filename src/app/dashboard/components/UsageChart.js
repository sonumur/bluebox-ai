"use client";
import { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Calendar } from "lucide-react";

export default function UsageChart({
    title = "Daily Active Users",
    value = "3",
    subValue = "peak",
    data = null
}) {
    const defaultData = useMemo(() => {
        const days = ["Feb 1", "Feb 4", "Feb 7", "Feb 10", "Feb 13", "Feb 16", "Feb 19", "Feb 22", "Feb 25"];
        return days.map((day, index) => {
            let val = 0;
            if (index === 4) val = 0;
            if (index === 5) val = 3;
            if (index > 5) val = 3;
            return { name: day, value: val };
        });
    }, []);

    const chartData = data || defaultData;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-lg">
                    <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">
                        {payload[0].value} <span className="text-xs font-medium text-indigo-600">Users</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white p-6 sm:p-8 w-full transition-all rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-6 border-b border-gray-100 pb-6">
                <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-bold text-gray-900 tracking-tight tabular-nums leading-none">{value}</span>
                        <span className="text-sm text-gray-500 font-medium">{subValue}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors shadow-sm group">
                    <Calendar size={16} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
                    <span className="text-sm font-medium text-gray-700">Historical View</span>
                </div>
            </div>

            <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                        />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                            domain={[0, 'auto']}
                            tickCount={5}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Line
                            type="monotone" // Smooth curved lines to look modern
                            dataKey="value"
                            stroke="#4f46e5" // Soft indigo
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#ffffff", stroke: "#4f46e5", strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: "#4f46e5", stroke: "#ffffff", strokeWidth: 2 }}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-8 text-center pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-medium tracking-wide">Integrated System Telemetry &bull; Version 1.0</p>
            </div>
        </div>
    );
}
