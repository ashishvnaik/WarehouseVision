import { ImageAnnotationViewer } from '../ImageAnnotationViewer';

export default function ImageAnnotationViewerExample() {
  const mockDetections = [
    { label: 'Steel Pallets', confidence: 94 },
    { label: 'Cardboard Boxes', confidence: 87 },
    { label: 'Plastic Containers', confidence: 92 },
  ];

  return (
    <div className="p-8 max-w-md">
      <ImageAnnotationViewer 
        detections={mockDetections}
        timestamp="2 mins ago"
      />
    </div>
  );
}
