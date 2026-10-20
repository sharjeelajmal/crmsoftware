"use client";

export function LowStockItem({ name, price, remaining }) {
  return (
    <div className="flex items-center p-4 rounded-xl text-white bg-primary">
      <span className="font-medium flex-grow">{name}</span>
      <span className="w-24 text-center">{price}/-</span>
      <span className="w-24 text-center">{remaining} pcs</span>
    </div>
  );
}

export default LowStockItem;
