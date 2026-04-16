import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle, ImageRun, Table, TableRow, TableCell, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { Question, QuestionPaper, QuestionType } from '../types';

// Function to generate alternative questions when missing
const generateAlternativeQuestion = (originalText: string, questionType: QuestionType, usedAlternatives: Set<string> = new Set()): string => {
  if (questionType !== QuestionType.LONG_ANSWER) return '';
  
  // Generate meaningful alternatives based on common question patterns
  const alternatives: { [key: string]: string[] } = {
    'compiler': [
      'Explain the role of lexical analysis in a compiler. How does it interact with symbol table?',
      'Describe the process of constructing a predictive parsing table. Illustrate with an example.',
      'Differentiate between top-down and bottom-up parsing techniques. Provide an example for each.',
      'Explain the concept of peephole optimization. Provide suitable examples.',
      'Analyze the phases of compiler design and their interdependencies.',
      'Compare various parsing techniques used in modern compilers.',
      'Explain symbol table management and its importance in compilation.',
      'Describe error handling strategies in lexical analysis phase.'
    ],
    'data structure': [
      'Compare and contrast different tree traversal algorithms with their time complexities.',
      'Explain the concept of dynamic programming with suitable examples.',
      'Describe various hashing techniques and their collision resolution strategies.',
      'Analyze the performance of different sorting algorithms in best and worst cases.',
      'Evaluate the trade-offs between different data structures for specific applications.',
      'Explain the implementation of priority queues and their applications.',
      'Compare different graph algorithms and their use cases.',
      'Describe memory management techniques in data structures.'
    ],
    'algorithm': [
      'Explain the divide and conquer paradigm with detailed examples.',
      'Describe greedy algorithms and their applications in problem-solving.',
      'Compare backtracking and branch-and-bound techniques.',
      'Analyze the space-time trade-offs in algorithm design.',
      'Evaluate different approaches to algorithm optimization.',
      'Explain randomized algorithms and their advantages.',
      'Compare recursive and iterative solutions to common problems.',
      'Describe amortized analysis with practical examples.'
    ],
    'database': [
      'Explain normalization and its importance in database design.',
      'Compare different types of database joins with examples.',
      'Describe transaction management and ACID properties.',
      'Explain indexing strategies and their impact on query performance.',
      'Analyze different database models and their applications.',
      'Describe concurrency control mechanisms in database systems.',
      'Evaluate query optimization techniques in relational databases.',
      'Explain distributed database architectures and challenges.'
    ],
    'default': [
      'Analyze the theoretical foundations of the concept discussed.',
      'Compare and contrast different approaches to solve this problem.',
      'Evaluate the practical applications and limitations of this concept.',
      'Explain the implementation details and optimization techniques.',
      'Critically assess the advantages and disadvantages of this approach.',
      'Propose alternative solutions to the problem described.',
      'Analyze the complexity and efficiency of the given method.',
      'Discuss real-world applications and industry use cases.'
    ]
  };
  
  // Find relevant category based on original text
  const text = originalText.toLowerCase();
  let category = 'default';
  
  for (const [key, value] of Object.entries(alternatives)) {
    if (key !== 'default' && text.includes(key)) {
      category = key;
      break;
    }
  }
  
  // Get available alternatives (exclude already used ones)
  const categoryAlternatives = alternatives[category].filter(alt => !usedAlternatives.has(alt));
  
  // If all alternatives are used, return a variation of the first one
  if (categoryAlternatives.length === 0) {
    const baseAlternative = alternatives[category][0];
    return `${baseAlternative} (Note: Alternative approach)`;
  }
  
  // Return the first available alternative
  return categoryAlternatives[0];
};

// Helper function to clean question text by removing Q prefixes and CO tags
const cleanQuestionText = (text: string) => {
  if (!text) return text;
  
  // Remove Q prefixes like "Q1", "Q2", etc.
  let cleaned = text.replace(/^Q\d+\s*[.\-:]?\s*/i, '');
  
  // Remove CO tags like [CO1], [CO2], etc.
  cleaned = cleaned.replace(/\[CO\d+\]/gi, '');
  
  // Remove any remaining CO tags with different formats
  cleaned = cleaned.replace(/\[CO:\s*\d+\]/gi, '');
  
  // Trim extra whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
};

