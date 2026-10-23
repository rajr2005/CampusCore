import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const formatAmount = (amount) => Number(amount || 0).toLocaleString('en-IN');

const roundCurrency = (amount) => Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;

export function calculatePayslipTotals({ one_day_salary, overtime, basic_pay, incentive, leaves_taken, late_permissions, tax }) {
  const overtimePay = roundCurrency(Number(overtime || 0) * Number(one_day_salary || 0));
  const totalAddition = roundCurrency(overtimePay + Number(basic_pay || 0) + Number(incentive || 0));
  const totalDeductions = roundCurrency(
    (Number(leaves_taken || 0) + Number(late_permissions || 0)) * Number(one_day_salary || 0)
      + Number(tax || 0)
  );

  return {
    overtimePay,
    totalAddition,
    totalDeductions,
    netSalary: roundCurrency(totalAddition - totalDeductions),
  };
}

const numberWordsBelowHundred = (number) => {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (number < 20) return ones[number];
  return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ''}`;
};

const numberWordsBelowThousand = (number) => {
  const hundreds = Math.floor(number / 100);
  const remainder = number % 100;
  const parts = [];

  if (hundreds) parts.push(`${numberWordsBelowHundred(hundreds)} Hundred`);
  if (remainder) parts.push(numberWordsBelowHundred(remainder));
  return parts.join(' ');
};

export function amountInWords(amount) {
  const roundedAmount = Math.round(Math.abs(Number(amount) || 0));
  if (!Number.isSafeInteger(roundedAmount)) {
    throw new Error('Net salary is too large to convert to words.');
  }
  if (roundedAmount === 0) return 'Zero Only';

  let remaining = roundedAmount;
  const words = [];
  const underOneHundred = remaining % 1000;
  if (underOneHundred) {
    words.unshift(numberWordsBelowThousand(underOneHundred));
  }
  remaining = Math.floor(remaining / 1000);

  for (const unit of ['Thousand', 'Lakh', 'Crore', 'Arab', 'Kharab', 'Neel']) {
    if (!remaining) break;
    const group = remaining % 100;
    if (group) {
      words.unshift(`${numberWordsBelowHundred(group)} ${unit}`);
    }
    remaining = Math.floor(remaining / 100);
  }

  if (remaining) {
    throw new Error('Net salary is too large to convert to words.');
  }

  return `${Number(amount) < 0 ? 'Minus ' : ''}${words.join(' ')} Only`;
}

export async function createPayslipPdf(employee, payslip) {
  const response = await fetch('/payslip-template.pdf');
  if (!response.ok) {
    throw new Error('The supplied payslip template could not be loaded.');
  }

  const pdf = await PDFDocument.load(await response.arrayBuffer());
  while (pdf.getPageCount() > 1) {
    pdf.removePage(pdf.getPageCount() - 1);
  }

  const page = pdf.getPage(0);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const orange = rgb(0.8, 0.35, 0.13);

  const drawCentered = (value, left, right, y, font = regular, size = 7) => {
    const text = String(value ?? '');
    if (!text) return;

    let fontSize = size;
    while (fontSize > 6.5 && font.widthOfTextAtSize(text, fontSize) > right - left - 6) {
      fontSize -= 0.25;
    }

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: left + (right - left - textWidth) / 2,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  };

  const tableColumns = [100, 205, 308, 391, 544];
  const rowBaseline = {
    employeeId: 650,
    dateOfJoining: 635,
    gender: 620,
    fixedDays: 605,
    totalSalary: 592,
    overtime: 563,
    basicPay: 548,
    incentive: 533,
    totalAddition: 516,
    totalDeduction: 516,
    netSalary: 502,
  };
  const drawCell = (value, leftColumn, rightColumn, row, font = regular) => {
    drawCentered(value, tableColumns[leftColumn], tableColumns[rightColumn], row, font);
  };

  page.drawRectangle({
    x: width / 2 - 82,
    y: 661,
    width: 164,
    height: 12,
    color: rgb(1, 1, 1),
  });
  const title = `${payslip.month} Pay Slip ${payslip.year}`;
  const titleSize = 8;
  page.drawText(title, {
    x: (width - bold.widthOfTextAtSize(title, titleSize)) / 2,
    y: 666,
    size: titleSize,
    font: bold,
    color: orange,
  });

  page.drawRectangle({
    x: tableColumns[2] + 2,
    y: 592,
    width: tableColumns[3] - tableColumns[2] - 4,
    height: 10,
    color: rgb(1, 1, 1),
  });
  page.drawLine({
    start: { x: tableColumns[2], y: 602 },
    end: { x: tableColumns[3], y: 602 },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: tableColumns[2], y: 588 },
    end: { x: tableColumns[3], y: 588 },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  });

  drawCell(employee.employee_id || `EMP-${employee.id}`, 1, 2, rowBaseline.employeeId);
  drawCell(employee.date_of_joining ? new Date(`${employee.date_of_joining}T00:00:00`).toLocaleDateString('en-GB') : '', 1, 2, rowBaseline.dateOfJoining);
  drawCell(employee.name, 3, 4, rowBaseline.employeeId);
  drawCell(employee.designation || employee.role || 'Staff', 3, 4, rowBaseline.dateOfJoining);
  drawCell(employee.gender || '', 1, 2, rowBaseline.gender);
  drawCell(payslip.month, 3, 4, rowBaseline.gender);
  drawCell(payslip.fixed_days, 1, 2, rowBaseline.fixedDays);
  drawCell(payslip.present_days, 3, 4, rowBaseline.fixedDays);
  drawCell(formatAmount(payslip.total_salary), 2, 3, rowBaseline.totalSalary);

  const { overtimePay, totalAddition } = calculatePayslipTotals(payslip);
  drawCell(formatAmount(overtimePay), 1, 2, rowBaseline.overtime);
  drawCell(formatAmount(payslip.leaves_taken), 3, 4, rowBaseline.overtime);
  drawCell(formatAmount(payslip.basic_pay), 1, 2, rowBaseline.basicPay);
  drawCell(formatAmount(payslip.late_permissions), 3, 4, rowBaseline.basicPay);
  drawCell(formatAmount(payslip.incentive), 1, 2, rowBaseline.incentive);
  drawCell(formatAmount(payslip.tax), 3, 4, rowBaseline.incentive);
  drawCell(formatAmount(totalAddition), 1, 2, rowBaseline.totalAddition);
  drawCell(formatAmount(payslip.deductions), 3, 4, rowBaseline.totalDeduction);
  drawCell(amountInWords(payslip.net_salary), 0, 2, rowBaseline.netSalary, regular, 8);
  drawCell(formatAmount(payslip.net_salary), 3, 4, rowBaseline.netSalary, bold);

  const receiptEmailLine = `Receipt Details Email ID:${employee.email || 'Not provided'}`;
  let emailSize = 8;
  while (emailSize > 6 && regular.widthOfTextAtSize(receiptEmailLine, emailSize) > width - 40) {
    emailSize -= 0.25;
  }
  const emailWidth = regular.widthOfTextAtSize(receiptEmailLine, emailSize);
  const emailY = 449;
  page.drawRectangle({
    x: 120,
    y: emailY - 4,
    width: width - 240,
    height: 17,
    color: rgb(1, 1, 1),
  });
  page.drawText(receiptEmailLine, {
    x: (width - emailWidth) / 2,
    y: emailY,
    size: emailSize,
    font: regular,
    color: rgb(0, 0, 0),
  });

  return pdf.save();
}

export function downloadPayslipPdf(pdfBytes, employee, month, year) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeEmployeeName = employee.name.replace(/[^a-z0-9_-]/gi, '_');
  link.href = url;
  link.download = `payslip_${safeEmployeeName}_${month}_${year}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pdfBytesToDataUri(pdfBytes) {
  const chunks = [];
  for (let offset = 0; offset < pdfBytes.length; offset += 0x8000) {
    chunks.push(String.fromCharCode(...pdfBytes.subarray(offset, offset + 0x8000)));
  }
  return `data:application/pdf;base64,${btoa(chunks.join(''))}`;
}
