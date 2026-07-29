// Bang map: collection handle (tren Haravan) -> taxonomy cua app (occasion/relationship/style).
// Dua tren 140 collection that lay duoc tu data/collections.json ngay 2026-07-29.
//
// Chi map nhung collection ro nghia; cac collection mang tinh cau truc/danh muc san pham
// (vd "Tranh dat vang", "Decor phong khach", "Tat ca san pham"...) co tinh de trong,
// vi chung mo ta LOAI san pham chu khong phai dip/doi tuong/phong cach.
//
// Luu y: 4 occasion va 3 relationship duoi day la MOI so voi ban prototype dau tien,
// phat hien tu chinh catalogue that (mung tho, day thang, 8/3-20/10, hoi nghi khach hang,
// thay co, khach nuoc ngoai) - can cap nhat lai danh sach cau hoi trong app cho khop.

module.exports = {
  // ---- Dip tang (occasion) ----
  "qua-tan-gia": { occasions: ["tannha"] },
  "qua-tang-tan-gia": { occasions: ["tannha"] },
  "qua-tang-tan-gia-gg-shopping": { occasions: ["tannha"] },

  "qua-mung-khai-truong-dep-tai-loc-va-may-man-cho-nam-quy-mao-2023": { occasions: ["khaitruong"] },

  "qua-cuoi-ky-niem-ngay-cuoi": { occasions: ["kyniem"] },
  "qua-ngay-cuoi-ky-niem-cuoi": { occasions: ["kyniem"] },
  "qua-cuoi-gg-shopping": { occasions: ["kyniem"] },
  "doi-chim-hac-qua-cuoi": { occasions: ["kyniem"] },
  "hoa-sen-qua-cuoi": { occasions: ["kyniem"] },
  "ca-chep-qua-cuoi": { occasions: ["kyniem"] },
  "chim-cong-qua-cuoi": { occasions: ["kyniem"] },

  "qua-valentine": { occasions: ["valentine"] },

  "qua-8-3-va-20-10-nam-2023": { occasions: ["phunu"] }, // MOI: 8/3 & 20/10

  "qua-tang-cuoi-nam-tet": { occasions: ["tet"] },
  "qua-tet-giap-thin-nam-2024": { occasions: ["tet"] },
  "qua-tang-phong-thuy-nam-quy-mao-2023": { occasions: ["tet"], styles: ["phongthuy"] },

  "qua-tang-hoi-nghi": { occasions: ["hoinghi"] }, // MOI: hoi nghi khach hang
  "qua-su-kien": { occasions: ["hoinghi"] },
  "qua-tang-tri-an": { occasions: ["camon"] },

  "qua-mung-tho-dep-va-y-nghia": { occasions: ["mungtho"] }, // MOI: mung tho
  "tranh-thu-phap-mung-tho": { occasions: ["mungtho"] },

  "qua-tang-thoi-noi-qua-day-thang": { occasions: ["daythang"] }, // MOI: day thang / thoi noi

  "qua-tang-vinh-danh-dep-va-y-nghia-nam-quy-mao-2023": { occasions: ["thangchuc"] },

  // ---- Nguoi nhan (relationship) ----
  "qua-tang-sep": { relationships: ["sep"] },
  "qua-tang-sep-nam": { relationships: ["sep"] },
  "qua-tang-sep-nu": { relationships: ["sep"] },
  "qua-tang-sep-nam-1": { relationships: ["sep"] },
  "qua-tang-sep-nu-1": { relationships: ["sep"] },
  "qua-tang-sep-gg-shopping": { relationships: ["sep"] },
  "qua-tang-doi-tac": { relationships: ["sep"] },
  "qua-tang-doi-tac-gg-shopping": { relationships: ["sep"] },
  "qua-tang-doanh-nhan": { relationships: ["sep"] },

  "qua-tang-khach-hang-vip": { relationships: ["doanhnghiep"] },
  "qua-tang-doanh-nghiep": { relationships: ["doanhnghiep"] },
  "qua-tang-doanh-nghiep-gia-re": { relationships: ["doanhnghiep"] },
  "qua-tang-theo-doi-tuong": { relationships: ["doanhnghiep"] }, // handle lech ten, title that: "Qua tang doanh nghiep gia re"

  "qua-tang-me": { relationships: ["giadinh"] },
  "qua-tang-cha": { relationships: ["giadinh"] },

  "qua-tang-vo": { relationships: ["nguoiyeu"] },
  "qua-tang-chong": { relationships: ["nguoiyeu"] },
  "qua-tang-ban-gai": { relationships: ["nguoiyeu"] },
  "qua-tang-ban-trai": { relationships: ["nguoiyeu"] },

  "qua-tang-thay-co-giao": { relationships: ["thaycoc"] }, // MOI: thay co
  "qua-tang-nguoi-nuoc-ngoai": { relationships: ["khachnuocngoai"] }, // MOI: khach nuoc ngoai
  "qua-tang-cho-be": { relationships: ["treem"] }, // MOI: tre em

  // ---- Phong cach (style) ----
  "phong-thuy": { styles: ["phongthuy"] },
  "hanh-phuc-dat-vang": { styles: ["phongthuy"] },
  "phuc-loc-tho": { styles: ["phongthuy"] },
  "thinh-vuong": { styles: ["phongthuy"] },
  "phu-quy": { styles: ["phongthuy"] },
  "qua-tang-phat-giao": { styles: ["phongthuy"] },
  "heo-tai-loc": { styles: ["phongthuy"] },

  "qua-tang-cao-cap": { styles: ["cotdien"], buzzBoost: true },

  // ---- Tin hieu "hot" (dung tam thoi cho buzz score, thay cho tu dong hoa mang xa hoi sau nay) ----
  "san-pham-ban-chay": { buzzBoost: true },
  "hot-products": { buzzBoost: true },
  "phien-ban-gioi-han": { buzzBoost: true }
};
