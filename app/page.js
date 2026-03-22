"use client";

import React, { useEffect, useRef, useState } from "react";
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

export default function Page() {
  const [mode, setMode] = useState("email");
  const [text, setText] = useState("https://example.com");
  const [emailRecipients, setEmailRecipients] = useState([{ id: 1, value: "example1@email.com" }]);
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [emailSubject, setEmailSubject] = useState("Hello from my QR code");
  const [emailBody, setEmailBody] = useState("Hi,\n\nThis email was started by scanning a QR code.\n\nThanks");
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [fileName, setFileName] = useState("my-qr-code");
  const [copied, setCopied] = useState(false);
  const [brandName, setBrandName] = useState("Ethan Green");
  const [brandTagline, setBrandTagline] = useState("QR Kanban Tools");
  const [accentColor, setAccentColor] = useState("#0f172a");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const canvasRef = useRef(null);

  const cleanRecipients = (value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(",");

  const toValue = emailRecipients
    .map((item) => item.value.trim())
    .filter(Boolean)
    .join(",");

  const buildMailto = () => {
    const params = new URLSearchParams();
    if (emailSubject.trim()) params.set("subject", emailSubject);
    if (emailBody.trim()) params.set("body", emailBody);
    if (cleanRecipients(emailCc)) params.set("cc", cleanRecipients(emailCc));
    if (cleanRecipients(emailBcc)) params.set("bcc", cleanRecipients(emailBcc));
    return `mailto:${toValue}?${params.toString()}`;
  };

  const qrValue = mode === "email" ? buildMailto() : text.trim();

  useEffect(() => {
    const generate = async () => {
      if (!canvasRef.current || !qrValue.trim()) return;
      try {
        await QRCode.toCanvas(canvasRef.current, qrValue, {
          width: Number(size),
          margin: Number(margin),
        });
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
    };

    generate();
  }, [qrValue, size, margin]);

  const applyTemplate = (templateKey) => {
    const template = templates[templateKey];
    if (!template) return;
    setSelectedTemplate(templateKey);
    setMode("email");
    setEmailSubject(template.subject);
    setEmailBody(template.body);
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const downloadPng = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName || "qr-code"}.png`;
    link.click();
  };

  const downloadSvg = async () => {
    if (!qrValue.trim()) return;

    try {
      const svgString = await QRCode.toString(qrValue, {
        type: "svg",
        width: Number(size),
        margin: Number(margin),
      });

      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName || "qr-code"}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate SVG:", error);
    }
  };

  const downloadPdf = () => {
    if (!canvasRef.current || !qrValue.trim()) return;

    const imageUrl = canvasRef.current.toDataURL("image/png");
    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) {
      alert("Please allow popups to create the PDF print page.");
      return;
    }

    const safeTitle =
      (fileName || "qr-code").replace(/[^a-z0-9-_ ]/gi, "").trim() || "qr-code";

    printWindow.document.write(`
      <html>
        <head>
          <title>${safeTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              color: #111;
            }
            .sheet {
              max-width: 700px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 24px;
              border-radius: 16px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 16px;
              border-bottom: 2px solid ${accentColor};
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .brand img {
              width: 64px;
              height: 64px;
              object-fit: contain;
              border-radius: 12px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 6px;
            }
            .tagline {
              color: #555;
              font-size: 14px;
            }
            .qr-wrap {
              text-align: center;
              margin: 24px 0;
            }
            .qr-wrap img.qr {
              width: min(320px, 100%);
              height: auto;
            }
            .meta {
              font-size: 14px;
              line-height: 1.5;
              word-break: break-word;
            }
            .meta p {
              margin: 8px 0;
            }
            .hint {
              margin-top: 24px;
              font-size: 12px;
              color: #555;
            }
            @media print {
              body {
                padding: 0;
              }
              .sheet {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="brand">
              ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" />` : ""}
              <div>
                <h1>${brandName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1>
                <div class="tagline">${brandTagline.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              </div>
            </div>
            <div class="qr-wrap">
              <img class="qr" src="${imageUrl}" alt="QR Code" />
            </div>
            <div class="meta">
              <p><strong>File Name:</strong> ${safeTitle}</p>
              <p><strong>QR Value:</strong> ${qrValue.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
            </div>
            <div class="hint">
              Use Print and choose Save as PDF for printable kanban cards.
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const clearAll = () => {
    setMode("email");
    setText("");
    setEmailRecipients([{ id: 1, value: "example1@email.com" }]);
    setEmailCc("");
    setEmailBcc("");
    setEmailSubject("Hello from my QR code");
    setEmailBody("Hi,\n\nThis email was started by scanning a QR code.\n\nThanks");
    setFileName("my-qr-code");
    setSize(320);
    setMargin(2);
    setSelectedTemplate("");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px" }}>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "20px",
              borderBottom: `2px solid ${accentColor}`,
              paddingBottom: "16px",
            }}
          >
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Logo"
                style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "12px" }}
              />
            ) : (
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "12px",
                  background: accentColor,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "24px",
                }}
              >
                {brandName.slice(0, 1).toUpperCase() || "E"}
              </div>
            )}
            <div>
              <h1 style={{ fontSize: "28px", marginBottom: "6px", color: accentColor }}>{brandName}</h1>
              <p style={{ color: "#475569", margin: 0 }}>{brandTagline}</p>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Quick templates</label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {Object.entries(templates).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  style={buttonStyle(selectedTemplate === key, accentColor)}
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
            <div>
              <label style={labelStyle}>Brand name</label>
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tagline</label>
              <input value={brandTagline} onChange={(e) => setBrandTagline(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={labelStyle}>Accent colour</label>
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ ...inputStyle, height: "48px", padding: "6px" }} />
            </div>
            <div>
              <label style={labelStyle}>Upload logo</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ ...inputStyle, padding: "10px" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <button onClick={() => setMode("email")} style={buttonStyle(mode === "email", accentColor)}>
              Email QR
            </button>
            <button onClick={() => setMode("text")} style={buttonStyle(mode === "text", accentColor)}>
              Text / URL QR
            </button>
          </div>

          {mode === "email" ? (
            <>
              <label style={labelStyle}>Recipients</label>
              {emailRecipients.map((recipient, index) => (
                <div key={recipient.id} style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <input
                    value={recipient.value}
                    onChange={(e) =>
                      setEmailRecipients((prev) =>
                        prev.map((item) =>
                          item.id === recipient.id ? { ...item, value: e.target.value } : item
                        )
                      )
                    }
                    placeholder={`Recipient ${index + 1} email`}
                    style={inputStyle}
                  />
                  {emailRecipients.length > 1 && (
                    <button
                      onClick={() =>
                        setEmailRecipients((prev) => prev.filter((item) => item.id !== recipient.id))
                      }
                      style={smallButtonStyle}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => setEmailRecipients((prev) => [...prev, { id: Date.now(), value: "" }])}
                style={{ ...smallButtonStyle, marginBottom: "16px" }}
              >
                Add recipient
              </button>

              <label style={labelStyle}>CC</label>
              <input
                value={emailCc}
                onChange={(e) => setEmailCc(e.target.value)}
                placeholder="Optional CC emails, comma separated"
                style={inputStyle}
              />

              <label style={labelStyle}>BCC</label>
              <input
                value={emailBcc}
                onChange={(e) => setEmailBcc(e.target.value)}
                placeholder="Optional BCC emails, comma separated"
                style={inputStyle}
              />

              <label style={labelStyle}>Subject</label>
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter subject"
                style={inputStyle}
              />

              <label style={labelStyle}>Body</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Enter email body"
                style={{ ...inputStyle, minHeight: "140px", resize: "vertical" }}
              />
            </>
          ) : (
            <>
              <label style={labelStyle}>Content</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text or a URL"
                style={{ ...inputStyle, minHeight: "140px", resize: "vertical" }}
              />
            </>
          )}

          <label style={labelStyle}>File name</label>
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Size: {size}px</label>
          <input
            type="number"
            min="128"
            max="1024"
            step="32"
            value={size}
            onChange={(e) => setSize(Number(e.target.value) || 320)}
            style={inputStyle}
          />

          <label style={labelStyle}>Margin: {margin}</label>
          <input
            type="range"
            min="0"
            max="8"
            step="1"
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value))}
            style={{ width: "100%", marginBottom: "20px" }}
          />

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={downloadPng} style={actionButtonStyle(accentColor)}>
              Download PNG
            </button>
            <button onClick={downloadSvg} style={actionButtonStyle(accentColor)}>
              Download SVG
            </button>
            <button onClick={downloadPdf} style={actionButtonStyle(accentColor)}>
              Print / Save PDF
            </button>
            <button onClick={copyText} style={actionButtonStyle(accentColor)}>
              {copied ? "Copied" : "Copy QR value"}
            </button>
            <button onClick={clearAll} style={ghostButtonStyle}>
              Reset
            </button>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
              paddingBottom: "12px",
              borderBottom: `2px solid ${accentColor}`,
            }}
          >
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Logo"
                style={{ width: "44px", height: "44px", objectFit: "contain", borderRadius: "10px" }}
              />
            ) : null}
            <div>
              <h2 style={{ fontSize: "24px", margin: 0, color: accentColor }}>Preview</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>{brandName}</p>
            </div>
          </div>

          <div
            style={{
              minHeight: "520px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              background: "#fff",
              borderRadius: "24px",
            }}
          >
            {qrValue.trim() ? (
              <>
                <div
                  style={{
                    border: `1px solid ${accentColor}22`,
                    borderRadius: "24px",
                    padding: "16px",
                    background: "#fff",
                  }}
                >
                  <canvas ref={canvasRef} style={{ maxWidth: "100%" }} />
                </div>
                <div
                  style={{
                    marginTop: "24px",
                    width: "100%",
                    background: "#f8fafc",
                    borderRadius: "16px",
                    padding: "16px",
                    color: "#475569",
                    fontSize: "14px",
                  }}
                >
                  <p style={{ fontWeight: 600, color: accentColor, marginBottom: "8px" }}>
                    Encoded QR content
                  </p>
                  <p style={{ wordBreak: "break-all", textAlign: "center" }}>{qrValue}</p>
                </div>
              </>
            ) : (
              <p style={{ color: "#64748b" }}>Enter content to generate your QR code.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function buttonStyle(active, accentColor) {
  return {
    padding: "10px 16px",
    borderRadius: "14px",
    border: active ? `1px solid ${accentColor}` : "1px solid #cbd5e1",
    background: active ? accentColor : "#fff",
    color: active ? "#fff" : "#0f172a",
    cursor: "pointer",
    fontWeight: 600,
  };
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  marginBottom: "16px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
  color: "#0f172a",
};

function actionButtonStyle(accentColor) {
  return {
    padding: "10px 16px",
    borderRadius: "14px",
    border: `1px solid ${accentColor}`,
    background: accentColor,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  };
}

const ghostButtonStyle = {
  padding: "10px 16px",
  borderRadius: "14px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 600,
};

const smallButtonStyle = {
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 600,
};
