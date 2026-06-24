"use client";

const DAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface DayPickerProps {
  selected: number[];
  onChange: (days: number[]) => void;
}

export default function DayPicker({ selected, onChange }: DayPickerProps) {
  function toggle(day: number) {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort());
    }
  }

  return (
    <div className="flex gap-2">
      {DAYS.map((day) => (
        <button
          key={day.value}
          type="button"
          onClick={() => toggle(day.value)}
          className={`w-11 h-11 rounded-full text-sm font-medium transition cursor-pointer ${
            selected.includes(day.value)
              ? "bg-blue-600 text-white dark:text-black shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {day.label}
        </button>
      ))}
    </div>
  );
}
