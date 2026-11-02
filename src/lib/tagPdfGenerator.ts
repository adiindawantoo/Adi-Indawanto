import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { FixedAsset } from '../types';

export type LabelPaperSize = '60x30' | '50x20';

// TMII SVG Path constant for generating crisp logo
const TMII_SVG_PATH = "M 1656.504,188 H 1503 v 537.5 c 0,0 -1.375,50.021 81.5,49 h 72.004 z m 263.494,0 h -153.504 v 537.5 c 0,0 -1.375,50.021 81.5,49 h 72.004 z M 1383,284 c -18,-72.5 -85.177,-110.5 -161.5,-110.5 -106.25,0 -189,77.75 -189,77.75 C 1024,238.5 991.5,173.5 881.75,173.5 772,173.5 708,244.75 708,244.75 L 603,173.5 C 487.25,173.5 430,254 430,254 v 53 h 133.333 v 418.5 c 0,0 -2.375,50.021 80.5,49 h 72.004 V 307 h 186.496 v 418.5 c 0,0 -2.375,50.021 80.5,49 h 72.004 V 307 h 185.496 v 418.5 c 0,0 -2.375,50.021 80.5,49 h 72.004 V 532 c 0,-83.353 6.183,-183.478 -9.837,-248 z M 291,173.5 V 0 H 139 V 175.173 C 113.374,180.537 39.281,200.352 0,256 v 51 h 139 v 269 c 0,0 -0.5,89.5 26,128 35.79,51.996 80.911,70.516 156.5,70.516 C 420.5,774.516 485,703 485,703 V 660.176 H 291 V 301 c 0,0 67,-14 114,-73 v -54.5 z";

let cachedLogoDataUrl: string | null = null;

/**
 * Render TMII SVG path into a high-resolution black & white PNG DataURL
 */
export async function getTmiiLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 194;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve('');
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';

    const p = new Path2D(TMII_SVG_PATH);
    ctx.save();
    // Scale from viewBox 1920x775 to 480x194
    const scale = 480 / 1920;
    ctx.scale(scale, scale);
    ctx.fill(p);
    ctx.restore();

    cachedLogoDataUrl = canvas.toDataURL('image/png');
    resolve(cachedLogoDataUrl);
  });
}

/**
 * Generate high-resolution QR code data URL client-side
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 0,
      errorCorrectionLevel: 'M',
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating QR DataURL:', err);
    return '';
  }
}

/**
 * Generate vector-sharp PDF document for asset tagging
 */
export async function generateAssetTagPDF(
  assets: FixedAsset[],
  paperSize: LabelPaperSize
): Promise<jsPDF> {
  const is50x20 = paperSize === '50x20';
  const widthMm = is50x20 ? 50 : 60;
  const heightMm = is50x20 ? 20 : 30;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [widthMm, heightMm]
  });

  const logoDataUrl = await getTmiiLogoDataUrl();

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    if (i > 0) {
      pdf.addPage([widthMm, heightMm], 'landscape');
    }

    const qrDataUrl = await generateQrDataUrl(asset.code);

    const displayLocation = asset.location 
      ? (asset.location.toLowerCase().startsWith('lokasi') ? asset.location : `Lokasi ${asset.location}`)
      : 'Lokasi TMII';

    // Borderless: Outer border removed for clean die-cut thermal roll sticker printing

    if (is50x20) {
      // ===== 50mm x 20mm Layout =====
      const qrSize = 14.8; // mm
      const qrX = 1.8;
      const qrY = 2.6;

      // QR Code
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // Right Column
      const textX = 18.2;
      const maxTextWidth = 29.8; // 50 - 18.2 - 2

      // TMII Logo
      const logoW = 10.5;
      const logoH = 4.2;
      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', textX, 1.8, logoW, logoH);
      }

      // Asset Code
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(0, 0, 0);
      pdf.text(asset.code, textX, 8.4);

      // Asset Name (1 or 2 lines)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.2);
      const splitName = pdf.splitTextToSize(asset.name, maxTextWidth);
      const nameLines = splitName.slice(0, 2);
      pdf.text(nameLines, textX, 11.2, { lineHeightFactor: 1.15 });

      // Divider Line
      pdf.setLineWidth(0.25);
      pdf.line(textX, 15.2, 48.2, 15.2);

      // Location
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      // Truncate location if too wide
      let locText = displayLocation;
      if (pdf.getTextWidth(locText) > maxTextWidth) {
        while (locText.length > 3 && pdf.getTextWidth(locText + '...') > maxTextWidth) {
          locText = locText.slice(0, -1);
        }
        locText += '...';
      }
      pdf.text(locText, textX, 17.8);

    } else {
      // ===== 60mm x 30mm Layout =====
      const qrSize = 22.8; // mm
      const qrX = 2.6;
      const qrY = 3.6;

      // QR Code
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // Right Column
      const textX = 27.2;
      const maxTextWidth = 30.5; // 60 - 27.2 - 2.3

      // TMII Logo
      const logoW = 14.5;
      const logoH = 5.8;
      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, 'PNG', textX, 2.8, logoW, logoH);
      }

      // Asset Code
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(0, 0, 0);
      pdf.text(asset.code, textX, 11.6);

      // Asset Name (up to 3 lines)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);
      const splitName = pdf.splitTextToSize(asset.name, maxTextWidth);
      const nameLines = splitName.slice(0, 3);
      pdf.text(nameLines, textX, 15.2, { lineHeightFactor: 1.2 });

      // Divider Line
      pdf.setLineWidth(0.3);
      pdf.line(textX, 23.2, 57.5, 23.2);

      // Location
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.2);
      let locText = displayLocation;
      if (pdf.getTextWidth(locText) > maxTextWidth) {
        while (locText.length > 3 && pdf.getTextWidth(locText + '...') > maxTextWidth) {
          locText = locText.slice(0, -1);
        }
        locText += '...';
      }
      pdf.text(locText, textX, 27.0);
    }
  }

  return pdf;
}

