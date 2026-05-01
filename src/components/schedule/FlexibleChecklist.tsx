import { Target, Plus, CheckCircle2, Circle } from 'lucide-react';

export default function FlexibleChecklist({ tasks, onToggle, onAddClick }: { tasks: any[], onToggle: (id: string, status: boolean) => void, onAddClick: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-xl flex items-center gap-2 dark:text-white">
          <Target className="text-orange-500" /> Anytime Tasks
        </h3>
        <button onClick={onAddClick} className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 transition-colors">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} onClick={() => onToggle(task.id, task.is_completed)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${task.is_completed ? 'bg-gray-50 dark:bg-[#1E1E1E] border-gray-200 dark:border-gray-800 opacity-60' : 'bg-white dark:bg-[#1E1E1E] border-gray-200 dark:border-gray-800 hover:border-orange-300'}`}>
            {task.is_completed ? <CheckCircle2 className="text-green-500 shrink-0" size={24} /> : <Circle className="text-gray-300 shrink-0" size={24} />}
            <span className={`font-medium dark:text-white ${task.is_completed ? 'line-through text-gray-400' : ''}`}>{task.title}</span>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="p-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-center text-gray-400 text-sm">Klik + untuk menambah tugas fleksibel.</div>
        )}
      </div>
    </div>
  );
}