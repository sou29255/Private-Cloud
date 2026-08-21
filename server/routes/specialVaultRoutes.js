const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { protect, sumanaOnly } = require('../middleware/authMiddleware');

router.get('/', protect, sumanaOnly, (req, res) => {
  // Return the handcrafted zero-background transparent artwork catalog strictly for Sumana
  const specialCatalog = {
    success: true,
    title: "Only For You 💖",
    subtitle: "Exclusive Photoshop Artworks & Dreamscape Vault for Sumana",
    recipient: "Sumana",
    audioTrack: "/photo/sppppppppp.mp4",
    fallbackAudio: "/music/WhatsApp Audio 2026-08-21 at 1.00.10 AM.mpeg",
    cutouts: [
      {
        id: "cutout_01",
        title: "Grace & Elegance",
        subtitle: "Aura of Soft Blossoms",
        caption: "A smile that effortlessly lights up every room and stays in the heart forever. ✨",
        quote: "“In your smile, I find a beauty that words could never completely capture.”",
        src: "/photo/cutout_clean_01.png",
        glowColor: "rgba(255, 64, 129, 0.6)",
        gradient: "linear-gradient(135deg, rgba(255, 64, 129, 0.25), rgba(124, 77, 255, 0.25))",
        tag: "💖 Pure Radiance"
      },
      {
        id: "cutout_02",
        title: "Timeless Charm",
        subtitle: "Golden Glow Portrait",
        caption: "Pure radiance, gentle grace, and timeless charm in every captured moment. 🌸",
        quote: "“Some souls carry a light so quiet yet so radiant it makes the whole world softer.”",
        src: "/photo/cutout_clean_02.png",
        glowColor: "rgba(0, 229, 255, 0.6)",
        gradient: "linear-gradient(135deg, rgba(0, 229, 255, 0.25), rgba(0, 245, 212, 0.25))",
        tag: "✨ Timeless Elegance"
      },
      {
        id: "cutout_03",
        title: "Sweet Radiance",
        subtitle: "Starlight Dream Cutout",
        caption: "Unfiltered sweetness, genuine laughter, and the most precious memories ever made. 💫",
        quote: "“Cherishing every second, every laughter, and every precious memory shared together.”",
        src: "/photo/cutout_clean_03.png",
        glowColor: "rgba(124, 77, 255, 0.6)",
        gradient: "linear-gradient(135deg, rgba(124, 77, 255, 0.25), rgba(255, 64, 129, 0.25))",
        tag: "🌷 Joy & Starlight"
      }
    ],
    portraits: [
      {
        id: "portrait_01",
        title: "Candid Joy",
        caption: "Cherished smiles and candid happiness frozen in time. 📸",
        quote: "“The purest smile is the one that comes straight from the heart.”",
        src: "/photo/cutout_portrait_01.png",
        glowColor: "rgba(255, 183, 77, 0.6)",
        tag: "📸 Candid Warmth"
      },
      {
        id: "portrait_02",
        title: "Gentle Warmth",
        caption: "Every glance holds a story of warmth, peace, and tenderness. 🌟",
        quote: "“Gentle moments that fill the heart with pure tranquility.”",
        src: "/photo/cutout_portrait_02.png",
        glowColor: "rgba(0, 245, 212, 0.6)",
        tag: "🌟 Gentle Peace"
      },
      {
        id: "portrait_03",
        title: "Treasured Memory",
        caption: "A gentle reminder of all the beautiful moments we treasure deeply. 💖",
        quote: "“Holding onto the most beautiful memories of our journey.”",
        src: "/photo/cutout_portrait_03.png",
        glowColor: "rgba(255, 64, 129, 0.6)",
        tag: "💖 Deep Treasure"
      },
      {
        id: "portrait_04",
        title: "Golden Vibes",
        caption: "Soft golden light and peaceful memories that never fade. 🌅",
        quote: "“Shining bright with timeless charm and endless grace.”",
        src: "/photo/cutout_portrait_04.png",
        glowColor: "rgba(124, 77, 255, 0.6)",
        tag: "🌅 Golden Glow"
      }
    ]
  };

  return res.json(specialCatalog);
});

module.exports = router;
