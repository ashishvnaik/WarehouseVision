import { InventoryTable } from '../InventoryTable';

export default function InventoryTableExample() {
  const mockItems = [
    { id: '1', name: 'Steel Pallets', sku: 'PLT-001', location: 'A-Zone', currentCount: 3, minThreshold: 10, category: 'Pallets', lastUpdated: '2 hours ago' },
    { id: '2', name: 'Cardboard Boxes', sku: 'BOX-102', location: 'B-Zone', currentCount: 45, minThreshold: 20, category: 'Packaging', lastUpdated: '1 day ago' },
    { id: '3', name: 'Plastic Containers', sku: 'CNT-205', location: 'C-Zone', currentCount: 0, minThreshold: 15, category: 'Containers', lastUpdated: '3 days ago' },
  ];

  return (
    <div className="p-8">
      <InventoryTable 
        items={mockItems} 
        onEdit={(id) => console.log('Edit item:', id)}
      />
    </div>
  );
}
