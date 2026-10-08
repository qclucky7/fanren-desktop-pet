import { PetInspector, type PetInspectorProps } from "@/components/settings/PetInspector";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PetDetailSheetProps extends PetInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PetDetailSheet({ open, onOpenChange, ...inspectorProps }: PetDetailSheetProps) {
  const name = inspectorProps.selected?.displayName ?? "宠物";

  return (
    <Sheet open={open && inspectorProps.selected !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="pet-detail-sheet">
        <SheetHeader className="sr-only">
          <SheetTitle>{name}配置</SheetTitle>
          <SheetDescription>查看宠物信息并编辑桌面宠物与对话设置</SheetDescription>
        </SheetHeader>
        <PetInspector {...inspectorProps} />
      </SheetContent>
    </Sheet>
  );
}