/**
 * Generate isolated printable HTML for the print iframe/window
 */
export async function generatePrintableHtml(
  assets: FixedAsset[],
  paperSize: LabelPaperSize
): Promise<string> {
  const is50x20 = paperSize === '50x20';
  const widthMm = is50x20 ? '50mm' : '60mm';
  const heightMm = is50x20 ? '20mm' : '30mm';
  const qrSize = is50x20 ? '14.8mm' : '22.8mm';
  const logoH = is50x20 ? '4.2mm' : '5.8mm';
  const logoW = is50x20 ? '10.5mm' : '14.5mm';
  const codeSize = is50x20 ? '7.5pt' : '9.5pt';
  const nameSize = is50x20 ? '6.2pt' : '7.2pt';
  const locSize = is50x20 ? '6.5pt' : '8.2pt';

  const logoDataUrl = await getTmiiLogoDataUrl();

  const labelsHtml = await Promise.all(
    assets.map(async (asset) => {
      const qrDataUrl = await generateQrDataUrl(asset.code);
      const displayLocation = asset.location 
        ? (asset.location.toLowerCase().startsWith('lokasi') ? asset.location : `Lokasi ${asset.location}`)
        : 'Lokasi TMII';

      return `
        <div class="sticker-page">
          <div class="sticker-box">
            <div class="qr-col">
              <img src="${qrDataUrl}" alt="${asset.code}" class="qr-img" />
            </div>
            <div class="info-col">
              <div class="top-info">
                <img src="${logoDataUrl}" alt="TMII" class="logo-img" />
                <div class="asset-code">${asset.code}</div>
                <div class="asset-name">${asset.name}</div>
              </div>
              <div class="bottom-info">
                <div class="divider"></div>
                <div class="location">${displayLocation}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Label Tagging TMII - ${paperSize}</title>
        <style>
          @page {
            size: ${widthMm} ${heightMm};
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: ${widthMm};
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #000000;
          }
          .sticker-page {
            width: ${widthMm};
            height: ${heightMm};
            page-break-after: always;
            break-after: page;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: ${is50x20 ? '0.8mm' : '1mm'};
          }
          .sticker-box {
            width: 100%;
            height: 100%;
            border: none;
            display: flex;
            align-items: center;
            padding: ${is50x20 ? '1mm 1.2mm' : '1.5mm 2mm'};
            gap: ${is50x20 ? '1.5mm' : '2.5mm'};
            overflow: hidden;
          }
          .qr-col {
            width: ${qrSize};
            height: ${qrSize};
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr-img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .info-col {
            flex: 1;
            height: 100%;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .logo-img {
            width: ${logoW};
            height: ${logoH};
            object-fit: contain;
            display: block;
            margin-bottom: ${is50x20 ? '0.3mm' : '0.5mm'};
          }
          .asset-code {
            font-weight: 900;
            font-size: ${codeSize};
            line-height: 1.1;
            letter-spacing: -0.2px;
            word-break: break-all;
          }
          .asset-name {
            font-size: ${nameSize};
            font-weight: 500;
            line-height: 1.15;
            margin-top: 0.3mm;
            max-height: ${is50x20 ? '5.5mm' : '8.5mm'};
            overflow: hidden;
            word-break: break-word;
          }
          .divider {
            border-bottom: 1px solid #000000;
            margin-bottom: 0.5mm;
            width: 100%;
          }
          .location {
            font-weight: 800;
            font-size: ${locSize};
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        </style>
      </head>
      <body>
        ${labelsHtml.join('')}
      </body>
    </html>
  `;
}
