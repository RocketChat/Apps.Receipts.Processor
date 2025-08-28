import { formatDateDDMMYY } from "../utils/date";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ISpendingReport } from "../types/receipt";
import { IModify } from "@rocket.chat/apps-engine/definition/accessors";
import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { IUser } from "@rocket.chat/apps-engine/definition/users";
import { sendDownloadableFile } from "./message";

interface ColorScheme {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
    light: [number, number, number];
    white: [number, number, number];
    text: [number, number, number];
    danger: [number, number, number];
}

export async function sendDownloadablePDF(
    modify: IModify,
    user: IUser,
    room: IRoom,
    fileName: string,
    data: ISpendingReport,
    currency: string,
    message?: string,
    threadId?: string
): Promise<void> {
    if (!data.categories || data.categories.length === 0) {
        const emptyBuilder = modify
            .getCreator()
            .startMessage()
            .setSender(user)
            .setRoom(room)
            .setText("❌ No data available to export");

        if (threadId) {
            emptyBuilder.setThreadId(threadId);
        }

        await modify.getCreator().finish(emptyBuilder);
        return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const colors: ColorScheme = {
        primary: [245, 69, 92],
        secondary: [52, 73, 94],
        accent: [46, 204, 113],
        light: [236, 240, 241],
        white: [255, 255, 255],
        text: [44, 62, 80],
        danger: [231, 76, 60]
    };

    createHeader(doc, pageWidth, colors);
    createTitleSection(doc, data, colors, room);
    const summaryY = createSummarySection(doc, data, 60, colors);
    const cardsY = createSummaryCards(doc, data, pageWidth, colors, currency, summaryY);
    let currentY = Math.max(summaryY, cardsY) + 20;
    currentY = createCategoriesSection(doc, data, currentY, colors, currency);
    createFooter(doc, pageHeight, colors);

    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfContent = Buffer.from(pdfArrayBuffer).toString("base64");
    await sendDownloadableFile(
        modify,
        user,
        room,
        fileName,
        pdfContent,
        "pdf",
        message || `📊 Spending report with ${data.categories.length} categories ready for download`,
        threadId
    );
}

function createHeader(doc: jsPDF, pageWidth: number, colors: ColorScheme): void {
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');

    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SPENDING REPORT', 20, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = formatDateDDMMYY(new Date().toLocaleDateString());
    doc.text(`Generated on ${today}`, pageWidth - 20, 16, { align: 'right' });
}

function createTitleSection(doc: jsPDF, data: ISpendingReport, colors: ColorScheme, room: IRoom): void {
    doc.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
    doc.rect(0, 25, doc.internal.pageSize.width, 20, 'F');

    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Spending Summary Report for ' + room.displayName, 20, 35);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
        `Reporting Period: ${formatDateDDMMYY(data.startDate)} - ${formatDateDDMMYY(data.endDate)}`,
        20,
        43
    );
}

function createSummarySection(
    doc: jsPDF,
    data: ISpendingReport,
    startY: number,
    colors: ColorScheme
): number {
    if (!data.summary) {
        return startY;
    }

    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary & Insights', 20, startY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    const summaryLines = doc.splitTextToSize(data.summary, doc.internal.pageSize.width - 40);
    doc.text(summaryLines, 20, startY + 8);

    return startY + 8 + summaryLines.length * 6;
}

