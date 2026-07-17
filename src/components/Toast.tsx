import { CheckCircle2 } from 'lucide-react';

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-md bg-zinc-950 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap text-white shadow-xl dark:bg-white dark:text-zinc-950" role="status">
      <CheckCircle2 size={16} />
      {message}
    </div>
  );
}
