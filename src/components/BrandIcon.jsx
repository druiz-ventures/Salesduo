import aiIcon from "../../icons/ai.svg";
import bookIcon from "../../icons/book.svg";
import buildingIcon from "../../icons/building.svg";
import capIcon from "../../icons/cap.svg";
import carIcon from "../../icons/car.svg";
import chartIcon from "../../icons/chart.svg";
import fitnessIcon from "../../icons/fitness.svg";
import globeIcon from "../../icons/globe.svg";
import handshakeIcon from "../../icons/handshake.svg";
import houseIcon from "../../icons/house.svg";
import laptopIcon from "../../icons/laptop.svg";
import mobileIcon from "../../icons/mobile.svg";
import moneyIcon from "../../icons/money.svg";
import phoneIcon from "../../icons/phone.svg";
import shieldIcon from "../../icons/shield.svg";
import speechIcon from "../../icons/speech.svg";
import targetIcon from "../../icons/target.svg";
import trophyIcon from "../../icons/trophy.svg";

const ICONS = {
  ai: aiIcon,
  book: bookIcon,
  building: buildingIcon,
  cap: capIcon,
  car: carIcon,
  chart: chartIcon,
  fitness: fitnessIcon,
  globe: globeIcon,
  handshake: handshakeIcon,
  house: houseIcon,
  laptop: laptopIcon,
  mobile: mobileIcon,
  money: moneyIcon,
  phone: phoneIcon,
  shield: shieldIcon,
  speech: speechIcon,
  target: targetIcon,
  trophy: trophyIcon,
};

const EMOJI_TO_ICON = {
  "🎯": "target",
  "📖": "book",
  "📚": "book",
  "🎓": "cap",
  "🧠": "ai",
  "💡": "speech",
  "⭐": "trophy",
  "🌟": "trophy",
  "🏅": "trophy",
  "🎉": "trophy",
  "📊": "chart",
  "📈": "chart",
  "💬": "speech",
  "🛡️": "shield",
  "🌐": "globe",
  "💻": "laptop",
  "🏠": "house",
  "🏢": "building",
  "👤": "globe",
  "🧑‍💼": "building",
  "🔄": "handshake",
  "💰": "money",
  "⏰": "phone",
  "⚔️": "handshake",
  "🤝": "handshake",
  "😬": "shield",
  "😤": "target",
  "🤖": "ai",
  "🛍️": "money",
  "✨": "trophy",
  "🟢": "target",
  "🟡": "chart",
  "🔴": "shield",
  "✅": "trophy",
  "❌": "shield",
  "🔒": "shield",
  "📣": "speech",
  "🚀": "target",
};

export function getBrandIconSource({ icon, emoji }) {
  const key = icon || EMOJI_TO_ICON[emoji] || null;
  return key ? ICONS[key] : null;
}

export default function BrandIcon({ icon, emoji, alt = "", className = "", style, title, size = 1 }) {
  const src = getBrandIconSource({ icon, emoji });
  if (!src) {
    return emoji ? <span className={className} style={style} title={title}>{emoji}</span> : null;
  }

  const dimensions = typeof size === "number" ? `${size}em` : size;

  return (
    <img
      src={src}
      alt={alt}
      title={title}
      className={className}
      style={{ width: dimensions, height: dimensions, objectFit: "contain", verticalAlign: "middle", ...style }}
    />
  );
}
