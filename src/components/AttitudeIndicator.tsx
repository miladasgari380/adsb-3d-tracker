import React from 'react';

interface AttitudeIndicatorProps {
    pitch: number;    // degrees (-90 to 90)
    roll: number;     // degrees (-180 to 180)
    speed: number;    // knots
    altitude: number; // feet
    heading: number;  // degrees (0 to 360)
}

export const AttitudeIndicator: React.FC<AttitudeIndicatorProps> = ({
    pitch = 0,
    roll = 0,
    speed = 0,
    altitude = 0,
    heading = 0
}) => {
    // Clamp values for safety
    const clampedPitch = Math.max(-90, Math.min(90, pitch));

    // Calculate translations for tapes and horizon
    // 1 degree of pitch = 3px of vertical movement
    const horizonY = clampedPitch * 3;

    // For scrolling tapes, map values to Y translation offsets
    // Base offset is -64px because the 0 index (middle of 7 elements of 40px each) is at 160px from top,
    // and we want it to align with the 96px center mark (192px / 2 container height). 160 - 96 = 64px.
    const speedDecade = Math.floor(speed / 10) * 10;
    const speedOffset = -64 + (speed % 10) * 4;

    const altHundred = Math.floor(altitude / 100) * 100;
    const altOffset = -64 + (altitude % 100) * 0.4;

    // Heading strip base offset is 86px because the 0-degree point is 10px inside its 20px div,
    // and we want it to align under the 96px needle center mark in the 192px wide container.
    const hdgOffset = 86 - (heading % 360) * 2; // 2px per degree

    return (
        <div className="relative w-full aspect-square max-h-64 rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-xl font-mono select-none">

            {/* 1. The Artificial Horizon Background (Pitch & Roll) */}
            <div
                className="absolute inset-[-50%] transition-transform duration-300 ease-out origin-center"
                style={{ transform: `rotate(${-roll}deg) translateY(${horizonY}px)` }}
            >
                {/* Sky (Blue) */}
                <div className="absolute top-0 w-full h-1/2 bg-sky-500">
                    {/* Pitch Ladder SVG overlay */}
                    <svg className="absolute bottom-0 w-full h-[300px]" viewBox="0 0 200 300">
                        <g stroke="white" strokeWidth="1" opacity="0.8">
                            <line x1="80" y1="270" x2="120" y2="270" /> {/* +10 */}
                            <text x="70" y="273" fill="white" fontSize="8" textAnchor="end">10</text>
                            <line x1="90" y1="285" x2="110" y2="285" /> {/* +5 */}

                            <line x1="75" y1="240" x2="125" y2="240" /> {/* +20 */}
                            <text x="70" y="243" fill="white" fontSize="8" textAnchor="end">20</text>
                            <line x1="90" y1="255" x2="110" y2="255" /> {/* +15 */}

                            <line x1="75" y1="210" x2="125" y2="210" /> {/* +30 */}
                            <text x="70" y="213" fill="white" fontSize="8" textAnchor="end">30</text>
                        </g>
                    </svg>
                </div>

                {/* Horizon Line */}
                <div className="absolute top-1/2 w-full h-[2px] bg-white z-10 shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>

                {/* Ground (Brown) */}
                <div className="absolute bottom-0 w-full h-1/2 bg-amber-700">
                    {/* Pitch Ladder (Negative) SVG overlay */}
                    <svg className="absolute top-0 w-full h-[300px]" viewBox="0 0 200 300">
                        <g stroke="white" strokeWidth="1" opacity="0.8" strokeDasharray="3 2">
                            <line x1="90" y1="15" x2="110" y2="15" /> {/* -5 */}
                            <line x1="80" y1="30" x2="120" y2="30" /> {/* -10 */}
                            <text x="70" y="33" fill="white" fontSize="8" textAnchor="end">-10</text>

                            <line x1="90" y1="45" x2="110" y2="45" /> {/* -15 */}
                            <line x1="75" y1="60" x2="125" y2="60" /> {/* -20 */}
                            <text x="70" y="63" fill="white" fontSize="8" textAnchor="end">-20</text>
                        </g>
                    </svg>
                </div>
            </div>

            {/* 2. Fixed Center Reticle / Airplane Symbol */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="relative w-32 h-32">
                    {/* Center Dot */}
                    <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-sm border border-black/50"></div>
                    {/* Left Wing */}
                    <div className="absolute top-1/2 left-4 w-10 h-1 bg-yellow-400 -translate-y-1/2 shadow-sm border border-black/50"></div>
                    {/* Right Wing */}
                    <div className="absolute top-1/2 right-4 w-10 h-1 bg-yellow-400 -translate-y-1/2 shadow-sm border border-black/50"></div>
                    <div className="absolute top-1/2 left-[calc(1rem+40px)] w-0 h-4 border-l-[3px] border-yellow-400 border-b-[3px] border-b-transparent"></div>
                    <div className="absolute top-1/2 right-[calc(1rem+40px)] w-0 h-4 border-r-[3px] border-yellow-400 border-b-[3px] border-b-transparent"></div>
                </div>
            </div>

            {/* 3. Roll Indicator Arc (Top) */}
            <div className="absolute top-0 left-0 w-full h-1/4 overflow-hidden pointer-events-none z-20">
                <svg className="w-full h-full" viewBox="0 0 200 50">
                    {/* Static Arc */}
                    <path d="M 20 40 A 80 80 0 0 1 180 40" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
                    {/* Static Ticks */}
                    <g stroke="white" strokeWidth="2" opacity="0.8">
                        <line x1="100" y1="5" x2="100" y2="15" strokeWidth="3" /> {/* 0 deg */}
                        <line x1="82" y1="6" x2="85" y2="15" /> {/* -10 deg */}
                        <line x1="118" y1="6" x2="115" y2="15" /> {/* +10 deg */}
                        <line x1="65" y1="12" x2="70" y2="20" /> {/* -20 deg */}
                        <line x1="135" y1="12" x2="130" y2="20" /> {/* +20 deg */}
                        <line x1="49" y1="21" x2="56" y2="28" strokeWidth="3" /> {/* -30 deg */}
                        <line x1="151" y1="21" x2="144" y2="28" strokeWidth="3" /> {/* +30 deg */}
                        <line x1="22" y1="46" x2="31" y2="43" strokeWidth="3" /> {/* -60 deg */}
                        <line x1="178" y1="46" x2="169" y2="43" strokeWidth="3" /> {/* +60 deg */}
                    </g>

                    {/* Dynamic Roll Pointer */}
                    <g
                        transform={`rotate(${-roll} 100 80)`}
                        className="transition-transform duration-300 ease-out origin-[100px_80px]"
                    >
                        <polygon points="100,16 95,26 105,26" fill="yellow" stroke="black" strokeWidth="0.5" />
                    </g>
                </svg>
            </div>

            {/* 4. Speed Tape (Left) */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-48 bg-slate-900/80 border-r border-white/20 backdrop-blur-sm z-30 overflow-hidden shadow-[5px_0_10px_rgba(0,0,0,0.5)]">
                {/* Moving Tape */}
                <div
                    className="absolute w-full flex flex-col items-end transition-transform duration-300 ease-linear"
                    style={{ transform: `translateY(${speedOffset}px)` }}
                >
                    {[-30, -20, -10, 0, 10, 20, 30].map((offset) => {
                        const val = speedDecade - offset;
                        const isTarget = offset === 0;
                        if (val < 0) return <div key={offset} className="h-10 border-b border-transparent"></div>;

                        return (
                            <div key={offset} className="w-full h-10 border-b border-white/30 flex items-end justify-between pr-1 pb-1">
                                <div className="w-2 h-[1px] bg-white/50 mb-3 absolute left-0"></div>
                                <span className={`text-xs ${isTarget ? 'text-transparent' : 'text-white'}`}>{val}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Readout Box (Center Fixed) */}
                <div className="absolute top-1/2 left-0 w-full h-8 -translate-y-1/2 bg-slate-900 border-y-2 border-r-2 border-yellow-400 flex flex-col items-center justify-center font-bold text-green-400 text-sm transform">
                    <div className="absolute -right-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[6px] border-l-yellow-400 pointer-events-none z-40"></div>
                    {Math.round(speed)}
                    <span className="text-[8px] text-green-600/80 -mt-1 leading-none uppercase">KTS</span>
                </div>
            </div>

            {/* 5. Altitude Tape (Right) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[72px] h-48 bg-slate-900/80 border-l border-white/20 backdrop-blur-sm z-30 overflow-hidden shadow-[-5px_0_10px_rgba(0,0,0,0.5)]">
                {/* Moving Tape */}
                <div
                    className="absolute w-full flex flex-col items-start transition-transform duration-300 ease-linear"
                    style={{ transform: `translateY(${altOffset}px)` }}
                >
                    {[-300, -200, -100, 0, 100, 200, 300].map((offset) => {
                        const val = altHundred - offset;
                        const isTarget = offset === 0;
                        if (val < 0) return <div key={offset} className="h-10 border-b border-transparent"></div>;

                        return (
                            <div key={offset} className="w-full h-10 border-b border-white/30 flex items-end justify-between pl-1 pb-1">
                                <span className={`text-[10px] ${isTarget ? 'text-transparent' : 'text-white'}`}>{val}</span>
                                <div className="w-2 h-[1px] bg-white/50 mb-3 absolute right-0"></div>
                            </div>
                        );
                    })}
                </div>

                {/* Readout Box (Center Fixed) */}
                <div className="absolute top-1/2 right-0 w-full h-8 -translate-y-1/2 bg-slate-900 border-y-2 border-l-2 border-yellow-400 flex flex-col items-center justify-center font-bold text-green-400 text-sm transform">
                    <div className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[6px] border-r-yellow-400 pointer-events-none z-40"></div>
                    {Math.round(altitude)}
                    <span className="text-[8px] text-green-600/80 -mt-1 leading-none uppercase">FT</span>
                </div>
            </div>

            {/* 6. Heading Strip (Bottom) */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-8 bg-slate-900/80 border-t border-x border-white/20 rounded-t-md backdrop-blur-sm z-30 overflow-hidden shadow-[0_-5px_10px_rgba(0,0,0,0.5)]">
                {/* Moving Strip */}
                <div
                    className="absolute top-0 h-full flex transition-transform duration-300 ease-linear"
                    style={{ transform: `translateX(${hdgOffset}px)` }}
                >
                    {/* We render 3 copies of 360 degrees to ensure seamless scrolling wrap-around */}
                    {[0, 1, 2].map((cycle) => (
                        <div key={cycle} className="flex h-full">
                            {Array.from({ length: 36 }).map((_, i) => {
                                const deg = i * 10;
                                const isCardinal = deg % 90 === 0;
                                let label = (deg / 10).toString().padStart(2, '0');

                                if (deg === 0) label = 'N';
                                if (deg === 90) label = 'E';
                                if (deg === 180) label = 'S';
                                if (deg === 270) label = 'W';

                                return (
                                    <div key={i} className="flex flex-col items-center justify-start h-full" style={{ width: '20px' }}>
                                        <div className={`w-px bg-white ${isCardinal ? 'h-2' : 'h-1'} mb-[2px] opacity-70`}></div>
                                        <span className={`text-[8px] ${isCardinal ? 'text-yellow-400 font-bold' : 'text-slate-300'}`}>
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Center Needle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-yellow-400/80 z-40"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-yellow-400 z-40"></div>
            </div>

        </div>
    );
};
