import { Check } from "lucide-react";
import { SpritePreview } from "@/components/pet/SpritePreview";
import { Button } from "@/components/ui/button";
import type { PetRecord } from "@/lib/types";

interface PetCardProps {
  pet: PetRecord;
  active: boolean;
  selected: boolean;
  busy?: boolean;
  onSelect: () => void;
  onActivate: () => void;
}

export function PetCard({ pet, active, selected, busy = false, onSelect, onActivate }: PetCardProps) {
  return (
    <article
      className={`pet-card${selected ? " is-selected" : ""}`}
    >
      <button
        type="button"
        className="pet-card-open"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${pet.displayName}${active ? "，当前正在使用" : ""}`}
      >
        <div className="pet-card-stage">
          <SpritePreview src={pet.previewUrl} className="pet-card-sprite" />
        </div>
      </button>
      <div className="pet-card-footer">
        <span className="pet-card-name">{pet.displayName}</span>
        {active ? (
          <span className="pet-status is-active">
            <Check className="h-3 w-3" />
            使用中
          </span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pet-quick-activate"
            disabled={busy}
            onClick={onActivate}
            aria-label={`将${pet.displayName}设为桌宠`}
          >
            设为桌宠
          </Button>
        )}
      </div>
    </article>
  );
}
