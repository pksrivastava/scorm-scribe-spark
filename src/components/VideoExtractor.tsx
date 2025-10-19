import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Download, Play } from "lucide-react";
import JSZip from "jszip";
import { toast } from "sonner";

interface VideoExtractorProps {
  file: File;
}

interface ExtractedVideo {
  name: string;
  size: number;
  blob: Blob;
  url: string;
}

export const VideoExtractor = ({ file }: VideoExtractorProps) => {
  const [videos, setVideos] = useState<ExtractedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const extractVideos = async () => {
      try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        const extractedVideos: ExtractedVideo[] = [];

        // Look for video files
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
        
        for (const [filename, zipEntry] of Object.entries(contents.files)) {
          if (!zipEntry.dir && videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
            const blob = await zipEntry.async("blob");
            extractedVideos.push({
              name: filename,
              size: blob.size,
              blob: blob,
              url: URL.createObjectURL(blob)
            });
          }
        }

        setVideos(extractedVideos);
        setLoading(false);
        
        if (extractedVideos.length > 0) {
          toast.success(`Found ${extractedVideos.length} video file(s)`);
        } else {
          toast.info("No video files found in SCORM package");
        }
      } catch (error) {
        console.error("Error extracting videos:", error);
        toast.error("Failed to extract videos");
        setLoading(false);
      }
    };

    extractVideos();

    return () => {
      videos.forEach(video => URL.revokeObjectURL(video.url));
    };
  }, [file]);

  const downloadVideo = (video: ExtractedVideo) => {
    const a = document.createElement('a');
    a.href = video.url;
    a.download = video.name;
    a.click();
    toast.success(`Downloading ${video.name}`);
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Extracting videos...</p>
      </Card>
    );
  }

  if (videos.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No videos found in this SCORM package</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {videos.map((video, index) => (
        <Card key={index} className="overflow-hidden hover:shadow-lg hover:shadow-primary/20 transition-all">
          <div className="aspect-video bg-muted relative group">
            <video
              src={video.url}
              className="w-full h-full object-cover"
              controls
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent"
              >
                <Play className="w-8 h-8 ml-1" />
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <h3 className="font-semibold mb-2 truncate">{video.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {(video.size / 1024 / 1024).toFixed(2)} MB
            </p>
            
            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={() => downloadVideo(video)}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
