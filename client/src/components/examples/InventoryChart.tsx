import { InventoryChart } from '../InventoryChart';

export default function InventoryChartExample() {
  const mockData = [
    { name: 'Mon', count: 45 },
    { name: 'Tue', count: 52 },
    { name: 'Wed', count: 38 },
    { name: 'Thu', count: 61 },
    { name: 'Fri', count: 48 },
    { name: 'Sat', count: 35 },
    { name: 'Sun', count: 42 },
  ];

  return (
    <div className="p-8">
      <InventoryChart title="Items Tracked This Week" data={mockData} />
    </div>
  );
}
