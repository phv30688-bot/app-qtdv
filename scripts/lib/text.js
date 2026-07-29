// Haravan API dang tra ve chuoi tieng Viet bi ma hoa UTF-8 hai lan
// (vi du "Quà tặng" tra ve thanh "QuÃ  táº·ng"). Ham nay giai ma lai cho dung.
function fixMojibake(value) {
  if (typeof value !== "string" || value === "") return value;

  const roundTripped = Buffer.from(value, "latin1").toString("utf8");

  // Neu chuoi goc dung UTF-8 tu dau, roundtrip qua latin1 se tao ra ky tu
  // khong hop le (U+FFFD) - khi do giu nguyen chuoi goc, khong sua.
  if (roundTripped.includes("�")) return value;

  return roundTripped;
}

module.exports = { fixMojibake };
