function detectProductCategory(title) {
  const t = (title || "").toLowerCase();
  if (t.includes("đĩa")) return "dia";
  if (t.includes("tượng")) return "tuong";
  if (t.includes("tranh")) return "tranh";
  return "other";
}

module.exports = { detectProductCategory };
