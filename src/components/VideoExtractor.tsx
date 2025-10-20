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

        // Look for video files in order from manifest
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.flv'];
        const fileList: { name: string; entry: any }[] = [];

        // First, try to get order from manifest
        const manifestFile = contents.file("imsmanifest.xml");
        let orderedFiles: string[] = [];

        if (manifestFile) {
          try {
            const manifestContent = await manifestFile.async("string");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(manifestContent, "text/xml");
            
            // Get resources that reference video files
            const resources = Array.from(xmlDoc.getElementsByTagName("resource"));
            resources.forEach(resource => {
              const href = resource.getAttribute("href");
              const fileElements = Array.from(resource.getElementsByTagName("file"));
              fileElements.forEach(fileEl => {
                const fileHref = fileEl.getAttribute("href");
                if (fileHref && videoExtensions.some(ext => fileHref.toLowerCase().endsWith(ext))) {
                  orderedFiles.push(fileHref);
                }
              });
              if (href && videoExtensions.some(ext => href.toLowerCase().endsWith(ext))) {
                orderedFiles.push(href);
              }
            });
          } catch (error) {
            console.warn("Could not parse manifest for video order:", error);
          }
        }

        // Collect all video files
        for (const [filename, zipEntry] of Object.entries(contents.files)) {
          if (!zipEntry.dir && videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
            fileList.push({ name: filename, entry: zipEntry });
          }
        }

        // Sort by manifest order if available, otherwise alphabetically
        if (orderedFiles.length > 0) {
          fileList.sort((a, b) => {
            const indexA = orderedFiles.findIndex(f => a.name.includes(f) || f.includes(a.name));
            const indexB = orderedFiles.findIndex(f => b.name.includes(f) || f.includes(b.name));
            if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        } else {
          fileList.sort((a, b) => a.name.localeCompare(b.name));
        }

        // Extract video blobs
        for (const { name, entry } of fileList) {
          try {
            const blob = await entry.async("blob");
            const mimeType = name.toLowerCase().endsWith('.mp4') ? 'video/mp4' :
                           name.toLowerCase().endsWith('.webm') ? 'video/webm' :
                           name.toLowerCase().endsWith('.ogg') ? 'video/ogg' : 'video/mp4';
            const videoBlob = new Blob([blob], { type: mimeType });
            
            extractedVideos.push({
              name: name,
              size: blob.size,
              blob: videoBlob,
              url: URL.createObjectURL(videoBlob)
            });
          } catch (error) {
            console.error(`Error extracting ${name}:`, error);
          }
        }

        setVideos(extractedVideos);
        setLoading(false);
        
        if (extractedVideos.length > 0) {
          toast.success(`Extracted ${extractedVideos.length} video file(s) in sequence`);
        } else {
          toast.info("No video files found in SCORM package");
        }
      } catch (error) {
        console.error("Error extracting videos:", error);
        toast.error("Failed to extract videos: " + (error instanceof Error ? error.message : "Unknown error"));
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
    <div className="space-y-4">
      {videos.length > 0 && (
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <p className="text-sm">
            <strong>Sequence:</strong> Videos are displayed in the order they appear in the SCORM manifest or alphabetically.
          </p>
        </Card>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((video, index) => (
          <Card key={index} className="overflow-hidden hover:shadow-lg hover:shadow-primary/20 transition-all">
            <div className="aspect-video bg-muted relative group">
              <video
                src={video.url}
                className="w-full h-full object-cover"
                controls
                preload="metadata"
              />
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xs font-semibold text-primary">#{index + 1}</span>
                <h3 className="font-semibold truncate flex-1">{video.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {(video.size / 1024 / 1024).toFixed(2)} MB
              </p>
              
            <Button
              className="w-full gap-2"
              variant="outline"
              onClick={() => downloadVideo(video)}
            >
              <Download className="w-4 h-4" />
              Download Video {index + 1}
            </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
