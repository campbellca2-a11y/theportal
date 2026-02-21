"use client";

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { Coffee, Droplet, Zap, TrendingUp, Activity, Moon, Plus, Minus } from 'lucide-react';

const MG_PER_CUP = 95;
const HALF_LIFE_HOURS = 6;
const SLEEP_THRESHOLD_MG = 40;

function generateProjectionCurve(currentLoad: number) {
  const points = [];
  let simulatedLoad = currentLoad;
  const now = new Date();
  for (let i = 0; i <= 8; i++) {
    const futureTime = new Date(now.getTime() + i * 60 * 60 * 1000);
    const timeString = futureTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    points.push({ time: timeString, load: Math.round(simulatedLoad) });
    simulatedLoad = simulatedLoad * Math.pow(0.5, 1 / HALF_LIFE_HOURS);
  }
  return points;
}

export default function CoffeeTracker() {
  const [cups, setCups] = useState(0);
  const [sugar, setSugar] = useState(0);
  const [currentCaffeine, setCurrentCaffeine] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('coffee_tracker_date');
    if (storedDate === today) {
      setCups(parseFloat(localStorage.getItem('coffee_tracker_cups') || '0'));
      setSugar(parseFloat(localStorage.getItem('coffee_tracker_sugar') || '0'));
      setCurrentCaffeine(parseFloat(localStorage.getItem('coffee_tracker_caff') || '0'));
    } else {
      localStorage.setItem('coffee_tracker_date', today);
      resetStorage();
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('coffee_tracker_cups', cups.toString());
      localStorage.setItem('coffee_tracker_sugar', sugar.toString());
      localStorage.setItem('coffee_tracker_caff', currentCaffeine.toString());
    }
  }, [cups, sugar, currentCaffeine, isMounted]);

  useEffect(() => {
    if (!isMounted || currentCaffeine <= 0) return;
    const decayInterval = setInterval(() => {
      setCurrentCaffeine(prev => {
        const decayFactor = Math.pow(0.5, (1/60) / HALF_LIFE_HOURS);
        const newLoad = prev * decayFactor;
        return newLoad < 1 ? 0 : newLoad;
      });
    }, 60000); 
    return () => clearInterval(decayInterval);
  }, [isMounted, currentCaffeine]);

  const resetStorage = () => {
    localStorage.setItem('coffee_tracker_cups', '0');
    localStorage.setItem('coffee_tracker_sugar', '0');
    localStorage.setItem('coffee_tracker_caff', '0');
  };

  const handleAddCoffee = () => {
    playSound();
    setCups(prev => prev + 1);
    setSugar(prev => prev + 1.5); // Baseline sugar
    setCurrentCaffeine(prev => prev + MG_PER_CUP);
    triggerHaptic();
  };

  const adjustSugar = (amount: number) => {
    setSugar(prev => Math.max(0, prev + amount));
    triggerHaptic();
  };

  const playSound = () => {
    const audio = new Audio('/sounds/pour.mp3');
    audio.volume = 0.4;
    audio.play().catch(() => {});
  };

  const triggerHaptic = () => {
    if (typeof window !== "undefined" && window.navigator.vibrate) {
      window.navigator.vibrate(15);
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-stone-950" />;

  const projectionData = generateProjectionCurve(currentCaffeine);
  const weeklyData = [
    { day: 'Mon', cups: 3, sugar: 4.5 },
    { day: 'Tue', cups: 2, sugar: 3 },
    { day: 'Wed', cups: 4, sugar: 6 },
    { day: 'Thu', cups: 3, sugar: 4.5 },
    { day: 'Fri', cups: 5, sugar: 7.5 },
    { day: 'Sat', cups: 1, sugar: 1.5 },
    { day: 'Today', cups: cups, sugar: sugar },
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 p-6 font-sans selection:bg-amber-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-stone-800 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-amber-500 uppercase tracking-widest">System Telemetry</h1>
            <p className="text-stone-500 text-xs mt-1 font-mono uppercase">Decay Protocol: Active</p>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Dedicated Sugar Adjusters */}
            <div className="flex bg-stone-900 border border-stone-800 rounded-sm">
                <button onClick={() => adjustSugar(-1)} className="p-3 hover:bg-stone-800 text-stone-400 border-r border-stone-800"><Minus size={16}/></button>
                <div className="px-4 flex items-center text-[10px] font-mono text-blue-400 uppercase tracking-tighter">Sugar</div>
                <button onClick={() => adjustSugar(1)} className="p-3 hover:bg-stone-800 text-blue-400 border-l border-stone-800"><Plus size={16}/></button>
            </div>

            <button 
              onClick={handleAddCoffee} 
              className="flex-grow md:flex-none bg-amber-600 px-6 py-3 rounded-none font-bold text-stone-950 hover:bg-amber-500 transition-colors uppercase text-sm tracking-tighter active:scale-95 shadow-[0_0_20px_rgba(217,119,6,0.3)]"
            >
              Execute Intake
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Volume" value={`${cups} Cups`} icon={<Coffee className="text-amber-500" />} />
          <StatCard 
            title="System Load" 
            value={`${Math.round(currentCaffeine)}mg`} 
            icon={<Activity className={`${currentCaffeine > 0 ? 'animate-pulse text-red-500' : 'text-stone-600'}`} />} 
          />
          <StatCard title="Sugar Impact" value={`${sugar.toFixed(1)} tbsp`} icon={<Droplet className="text-blue-400" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-stone-900/30 border border-stone-800 p-5 rounded-sm backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xs font-mono text-stone-500 uppercase flex items-center gap-2">
                <Activity size={14} className="text-red-500" /> T-Plus 8H Projection
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#57534e" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#57534e" fontSize={10} tickLine={false} axisLine={false} unit="mg" />
                  <Tooltip contentStyle={{ backgroundColor: '#0c0a09', border: '1px solid #292524', fontSize: '12px', fontFamily: 'monospace' }} />
                  <ReferenceLine y={SLEEP_THRESHOLD_MG} stroke="#57534e" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="load" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorLoad)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-stone-900/30 border border-stone-800 p-5 rounded-sm backdrop-blur-md">
            <h3 className="text-xs font-mono text-stone-500 uppercase mb-6 flex items-center gap-2">
              <TrendingUp size={14} /> Historical Volume
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" stroke="#57534e" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#57534e" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#1c1917' }} contentStyle={{ backgroundColor: '#0c0a09', border: '1px solid #292524', fontSize: '12px', fontFamily: 'monospace' }} />
                  <Bar dataKey="cups" fill="#d97706" radius={[2, 2, 0, 0]} name="Cups" />
                  <Bar dataKey="sugar" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Sugar (tbsp)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-stone-900/30 border border-stone-800 p-6 rounded-sm backdrop-blur-md">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-mono uppercase text-stone-500 tracking-widest">{title}</span>
        {icon}
      </div>
      <div className="text-4xl font-light tracking-tighter">{value}</div>
    </div>
  );
}