import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">About</p>
          <DialogTitle>关于本站</DialogTitle>
          <DialogDescription className="pt-3 leading-7">
            本站用于按角色整理和分享表情包。所有图片来自互联网公开来源，仅供交流使用，作者不对相关内容主张版权。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-7 text-muted-foreground">
          <p>
            如内容涉及侵权，请联系{' '}
            <a className="font-medium text-primary underline underline-offset-4" href="mailto:yukikaze@disroot.org">
              yukikaze@disroot.org
            </a>
            。
          </p>
        </div>
        <div className="flex flex-col items-start gap-3">
          <a
            href="https://yuki1936.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
          >
            个人主页 yuki1936.com <ExternalLink size={15} />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
