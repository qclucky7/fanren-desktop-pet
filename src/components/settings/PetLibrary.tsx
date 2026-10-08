import { PetCard } from "@/components/settings/PetCard";
import { sortPetsByDisplayName } from "@/lib/pet-sort";
import type { PetRecord } from "@/lib/types";

interface PetLibraryProps {
  pets: PetRecord[];
  activePetId: string | null;
  selectedId: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
}

export function PetLibrary({ pets, activePetId, selectedId, busy, onSelect, onActivate }: PetLibraryProps) {
  const sortedPets = sortPetsByDisplayName(pets);

  return (
    <div className="library-panel">
      <div className="section-heading">
        <div className="section-heading-copy">
          <h1>宠物</h1>
          <p>选择角色查看与编辑配置</p>
        </div>
        <span className="count-label">共 {pets.length} 个</span>
      </div>
      <div className="pet-grid-scroll" role="region" aria-label="宠物列表" tabIndex={0}>
        <div className="pet-grid">
          {sortedPets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              active={activePetId === pet.id}
              selected={selectedId === pet.id}
              busy={busy}
              onSelect={() => onSelect(pet.id)}
              onActivate={() => onActivate(pet.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
