"use client";

import React, { useState, useEffect } from 'react';
import { Coffee, Trash2, Edit2, Plus, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CoffeeTracker() {
  const [history, setHistory] = useState([]);
  const [cups, setCups] = useState(1);
  const [sugar, setSugar] = useState(1);
  const [editingId, setEditingId] = useState(null);

  // Load data from localStorage on start
  useEffect(() => {
    const saved = localStorage.getItem('coffee-data');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // Save data whenever history changes
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
    // Reset to defaults
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
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center space-x-4 border-b border-[#D4A373] pb-6">
          <Coffee size={40} className="text-[#8B5E3C]" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Telemetry Coffee Tracker</h1>
            <p className="text-[#6F4E37]">Real-world data for your daily caffeine intake.</p>
          </div>
        </header>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6CCB2]">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              {editingId ? 'Edit Entry' : 'New Log'}
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Coffee Cups</p>
                  <p className="text-xs text-[#9C6644] italic">1 cup = 1 standard coffee cup volume</p>
                </div>
                <div className="flex items-center space-x-4">
                  <button onClick={() => setCups(Math.max(1, cups - 1))} className="p-2 bg-[#E6CCB2] rounded-full hover:bg-[#D4A373]"><Minus size={16}/></button>
                  <span className="text-2xl font-bold w-8 text-center">{cups}</span>
                  <button onClick={() => setCups(cups + 1)} className="p-2 bg-[#E6CCB2] rounded-full hover:bg-[#D4A373]"><Plus size={16}/></button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="font-medium">Tablespoons of Sugar</p>
                <div className="flex items-center space-x-4">
                  <button onClick={() => setSugar(Math.max(0, sugar - 1))} className="p-2 bg-[#E6CCB2] rounded-full hover:bg-[#D4A373]"><Minus size={16}/></button>
                  <span className="text-2xl font-bold w-8 text-center">{sugar}</span>
                  <button onClick={() => setSugar(sugar + 1)} className="p-2 bg-[#E6CCB2] rounded-full hover:bg-[#D4A373]"><Plus size={16}/></button>
                </div>
              </div>

              <button 
                onClick={handleLogCoffee}
                className="w-full bg-[#6F4E37] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#3C2A21] transition-colors shadow-md"
              >
                {editingId ? 'Save Changes' : 'Log Coffee'}
              </button>
              {editingId && (
                <button onClick={() => {setEditingId(null); setCups(1); setSugar(1);}} className="w-full text-[#9C6644] text-sm underline">Cancel Edit</button>
              )}
            </div>
          </div>

          {/* Stats Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E6CCB2]">
            <h2 className="text-xl font-semibold mb-4">Sugar Trends</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...history].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5EBE0" />
                  <XAxis dataKey="date" stroke="#9C6644" fontSize={12} />
                  <YAxis stroke="#9C6644" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E6CCB2' }} />
                  <Line type="monotone" dataKey="sugar" stroke="#6F4E37" strokeWidth={3} dot={{ fill: '#D4A373' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E6CCB2] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#EDE0D4]">
              <tr>
                <th className="p-4 font-semibold text-[#6F4E37]">Date</th>
                <th className="p-4 font-semibold text-[#6F4E37]">Coffee Cups</th>
                <th className="p-4 font-semibold text-[#6F4E37]">Sugar (tbsp)</th>
                <th className="p-4 text-right font-semibold text-[#6F4E37]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE0D4]">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-[#FDFBF7] transition-colors">
                  <td className="p-4 font-medium">{item.date}</td>
                  <td className="p-4">{item.cups}</td>
                  <td className="p-4">{item.sugar}</td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => startEdit(item)} className="p-2 text-[#D4A373] hover:bg-[#FDFBF7] rounded-lg transition-colors"><Edit2 size={18} /></button>
                    <button onClick={() => deleteEntry(item.id)} className="p-2 text-[#9C6644] hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}