function createSummaryCards(
    doc: jsPDF,
    data: ISpendingReport,
    pageWidth: number,
    colors: ColorScheme,
    currency: string,
    startY = 55
): number {
    const cardWidth = (pageWidth - 80) / 3;
    const cardHeight = 25;
    const rowSpacing = 30;

    const totalCategories = data.categories.length;
    const totalItems = data.categories.reduce((sum, cat) => sum + cat.items.length, 0);
    const extraFee = data.extraFee || 0;
    const discounts = data.discounts || 0;
    const totalSpent = data.categories.reduce(
        (sum, cat) =>
            sum +
            cat.items.reduce((catSum, item) => catSum + item.price * item.quantity, 0), 0
    ) + extraFee - discounts;
    const formattedTotalSpent = totalSpent.toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 2});

    createSummaryCard(doc, 20, startY, cardWidth, cardHeight, 'Total Spent', `${currency}${formattedTotalSpent}`, colors.danger, colors);
    createSummaryCard(doc, 30 + cardWidth, startY, cardWidth, cardHeight, 'Categories', totalCategories.toString(), colors.primary, colors);
    createSummaryCard(doc, 40 + cardWidth * 2, startY, cardWidth, cardHeight, 'Total Items', totalItems.toString(), colors.accent, colors);

    const secondRowStartX = (pageWidth - (cardWidth * 2 + 10)) / 2;
    createSummaryCard(doc, secondRowStartX, startY + rowSpacing, cardWidth, cardHeight, 'Extra Fees', `${currency}${extraFee}`, colors.secondary, colors);
    createSummaryCard(doc, secondRowStartX + cardWidth + 10, startY + rowSpacing, cardWidth, cardHeight, 'Discounts', `${currency}${discounts}`, colors.accent, colors);

    return startY + cardHeight + rowSpacing;
}

function createSummaryCard(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    value: string,
    accentColor: [number, number, number],
    colors: ColorScheme
): void {
    doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.rect(x, y, width, height, 'F');

    doc.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
    doc.setLineWidth(0.5);
    doc.rect(x, y, width, height, 'S');

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(x, y, width, 3, 'F');

    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(title, x + width/2, y + 12, { align: 'center' });

    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + width/2, y + 20, { align: 'center' });
}

function createCategoriesSection(
    doc: jsPDF,
    data: ISpendingReport,
    startY: number,
    colors: ColorScheme,
    currency: string
): number {
    let currentY = startY;
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detailed Breakdown by Category', 20, currentY);
    currentY += 15;

    data.categories.forEach((cat) => {
        if (currentY > doc.internal.pageSize.height - 60) {
            doc.addPage();
            currentY = 30;
        }

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(20, currentY - 5, doc.internal.pageSize.width - 40, 12, 'F');

        doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(cat.category, 25, currentY + 2);

        const categoryTotal = cat.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const formattedCategoryTotal = categoryTotal.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
        doc.text(`${currency}${formattedCategoryTotal}`, doc.internal.pageSize.width - 25, currentY + 2, { align: 'right' });

        currentY += 15;
        const headers = [['Item Name', 'Quantity', 'Unit Price', 'Total']];
        const rows = cat.items.map((item) => [
            item.name,
            item.quantity.toString(),
            `${currency}${item.price}`,
            `${currency}${(item.price * item.quantity)}`
        ]);

        autoTable(doc, {
            head: headers,
            body: rows,
            startY: currentY,
            styles: {
                fontSize: 9,
                textColor: [colors.text[0], colors.text[1], colors.text[2]],
                lineColor: [colors.light[0], colors.light[1], colors.light[2]],
                lineWidth: 0.1
            },
            headStyles: {
                fillColor: [colors.secondary[0], colors.secondary[1], colors.secondary[2]],
                textColor: [colors.white[0], colors.white[1], colors.white[2]],
                fontSize: 10,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [249, 249, 249]
            },
            margin: { left: 20, right: 20 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 25, halign: 'center' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
            },
            didDrawPage: (tableData) => {
                if (tableData.cursor) {
                    currentY = tableData.cursor.y + 10;
                }
            },
        });

        currentY += 15;
    });

    return currentY;
}

function createFooter(doc: jsPDF, pageHeight: number, colors: ColorScheme): void {
    const footerY = pageHeight - 15;

    doc.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
    doc.setLineWidth(0.5);
    doc.line(20, footerY - 5, doc.internal.pageSize.width - 20, footerY - 5);

    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This report was generated automatically', 20, footerY);

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 20, footerY, { align: 'right' });
    }
}
