import JSZip from 'jszip';
import { extractQTIQuestions, extractJavaScriptQuestions, extractSCORMInteractionQuestions } from './assessmentExtractors';

export interface MultimediaFile {
  path: string;
  size: number;
  type: string;
  duration?: number;
  blob?: Blob;
}

export interface Assessment {
  file: string;
  type: 'qti' | 'html' | 'javascript' | 'scorm' | 'unknown';
  questionCount: number;
  questions: Question[];
  metadata?: any;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'multiple-select' | 'true-false' | 'text-input' | 'matching' | 'fill-in-blank' | 'essay' | 'unknown';
  text: string;
  options?: string[];
  correctAnswer?: any;
  points?: number;
  feedback?: string;
  metadata?: any;
}

export interface ScormAnalysis {
  format: string;
  version: string;
  title: string;
  structure: any[];
  resources: any[];
  metadata: any;
  contentFiles: {
    html: string[];
    videos: MultimediaFile[];
    audio: MultimediaFile[];
    images: string[];
    javascript: string[];
    css: string[];
    other: string[];
  };
  assessments: Assessment[];
  interactions: any[];
  entryPoints: string[];
  multimediaExtracted: boolean;
}

export const analyzeScormPackage = async (file: File): Promise<ScormAnalysis> => {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  // Find manifest
  const manifestFile = contents.file("imsmanifest.xml");
  if (!manifestFile) {
    throw new Error("No imsmanifest.xml found");
  }

  const manifestContent = await manifestFile.async("string");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(manifestContent, "text/xml");

  // Detect SCORM version
  const version = detectScormVersion(xmlDoc);
  
  // Extract metadata
  const metadata = extractMetadata(xmlDoc);
  
  // Extract structure
  const structure = extractStructure(xmlDoc);
  
  // Extract resources
  const resources = extractResources(xmlDoc);
  
  // Categorize all files
  const contentFiles = await categorizeFiles(contents);
  
  // Extract assessments
  const assessments = await extractAssessments(contents, xmlDoc);
  
  // Extract interactions
  const interactions = extractInteractions(xmlDoc);
  
  // Get entry points
  const entryPoints = resources.map((r: any) => r.href).filter(Boolean);

  return {
    format: 'SCORM',
    version,
    title: metadata.title || 'Untitled Course',
    structure,
    resources,
    metadata,
    contentFiles,
    assessments,
    interactions,
    entryPoints,
    multimediaExtracted: contentFiles.videos.length > 0 || contentFiles.audio.length > 0
  };
};

const detectScormVersion = (xmlDoc: Document): string => {
  const schemaversion = xmlDoc.querySelector('schemaversion');
  if (schemaversion?.textContent?.includes('2004')) {
    return 'SCORM 2004';
  } else if (schemaversion?.textContent?.includes('1.2')) {
    return 'SCORM 1.2';
  }
  
  // Check by namespace
  const manifest = xmlDoc.querySelector('manifest');
  const xmlns = manifest?.getAttribute('xmlns');
  if (xmlns?.includes('2004')) return 'SCORM 2004';
  if (xmlns?.includes('1.2')) return 'SCORM 1.2';
  
  return 'Unknown';
};

const extractMetadata = (xmlDoc: Document): any => {
  const metadata: any = {};
  
  const titleElement = xmlDoc.querySelector('organizations > organization > title, metadata > lom > general > title > string');
  metadata.title = titleElement?.textContent?.trim() || '';
  
  const description = xmlDoc.querySelector('metadata > lom > general > description > string');
  metadata.description = description?.textContent?.trim() || '';
  
  const keywords = Array.from(xmlDoc.querySelectorAll('metadata > lom > general > keyword > string'))
    .map(k => k.textContent?.trim())
    .filter(Boolean);
  metadata.keywords = keywords;
  
  const duration = xmlDoc.querySelector('metadata > lom > educational > typicallearningtime > duration');
  metadata.duration = duration?.textContent?.trim() || '';
  
  return metadata;
};

const extractStructure = (xmlDoc: Document): any[] => {
  const items = Array.from(xmlDoc.querySelectorAll('organizations > organization > item'));
  
  const extractItem = (item: Element, level: number = 0): any => {
    const title = item.querySelector(':scope > title')?.textContent?.trim() || '';
    const identifier = item.getAttribute('identifier') || '';
    const identifierref = item.getAttribute('identifierref') || '';
    
    const childItems = Array.from(item.querySelectorAll(':scope > item'));
    const children = childItems.map(child => extractItem(child, level + 1));
    
    return {
      identifier,
      identifierref,
      title,
      level,
      children: children.length > 0 ? children : undefined
    };
  };
  
  return items.map(item => extractItem(item));
};

