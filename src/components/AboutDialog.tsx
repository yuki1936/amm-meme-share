import { ExternalLink, X } from 'lucide-react';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="w-[min(480px,calc(100vw-32px))] rounded-lg border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold text-teal-700 uppercase dark:text-teal-400">About</p>
            <h2 id="about-title" className="text-xl font-bold text-zinc-950 dark:text-white">关于本站</h2>
          </div>
          <button type="button" className="icon-button" title="关闭" aria-label="关闭" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="mt-5 space-y-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
          <p>本站用于按角色整理和分享表情包。所有图片来自互联网公开来源，仅供交流使用，作者不对相关内容主张版权。</p>
          <p>如内容涉及侵权，请联系 <a className="font-medium text-teal-700 underline underline-offset-4 dark:text-teal-400" href="mailto:yukikaze@disroot.org">yukikaze@disroot.org</a>。</p>
        </div>
        <a
          href="https://www.youtube.com/channel/UCkIimWZ9gBJRamKF0rmPU8w?sub_confirmation=1"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white"
        >
          关注阿喵喵 <ExternalLink size={15} />
        </a>
      </section>
    </div>
  );
}
