"use client";

import React, { useState, useEffect } from 'react';
import { Coffee, Trash2, Edit2, Plus, Minus, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CoffeeTracker() {
  const [history, setHistory] = useState([]);
  const [cups, setCups] = useState(1);
  const [sugar, setSugar] = useState(1);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('coffee-data');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('coffee-data', JSON.stringify(history));
  }, [history]);

  const handleLogCoffee = () => {
    if (editingId) {
      setHistory(history.map(item => 
        item.id === editingId ? { ...item, cups, sugar } : item
      ));
      setEditingId(null);
    } else {
      const newEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        cups,
        sugar
      };
      setHistory([newEntry, ...history]);
    }
    setCups(1);
    setSugar(1);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setCups(item.cups);
    setSugar(item.sugar);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEntry = (id) => {
    setHistory(history.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#3C2A21] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex items-center space-x-4 border-b border-[#D4A373] pb-6">
          <Coffee size={40} className="text-[#8B5E3C]" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Telemetry Coffee Tracker</h1>
            <p className="text-[#6F4E37]">Consolidated Caffeine & Glucose Monitoring</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls - 1 Column */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6CCB2] h-fit">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              {editingId ? 'Edit Entry' : 'New Log'}
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm uppercase tracking-wider">Coffee Cups</p>
                  <span className="text-2xl font-bold text-[#6F4E37]">{cups}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setCups(Math.max(1, cups - 1))} className="flex-1 p-2 bg-[#F5EBE0] rounded-lg hover:bg-[#E6CCB2] transition-colors"><Minus size={18} className="mx-auto"/></button>
                  <button onClick={() => setCups(cups + 1)} className="flex-1 p-2 bg-[#F5EBE0] rounded-lg hover:bg-[#E6CCB2] transition-colors"><Plus size={18} className="mx-auto"/></button>
                </div>
                <p className="text-[10px] text-[#9C6644] italic">Note: 1 cup = 1 standard coffee cup volume</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm uppercase tracking-wider">Sugar (tbsp)</p>
                  <span className="text-2xl font-bold text-[#6F4E37]">{sugar}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => setSugar(Math.max(0, sugar - 1))} className="flex-1 p-2 bg-[#F5EBE0] rounded-lg hover:bg-[#E6CCB2] transition-colors"><Minus size={18} className="mx-auto"/></button>
                  <button onClick={() => setSugar(sugar + 1)} className="flex-1 p-2 bg-[#F5EBE0] rounded-lg hover:bg-[#E6CCB2] transition-colors"><Plus size={18} className="mx-auto"/></button>
                </div>
              </div>

              <button 
                onClick={handleLogCoffee}
                className="w-full bg-[#6F4E37] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#3C2A21] transition-all shadow-md active:scale-[0.98]"
              >
                {editingId ? 'Save Changes' : 'Log Coffee'}
              </button>
              {editingId && (
                <button onClick={() => {setEditingId(null); setCups(1); setSugar(1);}} className="w-full text-[#9C6644] text-sm underline">Cancel Edit</button>
              )}
            </div>
          </div>

          {/* Unified Chart - 2 Columns */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-[#E6CCB2]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Activity size={20} className="text-[#D4A373]"/> Intake Trends
              </h2>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...history].reverse()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5EBE0" vertical={false} />
                  <XAxis dataKey="date" stroke="#9C6644" fontSize={12} tickMargin={10} />
                  <YAxis stroke="#9C6644" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E6CCB2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Line 
                    name="Coffee Cups" 
                    type="monotone" 
                    dataKey="cups" 
                    stroke="#8B5E3C" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#8B5E3C' }} 
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    name="Sugar (tbsp)" 
                    type="monotone" 
                    dataKey="sugar" 
                    stroke="#D4A373" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#D4A373' }} 
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E6CCB2] overflow-hidden">
          <div className="p-4 bg-[#EDE0D4] border-b border-[#E6CCB2]">
            <h3 className="font-bold text-[#6F4E37]">Historical Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[#9C6644] text-sm uppercase tracking-widest border-b border-[#F5EBE0]">
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Coffee</th>
                  <th className="p-4 font-semibold">Sugar</th>
                  <th className="p-4 text-right font-semibold">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EBE0]">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FDFBF7] transition-colors">
                    <td className="p-4 font-medium text-[#3C2A21]">{item.date}</td>
                    <td className="p-4">{item.cups} Cups</td>
                    <td className="p-4">{item.sugar} tbsp</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => startEdit(item)} className="p-2 text-[#D4A373] hover:bg-[#FDFBF7] rounded-lg transition-colors" title="Edit Entry"><Edit2 size={18} /></button>
                      <button onClick={() => deleteEntry(item.id)} className="p-2 text-[#9C6644] hover:bg-red-50 rounded-lg transition-colors" title="Delete Entry"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-[#9C6644] italic">No data logged yet. Pour a cup and start tracking!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}