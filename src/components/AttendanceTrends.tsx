import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { Calendar, AlertCircle } from 'lucide-react';
import { buildAttendanceTrendData } from '../lib/attendanceData';

export default function AttendanceTrends() {
  const { app } = useApp();

  const trends = useMemo(
    () => buildAttendanceTrendData(
      app.anwesenheit,
      app.anwesenheitDetail,
      app.schuljahr
    ),
    [app.anwesenheit, app.anwesenheitDetail, app.schuljahr]
  );

  if (trends.weekdayData.every(d => d.Fehlstunden === 0) && trends.weeklyData.length === 0) {
         return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10 print:hidden">
      {/* Wochentage */}
      <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
        <h4 className="text-[0.75rem] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-6">
          <Calendar size={14} /> Brennpunkt: Wochentage
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends.weekdayData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }} 
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }} 
              />
              <Bar dataKey="Fehlstunden" radius={[6, 6, 0, 0]}>
                {trends.weekdayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.Fehlstunden > 30 ? '#f43f5e' : entry.Fehlstunden > 15 ? '#f59e0b' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wochenverlauf */}
      <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
        <h4 className="text-[0.75rem] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-6">
          <AlertCircle size={14} /> Trend: Letzte Wochen
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends.weeklyData} margin={{ top: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }} 
              />
              <Bar dataKey="Entschuldigt" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Unentschuldigt" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
