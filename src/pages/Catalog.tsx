import TopBar from "@/components/TopBar";
import { SectionHeader } from "@/components/DashboardWidgets";
import { Package, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const products = [
  { id: "p1", name: "Office Chair Ergonomic Pro", sku: "CHR-001", price: 349.99, stock: 124, category: "Furniture" },
  { id: "p2", name: "Standing Desk 160cm", sku: "DSK-002", price: 599.00, stock: 56, category: "Furniture" },
  { id: "p3", name: "Wireless Keyboard & Mouse", sku: "ACC-003", price: 89.99, stock: 340, category: "Peripherals" },
  { id: "p4", name: "27\" 4K Monitor", sku: "MON-004", price: 449.00, stock: 78, category: "Electronics" },
  { id: "p5", name: "Noise Cancelling Headphones", sku: "AUD-005", price: 279.00, stock: 92, category: "Electronics" },
  { id: "p6", name: "Laptop Stand Aluminium", sku: "ACC-006", price: 69.99, stock: 210, category: "Accessories" },
  { id: "p7", name: "Webcam HD 1080p", sku: "CAM-007", price: 129.00, stock: 165, category: "Electronics" },
  { id: "p8", name: "Desk Lamp LED", sku: "LGT-008", price: 45.00, stock: 290, category: "Accessories" },
];

const Catalog = () => {
  return (
    <>
      <TopBar title="Catalog" subtitle="Manage products across stores" />
      <div className="p-6 space-y-6 overflow-auto">
        <div className="bg-card rounded-lg border border-border shadow-card animate-fade-in">
          <div className="p-5 border-b border-border">
            <SectionHeader
              title={`Products (${products.length})`}
              action={
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Filter products…" className="pl-9 h-9 w-52 text-sm" />
                  </div>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" />
                    Add Product
                  </Button>
                </div>
              }
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
            {products.map((product, i) => (
              <div
                key={product.id}
                className="border border-border rounded-lg p-4 hover:shadow-card-hover transition-shadow cursor-pointer animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-full h-28 bg-secondary rounded-md flex items-center justify-center mb-3">
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{product.sku}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-semibold text-foreground">${product.price}</span>
                  <span className="text-xs text-muted-foreground">{product.stock} in stock</span>
                </div>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                  {product.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Catalog;
