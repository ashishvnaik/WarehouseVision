import { UploadZone } from '../UploadZone';

export default function UploadZoneExample() {
  return (
    <div className="p-8 max-w-3xl">
      <UploadZone onFilesSelected={(files) => console.log('Files:', files)} />
    </div>
  );
}
