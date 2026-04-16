// Fixed exportToPDF function with proper CO1/CO2 labels and "attempt any two" instructions
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Question, QuestionPaper, QuestionType } from '../types';

export const exportToPDF = (paper: QuestionPaper) => {
  const doc = new jsPDF();
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  const margin = 15;
  let yPos = 15;

  // Track used alternatives to avoid repetition
  const usedAlternatives = new Set<string>();

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

  // Check if this is Revised Format MST-I template
  const isRevisedFormatMSTI = paper.templateId && 
    paper.templateId.toLowerCase().includes('revised format') && 
    paper.templateId.toLowerCase().includes('mst - i');

  // Helper to draw image in cell
  const drawImageInCell = (data: any, q: Question) => {
    if (q.imageUrl && data.section === 'body') {
      try {
        const maxImgWidth = Math.min(data.cell.width - 10, 50);
        const maxImgHeight = 40;
        const x = data.cell.x + (data.cell.width - maxImgWidth) / 2;
        const y = data.cell.y + 5;
        
        const textHeight = doc.getTextDimensions(q.text).h;
        const imageY = data.cell.y + textHeight + 10;
        
        doc.addImage(q.imageUrl, 'PNG', x, imageY, maxImgWidth, maxImgHeight);
        
        console.log(`📷 Added image to PDF for question:`, {
          questionId: q.id,
          imageSize: `${maxImgWidth}x${maxImgHeight}`,
          position: `x:${x}, y:${imageY}`
        });
      } catch (e) {
        console.error("Error adding image to PDF:", e);
      }
    }
  };

  // PART A - MCQs with CO1/CO2
  if (mcqs.length > 0) {
    doc.setFontSize(11);
    doc.text('PART A', 105, yPos, { align: 'center' });
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Q.No', 'Question / Options', '', 'Marks', 'COs']],
      body: [
        [{ content: 'Objective Type Questions (attempt all questions)', colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }],
        ...mcqs.flatMap((q, i) => {
          // Use CO1 for first half, CO2 for second half of MCQs
          let coLabel = q.courseOutcome;
          if (!coLabel || coLabel === '3') {
            coLabel = i < Math.ceil(mcqs.length / 2) ? 'CO1' : 'CO2';
          }
          
          return [
            { content: `${i + 1}`, rowSpan: 3, styles: { valign: 'top', halign: 'center' } },
            { content: `${q.text}${q.imageUrl ? '\n\n\n\n\n\n\n\n' : ''}`, colSpan: 2, styles: { fontStyle: 'bold', textColor: 0 } },
            { content: '0.5', rowSpan: 3, styles: { valign: 'middle', halign: 'center', textColor: 0 } },
            { content: coLabel, rowSpan: 3, styles: { valign: 'middle', halign: 'center', textColor: 0 } }
          ];
        }),
        ...mcqs.flatMap((q, i) => [
          { content: `a. ${q.options?.[0] || ''}` },
          { content: `b. ${q.options?.[1] || ''}` }
        ]),
        ...mcqs.flatMap((q, i) => [
          { content: `c. ${q.options?.[2] || ''}` },
          { content: `d. ${q.options?.[3] || ''}` }
        ])
      ],
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const rowIndex = data.row.index - 1;
          if (rowIndex >= 0 && rowIndex % 3 === 0) {
            const qIndex = rowIndex / 3;
            const q = mcqs[qIndex];
            drawImageInCell(data, q);
          }
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Course Outcome Statement Table for Revised Format MST-I
  if (isRevisedFormatMSTI && shortAns.length > 0) {
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(11);
    doc.text('Course Outcome Statement:', 105, yPos, { align: 'center' });
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Course Outcome', 'Description']],
      body: [
        ['CO1', 'Remember and understand fundamental concepts and definitions.'],
        ['CO2', 'Apply learned principles to solve problems and analyze scenarios.']
      ],
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1 },
      styles: { font: 'times', fontSize: 9, cellPadding: 2, lineColor: 0, lineWidth: 0.1 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // PART B - Short Answer with CO1/CO2 and "attempt any two"
  if (shortAns.length > 0) {
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(11);
    doc.text('PART B', 105, yPos, { align: 'center' });
    yPos += 5;

    const headerText = isRevisedFormatMSTI ? 
      'Short Answer Type Questions (6 Questions - Attempt Q1, Q2, Q3 and any two of Q4, Q5, Q6)' : 
      'Short Answer Type Questions (Attempt any two)';
    
    const questionRows: any[] = [
      [{ content: headerText, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: 0 } }]
    ];

    // Add questions with proper CO labels (CO1, CO2) and header between Q3 and Q4 for Revised Format MST-I
    shortAns.forEach((q, i) => {
      // Use CO1 for first half, CO2 for second half of questions
      let coLabel = q.courseOutcome;
      if (!coLabel || coLabel === '3') {
        coLabel = i < Math.ceil(shortAns.length / 2) ? 'CO1' : 'CO2';
      }
      
      questionRows.push([
        { content: `${i + 1}. ${q.text}${q.imageUrl ? '\n\n\n\n\n\n\n\n' : ''}`, styles: { cellPadding: 3, textColor: 0 } },
        { content: '2', styles: { textColor: 0, valign: 'middle', halign: 'center' } },
        { content: coLabel, styles: { textColor: 0, valign: 'middle', halign: 'center' } }
      ]);
      
      // Add header after Q3 for Revised Format MST-I
      if (isRevisedFormatMSTI && i === 2 && shortAns.length > 3) {
        questionRows.push([
          { content: 'Attempt any two of the following:', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [255, 235, 205], textColor: 0 } }
        ]);
      }
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Question', 'Marks', 'COs']],
      body: questionRows,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const qIndex = data.row.index - 1;
          if (qIndex >= 0 && qIndex < shortAns.length) {
            const q = shortAns[qIndex];
            drawImageInCell(data, q);
          }
        }
      }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // PART C - Long Answer with CO1/CO2
  if (longAns.length > 0) {
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(11);
    doc.text('PART C', 105, yPos, { align: 'center' });
    yPos += 5;

    const longQuestionRows: any[] = [
      [{ content: 'Long Answer Type Questions', colSpan: 1, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: 0 } }]
    ];

    longAns.forEach((q, i) => {
      // Use CO1 for first half, CO2 for second half of questions
      let coLabel = q.courseOutcome;
      if (!coLabel || coLabel === '3') {
        coLabel = i < Math.ceil(longAns.length / 2) ? 'CO1' : 'CO2';
      }
      
      longQuestionRows.push([
        { content: `${i + 1}. a) ${q.text}${q.imageUrl ? '\n\n\n\n\n\n\n\n' : ''} [7 Marks] [CO: ${coLabel}] [Bloom: ${q.bloomLevel || 'Analyze'}]`, styles: { cellPadding: 3, textColor: 0 } }
      ]);
      
      longQuestionRows.push([
        { content: `b) ${q.alternativeText || generateAlternativeQuestion(q.text, q.type, usedAlternatives)} [7 Marks] [CO: ${coLabel}] [Bloom: ${q.bloomLevel || 'Analyze'}]`, styles: { cellPadding: 3, textColor: 0 } }
      ]);
    });

    autoTable(doc, {
      startY: yPos,
      head: [['Question']],
      body: longQuestionRows,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const qIndex = Math.floor((data.row.index - 1) / 2);
          if (qIndex >= 0 && qIndex < longAns.length) {
            const q = longAns[qIndex];
            drawImageInCell(data, q);
          }
        }
      }
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length;
  for (let i = 0; i < pageCount; i++) {
    doc.setPage(i + 1);
    doc.setFontSize(8);
    doc.text(`Page ${i + 1} of ${pageCount}`, 105, 285, { align: 'center' });
  }

  return doc;
};

// Helper function to generate alternative questions
const generateAlternativeQuestion = (originalText: string, questionType: QuestionType, usedAlternatives: Set<string> = new Set()): string => {
  if (questionType !== QuestionType.LONG_ANSWER) return '';
  
  const alternatives: { [key: string]: string[] } = {
    'differentiate': ['Differentiate the following function:', 'Find the derivative of the function:', 'Calculate the rate of change:'],
    'analyze': ['Analyze the following scenario:', 'Examine the given situation:', 'Evaluate the provided case:'],
    'compare': ['Compare the following concepts:', 'Contrast the given elements:', 'Differentiate between:'],
    'explain': ['Explain the following concept:', 'Describe the given principle:', 'Elaborate on:'],
    'implement': ['Implement the following algorithm:', 'Write code for the given problem:', 'Develop a solution for:']
  };

  for (const [keyword, alts] of Object.entries(alternatives)) {
    if (originalText.toLowerCase().includes(keyword)) {
      for (const alt of alts) {
        if (!usedAlternatives.has(alt)) {
          usedAlternatives.add(alt);
          return alt;
        }
      }
    }
  }

  return 'Provide a detailed solution to the given problem.';
};
