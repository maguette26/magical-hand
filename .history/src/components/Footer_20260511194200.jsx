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

      {/* Adresse */}
      <p
        style={{
          fontSize: "14px",
          color: "#FAF6EF",
          marginBottom: "10px",
        }}
      >
        📍 Localisation : Poste thiaroye
      </p>

      {/* Google Maps */}
      <a
        href="https://www.google.com/maps"
        target="_blank"
        rel="noreferrer"
        style={{
          fontSize: "13px",
          color: "#C9A84C",
          textDecoration: "none",
          display: "block",
          marginBottom: "20px",
        }}
      >
        Voir sur Google Maps
      </a>

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