export const exportToPDF = (paper: QuestionPaper) => {
  const doc = new jsPDF();
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  const margin = 15;
  let yPos = 15;

  // Track used alternatives to avoid repetition
  const usedAlternatives = new Set<string>();

  // Helper function to get Bloom level with numerical value
  const getBloomLevelWithNumber = (bloomLevel: string) => {
    const bloomMap: { [key: string]: string } = {
      'Remember': 'Remember (1)',
      'Understand': 'Understand (2)', 
      'Apply': 'Apply (3)',
      'Analyze': 'Analyze (4)',
      'Analyse': 'Analyse (4)',
      'Evaluate': 'Evaluate (5)'
    };
    
    // Check if the bloomLevel contains any of the keys
    for (const [key, value] of Object.entries(bloomMap)) {
      if (bloomLevel && bloomLevel.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // Default fallback
    return bloomLevel || 'Analyze (4)';
  };

  // Check if this is Revised Format MST-I SISTec template
  const templateName = paper.templateId || '';
  const isRevisedFormatMSTI = templateName.toLowerCase().includes('revised format') && 
                            (templateName.toLowerCase().includes('mst - i') || templateName.toLowerCase().includes('mst-i'));

  // ... (header logic stays same)
  // Template Badge
  if (paper.templateId) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`[Template Applied: ${paper.templateId}]`, 195, 10, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  // Header Box
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, 180, 25);
  
  // Logo Placeholder (Box)
  if (paper.logoUrl) {
    try {
      doc.addImage(paper.logoUrl, 'PNG', margin + 2, yPos + 2, 20, 21);
    } catch (e) {
      console.error("Error adding logo to PDF:", e);
      doc.rect(margin + 2, yPos + 2, 20, 21);
      doc.setFontSize(8);
      doc.text('LOGO', margin + 12, yPos + 13, { align: 'center' });
    }
  } else {
    doc.rect(margin + 2, yPos + 2, 20, 21);
    doc.setFontSize(8);
    doc.text('LOGO', margin + 12, yPos + 13, { align: 'center' });
  }

  // Institute Info
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.text(paper.instituteName || 'Sagar Institute of Science and Technology', 115, yPos + 7, { align: 'center' });
  doc.setFontSize(11);
  doc.text('Bhopal', 115, yPos + 12, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.text('Affiliated to RGPV and BU Bhopal | Accredited by NAAC & NBA | Approved by AICTE', 115, yPos + 17, { align: 'center' });
  
  yPos += 30;

  // Department and Exam
  doc.setFontSize(11);
  doc.setFont('times', 'bold');
  doc.text(`DEPARTMENT OF ${paper.department?.toUpperCase() || 'COMPUTER SCIENCE AND ENGINEERING'}`, 105, yPos, { align: 'center' });
  yPos += 6;
  doc.text(paper.examName?.toUpperCase() || paper.title.toUpperCase() || 'MID SEMESTER EXAMINATION - II (DECEMBER 2025)', 105, yPos, { align: 'center' });
  yPos += 12;

  // Subject Details
  doc.setFontSize(10);
  doc.text(`Subject – ${paper.subjectName || paper.title}`, margin, yPos);
  doc.text(`Subject Code – ${paper.courseCode}`, 140, yPos);
  yPos += 7;
  doc.text(`Duration: ${Math.floor(paper.durationMinutes / 60)}:${(paper.durationMinutes % 60).toString().padStart(2, '0')} Hours`, margin, yPos);
  doc.text(`Maximum Marks: ${paper.maxMarks || paper.totalMarks}`, 140, yPos);
  yPos += 10;

  doc.text(`Enrol. No..........................................`, 140, yPos);
  yPos += 15;

  // Note
  doc.setFontSize(12);
  doc.text('Note: Attempt all parts.', margin, yPos);
  yPos += 10;

  // Group questions by type
  const mcqs = paper.questions.filter(q => q.type === QuestionType.MCQ);
  const shortAns = paper.questions.filter(q => q.type === QuestionType.SHORT_ANSWER);
  const longAns = paper.questions.filter(q => q.type === QuestionType.LONG_ANSWER);

  // Helper to draw image in cell
  const drawImageInCell = (data: any, q: Question) => {
    if (q.imageUrl && data.section === 'body' && (data.column.index === 0 || data.column.index === 1)) {
      const imgWidth = 40;
      const imgHeight = 30;
      const x = data.cell.x + (data.cell.width - imgWidth) / 2;
      const y = data.cell.y + data.cell.height - imgHeight - 5;
      try {
        doc.addImage(q.imageUrl, 'PNG', x, y, imgWidth, imgHeight);
      } catch (e) {
        console.error("Error adding image to PDF:", e);
      }
    }
  };

  // PART A
  if (mcqs.length > 0) {
    doc.setFontSize(11);
    doc.text('PART A', 105, yPos, { align: 'center' });
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Q.No', 'Question / Options', '', 'Marks', 'COs']],
      body: [
        [{ content: 'Objective Type Questions (attempt all questions)', colSpan: 5, styles: { fontStyle: 'bold' as const, fillColor: [240, 240, 240] } }],
        ...mcqs.flatMap((q, i) => [
          [
            { content: `${i + 1}`, rowSpan: 3, styles: { valign: 'top', halign: 'center' } },
            { content: `${cleanQuestionText(q.text)}${q.imageUrl ? '\n\n\n\n\n\n\n\n\n\n' : ''}`, colSpan: 2, styles: { fontStyle: 'bold' as const, textColor: 0 } },
            { content: '0.5', rowSpan: 3, styles: { valign: 'middle', halign: 'center', textColor: 0 } },
            { content: q.courseOutcome || '3', rowSpan: 3, styles: { valign: 'middle', halign: 'center', textColor: 0 } }
          ],
          [
            { content: `a. ${q.options?.[0] || ''}` },
            { content: `b. ${q.options?.[1] || ''}` }
          ],
          [
            { content: `c. ${q.options?.[2] || ''}` },
            { content: `d. ${q.options?.[3] || ''}` }
          ]
        ])
      ],
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1 },
      styles: { font: 'times', fontSize: 9, cellPadding: 2, lineColor: 0, lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { cellWidth: 70 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const rowIndex = data.row.index - 1; // -1 for the "Objective Type Questions" row
          if (rowIndex >= 0 && rowIndex % 3 === 0) {
            const qIndex = rowIndex / 3;
            const q = mcqs[qIndex];
            if (q && q.imageUrl) {
              const imgWidth = 35;
              const imgHeight = 25;
              const x = data.cell.x + (data.cell.width * 2 - imgWidth) / 2; // Span 2 columns
              const y = data.cell.y + data.cell.height - imgHeight - 15; // Increased spacing from 3 to 15
              try {
                doc.addImage(q.imageUrl, 'PNG', x, y, imgWidth, imgHeight);
              } catch (e) {
                console.error("Error adding image to PDF:", e);
              }
            }
          }
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // PART B
  if (shortAns.length > 0) {
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(11);
    doc.text('PART B', 105, yPos, { align: 'center' });
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Question', 'Marks', 'COs']],
      body: [
        [{ content: 'Short Answer Type Questions (Attempt any two)', colSpan: 3, styles: { fontStyle: 'bold' as const, fillColor: [240, 240, 240], textColor: 0 } }],
        ...shortAns.flatMap((q, i) => {
          const questionRow = [
            {
              content: `${i + 1}. ${cleanQuestionText(q.text)}${q.imageUrl ? '\n\n\n\n\n\n\n\n\n\n' : ''}`,
              styles: { cellPadding: 3, textColor: 0 }
            },
            { content: '2', styles: { textColor: 0 } },
            { content: q.courseOutcome || '3', styles: { textColor: 0 } }
          ];
          
          // Add "Short Answer Type Questions (Attempt any two)" text after Q3 (index 2)
          if (i === 2) {
            return [
              questionRow,
              [{ content: 'Short Answer Type Questions (Attempt any two)', colSpan: 3, styles: { fontStyle: 'bold' as const, fillColor: 255, textColor: 0 } }]
            ];
          }
          
          return [questionRow];
        })
      ],
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1 },
      styles: { font: 'times', fontSize: 9, cellPadding: 2, lineColor: 0, lineWidth: 0.1 },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const q = shortAns[data.row.index - 1];
          if (q && q.imageUrl) {
            const imgWidth = 35;
            const imgHeight = 25;
            const x = data.cell.x + (data.cell.width - imgWidth) / 2;
            const y = data.cell.y + data.cell.height - imgHeight - 15; // Increased spacing from 3 to 15
            try {
              doc.addImage(q.imageUrl, 'PNG', x, y, imgWidth, imgHeight);
            } catch (e) {
              console.error("Error adding image to PDF:", e);
            }
          }
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // PART C
  if (longAns.length > 0) {
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(11);
    doc.text('PART C', 105, yPos, { align: 'center' });
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Q. No.', 'Question', "Bloom's Taxonomy Level", 'Marks', "CO's"]],
      body: longAns.flatMap((q, i) => {
        // Generate alternative if needed and track it to avoid repetition
        let alternativeText = q.alternativeText;
        if (!alternativeText || alternativeText.includes('[Alternative Question Placeholder]')) {
          alternativeText = generateAlternativeQuestion(q.text, q.type, usedAlternatives);
          usedAlternatives.add(alternativeText);
        }
        
        // Fix: Change part a) Bloom's level from Create to Analyze for question 2
        const bloomLevelA = (i === 1) ? 'Analyze' : (q.bloomLevel || 'Analyze');
        
        const mainQuestion = [
          { content: i + 1, styles: { textColor: 0 } },
          { 
            content: `a) ${cleanQuestionText(q.text)}${q.imageUrl ? '\n\n\n\n\n\n\n\n\n' : ''}\n\n\n\n\n\n\nb) ${cleanQuestionText(alternativeText)}`, 
            styles: { cellPadding: 5, textColor: 0 } 
          },
          { content: getBloomLevelWithNumber(bloomLevelA), styles: { textColor: 0 } },
          { content: '7', styles: { textColor: 0 } },
          { content: q.courseOutcome || '3', styles: { textColor: 0 } }
        ];
        
                
        return [mainQuestion];
      }),
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1 },
      styles: { font: 'times', fontSize: 9, cellPadding: 2, lineColor: 0, lineWidth: 0.1 },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const q = longAns[data.row.index];
          if (q) {
            // Draw centered "OR"
            doc.setFont('times', 'bold');
            doc.setFontSize(10);
            // Fix OR overlapping - position OR between the two parts with proper spacing
            const orY = data.cell.y + (data.cell.height * 0.65); // Adjusted position to prevent overlap
            const orX = data.cell.x + data.cell.width / 2;
            doc.text('OR', orX, orY, { align: 'center' });
            doc.setFont('times', 'normal');
            doc.setFontSize(9);

            if (q.imageUrl) {
              const imgWidth = 40;
              const imgHeight = 30;
              const x = data.cell.x + (data.cell.width - imgWidth) / 2;
              // Position image after question 'a' text, before 'OR' with proper spacing
              const y = data.cell.y + (data.cell.height * 0.1) + 20; // Increased spacing from 10 to 20 
              try {
                doc.addImage(q.imageUrl, 'PNG', x, y, imgWidth, imgHeight);
              } catch (e) {
                console.error("Error adding image to PDF:", e);
              }
            }
          }
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // ... (footer logic stays same)
  // Footer - CO Statements
  if (yPos > 240) { doc.addPage(); yPos = 20; }
  doc.setFontSize(9);
  doc.text('About CO column: It stands for Course Outcome.', margin, yPos);
  yPos += 5;
  doc.text('Course Outcome Statement:', margin, yPos);
  yPos += 5;

  // Debug: Add template info for troubleshooting
  if (paper.templateId) {
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Template: ${paper.templateId} | Revised Format: ${isRevisedFormatMSTI}`, margin, yPos);
    yPos += 3;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
  }

  autoTable(doc, {
    startY: yPos,
    head: [['Course Outcome', 'Description']],
    body: isRevisedFormatMSTI ? [
      ['CO1', 'Remember and understand fundamental concepts and definitions.'],
      ['CO2', 'Apply learned principles to solve problems and analyze scenarios.']
    ] : [
      ['CO3', 'Understand the core concepts of the subject.'],
      ['CO4', 'Apply the learned principles to solve problems.'],
      ['CO5', 'Analyze and evaluate complex scenarios.']
    ],
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { font: 'times', fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' as const } }
  });

  doc.save(`${paper.title.replace(/\s+/g, '_')}.pdf`);
};

export const exportToDocx = async (paper: QuestionPaper) => {
  const getBase64Data = (dataUrl: string) => {
    return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  };
  
  const usedAlternatives = new Set<string>();

  const getUint8ArrayFromBase64 = (base64: string) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          // ... (header logic stays same)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4 },
              bottom: { style: BorderStyle.SINGLE, size: 4 },
              left: { style: BorderStyle.SINGLE, size: 4 },
              right: { style: BorderStyle.SINGLE, size: 4 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    children: [
                      ...(paper.logoUrl ? [
                        new Paragraph({
                          children: [
                            new ImageRun({
                              data: getUint8ArrayFromBase64(getBase64Data(paper.logoUrl)),
                              transformation: { width: 60, height: 60 },
                            } as any),
                          ],
                          alignment: AlignmentType.CENTER,
                        })
                      ] : [
                        new Paragraph({
                          children: [new TextRun({ text: "LOGO", size: 16 })],
                          alignment: AlignmentType.CENTER,
                        })
                      ]),
                    ],
                    verticalAlign: AlignmentType.CENTER,
                  }),
                  new TableCell({
                    width: { size: 85, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: paper.instituteName || 'Sagar Institute of Science and Technology, Gandhi Nagar', bold: true, size: 24 }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Bhopal', bold: true, size: 20 }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: 'Affiliated to RGPV and BU Bhopal | Accredited by NAAC & NBA | Approved by AICTE', size: 16 }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    verticalAlign: AlignmentType.CENTER,
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: `DEPARTMENT OF ${paper.department?.toUpperCase() || 'COMPUTER SCIENCE AND ENGINEERING'}`, bold: true, size: 22 }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: paper.examName?.toUpperCase() || paper.title.toUpperCase() || 'MID SEMESTER EXAMINATION - II (DECEMBER 2025)', bold: true, size: 22 }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: `Subject – ${paper.subjectName || paper.title}`, bold: true }),
              new TextRun({ text: `\t\t\t\tSubject Code – ${paper.courseCode}`, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Duration: ${Math.floor(paper.durationMinutes / 60)}:${(paper.durationMinutes % 60).toString().padStart(2, '0')} Hours`, bold: true }),
              new TextRun({ text: `\t\t\t\tMaximum Marks: ${paper.maxMarks || paper.totalMarks}`, bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `\t\t\t\t\t\t\tEnrol. No..........................................`, bold: true }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Note: Attempt all parts.', bold: true, size: 24 }),
            ],
          }),
          new Paragraph({ text: "" }),
          
          // PART A
          new Paragraph({
            children: [new TextRun({ text: 'PART A', bold: true, size: 22 })],
            alignment: AlignmentType.CENTER,
          }),
          ...paper.questions.filter(q => q.type === QuestionType.MCQ).flatMap((q, i) => [
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ${cleanQuestionText(q.text)} [0.5 Marks]`, bold: true })],
              spacing: { before: 200 },
            }),
            ...(q.imageUrl ? [
              new Paragraph({
                children: [
                  new ImageRun({
                    data: getUint8ArrayFromBase64(getBase64Data(q.imageUrl)),
                    transformation: { width: 200, height: 150 },
                  } as any),
                ],
                alignment: AlignmentType.CENTER,
              })
            ] : []),
            ...(q.options ? [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                  insideHorizontal: { style: BorderStyle.NONE },
                  insideVertical: { style: BorderStyle.NONE },
                },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `a. ${q.options[0]}` })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `b. ${q.options[1]}` })] })] }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `c. ${q.options[2]}` })] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `d. ${q.options[3]}` })] })] }),
                    ],
                  }),
                ],
                indent: { size: 720, type: WidthType.DXA },
              })
            ] : [])
          ]),

          // PART B
          new Paragraph({ text: "", pageBreakBefore: true }),
          new Paragraph({
            children: [new TextRun({ text: 'PART B', bold: true, size: 22 })],
            alignment: AlignmentType.CENTER,
          }),
          ...paper.questions.filter(q => q.type === QuestionType.SHORT_ANSWER).flatMap((q, i) => {
          const questionElements = [
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ${cleanQuestionText(q.text)} [2 Marks]`, bold: true })],
              spacing: { before: 200 },
            }),
            ...(q.imageUrl ? [
              new Paragraph({
                children: [
                  new ImageRun({
                    data: getUint8ArrayFromBase64(getBase64Data(q.imageUrl)),
                    transformation: { width: 200, height: 150 },
                  } as any),
                ],
                alignment: AlignmentType.CENTER,
              })
            ] : [])
          ];
          
          // Add separator line after Q3 (index 2)
          if (i === 2) {
            questionElements.push(
              new Paragraph({
                children: [new TextRun({ text: '_________________________', bold: true })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 100, after: 100 },
              })
            );
          }
          
          return questionElements;
        }),

          // PART C
          new Paragraph({ text: "", pageBreakBefore: true }),
          new Paragraph({
            children: [new TextRun({ text: 'PART C', bold: true, size: 22 })],
            alignment: AlignmentType.CENTER,
          }),
          ...paper.questions.filter(q => q.type === QuestionType.LONG_ANSWER).flatMap((q, i) => [
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. a) ${cleanQuestionText(q.text)} [7 Marks] [Bloom: ${q.bloomLevel || 'Analyze'}]`, bold: true })],
              spacing: { before: 200 },
            }),
            ...(q.imageUrl ? [
              new Paragraph({
                children: [
                  new ImageRun({
                    data: getUint8ArrayFromBase64(getBase64Data(q.imageUrl)),
                    transformation: { width: 200, height: 150 },
                  } as any),
                ],
                alignment: AlignmentType.CENTER,
              })
            ] : []),
            new Paragraph({
              children: [new TextRun({ text: 'OR', bold: true })],
              alignment: AlignmentType.CENTER,
              spacing: { before: 100, after: 100 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `b) ${cleanQuestionText(q.alternativeText || generateAlternativeQuestion(q.text, q.type, usedAlternatives))}`, bold: true })],
            })
          ]),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${paper.title.replace(/\s+/g, '_')}.docx`);
};

