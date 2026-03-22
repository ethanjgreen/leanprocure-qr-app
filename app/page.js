"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function Page() {
  const [text, setText] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");

  const canvasRef = useRef(null);

  const ADMIN_PASSWORD = "leanprocure123";

  useEffect(() => {
    if (!qrValue) return;

    QRCode.toCanvas(canvasRef.current, qrValue, {
      width: 300,
    });
  }, [qrValue]);

  const generateQR = () => {
    setQrValue(text);
  };

  const unlockAdmin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
    } else {
      alert("Wrong password");
    }
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL();
    link.download = "qr-code.png";
    link.click();
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>QR Code Generator</h1>

      {/* Admin Lock */}
      {!isAdmin && (
        <div style={{ marginBottom: 20 }}>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={unlockAdmin}>Unlock</button>
        </div>
      )}

      {/* Input */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Enter text or URL"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ width: 300 }}
        />
        <button onClick={generateQR}>Generate</button>
      </div>

      {/* QR */}
      <canvas ref={canvasRef} />

      <div style={{ marginTop: 20 }}>
        <button onClick={downloadQR}>Download QR</button>
      </div>

      {/* Admin Only Section */}
      {isAdmin && (
        <div style={{ marginTop: 40, borderTop: "1px solid #ccc", paddingTop: 20 }}>
          <h3>Admin Controls</h3>
          <p>Branding / advanced features go here</p>
        </div>
      )}
    </div>
  );
}