const extractResources = (xmlDoc: Document): any[] => {
  const resources = Array.from(xmlDoc.querySelectorAll('resources > resource'));
  
  return resources.map(resource => {
    const identifier = resource.getAttribute('identifier') || '';
    const type = resource.getAttribute('type') || '';
    const href = resource.getAttribute('href') || '';
    
    const files = Array.from(resource.querySelectorAll('file'))
      .map(file => file.getAttribute('href'))
      .filter(Boolean);
    
    return { identifier, type, href, files };
  });
};

const categorizeFiles = async (zip: JSZip): Promise<any> => {
  const categories = {
    html: [] as string[],
    videos: [] as MultimediaFile[],
    audio: [] as MultimediaFile[],
    images: [] as string[],
    javascript: [] as string[],
    css: [] as string[],
    other: [] as string[]
  };

  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.m4v'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.flac'];
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico'];
  
  const filePromises: Promise<void>[] = [];
  
  Object.keys(zip.files).forEach(filename => {
    const file = zip.files[filename];
    if (file.dir) return;
    
    const lower = filename.toLowerCase();
    
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      categories.html.push(filename);
    } else if (videoExts.some(ext => lower.endsWith(ext))) {
      // Extract video file with metadata
      filePromises.push(
        file.async('blob').then(blob => {
          categories.videos.push({
            path: filename,
            size: blob.size,
            type: blob.type || 'video/mp4',
            blob
          });
        })
      );
    } else if (audioExts.some(ext => lower.endsWith(ext))) {
      // Extract audio file with metadata
      filePromises.push(
        file.async('blob').then(blob => {
          categories.audio.push({
            path: filename,
            size: blob.size,
            type: blob.type || 'audio/mpeg',
            blob
          });
        })
      );
    } else if (imageExts.some(ext => lower.endsWith(ext))) {
      categories.images.push(filename);
    } else if (lower.endsWith('.js')) {
      categories.javascript.push(filename);
    } else if (lower.endsWith('.css')) {
      categories.css.push(filename);
    } else if (!lower.includes('imsmanifest.xml')) {
      categories.other.push(filename);
    }
  });

  await Promise.all(filePromises);
  return categories;
};

const extractAssessments = async (zip: JSZip, xmlDoc: Document): Promise<Assessment[]> => {
  const assessments: Assessment[] = [];
  
  // 1. Look for QTI XML files
  const qtiFiles = Object.keys(zip.files).filter(f => 
    f.toLowerCase().includes('qti') || f.toLowerCase().endsWith('.xml')
  );
  
  for (const qtiFile of qtiFiles) {
    const file = zip.files[qtiFile];
    if (file && !file.dir && qtiFile !== 'imsmanifest.xml') {
      try {
        const content = await file.async('string');
        const qtiQuestions = extractQTIQuestions(content);
        if (qtiQuestions.length > 0) {
          assessments.push({
            file: qtiFile,
            type: 'qti',
            questionCount: qtiQuestions.length,
            questions: qtiQuestions
          });
        }
      } catch (error) {
        console.error(`Error reading QTI ${qtiFile}:`, error);
      }
    }
  }
  
  // 2. Look for JavaScript-based assessments (Articulate, Captivate)
  const jsFiles = Object.keys(zip.files).filter(f => 
    f.toLowerCase().endsWith('.js')
  );
  
  for (const jsFile of jsFiles) {
    const file = zip.files[jsFile];
    if (file && !file.dir) {
      try {
        const content = await file.async('string');
        const jsQuestions = extractJavaScriptQuestions(content, jsFile);
        if (jsQuestions.length > 0) {
          assessments.push({
            file: jsFile,
            type: 'javascript',
            questionCount: jsQuestions.length,
            questions: jsQuestions
          });
        }
      } catch (error) {
        console.error(`Error reading JS ${jsFile}:`, error);
      }
    }
  }
  
  // 3. Look for HTML-based assessments
  const htmlFiles = Object.keys(zip.files).filter(f => 
    f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm')
  );
  
  for (const htmlFile of htmlFiles) {
    const file = zip.files[htmlFile];
    if (file && !file.dir) {
      try {
        const content = await file.async('string');
        
        // Check for quiz/assessment indicators
        const hasQuiz = content.toLowerCase().includes('quiz') || 
                       content.toLowerCase().includes('assessment') ||
                       content.toLowerCase().includes('question') ||
                       content.toLowerCase().includes('test') ||
                       content.toLowerCase().includes('exam');
        
        if (hasQuiz) {
          const questions = extractQuestionsFromHTML(content);
          if (questions.length > 0) {
            assessments.push({
              file: htmlFile,
              type: 'html',
              questionCount: questions.length,
              questions
            });
          }
        }
      } catch (error) {
        console.error(`Error reading ${htmlFile}:`, error);
      }
    }
  }
  
  // 4. Extract from SCORM manifest interactions
  const scormQuestions = extractSCORMInteractionQuestions(xmlDoc);
  if (scormQuestions.length > 0) {
    assessments.push({
      file: 'imsmanifest.xml',
      type: 'scorm',
      questionCount: scormQuestions.length,
      questions: scormQuestions
    });
  }
  
  return assessments;
};

