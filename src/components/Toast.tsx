import { CheckCircle2 } from 'lucide-react';

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      className="fixed bottom-5 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2.5 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium whitespace-nowrap text-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
      role="status"
    >
      <CheckCircle2 size={16} className="text-primary" />
      {message}
    </div>
  );
}
