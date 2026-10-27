import QRCode from 'qrcode';
import { Guest } from '../types';

/**
 * Generate a base64 Data URL QR Code image
 */
export async function generateQRCodeDataURL(text: string, size = 300): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

/**
 * Build WhatsApp invitation template
 */
export function buildWhatsAppShareUrl(guest: Guest, eventTitle: string, eventLocation: string, eventDate: string): string {
  const message = `Halo Bapak/Ibu *${guest.name}*,\n\n` +
    `Anda diundang untuk menghadiri acara:\n` +
    `*${eventTitle}*\n` +
    `📅 Tanggal: ${eventDate}\n` +
    `📍 Lokasi: ${eventLocation}\n` +
    `👥 Kapasitas: ${guest.pax} Orang\n\n` +
    `Harap sebutkan nama Anda kepada petugas resepsionis di lokasi acara untuk presensi kilat.\n\n` +
    `Terima kasih! Sampai jumpa di acara.`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
