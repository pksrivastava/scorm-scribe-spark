import { useCallback } from "react";
import { Upload, FileArchive } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
}

export const UploadSection = ({ onFileUpload }: UploadSectionProps) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.zip')) {
        onFileUpload(file);
        toast.success("SCORM package uploaded successfully!");
      } else {
        toast.error("Please upload a valid SCORM ZIP file");
      }
    },
    [onFileUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.name.endsWith('.zip')) {
        onFileUpload(file);
        toast.success("SCORM package uploaded successfully!");
      } else {
        toast.error("Please upload a valid SCORM ZIP file");
      }
    },
    [onFileUpload]
  );

  const handleDemoMode = () => {
    // Create a dummy file for demo purposes
    const demoContent = "Demo SCORM Package";
    const blob = new Blob([demoContent], { type: 'application/zip' });
    const demoFile = new File([blob], 'demo-scorm-package.zip', { type: 'application/zip' });
    onFileUpload(demoFile);
    toast.success("Demo SCORM package loaded!");
  };

  return (
    <Card
      className="relative overflow-hidden border-2 border-dashed border-primary/30 bg-gradient-to-br from-card via-card/80 to-card/50 hover:border-primary/60 transition-all duration-300"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      
      <label htmlFor="file-upload" className="block cursor-pointer">
        <div className="relative p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/50">
                <Upload className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <FileArchive className="w-5 h-5 text-accent" />
              </div>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Upload SCORM Package
          </h3>
          <p className="text-muted-foreground mb-2">
            Drag and drop your SCORM ZIP file here, or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports SCORM 1.2 and SCORM 2004 packages
          </p>
        </div>
        <input
          id="file-upload"
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleFileInput}
        />
      </label>
    </Card>
  );
};
