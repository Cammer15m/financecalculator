export function NumberInput({
  label,
  name,
  defaultValue,
  step,
  min,
  max,
  suffix,
  required = true,
}: {
  label: string;
  name: string;
  defaultValue: number | string;
  step?: number | string;
  min?: number;
  max?: number;
  suffix?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="flex items-stretch rounded border border-gray-300 bg-white">
        <input
          type="number"
          name={name}
          defaultValue={defaultValue}
          step={step ?? "any"}
          min={min}
          max={max}
          required={required}
          className="w-full bg-transparent px-2 py-1 text-gray-900 outline-none"
        />
        {suffix && (
          <span className="border-l border-gray-300 bg-gray-50 px-2 py-1 text-xs text-gray-600">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

export function SelectInput({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-900"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
