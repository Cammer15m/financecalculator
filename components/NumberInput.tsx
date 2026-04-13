function HelpTip({ text }: { text: string }) {
  return (
    <span className="relative inline-block">
      <span
        tabIndex={0}
        aria-label={`Help: ${text}`}
        title={text}
        className="peer inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-semibold text-gray-500 hover:border-gray-500 hover:text-gray-700 focus:border-gray-500 focus:outline-none"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 w-60 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1.5 text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity peer-hover:opacity-100 peer-focus:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function NumberInput({
  label,
  name,
  defaultValue,
  step,
  min,
  max,
  suffix,
  required = true,
  help,
}: {
  label: string;
  name: string;
  defaultValue: number | string;
  step?: number | string;
  min?: number;
  max?: number;
  suffix?: string;
  required?: boolean;
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex items-center gap-1 font-medium text-gray-700">
        {label}
        {help && <HelpTip text={help} />}
      </span>
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
  help,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  help?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex items-center gap-1 font-medium text-gray-700">
        {label}
        {help && <HelpTip text={help} />}
      </span>
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
