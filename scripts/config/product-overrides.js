// Gan tam taxonomy cho cac san pham chua thuoc collection nao tren Haravan
// (thuong la san pham moi vua dang, chua duoc chu shop xep vao muc nao).
// Dua tren y nghia bieu tuong chuan trong van hoa qua tang VN (Ngua = ma dao thanh cong,
// Thuyen buom = thuan buom xuoi gio, Tung/Bo De = truong tho...).
//
// Day chi la giai phap tam thoi. Ve lau dai nen gan cac san pham nay vao collection
// tren chinh Haravan Admin - lan sync tiep theo se tu dong nhan dung tag, khong can
// sua file nay nua.

module.exports = {
  1075628002: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep", "doanhnghiep"], styles: ["cotdien", "phongthuy"] }, // Thuyen Buom ACT GOLD
  1075628001: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep", "doanhnghiep"], styles: ["cotdien"] }, // Tranh Song Ma
  1075627999: { occasions: ["mungtho", "tet"], relationships: ["giadinh"], styles: ["phongthuy"] }, // Tranh Chu Tam La Bo De
  1075627997: { occasions: ["tet", "mungtho"], relationships: ["giadinh"], styles: ["phongthuy"] }, // Tranh Chu Phuc La Bo De
  1075627996: { occasions: ["tet", "mungtho"], relationships: ["giadinh"], styles: ["phongthuy"] }, // Tranh Chu An La Bo De
  1075627995: { occasions: ["mungtho"], relationships: ["giadinh"], styles: ["phongthuy"] }, // Tranh Thu Phap Chu Tho
  1075627994: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep"], styles: ["cotdien"] }, // Tranh Ngua Chien Thang
  1075627993: { occasions: ["tet"], relationships: ["giadinh", "sep"], styles: ["cotdien"] }, // Tranh Doi Ga
  1075627992: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep"], styles: ["cotdien"] }, // Tranh Doc Ma Truy Phong
  1075627991: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep", "doanhnghiep"], styles: ["cotdien"] }, // Tranh Chu Thu Phap Thanh Cong
  1075627989: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep", "doanhnghiep"], styles: ["cotdien"] }, // Tranh Bat Ma (25tr)
  1075627988: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep", "doanhnghiep"], styles: ["cotdien"] }, // Tranh Bat Ma (6tr)
  1075627987: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep", "doanhnghiep"], styles: ["cotdien", "phongthuy"] }, // Thuyen Buom Mau 6 (gioi han)
  1075627986: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep"], styles: ["phongthuy", "cotdien"] }, // Ngua Tai Loc Mau 7 (gioi han)
  1075627985: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep"], styles: ["phongthuy", "cotdien"] }, // Ngua Tai Loc Mau 6 (gioi han)
  1075627984: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep"], styles: ["phongthuy", "cotdien"] }, // Ngua Tai Loc Mau 4
  1075627983: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep"], styles: ["phongthuy"] }, // Ngua Phu Quy
  1075627982: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep"], styles: ["phongthuy"] }, // Ngua Nhu Y
  1075627979: { occasions: ["khaitruong", "thangchuc"], relationships: ["sep"], styles: ["cotdien"] }, // Ngua Chien Thang
  1075627958: { occasions: ["tannha"], relationships: ["giadinh", "sep"], styles: ["cotdien"] }, // Lan Ho Diep Tieu Canh mau 2
  1075627957: { occasions: ["tannha"], relationships: ["giadinh", "sep"], styles: ["cotdien"] }, // Lan Ho Diep Tieu Canh mau 1
  1075627955: { occasions: ["tannha"], relationships: ["giadinh"], styles: ["cotdien"] }, // Hoa Mau Don Tieu Canh
  1075627954: { occasions: ["tannha"], relationships: ["giadinh"], styles: ["phongthuy"] }, // Ho Sen 6 Canh
  1075627952: { occasions: ["tannha", "mungtho"], relationships: ["giadinh"], styles: ["cotdien"] }, // Cay Tung Bonsai
  1075627951: { occasions: ["tannha"], relationships: ["giadinh"], styles: ["phongthuy"] }, // Cay Bo De
  1075627949: { occasions: ["tannha"], relationships: ["giadinh"], styles: ["cotdien"] }, // Binh Hoa Mau Don
  1075627948: { occasions: ["tannha"], relationships: ["giadinh"], styles: ["cotdien"] } // Binh Hoa Dia Lan
};
