"use client";

/** Icon + label + value cell used in the customer card grid. */
export function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start">
      <Icon size={16} className="text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default DetailItem;
