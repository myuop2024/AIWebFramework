import { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: ReactNode | string;
  showFooter?: boolean;
}

export function AdminModal({ isOpen, onClose, title, content, showFooter = false }: AdminModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>{title}</DialogTitle>
            {typeof content === "string" && <DialogDescription>{content}</DialogDescription>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 p-0">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>
        
        {typeof content === "string" ? (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <div className="pt-2">{content}</div>
        )}
        
        {showFooter && (
          <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}