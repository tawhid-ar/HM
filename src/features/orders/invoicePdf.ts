import { jsPDF } from 'jspdf';
import type { OrderItem } from '../../types/database.types';
import type { InvoiceOrder } from './useInvoice';

/**
 * Renders the invoice straight with jsPDF's text/line primitives rather than
 * screenshotting the on-screen <Invoice> component (html2canvas etc.) — that
 * approach is heavier, needs an extra dependency, and produces blurry text at
 * print size. This stays a small, crisp, always-selectable-text PDF.
 *
 * NOTE: Bengali labels here render fine on screen (Invoice.tsx) but jsPDF's
 * built-in fonts only cover Latin/Helvetica glyphs — Bengali script needs a
 * custom embedded font (.ttf converted to a jsPDF font module), which is out
 * of scope for a first pass. So the PDF uses English labels while the
 * on-screen invoice stays fully Bengali; swap in a Bengali TTF later
 * (see jsPDF's addFont docs) if a Bengali-text PDF becomes a requirement.
 */
export function downloadInvoicePdf(order: InvoiceOrder, items: OrderItem[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  let y = 56;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Hadiya Mart', marginX, y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', marginX, y + 16);

  doc.setFontSize(11);
  doc.text(order.order_number, 595 - marginX, y, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(new Date(order.created_at).toLocaleString('en-GB'), 595 - marginX, y + 14, { align: 'right' });
  doc.setTextColor(0);

  y += 44;
  doc.setDrawColor(220);
  doc.line(marginX, y, 595 - marginX, y);
  y += 24;

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('SHIPPING ADDRESS', marginX, y);
  doc.text('PAYMENT', 320, y);
  doc.setTextColor(0);
  doc.setFontSize(10);

  const addressLines = doc.splitTextToSize(order.shipping_address, 240);
  doc.text(addressLines, marginX, y + 14);

  const paymentMethodLine = paymentMethodEnglish(order.payment_method);
  doc.text(paymentMethodLine, 320, y + 14);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(paymentStatusEnglish(order.payment_status), 320, y + 28);
  let paymentExtraY = y + 42;
  if (order.payment_method === 'bkash' && order.payment_transaction_id) {
    doc.text(`Transaction ID: ${order.payment_transaction_id}`, 320, paymentExtraY);
    paymentExtraY += 14;
  }
  if (order.referral_code) {
    doc.text(`Referral code: ${order.referral_code}`, 320, paymentExtraY);
  }
  doc.setTextColor(0);

  y += Math.max(addressLines.length * 14, paymentExtraY - y + 8, 50) + 20;

  if (order.delivery_partner) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('DELIVERY PARTNER', marginX, y);
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(`${order.delivery_partner.name} — ${order.delivery_partner.phone}`, marginX, y + 14);
    y += 40;
  }

  doc.setDrawColor(220);
  doc.line(marginX, y, 595 - marginX, y);
  y += 18;

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('PRODUCT', marginX, y);
  doc.text('PRICE', 340, y, { align: 'right' });
  doc.text('QTY', 420, y, { align: 'right' });
  doc.text('SUBTOTAL', 547, y, { align: 'right' });
  doc.setTextColor(0);
  y += 10;
  doc.line(marginX, y, 595 - marginX, y);
  y += 16;

  doc.setFontSize(10);
  for (const item of items) {
    if (y > 740) {
      doc.addPage();
      y = 56;
    }
    const nameLines = doc.splitTextToSize(item.product_name, 220);
    doc.text(nameLines, marginX, y);
    doc.text(`BDT ${item.price}`, 340, y, { align: 'right' });
    doc.text(String(item.quantity), 420, y, { align: 'right' });
    doc.text(`BDT ${(item.price * item.quantity).toFixed(2)}`, 547, y, { align: 'right' });
    y += Math.max(nameLines.length * 14, 18);
  }

  y += 10;
  doc.line(360, y, 547, y);
  y += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL', 420, y, { align: 'right' });
  doc.text(`BDT ${order.total_amount.toFixed(2)}`, 547, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Thank you for shopping with Hadiya Mart.', 297.5, 800, { align: 'center' });

  doc.save(`${order.order_number}.pdf`);
}

function paymentMethodEnglish(method: string | null) {
  if (method === 'cod') return 'Cash on Delivery';
  if (method === 'bkash') return 'bKash';
  return method ?? '-';
}

function paymentStatusEnglish(status: string) {
  if (status === 'unpaid') return 'Unpaid (collect on delivery)';
  if (status === 'pending_verification') return 'Pending verification';
  if (status === 'paid') return 'Paid';
  return status;
}
