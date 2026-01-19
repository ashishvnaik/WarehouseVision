import { AlertCard } from '../AlertCard';

export default function AlertCardExample() {
  return (
    <div className="p-8 space-y-2 max-w-md">
      <AlertCard 
        id="1"
        itemName="Steel Pallets (A-Zone)"
        currentCount={3}
        threshold={10}
        severity="critical"
        onDismiss={(id) => console.log('Dismissed alert:', id)}
      />
      <AlertCard 
        id="2"
        itemName="Cardboard Boxes (B-Zone)"
        currentCount={8}
        threshold={15}
        severity="warning"
      />
      <AlertCard 
        id="3"
        itemName="Plastic Containers"
        currentCount={25}
        threshold={20}
        severity="info"
      />
    </div>
  );
}