const extractQuestionsFromHTML = (html: string): Question[] => {
  const questions: Question[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Look for common question patterns
  const questionElements = doc.querySelectorAll('[class*="question"], [id*="question"], .quiz-item, .assessment-item, [data-question]');
  
  questionElements.forEach((element, index) => {
    const text = element.textContent?.trim() || '';
    if (text.length > 10) {
      const options = extractOptions(element);
      const correctAnswer = extractCorrectAnswer(element);
      
      questions.push({
        id: `html_q_${index + 1}`,
        type: detectQuestionType(element),
        text: text.substring(0, 500),
        options: options.length > 0 ? options : undefined,
        correctAnswer,
        points: extractPoints(element)
      });
    }
  });
  
  return questions;
};

const extractOptions = (element: Element): string[] => {
  const options: string[] = [];
  
  // Look for radio buttons or checkboxes
  const inputs = element.querySelectorAll('input[type="radio"], input[type="checkbox"]');
  inputs.forEach(input => {
    const label = input.nextElementSibling || input.parentElement;
    const text = label?.textContent?.trim();
    if (text && text.length > 0) {
      options.push(text);
    }
  });
  
  // Look for list items
  if (options.length === 0) {
    const listItems = element.querySelectorAll('li, .option, [class*="choice"]');
    listItems.forEach(item => {
      const text = item.textContent?.trim();
      if (text && text.length > 0) {
        options.push(text);
      }
    });
  }
  
  return options;
};

const extractCorrectAnswer = (element: Element): any => {
  // Look for checked inputs
  const checked = element.querySelector('input:checked');
  if (checked) {
    return checked.getAttribute('value') || true;
  }
  
  // Look for data attributes
  const correctAttr = element.getAttribute('data-correct') || element.getAttribute('data-answer');
  if (correctAttr) {
    return correctAttr;
  }
  
  return undefined;
};

const extractPoints = (element: Element): number | undefined => {
  const pointsAttr = element.getAttribute('data-points') || element.getAttribute('data-score');
  return pointsAttr ? parseInt(pointsAttr, 10) : undefined;
};

const detectQuestionType = (element: Element): Question['type'] => {
  const html = element.innerHTML.toLowerCase();
  
  if (html.includes('type="radio"')) return 'multiple-choice';
  if (html.includes('type="checkbox"')) return 'multiple-select';
  if (html.includes('textarea')) return 'essay';
  if (html.includes('type="text"')) return 'text-input';
  if (html.includes('true') && html.includes('false')) return 'true-false';
  
  return 'unknown';
};

const extractInteractions = (xmlDoc: Document): any[] => {
  const interactions: any[] = [];
  
  // Extract from sequencing rules if present
  const sequencingElements = xmlDoc.querySelectorAll('sequencing');
  sequencingElements.forEach(seq => {
    const rules = Array.from(seq.querySelectorAll('sequencingRule'));
    rules.forEach(rule => {
      interactions.push({
        type: 'sequencing',
        conditions: Array.from(rule.querySelectorAll('ruleCondition')).map(c => c.textContent?.trim()),
        action: rule.querySelector('ruleAction')?.textContent?.trim()
      });
    });
  });
  
  return interactions;
};
