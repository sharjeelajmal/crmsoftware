"use client";
import { useState } from 'react';
import { Modal } from './Modal';
import { CustomDropdown } from './CustomDropdown';

export const AddProductPopup = ({ categories, initialCategory, onSave, onCancel }) => {
    const [product, setProduct] = useState({ name: '', category: initialCategory, purchasePrice: '', salePrice: '', remaining: '' });
    const handleChange = (e) => setProduct({...product, [e.target.name]: e.target.value });
    return (
        <Modal onCancel={onCancel}>
            <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Add New Product</h3>
            <div className="space-y-4">
                <CustomDropdown options={categories} selected={product.category} onSelect={(cat) => setProduct({...product, category: cat})} label="Category" containerClassName="w-full" buttonClassName="bg-gray-100"/>
                <input type="text" name="name" value={product.name} onChange={handleChange} placeholder="Enter Name" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
                <div className="grid grid-cols-2 gap-4"><input type="number" name="purchasePrice" value={product.purchasePrice} onChange={handleChange} placeholder="Enter Purchase Price" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/><input type="number" name="salePrice" value={product.salePrice} onChange={handleChange} placeholder="Enter Sale Price" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/></div>
                <input type="number" name="remaining" value={product.remaining} onChange={handleChange} placeholder="Enter Quantity" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
            </div>
            <div className="flex justify-end mt-8">
                <button onClick={() => onSave(product)} className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 transition-transform cursor-pointer">Add Product</button>
            </div>
        </Modal>
    );
};