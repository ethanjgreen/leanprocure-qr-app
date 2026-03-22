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

const batchExample = `fileName,to,cc,bcc,subject,body,text
artronics-170377,orders@vendor.com,,buyer@company.com,Reorder 170377,"Hi,\nPlease supply 45 pcs of part 170377.\nThanks",
stock-alert,,,,Stock Alert,"Bin empty for part BG0273-JP",
plain-url,,,,,,https://example.com/item/170377`;

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

  const [batchInput, setBatchInput] = useState(batchExample);
  const [batchRows, setBatchRows] = useState([]);
  const [batchMessage, setBatchMessage] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);

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

  const validBatchRows = useMemo(() => batchRows.filter((row) => getBatchQrValue(row).trim()), [batchRows]);

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
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
    };

    generate();
  }, [qrValue, size, margin, primaryColor]);

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

  const handleBatchParse = () => {
    const rows = parseCsv(batchInput);
    setBatchRows(rows);
    setBatchMessage(rows.length ? `${rows.length} rows ready for export.` : "No valid rows found.");
  };

  const downloadPng = () => {
    if (!canvasRef.current) return;
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
        const dataUrl = await QRCode.toDataURL(value, {
          width: Number(size),
          margin: Number(margin),
          color: {
            dark: primaryColor,
            light: "#FFFFFF",
          },
        });

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
      link.download = `${safeFileName(brandName, "leanprocure")}-batch-qrs.zip`;
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
                <div style={{ marginTop: 6, letterSpacing: "0.34em", fontSize: 12, fontWeight: 800, color: secondaryColor }}>{brandTagline}</div>
                <div style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>{brandSubline}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setCreatorMode("single")} style={tabButtonStyle(creatorMode === "single", primaryColor)}>Single QR</button>
              <button onClick={() => setCreatorMode("batch")} style={tabButtonStyle(creatorMode === "batch", primaryColor)}>Multiple QR Codes</button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 1.15fr) minmax(320px, 0.85fr)", gap: 24 }}>
          <div style={cardStyle}>
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
            ) : (
              <section>
                <div style={sectionHeaderStyle(primaryColor)}>Multiple QR Codes creator</div>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 0 }}>
                  Paste CSV rows for different QR codes. Use either text or email fields. Then export all QR codes as a ZIP of PNG files.
                </p>
                <label style={labelStyle}>CSV format</label>
                <textarea value={batchInput} onChange={(e) => setBatchInput(e.target.value)} style={{ ...inputStyle, minHeight: 220, resize: "vertical", fontFamily: "monospace" }} />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                  <button onClick={handleBatchParse} style={actionButtonStyle(primaryColor)}>Prepare QR list</button>
                  <button onClick={downloadBatchZip} style={actionButtonStyle(primaryColor)} disabled={batchLoading}>
                    {batchLoading ? "Building ZIP..." : "Download all QR codes"}
                  </button>
                </div>
                <div style={{ color: batchMessage.includes("failed") ? "#b91c1c" : "#475569", fontSize: 14, marginBottom: 16 }}>{batchMessage}</div>
                <div style={{ background: "#f8fbff", border: `1px solid ${primaryColor}22`, borderRadius: 18, padding: 16 }}>
                  <div style={{ fontWeight: 800, color: primaryColor, marginBottom: 10 }}>Parsed rows</div>
                  {validBatchRows.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {validBatchRows.map((row, index) => (
                        <div key={row.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 12, background: "white" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{row.fileName || `qr-${index + 1}`}</div>
                          <div style={{ fontSize: 13, color: "#64748b", wordBreak: "break-all", marginTop: 6 }}>{getBatchQrValue(row)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "#64748b", fontSize: 14 }}>No batch rows parsed yet.</div>
                  )}
                </div>
              </section>
            )}
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, borderBottom: `2px solid ${primaryColor}`, paddingBottom: 14, marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {logoDataUrl ? (
                  <img src={logoDataUrl} alt="Logo" style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 12 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>LP</div>
                )}
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: primaryColor }}>Preview</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{brandName}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, letterSpacing: "0.3em", fontWeight: 800, color: secondaryColor }}>{brandTagline}</div>
            </div>

            <div style={{ minHeight: 520, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              {creatorMode === "single" ? (
                qrValue.trim() ? (
                  <>
                    <div style={{ border: `1px solid ${primaryColor}22`, borderRadius: 24, padding: 16, background: "white" }}>
                      <canvas ref={canvasRef} style={{ maxWidth: "100%" }} />
                    </div>
                    <div style={{ width: "100%", marginTop: 22, background: "#f8fbff", borderRadius: 18, padding: 16 }}>
                      <div style={{ fontWeight: 800, color: primaryColor, marginBottom: 8 }}>Encoded QR content</div>
                      <div style={{ color: "#475569", fontSize: 14, wordBreak: "break-all", textAlign: "center" }}>{qrValue}</div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: "#64748b" }}>Enter content to generate your LeanProcure QR code.</div>
                )
              ) : (
                <div style={{ width: "100%", background: "#f8fbff", borderRadius: 18, padding: 18 }}>
                  <div style={{ fontWeight: 800, color: primaryColor, marginBottom: 10 }}>Batch mode</div>
                  <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
                    Parse your CSV on the left, then download a ZIP containing different QR codes for each row.
                  </div>
                  <div style={{ marginTop: 14, fontSize: 14, color: "#64748b" }}>
                    Ready rows: {validBatchRows.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function tabButtonStyle(active, color) {
  return {
    padding: "10px 16px",
    borderRadius: 14,
    border: active ? `1px solid ${color}` : "1px solid #cbd5e1",
    background: active ? color : "white",
    color: active ? "white" : "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function pillButtonStyle(active, primary, secondary) {
  return {
    padding: "10px 14px",
    borderRadius: 999,
    border: active ? `1px solid ${secondary}` : "1px solid #d7e0ea",
    background: active ? `${secondary}18` : "white",
    color: active ? primary : "#334155",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function actionButtonStyle(color) {
  return {
    padding: "10px 16px",
    borderRadius: 14,
    border: `1px solid ${color}`,
    background: color,
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function sectionHeaderStyle(color) {
  return {
    fontSize: 18,
    fontWeight: 800,
    color,
    marginBottom: 14,
  };
}

const cardStyle = {
  background: "white",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
};

const ghostButtonStyle = {
  padding: "10px 16px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};

const smallButtonStyle = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "white",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  height: 46,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  marginBottom: 16,
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  color: "#0f172a",
};
