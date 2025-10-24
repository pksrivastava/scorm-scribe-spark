import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Video, Image, Code, Music, AlertCircle, CheckCircle, Download } from "lucide-react";
import type { ScormAnalysis } from "@/utils/scormAnalyzer";
import { toast } from "sonner";
import JSZip from "jszip";

interface ScormAnalysisReportProps {
  analysis: ScormAnalysis;
}

export const ScormAnalysisReport = ({ analysis }: ScormAnalysisReportProps) => {
  const downloadFile = async (file: { path: string; content?: string; blob?: Blob }, type: string) => {
    try {
      let blob: Blob;
      let filename = file.path.split('/').pop() || 'download';

      if (file.blob) {
        blob = file.blob;
      } else if (file.content) {
        blob = new Blob([file.content], { type: 'text/plain' });
      } else {
        toast.error('File content not available');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const downloadAllOfType = async (files: any[], type: string) => {
    try {
      const zip = new JSZip();
      const folder = zip.folder(type);

      for (const file of files) {
        const filename = file.path.split('/').pop() || `${type}_${Date.now()}`;
        if (file.blob) {
          folder?.file(filename, file.blob);
        } else if (file.content) {
          folder?.file(filename, file.content);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded all ${type} files`);
    } catch (error) {
      console.error('Download all error:', error);
      toast.error(`Failed to download ${type} files`);
    }
  };
  return (
    <div className="space-y-4">
      <Card className="p-6 bg-gradient-to-br from-card to-card/50">
        <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          SCORM Package Analysis Report
        </h3>

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Format</p>
            <p className="font-semibold">{analysis.format}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Version</p>
            <p className="font-semibold">{analysis.version}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Structure Items</p>
            <p className="font-semibold">{analysis.structure.length}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Resources</p>
            <p className="font-semibold">{analysis.resources.length}</p>
          </div>
        </div>

        {/* Course Info */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2">Course Information</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Title:</span>{" "}
              <span className="font-medium">{analysis.title}</span>
            </div>
            {analysis.metadata.description && (
              <div>
                <span className="text-muted-foreground">Description:</span>{" "}
                <span>{analysis.metadata.description}</span>
              </div>
            )}
            {analysis.metadata.duration && (
              <div>
                <span className="text-muted-foreground">Duration:</span>{" "}
                <span>{analysis.metadata.duration}</span>
              </div>
            )}
            {analysis.metadata.keywords?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-muted-foreground">Keywords:</span>
                {analysis.metadata.keywords.map((keyword: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Files */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Content Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">HTML Files</p>
                <p className="font-semibold">{analysis.contentFiles.html.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Video className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Videos</p>
                <p className="font-semibold">{analysis.contentFiles.videos.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Music className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Audio</p>
                <p className="font-semibold">{analysis.contentFiles.audio.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Image className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Images</p>
                <p className="font-semibold">{analysis.contentFiles.images.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Code className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">JavaScript</p>
                <p className="font-semibold">{analysis.contentFiles.javascript.length}</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <Code className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-xs text-muted-foreground">CSS</p>
                <p className="font-semibold">{analysis.contentFiles.css.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assessments */}
        {analysis.assessments.length > 0 && (
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Detected Assessments</h4>
            <div className="space-y-2">
              {analysis.assessments.map((assessment: any, idx: number) => (
                <div key={idx} className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{assessment.file}</span>
                    <Badge>{assessment.questionCount} questions</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Structure */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="structure">
            <AccordionTrigger>Course Structure (Detailed)</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {analysis.structure.map((item: any, idx: number) => (
                  <StructureItem key={idx} item={item} level={0} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="resources">
            <AccordionTrigger>Resources ({analysis.resources.length})</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {analysis.resources.map((resource: any, idx: number) => (
                  <div key={idx} className="p-2 bg-muted/50 rounded text-sm">
                    <div className="font-medium">{resource.identifier}</div>
                    <div className="text-xs text-muted-foreground">
                      Type: {resource.type} | Entry: {resource.href}
                    </div>
                    {resource.files && resource.files.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {resource.files.length} file(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {analysis.contentFiles.videos.length > 0 && (
            <AccordionItem value="videos">
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <span>Video Files ({analysis.contentFiles.videos.length})</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadAllOfType(analysis.contentFiles.videos, 'videos');
                    }}
                    className="gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download All
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {analysis.contentFiles.videos.map((video, idx: number) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-mono text-foreground">{video.path}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(video.size / 1024 / 1024).toFixed(2)} MB • {video.type}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadFile(video, 'video')}
                        className="gap-2"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {analysis.contentFiles.audio.length > 0 && (
            <AccordionItem value="audio">
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <span>Audio Files ({analysis.contentFiles.audio.length})</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadAllOfType(analysis.contentFiles.audio, 'audio');
                    }}
                    className="gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download All
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {analysis.contentFiles.audio.map((audio, idx: number) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-mono text-foreground">{audio.path}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(audio.size / 1024 / 1024).toFixed(2)} MB • {audio.type}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadFile(audio, 'audio')}
                        className="gap-2"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {analysis.contentFiles.images.length > 0 && (
            <AccordionItem value="images">
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <span>Images ({analysis.contentFiles.images.length})</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadAllOfType(analysis.contentFiles.images, 'images');
                    }}
                    className="gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download All
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {analysis.contentFiles.images.map((image, idx: number) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-mono text-foreground">{image.path}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(image.size / 1024).toFixed(2)} KB • {image.type}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadFile(image, 'image')}
                        className="gap-2"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {analysis.contentFiles.pdfs.length > 0 && (
            <AccordionItem value="pdfs">
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <span>PDF Files ({analysis.contentFiles.pdfs.length})</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadAllOfType(analysis.contentFiles.pdfs, 'pdfs');
                    }}
                    className="gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download All
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {analysis.contentFiles.pdfs.map((pdf, idx: number) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-mono text-foreground">{pdf.path}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(pdf.size / 1024).toFixed(2)} KB • {pdf.type}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadFile(pdf, 'pdf')}
                        className="gap-2"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {analysis.contentFiles.epubs.length > 0 && (
            <AccordionItem value="epubs">
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <span>EPUB Files ({analysis.contentFiles.epubs.length})</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadAllOfType(analysis.contentFiles.epubs, 'epubs');
                    }}
                    className="gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download All
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {analysis.contentFiles.epubs.map((epub, idx: number) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-mono text-foreground">{epub.path}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(epub.size / 1024).toFixed(2)} KB • {epub.type}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadFile(epub, 'epub')}
                        className="gap-2"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {analysis.contentFiles.html.length > 0 && (
            <AccordionItem value="html">
              <AccordionTrigger>HTML Files ({analysis.contentFiles.html.length})</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {analysis.contentFiles.html.map((htmlFile, idx: number) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded">
                      <div className="text-sm font-mono text-foreground">{htmlFile.path}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {(htmlFile.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </Card>
    </div>
  );
};

const StructureItem = ({ item, level }: { item: any; level: number }) => {
  return (
    <div style={{ marginLeft: `${level * 20}px` }} className="space-y-1">
      <div className="p-2 bg-muted/50 rounded-lg text-sm">
        <div className="font-medium">{item.title}</div>
        <div className="text-xs text-muted-foreground">
          ID: {item.identifier}
          {item.identifierref && ` | Ref: ${item.identifierref}`}
        </div>
      </div>
      {item.children?.map((child: any, idx: number) => (
        <StructureItem key={idx} item={child} level={level + 1} />
      ))}
    </div>
  );
};
