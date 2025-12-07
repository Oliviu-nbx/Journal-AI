
import React from 'react';
import { JournalEntry } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  entries: JournalEntry[];
  onSelectDate: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ entries, onSelectDate }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEntryForDay = (day: number) => {
     return entries.find(e => {
        const d = new Date(e.date);
        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
     });
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 border border-gray-200 dark:border-white/5 animate-in fade-in zoom-in duration-300">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white">
             {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
             <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
             </button>
             <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
             </button>
          </div>
       </div>

       <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
             <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2">{d}</div>
          ))}
       </div>

       <div className="grid grid-cols-7 gap-2">
          {blanks.map(i => <div key={`blank-${i}`} className="aspect-square"></div>)}
          
          {days.map(day => {
             const entry = getEntryForDay(day);
             const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
             
             return (
                <div 
                   key={day} 
                   onClick={() => entry && onSelectDate(entry.id)}
                   className={`aspect-square rounded-xl border relative transition-all group cursor-pointer
                      ${isToday ? 'border-indigo-500 border-2' : 'border-gray-100 dark:border-white/5'}
                      ${entry ? 'bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-white/5'}
                   `}
                >
                   <span className={`absolute top-2 left-2 text-xs font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>{day}</span>
                   
                   {entry && (
                      <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-indigo-500"></div>
                   )}
                   {entry && entry.mood && (
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="text-[10px] bg-black/80 text-white px-1 py-0.5 rounded backdrop-blur-sm">{entry.mood}</span>
                       </div>
                   )}
                </div>
             );
          })}
       </div>
    </div>
  );
};

export default CalendarView;
