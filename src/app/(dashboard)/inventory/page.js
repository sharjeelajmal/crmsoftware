"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus } from "lucide-react";
import { containerVariants, itemVariants } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { ConfirmDialog, AlertDialog } from "@/components/ui/Dialogs";
import { useInventory } from "@/features/inventory/hooks/useInventory";
import { AddCategoryPopup } from "@/features/inventory/components/AddCategoryPopup";
import { AddProductPopup } from "@/features/inventory/components/AddProductPopup";
import { EditProductPopup } from "@/features/inventory/components/EditProductPopup";
import { StockUpdatePopup } from "@/features/inventory/components/StockUpdatePopup";
import { StockHistoryPopup } from "@/features/inventory/components/StockHistoryPopup";
import { ProductTable } from "@/features/inventory/components/ProductTable";
import { DateRangeButton } from "@/components/ui/DateRangeButton";
import { rangeLabel } from "@/constants/datePresets";
import { STOCK_FILTERS, STOCK_FILTER_OPTIONS, filterProducts } from "@/features/inventory/utils";

const CLOSED = { type: null, data: null };
const SEARCH_CLASS =
  "pl-12 pr-4 py-3 w-full bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary";

export default function InventoryPage() {
  const {
    products,
    categories,
    categoryOptions,
    isLoading,
    addProduct,
    updateProduct,
    addCategory,
    deleteProduct,
    deleteCategory,
    updateStock,
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState(STOCK_FILTERS.ALL);
  const [addedRange, setAddedRange] = useState(null);
  const [popup, setPopup] = useState(CLOSED);

  const closePopup = () => setPopup(CLOSED);
  const filteredProducts = filterProducts(products, {
    searchTerm,
    category: selectedCategory,
    stockFilter,
    addedRange,
  });
  const stockProduct = popup.type === "stock" ? products.find((p) => p._id === popup.data.productId) : null;
  const editProduct = popup.type === "edit" ? products.find((p) => p._id === popup.data) : null;
  const historyProduct = popup.type === "history" ? products.find((p) => p._id === popup.data) : null;
  // Pre-select the category the user is currently looking at.
  const initialCategory = selectedCategory !== "All" ? selectedCategory : categories[0] || "";

  const handleDeleteCategory = (name) => {
    const inUse = products.some((product) => product.category === name);
    if (inUse) setPopup({ type: "alert", data: `Cannot delete "${name}" because it contains products.` });
    else setPopup({ type: "deleteCategory", data: name });
  };

  const withClose = async (promise) => {
    if (await promise) closePopup();
  };

  const confirmDeleteCategory = async () => {
    if (await deleteCategory(popup.data)) {
      setSelectedCategory("All");
      closePopup();
    }
  };

  return (
    <>
      <AnimatePresence>
        {popup.type === "deleteProduct" && (
          <ConfirmDialog
            title="Confirmation"
            message="Are you sure you want to delete this product?"
            onConfirm={() => withClose(deleteProduct(popup.data))}
            onCancel={closePopup}
          />
        )}
        {popup.type === "deleteCategory" && (
          <ConfirmDialog
            title="Confirmation"
            message={`Are you sure you want to delete the "${popup.data}" category?`}
            onConfirm={confirmDeleteCategory}
            onCancel={closePopup}
          />
        )}
        {popup.type === "alert" && <AlertDialog message={popup.data} onClose={closePopup} />}
        {popup.type === "addCategory" && (
          <AddCategoryPopup onSave={(name) => name && withClose(addCategory(name))} onCancel={closePopup} />
        )}
        {popup.type === "addProduct" && (
          <AddProductPopup
            categories={categories}
            initialCategory={initialCategory}
            onSave={(product) => withClose(addProduct(product))}
            onCancel={closePopup}
          />
        )}
        {editProduct && (
          <EditProductPopup
            product={editProduct}
            categories={categories}
            onSave={(changes) => withClose(updateProduct(editProduct._id, changes))}
            onCancel={closePopup}
          />
        )}
        {stockProduct && (
          <StockUpdatePopup
            product={stockProduct}
            action={popup.data.action}
            onSave={(quantity, size) => withClose(updateStock(stockProduct._id, popup.data.action, quantity, size))}
            onCancel={closePopup}
          />
        )}
        {historyProduct && <StockHistoryPopup product={historyProduct} onClose={closePopup} />}
      </AnimatePresence>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full space-y-6">
        <motion.header
          variants={itemVariants}
          className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-3"
        >
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-center">
            <div className="relative flex items-center w-full sm:w-72 lg:w-80">
              <Search className="absolute left-4 text-gray-400" size={20} />
              <input
                autoComplete="off"
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={SEARCH_CLASS}
              />
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
              <CustomDropdown
                label="Category"
                options={categoryOptions}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                onDeleteOption={handleDeleteCategory}
                searchPlaceholder="Search category..."
                containerClassName="w-full sm:w-48"
              />
              <CustomDropdown
                label="Stock"
                options={STOCK_FILTER_OPTIONS}
                selected={stockFilter}
                onSelect={setStockFilter}
                containerClassName="w-full sm:w-48"
              />
              <DateRangeButton
                range={addedRange}
                onChange={setAddedRange}
                className="col-span-2 sm:w-64"
                testId="inventory-date-filter"
              />
            </div>
          </div>
          <Button
            icon={Plus}
            onClick={() => setPopup({ type: "addCategory", data: null })}
            className="w-full sm:w-auto sm:self-start xl:self-auto shrink-0 whitespace-nowrap"
          >
            Add Category
          </Button>
        </motion.header>

        <motion.div variants={itemVariants} className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedCategory === "All" ? "All Products" : selectedCategory}
              </h2>
              {addedRange && (
                <p className="text-sm text-gray-500" data-testid="inventory-date-summary">
                  Added: {rangeLabel(addedRange)} · {filteredProducts.length}{" "}
                  {filteredProducts.length === 1 ? "product" : "products"}
                </p>
              )}
            </div>
            <Button
              icon={Plus}
              onClick={() => setPopup({ type: "addProduct", data: null })}
              className="w-full sm:w-auto"
            >
              Add Product
            </Button>
          </div>
          <ProductTable
            products={filteredProducts}
            isLoading={isLoading}
            onStockChange={(productId, action) => setPopup({ type: "stock", data: { productId, action } })}
            onEdit={(productId) => setPopup({ type: "edit", data: productId })}
            onDelete={(productId) => setPopup({ type: "deleteProduct", data: productId })}
            onHistory={(productId) => setPopup({ type: "history", data: productId })}
            emptyText={
              products.length > 0 ? "No products match these filters. Change or clear a filter to see more." : undefined
            }
          />
        </motion.div>
      </motion.div>
    </>
  );
}