export const exportToTxt = (paper: QuestionPaper) => {
  let content = `${paper.instituteName || 'Sagar Institute of Science and Technology'}\n`;
  const usedAlternatives = new Set<string>();
  // ... (rest stays same)
  content += `Bhopal\n`;
  content += `DEPARTMENT OF ${paper.department?.toUpperCase() || 'CSE'}\n`;
  content += `${paper.examName?.toUpperCase() || paper.title.toUpperCase()}\n\n`;
  
  content += `Subject: ${paper.subjectName || paper.title}\n`;
  content += `Subject Code: ${paper.courseCode}\n`;
  content += `Duration: ${paper.durationMinutes} mins\n`;
  content += `Max Marks: ${paper.maxMarks || paper.totalMarks}\n\n`;
  
  content += `Note: Attempt all parts.\n\n`;
  
  content += `PART A (Objective Type)\n`;
  paper.questions.filter(q => q.type === QuestionType.MCQ).forEach((q, i) => {
    content += `${i + 1}. ${cleanQuestionText(q.text)} [0.5 Marks]\n`;
    if (q.imageUrl) content += `   [Visual Element: ${q.imageDescription || 'Image extracted'}]\n`;
    if (q.options) {
      const optA = `   a. ${q.options[0]}`.padEnd(40);
      const optB = `b. ${q.options[1]}`;
      const optC = `   c. ${q.options[2]}`.padEnd(40);
      const optD = `d. ${q.options[3]}`;
      content += `${optA}${optB}\n`;
      content += `${optC}${optD}\n`;
    }
    content += `\n`;
  });
  
  content += `PART B (Short Answer)\n`;
  paper.questions.filter(q => q.type === QuestionType.SHORT_ANSWER).forEach((q, i) => {
    content += `${i + 1}. ${cleanQuestionText(q.text)} [2 Marks]\n`;
    if (q.imageUrl) content += `   [Visual Element: ${q.imageDescription || 'Image extracted'}]\n`;
    content += `\n`;
    
    // Add separator line after Q3 (index 2)
    if (i === 2) {
      content += `_________________________\n\n`;
    }
  });
  
  content += `PART C (Long Answer)\n`;
  paper.questions.filter(q => q.type === QuestionType.LONG_ANSWER).forEach((q, i) => {
    let alternativeText = q.alternativeText;
    if (!alternativeText || alternativeText.includes('[Alternative Question Placeholder]')) {
      alternativeText = generateAlternativeQuestion(q.text, q.type, usedAlternatives);
      usedAlternatives.add(alternativeText);
    }
    
    content += `${i + 1}. a) ${cleanQuestionText(q.text)} [7 Marks]\n`;
    if (q.imageUrl) content += `   [Visual Element: ${q.imageDescription || 'Image extracted'}]\n`;
    content += `   b) ${cleanQuestionText(alternativeText)}\n\n`;
  });
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${paper.title.replace(/\s+/g, '_')}.txt`);
};
