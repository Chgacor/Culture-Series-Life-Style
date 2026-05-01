import { Clock, Plus, CheckCircle2, Circle } from 'lucide-react';

export default function TimeBlocker({ tasks, onToggle, onAddClick }: { tasks: any[], onToggle: (id: string, status: boolean) => void, onAddClick: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-xl flex items-center gap-2 dark:text-white">
          <Clock className="text-blue-500" /> Time Blocks
        </h3>
        <button onClick={onAddClick} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors">
          <Plus size={20} />
        </button>
      </div>

      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 dark:border-gray-800 divide-y dark:divide-gray-800">
        {tasks.length > 0 ? tasks.map((task) => (
          <div key={task.id} className="p-4 flex items-start gap-4">
            <div className="text-sm font-mono text-gray-400 pt-1 w-12">{task.start_time?.substring(0, 5)}</div>
            <div className={`flex-1 p-4 rounded-xl border-l-4 transition-all ${task.is_completed ? 'bg-gray-50 dark:bg-gray-800/40 border-gray-300 opacity-60' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500'}`}>
              <div className="flex justify-between items-start">
                <h4 className={`font-semibold dark:text-white ${task.is_completed ? 'line-through' : ''}`}>{task.title}</h4>
                <button onClick={() => onToggle(task.id, task.is_completed)}>
                  {task.is_completed ? <CheckCircle2 className="text-green-500" /> : <Circle className="text-gray-300" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Durasi: {task.start_time?.substring(0, 5)} - {task.end_time?.substring(0, 5)}</p>
            </div>
          </div>
        )) : (
          <div className="p-10 text-center text-gray-400 text-sm italic">Belum ada blok waktu hari ini.</div>
        )}
      </div>
    </div>
  );
}