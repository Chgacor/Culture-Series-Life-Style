import { Zap } from 'lucide-react';

export default function ProductivityRadar({ percent, today }: { percent: number, today: string }) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-[#1E1E1E] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          Daily Hub <Zap className="text-yellow-500 fill-yellow-500" size={28} />
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Target hari ini: {today}</p>
      </div>

      <div className="w-full md:w-64 space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span className="dark:text-gray-300">Productivity Radar</span>
          <span className="text-blue-600 dark:text-blue-400">{percent}%</span>
        </div>
        <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </header>
  );
}