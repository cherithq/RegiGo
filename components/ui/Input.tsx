type InputProps = {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export default function Input({
    label,
    name,
    type = "text",
    required = false,
    placeholder = "Type here",
    value,
    onChange,
}: InputProps) {
    return (
        <div>
            <label className="mb-2 block font-semibold text-slate-900">
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            <input
                name={name}
                type={type}
                required={required}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 placeholder:text-slate-400 shadow-sm focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
        </div>
    );
}