"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

const templates = {
  supplierReorder: {
    label: "Supplier reorder",
    subject: "Kanban Reorder Request",
    body: "Hi,\n\nPlease process a replenishment against this kanban trigger.\n\nPart Number: \nRequired Quantity: \nLocation: \nRequested By: \n\nThanks",
  },
  internalRequest: {
    label: "Internal request",
    subject: "Internal Stock Request",
    body: "Hi,\n\nPlease support the following internal stock request.\n\nPart Number: \nQuantity: \nNeeded By: \nArea: \n\nThanks",
  },
  kanbanRefill: {
    label: "Kanban refill",
    subject: "Kanban Bin Refill Required",
    body: "Hi,\n\nThis bin has reached trigger point and requires refill.\n\nBin ID: \nPart Number: \nRefill Quantity: \nLocation: \n\nThanks",
  },
  engineeringIssue: {
    label: "Engineering issue",
    subject: "Engineering Review Required",
    body: "Hi,\n\nPlease review the issue linked to this scan.\n\nPart Number: \nIssue Summary: \nBatch / Serial: \nRaised By: \n\nThanks",
  },
  goodsInAlert: {
    label: "Goods in alert",
    subject: "Goods In Query",
    body: "Hi,\n\nA goods in issue has been identified.\n\nSupplier: \nPO Number: \nPart Number: \nIssue: \n\nThanks",
  },
};

function createBatchEntry(id) {
  return {
    id,
    fileName: `qr-${id}`,
    qrType: "text",
    text: "",
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  };
}

function buildMailto({ to = "", cc = "", bcc = "", subject = "", body = "" }) {
  const params = new URLSearchParams();
  if (subject.trim()) params.set("subject", subject);
  if (body.trim()) params.set("body", body);
  if (cc.trim()) params.set("cc", cc);
  if (bcc.trim()) params.set("bcc", bcc);
  return `mailto:${to.trim()}?${params.toString()}`;
}

function safeFileName(value, fallback = "qr-code") {
  const cleaned = (value || fallback)
    .replace(/[^a-z0-9-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return cleaned || fallback;
}

function splitCsvLine(line) {
  const output = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      output.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  output.push(current);
  return output;
}

function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((item) => item.trim());

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const row = { id: index + 1 };

    headers.forEach((header, i) => {
      row[header] = values[i] || "";
    });

    return row;
  });
}

