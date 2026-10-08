import type { PetRecord } from "@/lib/types";

const PINYIN_COLLATOR = new Intl.Collator("zh-CN-u-co-pinyin", {
  numeric: true,
  sensitivity: "base",
});

export function sortPetsByDisplayName(pets: readonly PetRecord[]) {
  return [...pets].sort((left, right) => {
    const byName = PINYIN_COLLATOR.compare(left.displayName, right.displayName);
    return byName || left.id.localeCompare(right.id);
  });
}
