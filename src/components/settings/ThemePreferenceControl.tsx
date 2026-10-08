import type { ThemePreference } from "@/lib/theme-preference";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

interface ThemePreferenceControlProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

export function ThemePreferenceControl({ value, onChange }: ThemePreferenceControlProps) {
  return (
    <fieldset className="theme-choice-group">
      <legend className="sr-only">外观主题</legend>
      {OPTIONS.map((option) => (
        <label className="theme-choice" key={option.value}>
          <input
            className="sr-only"
            type="radio"
            name="theme-preference"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