function getBatchQrValue(row) {
  if ((row.text || "").trim()) return row.text.trim();

  return buildMailto({
    to: row.to || "",
    cc: row.cc || "",
    bcc: row.bcc || "",
    subject: row.subject || "",
    body: row.body || "",
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawQrBrandOverlay(canvas, logoSrc) {
  if (!canvas || !logoSrc) return;

  const ctx = canvas.getContext("2d");
  const img = await loadImage(logoSrc);
  const size = Math.max(40, Math.floor(Math.min(canvas.width, canvas.height) * 0.18));
  const x = (canvas.width - size) / 2;
  const y = (canvas.height - size) / 2;
  const pad = Math.floor(size * 0.14);
  const radius = Math.floor(size * 0.18);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y - pad);
  ctx.lineTo(x + size - radius, y - pad);
  ctx.quadraticCurveTo(x + size + pad, y - pad, x + size + pad, y - pad + radius);
  ctx.lineTo(x + size + pad, y + size + pad - radius);
  ctx.quadraticCurveTo(x + size + pad, y + size + pad, x + size - radius, y + size + pad);
  ctx.lineTo(x + radius, y + size + pad);
  ctx.quadraticCurveTo(x - pad, y + size + pad, x - pad, y + size + pad - radius);
  ctx.lineTo(x - pad, y - pad + radius);
  ctx.quadraticCurveTo(x - pad, y - pad, x + radius, y - pad);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fill();
  ctx.restore();

  ctx.drawImage(img, x, y, size, size);
}

export default function Page() {
  const [mode, setMode] = useState("email");
  const [creatorMode, setCreatorMode] = useState("single");
  const [text, setText] = useState("https://example.com");
  const [emailRecipients, setEmailRecipients] = useState([{ id: 1, value: "example1@email.com" }]);
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [emailSubject, setEmailSubject] = useState("Hello from LeanProcure");
  const [emailBody, setEmailBody] = useState("Hi,\n\nThis email was started by scanning a QR code.\n\nThanks");
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [fileName, setFileName] = useState("leanprocure-qr-code");
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [brandName, setBrandName] = useState("LeanProcure");
  const [brandTagline, setBrandTagline] = useState("SYSTEMS");
  const [brandSubline, setBrandSubline] = useState("Lean procurement workflows, automation and replenishment tools");
  const [primaryColor, setPrimaryColor] = useState("#0f2a4f");
  const [secondaryColor, setSecondaryColor] = useState("#5c9b4a");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseStatus, setLicenseStatus] = useState("Watermark ON");
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const VALID_LICENSE_KEYS = ["LP-PRO-91827", "LP-CLIENT-44219", "LP-UNLOCK-77031"];

  const [usageStats, setUsageStats] = useState({
    singleQrDownloads: 0,
    batchExports: 0,
    kanbanPrints: 0,
    watermarkFreeExports: 0,
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [batchEntries, setBatchEntries] = useState([createBatchEntry(1)]);
  const [batchMessage, setBatchMessage] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

  const [kanbanTitle, setKanbanTitle] = useState("EXTERNAL KANBAN");
  const [kanbanCode, setKanbanCode] = useState("K-033");
  const [kanbanDescription, setKanbanDescription] = useState("KPC101");
  const [kanbanPartNo, setKanbanPartNo] = useState("170377");
  const [kanbanOrderAt, setKanbanOrderAt] = useState("45 Pcs Left");
  const [kanbanOrderQty, setKanbanOrderQty] = useState("45 Pcs");
  const [kanbanSupplier, setKanbanSupplier] = useState("Artronics");
  const [kanbanRestockInfo, setKanbanRestockInfo] = useState("Scan QR code at this point");
  const [kanbanImageUrl, setKanbanImageUrl] = useState("");

  const canvasRef = useRef(null);

  const toValue = emailRecipients.map((item) => item.value.trim()).filter(Boolean).join(",");

  const qrValue = mode === "email"
    ? buildMailto({
        to: toValue,
        cc: emailCc,
        bcc: emailBcc,
        subject: emailSubject,
        body: emailBody,
      })
    : text.trim();

  const validBatchRows = useMemo(
    () =>
      batchEntries
        .map((entry) =>
          entry.qrType === "text"
            ? { id: entry.id, fileName: entry.fileName, text: entry.text }
            : {
                id: entry.id,
                fileName: entry.fileName,
                to: entry.to,
                cc: entry.cc,
                bcc: entry.bcc,
                subject: entry.subject,
                body: entry.body,
              }
        )
        .filter((row) => getBatchQrValue(row).trim()),
    [batchEntries]
  );

  useEffect(() => {
    const generate = async () => {
      if (!canvasRef.current || !qrValue.trim()) return;

      try {
        await QRCode.toCanvas(canvasRef.current, qrValue, {
          width: Number(size),
          margin: Number(margin),
          color: {
            dark: primaryColor,
            light: "#FFFFFF",
          },
        });

        if (logoDataUrl && watermarkEnabled) {
          await drawQrBrandOverlay(canvasRef.current, logoDataUrl);
        }
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
    };

    generate();
  }, [qrValue, size, margin, primaryColor, logoDataUrl, watermarkEnabled]);

  const applyTemplate = (templateKey) => {
    const template = templates[templateKey];
    if (!template) return;
    setSelectedTemplate(templateKey);
    setMode("email");
    setCreatorMode("single");
    setEmailSubject(template.subject);
    setEmailBody(template.body);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogoDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleKanbanImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setKanbanImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const unlockAdmin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAdminPassword("");
    } else {
      alert("Wrong password");
    }
  };

  const applyLicenseKey = () => {
    const cleaned = licenseKey.trim().toUpperCase();
    if (VALID_LICENSE_KEYS.includes(cleaned)) {
      setWatermarkEnabled(false);
      setLicenseStatus("Licensed mode active - watermark OFF");
    } else {
      setWatermarkEnabled(true);
      setLicenseStatus("Invalid license key - watermark ON");
      alert("Invalid license key");
    }
  };

  const addBatchEntry = () => {
    setBatchEntries((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, createBatchEntry(prev.length + 1)];
    });
  };

  const updateBatchEntry = (id, field, value) => {
    setBatchEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    );
  };

  const removeBatchEntry = (id) => {
    setBatchEntries((prev) => (prev.length === 1 ? prev : prev.filter((entry) => entry.id !== id)));
  };

  const prepareBatchList = () => {
    setBatchMessage(validBatchRows.length ? `${validBatchRows.length} QR codes ready.` : "Add at least one valid QR entry.");
  };

  const downloadPng = async () => {
    if (!canvasRef.current) return;

    if (logoDataUrl && watermarkEnabled) {
      await drawQrBrandOverlay(canvasRef.current, logoDataUrl);
    }

    const url = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(fileName, "leanprocure-qr-code")}.png`;
    link.click();
  };

  const downloadSvg = async () => {
    if (!qrValue.trim()) return;
    const svgString = await QRCode.toString(qrValue, {
      type: "svg",
      width: Number(size),
      margin: Number(margin),
      color: {
        dark: primaryColor,
        light: "#FFFFFF",
      },
    });

    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(fileName, "leanprocure-qr-code")}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!canvasRef.current || !qrValue.trim()) return;

    const imageUrl = canvasRef.current.toDataURL("image/png");
    const printWindow = window.open("", "_blank", "width=1000,height=1200");
    if (!printWindow) return;

    const safeTitle = safeFileName(fileName, "leanprocure-qr-code");

    printWindow.document.write(`
      <html>
        <head>
          <title>${safeTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111; background: #f4f7fb; }
            .sheet { max-width: 760px; margin: 0 auto; background: white; border: 1px solid #dbe4ee; border-radius: 24px; padding: 30px; }
            .brand { display: flex; align-items: center; gap: 18px; border-bottom: 3px solid ${primaryColor}; padding-bottom: 18px; }
            .logo { width: 72px; height: 72px; object-fit: contain; border-radius: 16px; }
            .mark { width: 72px; height: 72px; border-radius: 18px; background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 26px; }
            .name { margin: 0; font-size: 30px; line-height: 1; font-weight: 800; color: ${primaryColor}; }
            .tagline { margin: 6px 0 0; font-size: 12px; font-weight: 800; letter-spacing: 0.34em; color: ${secondaryColor}; }
            .subline { margin: 10px 0 0; font-size: 13px; color: #64748b; }
            .qr-wrap { text-align: center; margin: 28px 0; }
            .qr-wrap img { width: min(340px, 100%); height: auto; padding: 16px; border: 1px solid #e2e8f0; border-radius: 22px; background: white; }
            .meta { font-size: 14px; line-height: 1.6; word-break: break-word; }
            .meta p { margin: 10px 0; }
            .hint { margin-top: 22px; font-size: 12px; color: #64748b; }
            @media print { body { padding: 0; background: white; } .sheet { border: none; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="brand">
              ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Logo" />` : `<div class="mark">LP</div>`}
              <div>
                <p class="name">${brandName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                <p class="tagline">${brandTagline.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                <p class="subline">${brandSubline.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              </div>
            </div>
            <div class="qr-wrap"><img src="${imageUrl}" alt="QR Code" /></div>
            <div class="meta">
              <p><strong>File Name:</strong> ${safeTitle}</p>
              <p><strong>QR Value:</strong> ${qrValue.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
            </div>
            <div class="hint">Use Print and choose Save as PDF for printable LeanProcure cards.</div>
          </div>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const downloadKanbanCard = async () => {
    if (!qrValue.trim()) return;

    const kanbanQr = await QRCode.toDataURL(qrValue, {
      width: 420,
      margin: 1,
      color: {
        dark: "#111111",
        light: "#FFFFFF",
      },
    });

    const printWindow = window.open("", "_blank", "width=1000,height=1200");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${safeFileName(kanbanPartNo || kanbanDescription, "kanban-card")}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; background: #f4f4f4; }
            .card { width: 720px; margin: 0 auto; background: white; border: 2px solid #3b3b3b; }
            .header { display:flex; justify-content:space-between; align-items:center; background:#b64c4c; color:white; padding:10px 14px; font-weight:700; font-size:34px; }
            .brand-stamp { display:flex; align-items:center; gap:10px; padding:12px 14px; border-bottom:1px solid #555; }
            .brand-stamp img { width:44px; height:44px; object-fit:contain; border-radius:10px; }
            .brand-badge { width:44px; height:44px; border-radius:10px; background:linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); color:white; display:flex; align-items:center; justify-content:center; font-weight:800; }
            .brand-copy { font-size:12px; color:#444; line-height:1.35; }
            .code { font-size:30px; }
            .body { display:grid; grid-template-columns: 1fr 1fr; }
            .qrbox { border-right:1px solid #555; border-bottom:1px solid #555; padding:12px; min-height:340px; display:flex; align-items:center; justify-content:center; }
            .qrbox img { width:100%; max-width:300px; height:auto; }
            .rightcol { border-bottom:1px solid #555; }
            .sec-head { background:#b64c4c; color:white; font-weight:700; padding:8px 12px; font-size:20px; }
            .sec-body { padding:14px 12px; min-height:84px; font-size:22px; line-height:1.35; }
            .scan-note { display:inline-block; background:#e7d66f; color:#222; font-size:14px; font-weight:700; padding:4px 8px; margin-top:8px; }
            .image-row { display:grid; grid-template-columns: 1fr 1fr; }
            .img-box { border-right:1px solid #555; min-height:220px; display:flex; align-items:center; justify-content:center; padding:16px; }
            .img-box img { max-width:220px; max-height:180px; object-fit:contain; }
            .footer-head { background:#b64c4c; color:white; font-weight:700; padding:8px 12px; font-size:20px; border-top:1px solid #555; }
            .footer-body { padding:14px 12px; font-size:18px; min-height:80px; }
            @media print { body { padding:0; background:white; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>${kanbanTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              <div class="code">${kanbanCode.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            </div>
            <div class="brand-stamp">
              ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" />` : `<div class="brand-badge">LP</div>`}
              <div class="brand-copy"><strong>${brandName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong><br />${watermarkEnabled ? `© ${brandName.replace(/</g, "&lt;").replace(/>/g, "&gt;")} - generated card` : `Licensed client build`}</div>
            </div>
            <div class="body">
              <div class="qrbox">
                <img src="${kanbanQr}" alt="QR Code" />
              </div>
              <div class="rightcol">
                <div class="sec-head">DESCRIPTION</div>
                <div class="sec-body">
                  ${kanbanDescription.replace(/</g, "&lt;").replace(/>/g, "&gt;")}<br /><br />
                  (Part No. ${kanbanPartNo.replace(/</g, "&lt;").replace(/>/g, "&gt;")})
                </div>
                <div class="sec-head">ORDER AT</div>
                <div class="sec-body">
                  ${kanbanOrderAt.replace(/</g, "&lt;").replace(/>/g, "&gt;")}<br />
                  <span class="scan-note">SCAN QR CODE AT THIS POINT</span>
                </div>
                <div class="sec-head">ORDER QUANTITY</div>
                <div class="sec-body">${kanbanOrderQty.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                <div class="sec-head">SUPPLIERS</div>
                <div class="sec-body">${kanbanSupplier.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              </div>
            </div>
            <div class="image-row">
              <div class="img-box">${kanbanImageUrl ? `<img src="${kanbanImageUrl}" alt="Product" />` : ""}</div>
              <div></div>
            </div>
            <div class="footer-head">RESTOCKING INFORMATION</div>
            <div class="footer-body">${kanbanRestockInfo.replace(/</g, "&lt;").replace(/>/g, "&gt;")}${watermarkEnabled ? `<br /><br /><span style="font-size:12px;color:#666;">© ${brandName.replace(/</g, "&lt;").replace(/>/g, "&gt;")} - not for unauthorised reuse</span>` : ``}</div>
          </div>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const downloadBatchZip = async () => {
    if (!validBatchRows.length) {
      setBatchMessage("No valid rows to export.");
      return;
    }

    setBatchLoading(true);

    try {
      const encoder = new TextEncoder();
      const zipParts = [];
      const centralParts = [];
      let offset = 0;

      const crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) {
          c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        crcTable[n] = c >>> 0;
      }

      const crc32 = (bytes) => {
        let crc = 0xffffffff;
        for (let i = 0; i < bytes.length; i += 1) {
          crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
        }
        return (crc ^ 0xffffffff) >>> 0;
      };

      for (let i = 0; i < validBatchRows.length; i += 1) {
        const row = validBatchRows[i];
        const value = getBatchQrValue(row);
        const tempCanvas = document.createElement("canvas");
        await QRCode.toCanvas(tempCanvas, value, {
          width: Number(size),
          margin: Number(margin),
          color: {
            dark: primaryColor,
            light: "#FFFFFF",
          },
        });

        if (logoDataUrl && watermarkEnabled) {
          await drawQrBrandOverlay(tempCanvas, logoDataUrl);
        }

        const dataUrl = tempCanvas.toDataURL("image/png");
        const binary = atob(dataUrl.split(",")[1]);
        const fileBytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j += 1) {
          fileBytes[j] = binary.charCodeAt(j);
        }

        const file = `${safeFileName(row.fileName, `qr-${i + 1}`)}.png`;
        const nameBytes = encoder.encode(file);
        const crc = crc32(fileBytes);
        const sizeBytes = fileBytes.length;

        const localHeader = new Uint8Array(30 + nameBytes.length);
        const localView = new DataView(localHeader.buffer);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, 0, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, 0, true);
        localView.setUint16(12, 0, true);
        localView.setUint32(14, crc, true);
        localView.setUint32(18, sizeBytes, true);
        localView.setUint32(22, sizeBytes, true);
        localView.setUint16(26, nameBytes.length, true);
        localView.setUint16(28, 0, true);
        localHeader.set(nameBytes, 30);

        const centralHeader = new Uint8Array(46 + nameBytes.length);
        const centralView = new DataView(centralHeader.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, 0, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, 0, true);
        centralView.setUint16(14, 0, true);
        centralView.setUint32(16, crc, true);
        centralView.setUint32(20, sizeBytes, true);
        centralView.setUint32(24, sizeBytes, true);
        centralView.setUint16(28, nameBytes.length, true);
        centralView.setUint16(30, 0, true);
        centralView.setUint16(32, 0, true);
        centralView.setUint16(34, 0, true);
        centralView.setUint16(36, 0, true);
        centralView.setUint32(38, 0, true);
        centralView.setUint32(42, offset, true);
        centralHeader.set(nameBytes, 46);

        zipParts.push(localHeader, fileBytes);
        centralParts.push(centralHeader);
        offset += localHeader.length + fileBytes.length;
      }

      const centralStart = offset;
      let centralSize = 0;

      centralParts.forEach((part) => {
        centralSize += part.length;
        zipParts.push(part);
      });

      const endHeader = new Uint8Array(22);
      const endView = new DataView(endHeader.buffer);
      endView.setUint32(0, 0x06054b50, true);
      endView.setUint16(4, 0, true);
      endView.setUint16(6, 0, true);
      endView.setUint16(8, centralParts.length, true);
      endView.setUint16(10, centralParts.length, true);
      endView.setUint32(12, centralSize, true);
      endView.setUint32(16, centralStart, true);
      endView.setUint16(20, 0, true);
      zipParts.push(endHeader);

      const blob = new Blob(zipParts, { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(brandName, "leanprocure")}-multiple-qrs.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setBatchMessage(`${validBatchRows.length} QR codes exported.`);
    } catch (error) {
      console.error(error);
      setBatchMessage("Batch export failed.");
    } finally {
      setBatchLoading(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error(error);
    }
  };

  const clearAll = () => {
    setMode("email");
    setCreatorMode("single");
    setText("");
    setEmailRecipients([{ id: 1, value: "example1@email.com" }]);
    setEmailCc("");
    setEmailBcc("");
    setEmailSubject("Hello from LeanProcure");
    setEmailBody("Hi,\n\nThis email was started by scanning a QR code.\n\nThanks");
    setFileName("leanprocure-qr-code");
    setSelectedTemplate("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f7fb", padding: 24 }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div style={{ background: "white", borderRadius: 24, padding: 24, boxShadow: "0 16px 40px rgba(15,23,42,0.08)", marginBottom: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {logoDataUrl ? (
                <img src={logoDataUrl} alt="Logo" style={{ width: 76, height: 76, objectFit: "contain", borderRadius: 18 }} />
              ) : (
                <div style={{ width: 76, height: 76, borderRadius: 18, background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 28, boxShadow: "0 12px 30px rgba(15,23,42,0.18)" }}>LP</div>
              )}
              <div>
                <div style={{ fontSize: 36, fontWeight: 800, color: primaryColor, lineHeight: 1 }}>{brandName}</div>
                <div style={{ marginTop: 2, fontSize: 11, color: "#64748b" }}>© {brandName}</div>
                <div style={{ marginTop: 6, letterSpacing: "0.34em", fontSize: 12, fontWeight: 800, color: secondaryColor }}>{brandTagline}</div>
                <div style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>{brandSubline}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {!isAdmin ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <input
    type={showAdminPassword ? "text" : "password"}
    value={adminPassword}
    onChange={(e) => setAdminPassword(e.target.value)}
    placeholder="Admin password"
    style={{ ...adminInputStyle, borderColor: `${primaryColor}33` }}
  />
  <button onClick={() => setShowAdminPassword((prev) => !prev)} style={ghostButtonStyle}>
    {showAdminPassword ? "Hide" : "Show"}
  </button>
</div>
                  <button onClick={unlockAdmin} style={outlineButtonStyle(primaryColor)}>Unlock admin</button>
                </>
              ) : (
                <button onClick={() => setIsAdmin(false)} style={outlineButtonStyle(primaryColor)}>Lock admin</button>
              )}
              <button onClick={() => setCreatorMode("single")} style={tabButtonStyle(creatorMode === "single", primaryColor)}>Single QR</button>
              <button onClick={() => setCreatorMode("batch")} style={tabButtonStyle(creatorMode === "batch", primaryColor)}>Multiple QR Codes</button>
              <button onClick={() => setCreatorMode("kanban")} style={tabButtonStyle(creatorMode === "kanban", primaryColor)}>Kanban Card Generator</button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 1.15fr) minmax(320px, 0.85fr)", gap: 24 }}>
          <div style={cardStyle}>
            {isAdmin && (
              <section style={{ marginBottom: 24 }}>
                <div style={sectionHeaderStyle(primaryColor)}>Licensing and watermark</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
                  <div>
                    <label style={labelStyle}>Client license key</label>
                    <input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="Enter license key to remove watermark" style={inputStyle} />
                  </div>
                  <button onClick={applyLicenseKey} style={actionButtonStyle(primaryColor)}>Apply key</button>
                </div>
                <div style={{ marginTop: -4, marginBottom: 16, fontSize: 13, color: watermarkEnabled ? "#92400e" : "#166534" }}>{licenseStatus}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <button onClick={() => { setWatermarkEnabled(true); setLicenseStatus("Watermark ON"); }} style={outlineButtonStyle(primaryColor)}>Force watermark ON</button>
                  <button onClick={() => { setWatermarkEnabled(false); setLicenseStatus("Watermark OFF (admin override)"); }} style={outlineButtonStyle(primaryColor)}>Admin watermark OFF</button>
                </div>
              </section>

              <section style={{ marginBottom: 24 }}>
                <div style={sectionHeaderStyle(primaryColor)}>LeanProcure branding</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Brand name</label>
                    <input value={brandName} onChange={(e) => setBrandName(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Tagline</label>
                    <input value={brandTagline} onChange={(e) => setBrandTagline(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <label style={labelStyle}>Brand subline</label>
                <input value={brandSubline} onChange={(e) => setBrandSubline(e.target.value)} style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Primary colour</label>
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ ...inputStyle, height: 48, padding: 6 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Secondary colour</label>
                    <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} style={{ ...inputStyle, height: 48, padding: 6 }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Upload logo</label>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ ...inputStyle, padding: 10 }} />
                  </div>
                </div>
              </section>
            )}

            {creatorMode === "single" ? (
              <>
                <section style={{ marginBottom: 24 }}>
                  <div style={sectionHeaderStyle(primaryColor)}>Quick templates</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {Object.entries(templates).map(([key, template]) => (
                      <button key={key} onClick={() => applyTemplate(key)} style={pillButtonStyle(selectedTemplate === key, primaryColor, secondaryColor)}>
                        {template.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <button onClick={() => setMode("email")} style={tabButtonStyle(mode === "email", primaryColor)}>Email QR</button>
                    <button onClick={() => setMode("text")} style={tabButtonStyle(mode === "text", primaryColor)}>Text / URL QR</button>
                  </div>

                  {mode === "email" ? (
                    <>
                      <label style={labelStyle}>Recipients</label>
                      {emailRecipients.map((recipient, index) => (
                        <div key={recipient.id} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                          <input
                            value={recipient.value}
                            onChange={(e) => setEmailRecipients((prev) => prev.map((item) => item.id === recipient.id ? { ...item, value: e.target.value } : item))}
                            placeholder={`Recipient ${index + 1} email`}
                            style={inputStyle}
                          />
                          {emailRecipients.length > 1 ? (
                            <button onClick={() => setEmailRecipients((prev) => prev.filter((item) => item.id !== recipient.id))} style={smallButtonStyle}>Remove</button>
                          ) : null}
                        </div>
                      ))}
                      <button onClick={() => setEmailRecipients((prev) => [...prev, { id: Date.now(), value: "" }])} style={{ ...smallButtonStyle, marginBottom: 16 }}>Add recipient</button>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div>
                          <label style={labelStyle}>CC</label>
                          <input value={emailCc} onChange={(e) => setEmailCc(e.target.value)} style={inputStyle} placeholder="Optional CC emails" />
                        </div>
                        <div>
                          <label style={labelStyle}>BCC</label>
                          <input value={emailBcc} onChange={(e) => setEmailBcc(e.target.value)} style={inputStyle} placeholder="Optional BCC emails" />
                        </div>
                      </div>

                      <label style={labelStyle}>Subject</label>
                      <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} style={inputStyle} />

                      <label style={labelStyle}>Body</label>
                      <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} style={{ ...inputStyle, minHeight: 150, resize: "vertical" }} />
                    </>
                  ) : (
                    <>
                      <label style={labelStyle}>Content</label>
                      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text or a URL" style={{ ...inputStyle, minHeight: 150, resize: "vertical" }} />
                    </>
                  )}
                </section>

                <label style={labelStyle}>File name</label>
                <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={inputStyle} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Size: {size}px</label>
                    <input type="number" min="128" max="1024" step="32" value={size} onChange={(e) => setSize(Number(e.target.value) || 320)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Margin: {margin}</label>
                    <input type="range" min="0" max="8" step="1" value={margin} onChange={(e) => setMargin(Number(e.target.value))} style={{ width: "100%", marginTop: 14 }} />
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
                  <button onClick={downloadPng} style={actionButtonStyle(primaryColor)}>Download PNG</button>
                  <button onClick={downloadSvg} style={actionButtonStyle(primaryColor)}>Download SVG</button>
                  <button onClick={downloadPdf} style={actionButtonStyle(primaryColor)}>Print / Save PDF</button>
                  <button onClick={copyText} style={actionButtonStyle(primaryColor)}>{copied ? "Copied" : "Copy QR value"}</button>
                  <button onClick={clearAll} style={ghostButtonStyle}>Reset</button>
                </div>
              </>
            ) : creatorMode === "batch" ? (
              <section>
                <div style={sectionHeaderStyle(primaryColor)}>Create multiple different QR codes</div>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 0 }}>
                  Paste CSV rows for different QR codes. Use either text or email fields. Then export all QR codes as a ZIP of PNG files.
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: primaryColor }}>Build up to 5 different QR codes</div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Use one line per QR. Choose Text/URL or Email QR for each line.</div>
                  </div>
                  <button onClick={addBatchEntry} disabled={batchEntries.length >= 5} style={outlineButtonStyle(primaryColor)}>
                    Add line
                  </button>
                </div>

                <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                  {batchEntries.map((entry, index) => (
                    <div key={entry.id} style={{ border: `1px solid ${primaryColor}22`, borderRadius: 16, padding: 14, background: "#f8fbff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ fontWeight: 700, color: primaryColor }}>QR line {index + 1}</div>
                        {batchEntries.length > 1 ? (
                          <button onClick={() => removeBatchEntry(entry.id)} style={ghostButtonStyle}>Remove</button>
                        ) : null}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12 }}>
                        <div>
                          <label style={labelStyle}>File name</label>
                          <input
                            value={entry.fileName}
                            onChange={(e) => updateBatchEntry(entry.id, "fileName", e.target.value)}
                            style={inputStyle}
                            placeholder={`qr-${index + 1}`}
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>QR type</label>
                          <select
                            value={entry.qrType}
                            onChange={(e) => updateBatchEntry(entry.id, "qrT
