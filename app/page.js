"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

/* -------------------- TEMPLATES -------------------- */
const templates = {
  supplierReorder: {
    label: "Supplier reorder",
    subject: "Kanban Reorder Request",
    body: "Hi,\n\nPlease process a replenishment.\n\nPart Number:\nQuantity:\n\nThanks",
  },
};

/* -------------------- HELPERS -------------------- */
function buildMailto({ to = "", subject = "", body = "" }) {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  return `mailto:${to}?${params.toString()}`;
}

function safeFileName(value) {
  return (value || "qr-code").replace(/\s+/g, "-").toLowerCase();
}

/* -------------------- PAGE -------------------- */
export default function Page() {
  const [mode, setMode] = useState("email");
  const [creatorMode, setCreatorMode] = useState("single");

  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [qrValue, setQrValue] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const ADMIN_PASSWORD = "leanprocure123";

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!qrValue) return;
    QRCode.toCanvas(canvasRef.current, qrValue, { width: 300 });
  }, [qrValue]);

  const generateQR = () => {
    if (mode === "email") {
      setQrValue(buildMailto({ to: email, subject, body }));
    } else {
      setQrValue(text);
    }
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL();
    link.download = `${safeFileName("qr")}.png`;
    link.click();
  };

  const unlockAdmin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
    } else {
      alert("Wrong password");
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
      <h1>QR Code Generator</h1>

      {/* ADMIN */}
      {!isAdmin && (
        <div>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={unlockAdmin}>Unlock</button>
        </div>
      )}

      {/* MODE */}
      <div style={{ marginTop: 20 }}>
        <button onClick={() => setCreatorMode("single")}>Single QR</button>
        <button onClick={() => setCreatorMode("batch")}>Multiple QR</button>
        <button onClick={() => setCreatorMode("kanban")}>Kanban</button>
      </div>

      {/* SINGLE */}
      {creatorMode === "single" && (
        <>
          <div>
            <button onClick={() => setMode("email")}>Email</button>
            <button onClick={() => setMode("text")}>Text</button>
          </div>

          {mode === "email" ? (
            <>
              <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
              <input placeholder="Subject" onChange={(e) => setSubject(e.target.value)} />
              <textarea placeholder="Body" onChange={(e) => setBody(e.target.value)} />
            </>
          ) : (
            <input placeholder="Text / URL" onChange={(e) => setText(e.target.value)} />
          )}

          <button onClick={generateQR}>Generate</button>
        </>
      )}

      {/* BATCH */}
      {creatorMode === "batch" && (
        <div>
          <p>Paste CSV (simplified)</p>
          <textarea placeholder="text,url etc" />
        </div>
      )}

      {/* KANBAN */}
      {creatorMode === "kanban" && (
        <div>
          <p>Kanban generator (uses current QR)</p>
        </div>
      )}

      {/* QR */}
      <div style={{ marginTop: 20 }}>
        <canvas ref={canvasRef} />
      </div>

      <button onClick={downloadQR}>Download</button>

      {/* ADMIN SECTION */}
      {isAdmin && (
        <div style={{ marginTop: 40 }}>
          <h3>Admin Controls</h3>
          <p>Branding hidden from users</p>
        </div>
      )}
    </div>
  );
}
