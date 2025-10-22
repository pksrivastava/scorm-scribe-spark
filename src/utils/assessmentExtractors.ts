import type { Question } from './scormAnalyzer';

// Extract QTI (Question & Test Interoperability) format questions
export const extractQTIQuestions = (xml: string): Question[] => {
  const questions: Question[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  
  // Look for assessmentItem elements (QTI 2.x)
  const items = doc.querySelectorAll('assessmentItem, item');
  
  items.forEach((item, index) => {
    const identifier = item.getAttribute('identifier') || `qti_${index + 1}`;
    const title = item.getAttribute('title') || '';
    
    // Get question text from itemBody or presentation
    const itemBody = item.querySelector('itemBody, presentation');
    const questionText = itemBody?.textContent?.trim() || title;
    
    // Get interaction type
    const interaction = item.querySelector('[class*="Interaction"], interaction');
    const interactionType = interaction?.tagName.toLowerCase() || 'unknown';
    
    // Extract choices
    const choices = Array.from(item.querySelectorAll('simpleChoice, response_label')).map(
      choice => choice.textContent?.trim() || ''
    ).filter(Boolean);
    
    // Extract correct response
    const responseDeclaration = item.querySelector('responseDeclaration');
    const correctResponse = responseDeclaration?.querySelector('correctResponse value')?.textContent?.trim();
    
    // Determine question type
    let questionType: Question['type'] = 'unknown';
    if (interactionType.includes('choice')) {
      questionType = interactionType.includes('multiple') ? 'multiple-select' : 'multiple-choice';
    } else if (interactionType.includes('text')) {
      questionType = 'text-input';
    } else if (interactionType.includes('match')) {
      questionType = 'matching';
    }
    
    questions.push({
      id: identifier,
      type: questionType,
      text: questionText,
      options: choices.length > 0 ? choices : undefined,
      correctAnswer: correctResponse,
      metadata: {
        source: 'qti',
        title
      }
    });
  });
  
  return questions;
};

// Extract questions from JavaScript (Articulate Storyline, Adobe Captivate)
export const extractJavaScriptQuestions = (js: string, filename: string): Question[] => {
  const questions: Question[] = [];
  
  // Articulate Storyline patterns
  if (js.includes('articulate') || js.includes('storyline')) {
    // Look for question data structures
    const questionMatches = js.matchAll(/question[s]?\s*[=:]\s*\[([^\]]+)\]/gi);
    for (const match of questionMatches) {
      try {
        // Attempt to parse question objects
        const questionsText = match[1];
        const questionObjects = questionsText.split(/},\s*{/);
        
        questionObjects.forEach((qObj, index) => {
          const textMatch = qObj.match(/text['":\s]+['"]([^'"]+)['"]/i);
          const typeMatch = qObj.match(/type['":\s]+['"]([^'"]+)['"]/i);
          
          if (textMatch) {
            questions.push({
              id: `articulate_${filename}_${index}`,
              type: typeMatch?.[1] as Question['type'] || 'unknown',
              text: textMatch[1],
              metadata: {
                source: 'articulate',
                filename
              }
            });
          }
        });
      } catch (error) {
        console.error('Error parsing Articulate questions:', error);
      }
    }
  }
  
  // Adobe Captivate patterns
  if (js.includes('captivate') || js.includes('cpQuizInfoStudentName')) {
    const quizMatches = js.matchAll(/quiz[A-Z][a-z]+\s*=\s*['""]([^'""]+)['""]/gi);
    for (const match of quizMatches) {
      questions.push({
        id: `captivate_${filename}_${questions.length}`,
        type: 'unknown',
        text: match[1],
        metadata: {
          source: 'captivate',
          filename
        }
      });
    }
  }
  
  // Generic JavaScript quiz patterns
  const genericPatterns = [
    /question[s]?\s*:\s*['"]([^'"]+)['"]/gi,
    /prompt\s*:\s*['"]([^'"]+)['"]/gi,
    /query\s*:\s*['"]([^'"]+)['"]/gi
  ];
  
  for (const pattern of genericPatterns) {
    const matches = js.matchAll(pattern);
    for (const match of matches) {
      if (match[1].length > 20 && match[1].includes('?')) {
        questions.push({
          id: `js_generic_${filename}_${questions.length}`,
          type: 'unknown',
          text: match[1],
          metadata: {
            source: 'javascript',
            filename
          }
        });
      }
    }
  }
  
  return questions;
};

// Extract SCORM interaction objectives as questions
export const extractSCORMInteractionQuestions = (xmlDoc: Document): Question[] => {
  const questions: Question[] = [];
  
  const interactions = xmlDoc.querySelectorAll('interaction, cmi\\.interactions');
  
  interactions.forEach((interaction, index) => {
    const id = interaction.getAttribute('id') || `scorm_interaction_${index}`;
    const type = interaction.getAttribute('type') || 'unknown';
    const description = interaction.querySelector('description')?.textContent?.trim() || '';
    
    // Map SCORM interaction types to question types
    let questionType: Question['type'] = 'unknown';
    switch (type.toLowerCase()) {
      case 'choice':
      case 'multiple_choice':
        questionType = 'multiple-choice';
        break;
      case 'true-false':
      case 'true_false':
        questionType = 'true-false';
        break;
      case 'fill-in':
      case 'fill_in':
        questionType = 'fill-in-blank';
        break;
      case 'matching':
        questionType = 'matching';
        break;
      case 'performance':
      case 'essay':
        questionType = 'essay';
        break;
    }
    
    const correctResponses = Array.from(interaction.querySelectorAll('correct_response')).map(
      resp => resp.textContent?.trim() || ''
    );
    
    questions.push({
      id,
      type: questionType,
      text: description || `Interaction ${index + 1}`,
      correctAnswer: correctResponses.length > 0 ? correctResponses : undefined,
      metadata: {
        source: 'scorm_manifest',
        interactionType: type
      }
    });
  });
  
  return questions;
};
