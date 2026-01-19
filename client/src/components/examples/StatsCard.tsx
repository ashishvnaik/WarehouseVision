import { StatsCard } from '../StatsCard';
import { Package } from 'lucide-react';

export default function StatsCardExample() {
  return (
    <div className="p-8">
      <StatsCard 
        title="Total Items" 
        value="2,847" 
        icon={Package}
        trend={{ value: 12.5, isPositive: true }}
      />
    </div>
  );
}
