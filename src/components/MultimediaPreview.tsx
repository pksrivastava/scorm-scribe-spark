import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Maximize } from "lucide-react";
import type { MultimediaFile } from "@/utils/scormAnalyzer";

interface MultimediaPreviewProps {
  files: MultimediaFile[];
  type: 'video' | 'audio';
}

export const MultimediaPreview = ({ files, type }: MultimediaPreviewProps) => {
  const [selectedFile, setSelectedFile] = useState<MultimediaFile | null>(files[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (files.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No {type} files found in this SCORM package
      </Card>
    );
  }

  const handleDownload = (file: MultimediaFile) => {
    if (file.blob) {
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.path.split('/').pop() || `${type}.file`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* File List */}
      <Card className="p-4 lg:col-span-1">
        <h3 className="font-semibold mb-3">
          {type === 'video' ? 'Video' : 'Audio'} Files ({files.length})
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.map((file, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedFile(file)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                selectedFile === file 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <div className="text-sm font-medium truncate">{file.path.split('/').pop()}</div>
              <div className="text-xs opacity-70 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Preview Player */}
      <Card className="p-6 lg:col-span-2">
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selectedFile.path.split('/').pop()}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedFile.type} • {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(selectedFile)}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>

            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {type === 'video' ? (
                <video
                  src={selectedFile.blob ? URL.createObjectURL(selectedFile.blob) : ''}
                  controls
                  className="w-full h-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="w-full p-8">
                  <audio
                    src={selectedFile.blob ? URL.createObjectURL(selectedFile.blob) : ''}
                    controls
                    className="w-full"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  const media = document.querySelector(type) as HTMLMediaElement;
                  if (media) {
                    if (isPlaying) {
                      media.pause();
                    } else {
                      media.play();
                    }
                  }
                }}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => {
                  const media = document.querySelector(type) as HTMLMediaElement;
                  if (media) {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      media.requestFullscreen();
                    }
                  }
                }}
              >
                <Maximize className="w-4 h-4" />
                Fullscreen
              </Button>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm">Available Formats</h4>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-background rounded text-xs">Original</span>
                <span className="px-2 py-1 bg-background rounded text-xs opacity-50">MP4 (Processing)</span>
                <span className="px-2 py-1 bg-background rounded text-xs opacity-50">HLS (Processing)</span>
                <span className="px-2 py-1 bg-background rounded text-xs opacity-50">DASH (Processing)</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Additional formats will be available after processing completes
              </p>
            </div>
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center text-muted-foreground">
            Select a file to preview
          </div>
        )}
      </Card>
    </div>
  );
};
