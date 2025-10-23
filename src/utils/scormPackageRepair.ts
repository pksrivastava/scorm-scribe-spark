import JSZip from 'jszip';
import { toast } from 'sonner';

export interface RepairResult {
  success: boolean;
  repairedFile?: File;
  issues: string[];
  fixes: string[];
  warnings: string[];
}

export const validateAndRepairScormPackage = async (file: File): Promise<RepairResult> => {
  const issues: string[] = [];
  const fixes: string[] = [];
  const warnings: string[] = [];

  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    
    // Check for manifest
    let manifestFile = contents.file('imsmanifest.xml');
    if (!manifestFile) {
      issues.push('Missing imsmanifest.xml');
      
      // Try case-insensitive search
      const files = Object.keys(contents.files);
      const manifestMatch = files.find(f => f.toLowerCase() === 'imsmanifest.xml');
      
      if (manifestMatch) {
        manifestFile = contents.file(manifestMatch);
        fixes.push(`Found manifest with different case: ${manifestMatch}`);
      } else {
        // Try to create a basic manifest
        const basicManifest = createBasicManifest(files);
        contents.file('imsmanifest.xml', basicManifest);
        fixes.push('Created basic SCORM 1.2 manifest');
      }
    }

    // Validate manifest structure
    if (manifestFile) {
      const manifestContent = await manifestFile.async('string');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(manifestContent, 'text/xml');
      
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        issues.push('Malformed XML in manifest');
        
        // Try to fix common XML issues
        let fixedXml = manifestContent
          .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
          .replace(/<([^>]+)>([^<]*)<\/\1\s*>/g, '<$1>$2</$1>');
        
        const fixedDoc = parser.parseFromString(fixedXml, 'text/xml');
        if (!fixedDoc.querySelector('parsererror')) {
          contents.file('imsmanifest.xml', fixedXml);
          fixes.push('Fixed XML encoding issues in manifest');
        }
      }

      // Check for resources section
      const resources = xmlDoc.getElementsByTagName('resource');
      if (resources.length === 0) {
        issues.push('No resources defined in manifest');
        warnings.push('Package may not have proper resource definitions');
      }

      // Check for entry points
      let hasValidEntry = false;
      for (let i = 0; i < resources.length; i++) {
        const href = resources[i].getAttribute('href');
        if (href) {
          const entryFile = contents.file(href);
          if (entryFile) {
            hasValidEntry = true;
            break;
          } else {
            issues.push(`Entry point not found: ${href}`);
            
            // Try to find similar files
            const possibleFiles = Object.keys(contents.files).filter(f => 
              f.toLowerCase().includes(href.toLowerCase().split('.')[0]) ||
              f.toLowerCase().endsWith('.html') ||
              f.toLowerCase().endsWith('.htm')
            );
            
            if (possibleFiles.length > 0) {
              warnings.push(`Possible alternative entry: ${possibleFiles[0]}`);
            }
          }
        }
      }

      if (!hasValidEntry) {
        // Find any HTML file to use as entry
        const htmlFiles = Object.keys(contents.files).filter(f => 
          f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm')
        );
        
        if (htmlFiles.length > 0) {
          const newEntry = htmlFiles[0];
          fixes.push(`Set ${newEntry} as default entry point`);
          
          // Update manifest with new entry point
          const updatedManifest = addEntryPointToManifest(manifestContent, newEntry);
          contents.file('imsmanifest.xml', updatedManifest);
        } else {
          issues.push('No HTML entry point found in package');
        }
      }
    }

    // Check for common SCORM runtime files
    const commonFiles = ['scormdriver.js', 'apibridge.js', 'scorm.js'];
    const missingRuntimeFiles = commonFiles.filter(f => !contents.file(f));
    
    if (missingRuntimeFiles.length > 0) {
      warnings.push(`Missing common SCORM runtime files: ${missingRuntimeFiles.join(', ')}`);
    }

    // Validate file structure
    const allFiles = Object.keys(contents.files);
    const hasContent = allFiles.some(f => 
      f.toLowerCase().endsWith('.html') || 
      f.toLowerCase().endsWith('.htm') ||
      f.toLowerCase().endsWith('.swf')
    );

    if (!hasContent) {
      issues.push('No content files (HTML/SWF) found in package');
    }

    // Generate repaired file if fixes were made
    if (fixes.length > 0) {
      const repairedBlob = await contents.generateAsync({ type: 'blob' });
      const repairedFile = new File([repairedBlob], file.name, { type: 'application/zip' });
      
      toast.success(`Applied ${fixes.length} fix(es) to SCORM package`);
      
      return {
        success: true,
        repairedFile,
        issues,
        fixes,
        warnings
      };
    }

    // If no repairs needed but there are warnings
    if (warnings.length > 0) {
      toast.info(`Package loaded with ${warnings.length} warning(s)`);
    }

    return {
      success: issues.length === 0,
      issues,
      fixes,
      warnings
    };

  } catch (error) {
    console.error('Error validating SCORM package:', error);
    issues.push(error instanceof Error ? error.message : 'Unknown validation error');
    
    return {
      success: false,
      issues,
      fixes,
      warnings
    };
  }
};

const createBasicManifest = (files: string[]): string => {
  const htmlFile = files.find(f => f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm')) || 'index.html';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.scorm.manifesttemplate" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>SCORM Content</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>Main Content</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="${htmlFile}">
      <file href="${htmlFile}"/>
    </resource>
  </resources>
</manifest>`;
};

const addEntryPointToManifest = (manifestContent: string, entryPoint: string): string => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(manifestContent, 'text/xml');
  
  // Find or create resources section
  let resources = xmlDoc.querySelector('resources');
  if (!resources) {
    resources = xmlDoc.createElement('resources');
    xmlDoc.documentElement.appendChild(resources);
  }

  // Create new resource element
  const resource = xmlDoc.createElement('resource');
  resource.setAttribute('identifier', 'resource_1');
  resource.setAttribute('type', 'webcontent');
  resource.setAttribute('adlcp:scormtype', 'sco');
  resource.setAttribute('href', entryPoint);

  const file = xmlDoc.createElement('file');
  file.setAttribute('href', entryPoint);
  resource.appendChild(file);

  // Add as first resource
  if (resources.firstChild) {
    resources.insertBefore(resource, resources.firstChild);
  } else {
    resources.appendChild(resource);
  }

  // Serialize back to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(xmlDoc);
};
