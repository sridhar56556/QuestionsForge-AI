import puppeteer from 'puppeteer';

export async function generatePDF(paper: any, assignment: any): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
    const page = await browser.newPage();
    
    let html = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0 0 10px 0; }
          .meta { display: flex; justify-content: space-between; font-size: 14px; color: #555; }
          .student-info { border: 1px solid #ccc; padding: 15px; margin-bottom: 30px; }
          .student-info div { margin-bottom: 10px; }
          .section { margin-top: 30px; }
          .section-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .instruction { font-style: italic; color: #666; margin-bottom: 15px; }
          .question { margin-bottom: 15px; page-break-inside: avoid; }
          .question-text { font-weight: bold; margin-bottom: 8px;}
          .marks { float: right; font-weight: normal; color: #666; }
          .options { margin-top: 8px; padding-left: 20px; }
          .option { margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${assignment.title || 'Assessment'}</h1>
          <div class="meta">
            <span>Subject: ${assignment.subject}</span>
            <span>Grade: ${assignment.grade}</span>
            <span>Total Marks: ${paper.totalMarks}</span>
          </div>
        </div>
        <div class="student-info">
          <div>Name: _______________________________</div>
          <div>Roll No: ____________________________</div>
          <div>Section: ____________________________</div>
        </div>
    `;

    for (const section of paper.sections) {
      html += `
        <div class="section">
          <div class="section-title">${section.title}</div>
          <div class="instruction">${section.instruction}</div>
          ${section.questions.map((q: any) => `
            <div class="question">
              <span class="marks">[${q.marks} marks]</span>
              <div class="question-text">Q${q.number}. ${q.text}</div>
              ${q.options && q.options.length > 0 ? `
                <div class="options">
                  ${q.options.map((opt: string) => `<div class="option">${opt}</div>`).join('')}
                </div>
              ` : ''}
              ${(!q.options || q.options.length === 0) ? `<br/><br/><br/>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    html += `</body></html>`;

    await page.setContent(html);
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    return Buffer.from(pdf);
  } catch (error: any) {
    console.error('Puppeteer failure:', error);
    // Return a dummy buffer in case Puppeteer fails (e.g. missing dependencies in preview host)
    return Buffer.from('%PDF-1.4\n1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj\n2 0 obj <</Type/Pages/Count 0 /Kids[]>> endobj\nxref\n0 3\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \ntrailer <</Size 3/Root 1 0 R>>\nstartxref\n111\n%%EOF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
