import { Card } from "@/components/ui/card";
import { Upload, FileImage, Film } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  onFilesSelected?: (files: File[]) => void;
}

export function UploadZone({ onFilesSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesSelected?.(updatedFiles);
    console.log('Files selected:', newFiles.map(f => f.name));
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesSelected?.(updatedFiles);
  };

  return (
    <div className="space-y-4">
      <Card
        className={`p-8 border-2 border-dashed transition-colors relative ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="upload-zone"
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium mb-1">Drop images or videos here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileImage className="h-4 w-4" />
              <span>JPG, PNG</span>
            </div>
            <div className="flex items-center gap-1">
              <Film className="h-4 w-4" />
              <span>MP4, MOV</span>
            </div>
          </div>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            data-testid="input-file-upload"
          />
        </div>
      </Card>

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <Card key={index} className="p-2 relative group" data-testid={`file-preview-${index}`}>
              <div className="aspect-square bg-muted rounded flex items-center justify-center">
                {file.type.startsWith('image/') ? (
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Film className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs mt-2 truncate" title={file.name}>{file.name}</p>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
                data-testid={`button-remove-file-${index}`}
              >
                <Upload className="h-3 w-3 rotate-180" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
