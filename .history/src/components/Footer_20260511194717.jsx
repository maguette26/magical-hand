import React from "react";

export default function Footer() {
  return (
    <footer
      style={{
        background: "#0A0A0A",
        borderTop: "1px solid rgba(201,168,76,0.2)",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      {/* Nom */}
      <h2
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "28px",
          color: "#C9A84C",
          marginBottom: "6px",
        }}
      >
        Magical Hand
      </h2>

      <p
        style={{
          fontSize: "12px",
          color: "#8A7968",
          letterSpacing: "0.2em",
          marginBottom: "20px",
          textTransform: "uppercase",
        }}
      >
        by Mamifa
      </p>

      {/* Téléphone */}
      <p
        style={{
          fontSize: "14px",
          color: "#FAF6EF",
          marginBottom: "10px",
        }}
      >
        📞 Téléphone : +221 77 669 57 90
      </p>

      {/* Localisation + Google Maps (même ligne) */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            fontSize: "14px",
            color: "#FAF6EF",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          📍 Localisation : Poste Thiaroye,Sénégal
        </p>

        <span style={{ color: "#8A7968" }}>•</span>

        <a
          href="https://www.google.com/maps/place/Casablanca"
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: "13px",
            color: "#C9A84C",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "0.3s",
          }}
          onMouseEnter={(e) => (e.target.style.color = "#FAF6EF")}
          onMouseLeave={(e) => (e.target.style.color = "#C9A84C")}
        >
          🗺️ Voir sur Google Maps
        </a>
      </div>

      {/* Paiement */}
      <p
        style={{
          fontSize: "13px",
          color: "#8A7968",
          marginBottom: "6px",
        }}
      >
        Paiement via
      </p>

      <p
        style={{
          fontSize: "14px",
          color: "#C9A84C",
          fontWeight: "500",
        }}
      >
        Wave · Orange Money
      </p>
    </footer>
  );
}