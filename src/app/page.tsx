"use client";

import React, { useState, useEffect } from 'react';
import { Coffee, Trash2, Edit2, Plus, Minus, Activity, Clock } from 'lucide-react';
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
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateLabel = `${now.toLocaleDateString([], {month: 'short', day: 'numeric'})} ${timestamp}`;

    if (editingId) {
      setHistory(history.map(item => 
        item.id === editingId ? { ...item, cups, sugar, fullTimestamp: dateLabel } : item
      ));
      setEditingId(null);
    } else {
      const newEntry = {
        id: Date.now(),
        date: dateLabel,
        rawDate: now.toISOString(),
        cups,
        sugar,
        timeOnly: timestamp
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
    <div className="min-h-screen bg-[#FDFBF7] text-[#3C2A21] p-3 md:p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* TOP ROW: LOGO & STATUS */}
        <header className="flex items-center justify-between border-b border-[#D4A373] pb-2">
          <div className="flex items-center space-x-3">
            <div className="bg-[#6F4E37] p-2 rounded-lg text-white">
              <Coffee size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight uppercase">Telemetry v1.2</h1>
          </div>
          <div className="flex items-center text-xs font-mono text-[#9C6644] animate-pulse">
            <Activity size={14} className="mr-1" /> SYSTEM LIVE: {new Date().toLocaleTimeString()}
          </div>
        </header>

        {/* ABOVE THE FOLD: COMPACT DASHBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          
          {/* CONTROL BOX (4 Columns) */}
          <div className="lg:col-span-4 bg-white p-4 rounded-xl shadow-sm border border-[#E6CCB2] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-dashed border-[#F5EBE0] pb-2">
                <span className="text-xs font-bold uppercase text-[#9C6644]">Intake Config</span>
                <span className="text-[10px] text-[#D4A373]">MODE: {editingId ? 'OVERWRITE' : 'APPEND'}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-tighter">Coffee</p>
                  <div className="flex items-center bg-[#FDFBF7] rounded-lg border border-[#EDE0D4] overflow-hidden">
                    <button onClick={() => setCups(Math.max(1, cups - 1))} className="px-3 py-2 hover:bg-[#EDE0D4]"><Minus size={14}/></button>
                    <span className="flex-1 text-center font-bold">{cups}</span>
                    <button onClick={() => setCups(cups + 1)} className="px-3 py-2 hover:bg-[#EDE0D4]"><Plus size={14}/></button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-tighter">Sugar (T)</p>
                  <div className="flex items-center bg-[#FDFBF7] rounded-lg border border-[#EDE0D4] overflow-hidden">
                    <button onClick={() => setSugar(Math.max(0, sugar - 1))} className="px-3 py-2 hover:bg-[#EDE0D4]"><Minus size={14}/></button>
                    <span className="flex-1 text-center font-bold">{sugar}</span>
                    <button onClick={() => setSugar(sugar + 1)} className="px-3 py-2 hover:bg-[#EDE0D4]"><Plus size={14}/></button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogCoffee}
              className="mt-4 w-full bg-[#3C2A21] text-white py-4 rounded-lg font-black text-xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-3"
            >
              <Coffee size={24} /> {editingId ? 'SAVE EDIT' : 'COFFEE'}
            </button>
            {editingId && (
              <button onClick={() => {setEditingId(null); setCups(1); setSugar(1);}} className="text-xs mt-2 underline">Cancel Edit</button>
            )}
          </div>

          {/* MAIN CHART (8 Columns) */}
          <div className="lg:col-span-8 bg-white p-4 rounded-xl shadow-sm border border-[#E6CCB2]">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...history].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5EBE0" vertical={false} />
                  <XAxis dataKey="date" stroke="#9C6644" fontSize={9} tickMargin={5} />
                  <YAxis stroke="#9C6644" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#3C2A21', color: '#FFF', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                    itemStyle={{ color: '#FDFBF7' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Line name="Cups" type="stepAfter" dataKey="cups" stroke="#8B5E3C" strokeWidth={3} dot={{ r: 3 }} />
                  <Line name="Sugar" type="monotone" dataKey="sugar" stroke="#D4A373" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* BELOW THE FOLD: LOGS */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E6CCB2] overflow-hidden">
          <div className="px-4 py-2 bg-[#F5EBE0] flex justify-between items-center border-b border-[#E6CCB2]">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Clock size={14}/> Historical Telemetry
            </h3>
            <span className="text-[10px] font-mono">{history.length} Logs recorded</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white shadow-sm">
                <tr className="text-[#9C6644] text-[10px] uppercase border-b border-[#F5EBE0]">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Volume</th>
                  <th className="p-3">Additives</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EBE0]">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FDFBF7]">
                    <td className="p-3 font-mono text-xs">{item.date}</td>
                    <td className="p-3 font-bold">{item.cups} Cup{item.cups > 1 ? 's' : ''}</td>
                    <td className="p-3">{item.sugar} tbsp Sugar</td>
                    <td className="p-3 text-right space-x-1">
                      <button onClick={() => startEdit(item)} className="p-2 text-[#D4A373] hover:bg-[#FDFBF7] rounded"><Edit2 size={14} /></button>
                      <button onClick={() => deleteEntry(item.id)} className="p-2 text-[#9C6644] hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}