using Backend.Data;
using Backend.Entities;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    /// <summary>
    /// Seed dữ liệu vật liệu xây dựng dựa trên Bảng Công bố Giá Quý III năm 2025
    /// Số: 02.03/2025/CBGVL-SXD - Sở Xây dựng Hà Nội, ngày 01/10/2025
    /// Giá chưa bao gồm VAT, là giá trung bình đến chân công trình.
    /// </summary>
    public static class SeedData1
    {
        public static async Task InitializeAsync(MyDbContext context)
        {
            await context.Database.EnsureCreatedAsync();

            // ===== Seed Supplier =====
            if (!await context.Suppliers.AnyAsync())
            {
                var suppliers = new List<Supplier>
                {
                    // --- Nhóm Bê tông đúc sẵn ---
                    new Supplier { Code = "SUP-001", Name = "Công ty Cổ phần Avia - Nhà máy bê tông Amaccao", Address = "Kiện Khê, Hà Nam" },
                    new Supplier { Code = "SUP-002", Name = "Công ty Cổ phần Carbon Việt Nam" },

                    // --- Nhóm Cửa nhựa / cửa nhôm ---
                    new Supplier { Code = "SUP-003", Name = "Công ty Cổ phần Thương mại và Xây lắp Hợp Phát" },
                    new Supplier { Code = "SUP-004", Name = "Công ty Cổ phần PAG Việt Nam" },
                    new Supplier { Code = "SUP-005", Name = "Công ty Cổ phần Nhôm Việt Pháp - Nhà máy nhôm Việt Pháp" },
                    new Supplier { Code = "SUP-006", Name = "Công ty Cổ phần Đầu tư Cửa Việt" },
                    new Supplier { Code = "SUP-007", Name = "Công ty Cổ phần Cơ khí Đông Anh Licogi" },

                    // --- Nhóm Gạch xây ---
                    new Supplier { Code = "SUP-008", Name = "Công ty Cổ phần SXVL mới An Thịnh" },
                    new Supplier { Code = "SUP-009", Name = "Công ty Cổ phần Vật liệu xây dựng Secoin" },
                    new Supplier { Code = "SUP-010", Name = "Công ty Cổ phần kinh doanh Gạch ốp lát Viglacera", Address = "Bắc Ninh" },

                    // --- Nhóm Kết cấu thép ---
                    new Supplier { Code = "SUP-011", Name = "Công ty Cổ phần Thép cao cấp Việt Nhật" },
                    new Supplier { Code = "SUP-012", Name = "Công ty Cổ phần Sản xuất Thép Việt Đức VGS" },
                    new Supplier { Code = "SUP-013", Name = "Công ty Cổ phần Thép Việt Ý" },
                    new Supplier { Code = "SUP-014", Name = "Công ty Cổ phần gang thép Thái Nguyên", Address = "Thái Nguyên" },
                    new Supplier { Code = "SUP-015", Name = "Công ty Cổ phần Tập đoàn VAS Nghi Sơn", Address = "Nghi Sơn, Thanh Hóa" },

                    // --- Nhóm Khung trần thạch cao ---
                    new Supplier { Code = "SUP-016", Name = "Nhà máy Tấm Trần Thạch Cao Mikado Gypsum" },

                    // --- Nhóm Sơn ---
                    new Supplier { Code = "SUP-017", Name = "Công ty Cổ phần Đầu tư sản xuất và Thương mại Tân Phát" },
                    new Supplier { Code = "SUP-018", Name = "Công ty TNHH Sơn Jotun Việt Nam" },
                    new Supplier { Code = "SUP-019", Name = "Công ty Cổ phần Sản xuất Xuất nhập khẩu và Xây dựng Hà Nội" },
                    new Supplier { Code = "SUP-020", Name = "Công ty Cổ phần Sơn NISHU" },
                    new Supplier { Code = "SUP-021", Name = "Công ty Cổ phần Sonata Việt Nam" },
                    new Supplier { Code = "SUP-022", Name = "Công ty TNHH JEP JAPAN" },
                    new Supplier { Code = "SUP-023", Name = "Công ty Cổ phần liên doanh Sơn Dulor Việt Nam" },
                    new Supplier { Code = "SUP-024", Name = "Công ty Cổ phần Sơn Pantone Việt Nam" },
                    new Supplier { Code = "SUP-025", Name = "Công ty Cổ phần Xuất nhập khẩu sơn Hà Nội" },

                    // --- Nhóm Vật liệu lợp (Tôn) ---
                    new Supplier { Code = "SUP-026", Name = "Công ty Cổ phần Austnam" },
                    new Supplier { Code = "SUP-027", Name = "Công ty Cổ phần Tập đoàn Thép Poshaco" },

                    // --- Nhóm Vật liệu khác ---
                    new Supplier { Code = "SUP-028", Name = "Công ty Cổ phần Conmik Việt Nam" },

                    // --- Nhóm Xi măng ---
                    new Supplier { Code = "SUP-029", Name = "Công ty Cổ phần Sài Sơn" },
                    new Supplier { Code = "SUP-030", Name = "Công ty Cổ phần Xi măng Hoàng Long" },
                    new Supplier { Code = "SUP-031", Name = "Công ty Cổ phần Xi măng Bỉm Sơn", Address = "Bỉm Sơn, Thanh Hóa" },
                    new Supplier { Code = "SUP-032", Name = "Công ty TNHH Xi măng Vĩnh Sơn" },
                    new Supplier { Code = "SUP-033", Name = "Công ty Cổ phần Xi măng Tiên Sơn Hà Tây" },
                    new Supplier { Code = "SUP-034", Name = "Công ty Cổ phần Xi măng Thành Thắng" },
                    new Supplier { Code = "SUP-035", Name = "Công ty Cổ phần Xi măng Xuân Thành" },
                    new Supplier { Code = "SUP-036", Name = "Công ty Cổ phần Xi măng La Hiên", Address = "La Hiên, Thái Nguyên" },

                    // --- Nhóm Ống nhựa ---
                    new Supplier { Code = "SUP-037", Name = "Nhà sản xuất ống Europipe" },
                };

                await context.Suppliers.AddRangeAsync(suppliers);
                await context.SaveChangesAsync();
            }

            // ===== Seed Material =====
            if (!await context.Materials.AnyAsync())
            {
                var materials = new List<Material>
                {
                    // ============================================================
                    // NHÓM 1: BÊ TÔNG ĐÚC SẴN - Amaccao
                    // ============================================================
                    new Material { Code = "MAT-001", Name = "Cống rung ép liên kết miệng loe Ø500 mác 300 tải trọng thấp (VH), L=2.5m", Unit = "m", IsDecimalUnit = true, UnitPrice = 388168, Specification = "Ø500mm, mác 300, chiều dài 2.5m" },
                    new Material { Code = "MAT-002", Name = "Cống rung ép liên kết miệng loe Ø600 mác 300 tải trọng thấp (VH), L=2.5m", Unit = "m", IsDecimalUnit = true, UnitPrice = 483424, Specification = "Ø600mm, mác 300, chiều dài 2.5m" },
                    new Material { Code = "MAT-003", Name = "Cống rung ép liên kết miệng loe Ø800 mác 300 tải trọng thấp (VH), L=2.5m", Unit = "m", IsDecimalUnit = true, UnitPrice = 889453, Specification = "Ø800mm, mác 300, chiều dài 2.5m" },
                    new Material { Code = "MAT-004", Name = "Cống rung ép liên kết miệng loe Ø1000 mác 300 tải trọng thấp (VH), L=2.5m", Unit = "m", IsDecimalUnit = true, UnitPrice = 1238328, Specification = "Ø1000mm, mác 300, chiều dài 2.5m" },
                    new Material { Code = "MAT-005", Name = "Cống rung ép liên kết miệng loe Ø1250 mác 300 tải trọng thấp (VH), L=2.5m", Unit = "m", IsDecimalUnit = true, UnitPrice = 1792004, Specification = "Ø1250mm, mác 300, chiều dài 2.5m" },
                    new Material { Code = "MAT-006", Name = "Cống rung ép liên kết miệng loe Ø1500 mác 300 tải trọng thấp (VH), L=2.5m", Unit = "m", IsDecimalUnit = true, UnitPrice = 2369493, Specification = "Ø1500mm, mác 300, chiều dài 2.5m" },
                    new Material { Code = "MAT-007", Name = "Cống rung ép liên kết miệng loe Ø1800 mác 300 tải trọng thấp (VH), L=2.5m", Unit = "m", IsDecimalUnit = true, UnitPrice = 4527900, Specification = "Ø1800mm, mác 300, chiều dài 2.5m" },
                    new Material { Code = "MAT-008", Name = "Cống rung ép liên kết miệng loe Ø500 mác 300 tải trọng TC (HL-93), L=2.5m", Unit = "m", IsDecimalUnit = true, UnitPrice = 408411, Specification = "Ø500mm, mác 300, tải trọng tiêu chuẩn HL-93, L=2.5m" },
                    new Material { Code = "MAT-009", Name = "Cống rung ép liên kết miệng loe Ø1000 mác 300 tải trọng TC (HL-93), L=2.5m", Unit = "m", IsDecimalUnit = true, UnitPrice = 1338347, Specification = "Ø1000mm, mác 300, tải trọng tiêu chuẩn HL-93, L=2.5m" },
                    new Material { Code = "MAT-010", Name = "Cống hộp rung ép BxH 800x800mm tải trọng vỉa hè, L=1m", Unit = "cái", IsDecimalUnit = false, UnitPrice = 2039670, Specification = "BxH 800x800mm, tải trọng vỉa hè, L=1m" },
                    new Material { Code = "MAT-011", Name = "Cống hộp rung ép BxH 1000x1000mm tải trọng vỉa hè, L=1m", Unit = "cái", IsDecimalUnit = false, UnitPrice = 2768378, Specification = "BxH 1000x1000mm, tải trọng vỉa hè, L=1m" },
                    new Material { Code = "MAT-012", Name = "Cống hộp rung ép BxH 1250x1250mm tải trọng vỉa hè, L=1m", Unit = "cái", IsDecimalUnit = false, UnitPrice = 3095820, Specification = "BxH 1250x1250mm, tải trọng vỉa hè, L=1m" },
                    new Material { Code = "MAT-013", Name = "Cống hộp rung ép BxH 1500x1500mm tải trọng vỉa hè, L=1m", Unit = "cái", IsDecimalUnit = false, UnitPrice = 4831861, Specification = "BxH 1500x1500mm, tải trọng vỉa hè, L=1m" },
                    new Material { Code = "MAT-014", Name = "Tấm bê tông ứng lực trước cốt sợi PP mác 450 dày 100mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 884000, Specification = "Mác 450, dày 100mm, cốt sợi PP" },
                    new Material { Code = "MAT-015", Name = "Tấm bê tông trồng cỏ cốt sợi PP mác 450 dày 100mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 1014000, Specification = "Mác 450, dày 100mm, cốt sợi PP" },

                    // ============================================================
                    // NHÓM 2: BÊ TÔNG NHỰA - Carbon Việt Nam
                    // ============================================================
                    new Material { Code = "MAT-016", Name = "Vật liệu Carboncor Asphalt", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 3553200 },
                    new Material { Code = "MAT-017", Name = "Bê tông nhựa Carboncor Asphalt CA 95", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 3715200, Specification = "CA 95" },
                    new Material { Code = "MAT-018", Name = "Bê tông nhựa Carboncor Asphalt CA 19", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 2829600, Specification = "CA 19" },

                    // ============================================================
                    // NHÓM 3: CỬA NHÔM - Hợp Phát (hệ Việt Pháp)
                    // ============================================================
                    new Material { Code = "MAT-019", Name = "Vách kính nhôm định hình hệ Việt Pháp, kính 2 lớp dày 6.38mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 1861930, TechnicalStandard = "TCVN 9366-2:2012", Specification = "Nhôm hệ Việt Pháp, kính 2 lớp 6.38mm" },
                    new Material { Code = "MAT-020", Name = "Cửa sổ 2 cánh trượt nhôm hệ Việt Pháp 2600, kính 2 lớp 6.38mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 2305826, Specification = "Nhôm VP 2600, kính 2 lớp 6.38mm, PKKK bánh xe đơn, khóa bán nguyệt" },
                    new Material { Code = "MAT-021", Name = "Cửa sổ 1 cánh hất nhôm Việt Pháp, kính 2 lớp 6.38mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 3064566, Specification = "Nhôm VP, kính 2 lớp 6.38mm, bản lề A, tay nắm cài, thanh hạn vị" },
                    new Material { Code = "MAT-022", Name = "Cửa đi 2 cánh quay nhôm Việt Pháp 450, kính 2 lớp 6.38mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 3485627, Specification = "Nhôm VP 450, kính 2 lớp 6.38mm, bản lề cối, ổ khóa tay nắm" },
                    new Material { Code = "MAT-023", Name = "Cửa đi 1 cánh quay nhôm Việt Pháp 4400, kính 2 lớp 6.38mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 3369307, Specification = "Nhôm VP 4400, kính 2 lớp 6.38mm, bản lề cối, ổ khóa tay nắm" },

                    // ============================================================
                    // NHÓM 4: CỬA NHỰA uPVC - PAG Việt Nam
                    // ============================================================
                    new Material { Code = "MAT-024", Name = "Vách kính cố định nhựa uPVC Sparlee, kính an toàn 6.38mm KT 700x1000", Unit = "m2", IsDecimalUnit = true, UnitPrice = 1650000, Specification = "Profile Sparlee uPVC, kính Việt Nhật 6.38mm, KT 700x1000" },
                    new Material { Code = "MAT-025", Name = "Cửa sổ trượt 2 cánh nhựa uPVC Sparlee, kính an toàn 6.38mm KT 1200x1400", Unit = "m2", IsDecimalUnit = true, UnitPrice = 2490000, Specification = "Profile Sparlee uPVC, kính 6.38mm, khóa bán nguyệt GQ, KT 1200x1400" },
                    new Material { Code = "MAT-026", Name = "Cửa đi mở quay 1 cánh nhựa uPVC Sparlee, kính an toàn 6.38mm KT 800x2200", Unit = "m2", IsDecimalUnit = true, UnitPrice = 2650000, Specification = "Profile Sparlee uPVC, kính 6.38mm, PKKK GQ, KT 800x2200" },

                    // ============================================================
                    // NHÓM 5: CỬA NHÔM hệ Xingfa - Nhôm Việt Pháp
                    // ============================================================
                    new Material { Code = "MAT-027", Name = "Vách kính cố định nhôm Xingfa sơn tĩnh điện 1.4mm, kính 6.38mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 2188000, Specification = "Nhôm Xingfa sơn tĩnh điện 1.4mm, kính VN 6.38mm, R600-1500 C1000-1500" },
                    new Material { Code = "MAT-028", Name = "Cửa sổ mở quay 1 cánh nhôm Xingfa, kính 6.38mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 2675000, Specification = "Nhôm Xingfa sơn tĩnh điện 1.2-1.4mm, kính VN 6.38mm, R600-1000 C800-1600" },
                    new Material { Code = "MAT-029", Name = "Cửa đi mở quay 1 cánh nhôm Xingfa, kính 6.38mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 3120000, Specification = "Nhôm Xingfa sơn tĩnh điện 1.4-2mm, kính VN 6.38mm, R600-1000 C2000-2600" },
                    new Material { Code = "MAT-030", Name = "Cửa đi mở quay 2 cánh nhôm Xingfa, kính 6.38mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 3152000, Specification = "Nhôm Xingfa sơn tĩnh điện 1.4-2mm, kính VN 6.38mm, R600-1000 C2000-2600" },

                    // ============================================================
                    // NHÓM 6: GẠCH XÂY - An Thịnh
                    // ============================================================
                    new Material { Code = "MAT-031", Name = "Gạch đặc bê tông M10 AT-SL 95, KT 200x95x60mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 1050, TechnicalStandard = "TCVN", Specification = "200x95x60mm, M10" },
                    new Material { Code = "MAT-032", Name = "Gạch đặc bê tông M10 AT-SL 100, KT 210x100x60mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 1100, Specification = "210x100x60mm, M10" },
                    new Material { Code = "MAT-033", Name = "Gạch đặc bê tông M10 AT-SL 105, KT 220x105x60mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 1300, Specification = "220x105x60mm, M10" },
                    new Material { Code = "MAT-034", Name = "Gạch đặc bê tông M7.5 AT-SL150, KT 170x150x60mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 1380, Specification = "170x150x60mm, M7.5" },
                    new Material { Code = "MAT-035", Name = "Gạch rỗng bê tông M7.5 AT-HL120/3W, KT 390x150x130mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 7500, Specification = "390x150x130mm, M7.5" },

                    // ============================================================
                    // NHÓM 7: GẠCH SECOIN
                    // ============================================================
                    new Material { Code = "MAT-036", Name = "Gạch Block xây đặc Secoin, KT 200x95x60mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 1050, Specification = "200x95x60mm" },
                    new Material { Code = "MAT-037", Name = "Gạch Block xây rỗng Secoin, KT 390x200x130mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 8500, Specification = "390x200x130mm" },
                    new Material { Code = "MAT-038", Name = "Gạch terrazzo ngoài trời Secoin 300x300mm và 400x400mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 95000, TechnicalStandard = "TCVN 7744:2013", Specification = "300x300x30mm; 400x400x30mm" },
                    new Material { Code = "MAT-039", Name = "Gạch terrazzo tấm lớn Secoin loại hạt đá 600x600mm - 600x1200mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 950000, Specification = "600x600x20~25mm; 600x1200x20~25mm" },
                    new Material { Code = "MAT-040", Name = "Gạch Block lát hè tự chèn Secoin", Unit = "m2", IsDecimalUnit = true, UnitPrice = 95000, TechnicalStandard = "QCVN 16:2023/BXD", Specification = "200x100x60, 164x200x60, 160x160x60, 225x112.5x60mm" },
                    new Material { Code = "MAT-041", Name = "Gạch bông gió Secoin màu ghi, KT 190x190x65mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 20000, TechnicalStandard = "TCVN 6477:2016", Specification = "190x190x65mm" },

                    // ============================================================
                    // NHÓM 8: GẠCH BÊ TÔNG KHÍ CHƯNG ÁP (AAC) - Viglacera
                    // ============================================================
                    new Material { Code = "MAT-042", Name = "Gạch AAC Viglacera AAC3, KT 600x200x50mm (dày 50mm)", Unit = "m3", IsDecimalUnit = true, UnitPrice = 1877478, TechnicalStandard = "TCVN 7959:2017; QCVN16:2023/BXD", Specification = "Dài 600 x Cao 200 x Dày 50mm, 1 pallet = 0.864m3" },
                    new Material { Code = "MAT-043", Name = "Gạch AAC Viglacera AAC3, KT 600x200x75mm (dày 75mm)", Unit = "m3", IsDecimalUnit = true, UnitPrice = 1877478, TechnicalStandard = "TCVN 7959:2017; QCVN16:2023/BXD", Specification = "Dài 600 x Cao 200 x Dày 75mm, 1 pallet = 0.864m3" },
                    new Material { Code = "MAT-044", Name = "Gạch AAC Viglacera AAC3, KT 600x200x100mm (dày 100mm)", Unit = "m3", IsDecimalUnit = true, UnitPrice = 1727478, TechnicalStandard = "TCVN 7959:2017; QCVN16:2023/BXD", Specification = "Dài 600 x Cao 200 x Dày 100mm, 1 pallet = 0.864m3" },
                    new Material { Code = "MAT-045", Name = "Gạch AAC Viglacera AAC3, KT 600x200x150mm (dày 150mm)", Unit = "m3", IsDecimalUnit = true, UnitPrice = 1727478, TechnicalStandard = "TCVN 7959:2017; QCVN16:2023/BXD", Specification = "Dài 600 x Cao 200 x Dày 150mm, 1 pallet = 0.864m3" },
                    new Material { Code = "MAT-046", Name = "Tấm Panel ALC Viglacera A1 có cốt thép, KT 2400x600x100mm", Unit = "m3", IsDecimalUnit = true, UnitPrice = 4389000, TechnicalStandard = "TCVN 12867:2020; QCVN16:2023/BXD", Specification = "2400x600x100mm, 2 lưới cốt thép, 3-12 tấm/pallet" },

                    // ============================================================
                    // NHÓM 9: THÉP XÂY DỰNG - Việt Nhật
                    // ============================================================
                    new Material { Code = "MAT-047", Name = "Thép thanh vằn D10 CB300V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13700, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D10, CB300V" },
                    new Material { Code = "MAT-048", Name = "Thép thanh vằn D12 CB300V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13550, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D12, CB300V" },
                    new Material { Code = "MAT-049", Name = "Thép thanh vằn D14-D32 CB300V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13500, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D14-D32, CB300V" },
                    new Material { Code = "MAT-050", Name = "Thép thanh vằn D10 CB400V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13750, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D10, CB400V" },
                    new Material { Code = "MAT-051", Name = "Thép thanh vằn D14-D32 CB400V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13910, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D14-D32, CB400V" },

                    // ============================================================
                    // NHÓM 10: THÉP XÂY DỰNG - VGS Việt Đức
                    // ============================================================
                    new Material { Code = "MAT-052", Name = "Thép cuộn trơn CB240 D6-D8 - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13640, TechnicalStandard = "TCVN 1651-1:2018", Specification = "D6-D8, CB240" },
                    new Material { Code = "MAT-053", Name = "Thép thanh vằn D10 CB300V - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13940, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D10, SD295/CB300/CII/Gr40" },
                    new Material { Code = "MAT-054", Name = "Thép thanh vằn D14-D32 CB400V - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13640, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D14-D32, SD390/CB400/CIII/Gr60" },

                    // ============================================================
                    // NHÓM 11: THÉP XÂY DỰNG - Việt Ý
                    // ============================================================
                    new Material { Code = "MAT-055", Name = "Thép cuộn f6-f8 CB240T - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14850, TechnicalStandard = "CB240T", Specification = "f6-f8" },
                    new Material { Code = "MAT-056", Name = "Thép thanh vằn D10 CB300V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14900, TechnicalStandard = "CB300V", Specification = "D10" },
                    new Material { Code = "MAT-057", Name = "Thép thanh vằn D14-D32 CB300V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14650, TechnicalStandard = "CB300V", Specification = "D14-D32" },
                    new Material { Code = "MAT-058", Name = "Thép thanh vằn D10 CB400V/CB500V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15200, TechnicalStandard = "CB400V/CB500V", Specification = "D10" },

                    // ============================================================
                    // NHÓM 12: THÉP HÌNH - Gang thép Thái Nguyên & VAS Nghi Sơn
                    // ============================================================
                    new Material { Code = "MAT-059", Name = "Thép góc L40 SS400, L=6m/9m/12m - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14950, TechnicalStandard = "SS400/CT38/CT42", Specification = "L40, L=6m; 9m; 12m" },
                    new Material { Code = "MAT-060", Name = "Thép I10 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 16050, TechnicalStandard = "SS400/CT38/CT42", Specification = "I10" },
                    new Material { Code = "MAT-061", Name = "Thép I12 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15850, TechnicalStandard = "SS400/CT38/CT42", Specification = "I12" },
                    new Material { Code = "MAT-062", Name = "Thép C8-10 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 16950, TechnicalStandard = "SS400/CT38/CT42", Specification = "C8-10" },
                    new Material { Code = "MAT-063", Name = "Thép thanh vằn D10 CB300V - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13519, TechnicalStandard = "TCVN 1651-2:2018; ASTM A615/A615M-20", Specification = "D10, CB300V/GR40" },
                    new Material { Code = "MAT-064", Name = "Thép thanh vằn D14-D20 CB300V/GR40 - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13674, TechnicalStandard = "TCVN 1651-2:2018; ASTM A615/A615M-20", Specification = "D14-D20, CB300V/GR40" },

                    // ============================================================
                    // NHÓM 13: TRẦN THẠCH CAO - Mikado Gypsum
                    // ============================================================
                    new Material { Code = "MAT-065", Name = "Làm trần phẳng thạch cao Mikado GOLD + tấm tiêu chuẩn 9mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 143000, TechnicalStandard = "ASTM C1396; EN 520; QCVN 16:2019/BXD", Specification = "Khung GOLD + tấm Standard 9mm, 1m x 1m" },
                    new Material { Code = "MAT-066", Name = "Làm trần phẳng thạch cao Mikado GOLDPRO + tấm tiêu chuẩn 9mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 157000, TechnicalStandard = "ASTM C1396; EN 520", Specification = "Khung GOLDPRO + tấm Standard 9mm" },
                    new Material { Code = "MAT-067", Name = "Làm trần phẳng thạch cao chống cháy Mikado GOLD + tấm Firestop 12.5mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 270000, Specification = "Khung GOLD + tấm Firestop 12.5mm" },
                    new Material { Code = "MAT-068", Name = "Làm trần thả 600x600mm thạch cao phủ PVC, khung Mikado XT", Unit = "m2", IsDecimalUnit = true, UnitPrice = 108000, Specification = "Khung XT, tấm thả trang trí phủ PVC, 600x600mm" },
                    new Material { Code = "MAT-069", Name = "Vách ngăn thạch cao 2 mặt, khung C75/U76 + tấm Standard 12.7mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 227000, Specification = "Khung GOLD C75, U76; tấm Standard 12.7mm" },

                    // ============================================================
                    // NHÓM 14: SƠN - Jotun
                    // ============================================================
                    new Material { Code = "MAT-070", Name = "Sơn phủ ngoại thất Jotashield bền màu toàn diện", Unit = "lít", IsDecimalUnit = true, UnitPrice = 460000, Specification = "9.5-12.7 m²/lít" },
                    new Material { Code = "MAT-071", Name = "Sơn phủ nội thất Majestic đẹp hoàn hảo - Jotun", Unit = "lít", IsDecimalUnit = true, UnitPrice = 240000, Specification = "9-12 m²/lít" },
                    new Material { Code = "MAT-072", Name = "Sơn chống thấm Waterguard - Jotun", Unit = "kg", IsDecimalUnit = true, UnitPrice = 170000, Specification = "5.5-7.5 m²/kg" },
                    new Material { Code = "MAT-073", Name = "Sơn lót ngoại thất Jotashield Primer - Jotun", Unit = "lít", IsDecimalUnit = true, UnitPrice = 180000, Specification = "8-10.7 m²/lít" },
                    new Material { Code = "MAT-074", Name = "Bột bả ngoại thất Jotun Exterior Putty", Unit = "kg", IsDecimalUnit = true, UnitPrice = 9500, Specification = "1 m²/kg" },
                    new Material { Code = "MAT-075", Name = "Bột bả nội thất Jotun Interior Putty", Unit = "kg", IsDecimalUnit = true, UnitPrice = 8000, Specification = "1 m²/kg" },

                    // ============================================================
                    // NHÓM 15: SƠN - NISHU
                    // ============================================================
                    new Material { Code = "MAT-076", Name = "Sơn nội thất Nishu Crysin", Unit = "lít", IsDecimalUnit = true, UnitPrice = 100699, TechnicalStandard = "QCVN16:2019/BXD", Specification = "17 lít/thùng" },
                    new Material { Code = "MAT-077", Name = "Sơn ngoại thất Nishu Crys", Unit = "lít", IsDecimalUnit = true, UnitPrice = 141100, TechnicalStandard = "QCVN16:2019/BXD" },
                    new Material { Code = "MAT-078", Name = "Sơn chống thấm Nishu Ston", Unit = "kg", IsDecimalUnit = true, UnitPrice = 125499, TechnicalStandard = "TCCS 011:2017 NISHU", Specification = "20kg/thùng" },
                    new Material { Code = "MAT-079", Name = "Bột bả nội thất NISHU Bt-01", Unit = "kg", IsDecimalUnit = true, UnitPrice = 5624, TechnicalStandard = "TCCS026:2017", Specification = "40kg/bao" },

                    // ============================================================
                    // NHÓM 16: SƠN - Sonata
                    // ============================================================
                    new Material { Code = "MAT-080", Name = "Sơn nội thất Challenge Int - Sonata", Unit = "lít", IsDecimalUnit = true, UnitPrice = 48200, TechnicalStandard = "QCVN 16:2023/BXD", Specification = "Thùng 18 lít; Lon 5 lít" },
                    new Material { Code = "MAT-081", Name = "Sơn ngoại thất Challenge Ext - Sonata", Unit = "lít", IsDecimalUnit = true, UnitPrice = 89190, TechnicalStandard = "QCVN 16:2023/BXD" },
                    new Material { Code = "MAT-082", Name = "Sơn lót Challenge Sealer - Sonata", Unit = "lít", IsDecimalUnit = true, UnitPrice = 78000 },

                    // ============================================================
                    // NHÓM 17: SƠN - JEP JAPAN
                    // ============================================================
                    new Material { Code = "MAT-083", Name = "Sơn mịn nội thất tiêu chuẩn JP-5200 - JEP JAPAN", Unit = "lít", IsDecimalUnit = true, UnitPrice = 77780, TechnicalStandard = "QCVN 16:2023/BXD", Specification = "Thùng 18L; Lon 5L" },
                    new Material { Code = "MAT-084", Name = "Sơn mịn ngoại thất cao cấp JP-7100 - JEP JAPAN", Unit = "lít", IsDecimalUnit = true, UnitPrice = 164610, TechnicalStandard = "QCVN 16:2023/BXD" },
                    new Material { Code = "MAT-085", Name = "Sơn chống thấm đa năng JP-9100 - JEP JAPAN", Unit = "lít", IsDecimalUnit = true, UnitPrice = 184170 },
                    new Material { Code = "MAT-086", Name = "Bột bả nội thất JP-1100 - JEP JAPAN", Unit = "kg", IsDecimalUnit = true, UnitPrice = 10850 },

                    // ============================================================
                    // NHÓM 18: SƠN - Pantone Việt Nam
                    // ============================================================
                    new Material { Code = "MAT-087", Name = "Sơn nội thất chất lượng cao VID 500E - Pantone", Unit = "kg", IsDecimalUnit = true, UnitPrice = 34091, Specification = "24kg" },
                    new Material { Code = "MAT-088", Name = "Sơn ngoại thất chất lượng cao VID 800E - Pantone", Unit = "kg", IsDecimalUnit = true, UnitPrice = 53338, Specification = "22kg" },
                    new Material { Code = "MAT-089", Name = "Bột trét VID 102 MT - Pantone", Unit = "kg", IsDecimalUnit = true, UnitPrice = 7159, Specification = "40kg" },

                    // ============================================================
                    // NHÓM 19: SƠN - Xuất nhập khẩu sơn Hà Nội
                    // ============================================================
                    new Material { Code = "MAT-090", Name = "Sơn lót kháng kiềm nội thất JAPAN SEALER SH22 (22kg)", Unit = "thùng", IsDecimalUnit = false, UnitPrice = 1088000, TechnicalStandard = "QCVN16:2019/BXD; TCVN 8652:2020", Specification = "Thùng 22kg" },
                    new Material { Code = "MAT-091", Name = "Bột bả nội thất BBTN (40kg) - Xuất nhập khẩu sơn HN", Unit = "bao", IsDecimalUnit = false, UnitPrice = 320000, TechnicalStandard = "QCVN 16:2019/BXD; TCVN 7239:2014", Specification = "Bao 40kg" },
                    new Material { Code = "MAT-092", Name = "Bột bả ngoại thất BBNN (40kg) - Xuất nhập khẩu sơn HN", Unit = "bao", IsDecimalUnit = false, UnitPrice = 400000, TechnicalStandard = "QCVN 16:2019/BXD; TCVN 7239:2014", Specification = "Bao 40kg" },

                    // ============================================================
                    // NHÓM 20: VẬT LIỆU KHÁC
                    // ============================================================
                    new Material { Code = "MAT-093", Name = "Nhựa đường phuy", Unit = "kg", IsDecimalUnit = true, UnitPrice = 18500 },
                    new Material { Code = "MAT-094", Name = "Nhựa đường đặc nóng", Unit = "kg", IsDecimalUnit = true, UnitPrice = 17500 },
                    new Material { Code = "MAT-095", Name = "Gỗ cốt pha", Unit = "m3", IsDecimalUnit = true, UnitPrice = 2000000 },
                    new Material { Code = "MAT-096", Name = "Gỗ xà gồ (Gỗ hồng sắc)", Unit = "m3", IsDecimalUnit = true, UnitPrice = 2000000 },
                    new Material { Code = "MAT-097", Name = "Gỗ cầu phong", Unit = "m3", IsDecimalUnit = true, UnitPrice = 2000000 },
                    new Material { Code = "MAT-098", Name = "Gỗ làm khe co dãn", Unit = "m3", IsDecimalUnit = true, UnitPrice = 1500000 },
                    new Material { Code = "MAT-099", Name = "Cây chống cao ≥ 4m", Unit = "cây", IsDecimalUnit = false, UnitPrice = 25000 },

                    // ============================================================
                    // NHÓM 21: CHỐNG THẤM - Conmik
                    // ============================================================
                    new Material { Code = "MAT-100", Name = "Hóa chất chống thấm gốc xi măng 2 thành phần Conmik Seal 100 CM75", Unit = "kg", IsDecimalUnit = true, UnitPrice = 27500, TechnicalStandard = "TCVN 9067", Specification = "25kg/bộ" },
                    new Material { Code = "MAT-101", Name = "Hóa chất chống thấm gốc xi măng 1 thành phần Conmik Seal CM71", Unit = "kg", IsDecimalUnit = true, UnitPrice = 88000, Specification = "25kg/thùng" },
                    new Material { Code = "MAT-102", Name = "Màng chống thấm tự dính Polyetylen Conmik WP 590", Unit = "m2", IsDecimalUnit = true, UnitPrice = 110000, Specification = "20m2/cuộn" },
                    new Material { Code = "MAT-103", Name = "Màng chống thấm tự dính Polyetylen Conmik WP 800", Unit = "m2", IsDecimalUnit = true, UnitPrice = 154000, Specification = "20m2/cuộn" },

                    // ============================================================
                    // NHÓM 22: VẬT LIỆU LỢP - TÔN Austnam
                    // ============================================================
                    new Material { Code = "MAT-104", Name = "Tôn Austnam AC11 - 11 sóng, dày 0.45mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 190000, TechnicalStandard = "ASTM A755/A792", Specification = "11 sóng, dày 0.45mm, liên kết bằng vít" },
                    new Material { Code = "MAT-105", Name = "Tôn Austnam ATEK1000 - 6 sóng, dày 0.45mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 190909, TechnicalStandard = "ASTM A755/A792", Specification = "6 sóng, dày 0.45mm, liên kết bằng vít" },
                    new Material { Code = "MAT-106", Name = "Tôn Austnam ALOK420 - 3 sóng, dày 0.45mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 240909, TechnicalStandard = "ASTM A755/A792", Specification = "3 sóng, dày 0.45mm, liên kết bằng đai kẹp âm" },
                    new Material { Code = "MAT-107", Name = "Tôn sandwich PU Austnam APU1 - 11 sóng, dày 0.45mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 275455, Specification = "11 sóng, dày 0.45mm, Tôn+PU(18mm)+Bạc Alufilm, tỉ trọng PU 28-32 kg/m3" },
                    new Material { Code = "MAT-108", Name = "Tôn Suntek EC11 - 11 sóng, dày 0.45mm", Unit = "m2", IsDecimalUnit = true, UnitPrice = 130000, TechnicalStandard = "JIS G3322:2013", Specification = "11 sóng, dày 0.45mm" },

                    // ============================================================
                    // NHÓM 23: TÔN - Poshaco (ZAM)
                    // ============================================================
                    new Material { Code = "MAT-109", Name = "Tôn Kazin 100 - 11 sóng, dày 0.45mm - Poshaco", Unit = "m2", IsDecimalUnit = true, UnitPrice = 190000, Specification = "ZAM 100, sơn Polyester 20/7um G550/G350, 0.45x1080" },
                    new Material { Code = "MAT-110", Name = "Tôn Kazin 100 - 11 sóng, dày 0.50mm - Poshaco", Unit = "m2", IsDecimalUnit = true, UnitPrice = 200000, Specification = "ZAM 100, sơn Polyester 20/7um G550/G350, 0.50x1080" },
                    new Material { Code = "MAT-111", Name = "Tôn PU 11 sóng dày 0.45mm - Poshaco", Unit = "m2", IsDecimalUnit = true, UnitPrice = 265000, Specification = "ZAM 100, Tôn+PU(20mm)+Bạc Alufilm, 0.45x1080" },
                    new Material { Code = "MAT-112", Name = "Xà gồ mạ kẽm CZ150, dày 1.5-3.0mm - Poshaco", Unit = "kg", IsDecimalUnit = true, UnitPrice = 27000, Specification = "CZ150, dày 1.5mm-3.0mm, độ phủ 80g/m2" },
                    new Material { Code = "MAT-113", Name = "Xà gồ mạ kẽm CZ200, dày 1.5-3.0mm - Poshaco", Unit = "kg", IsDecimalUnit = true, UnitPrice = 27000, Specification = "CZ200, dày 1.5mm-3.0mm, độ phủ 80g/m2" },

                    // ============================================================
                    // NHÓM 24: NGÓI - Secoin
                    // ============================================================
                    new Material { Code = "MAT-114", Name = "Ngói chính sóng tròn Secoin, KT 424x335mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 19000, TechnicalStandard = "QCVN 16:2023/BXD", Specification = "424x335mm" },
                    new Material { Code = "MAT-115", Name = "Ngói sóng vuông Secoin, KT 424x335mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 21000, Specification = "424x335mm" },
                    new Material { Code = "MAT-116", Name = "Ngói phẳng Pháp Secoin, KT 406x345mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 21000, Specification = "406x345mm" },
                    new Material { Code = "MAT-117", Name = "Ngói bò nóc sóng Secoin, KT 380x210mm", Unit = "viên", IsDecimalUnit = false, UnitPrice = 30500, Specification = "380x210mm" },

                    // ============================================================
                    // NHÓM 25: ỐNG NHỰA - Europipe
                    // ============================================================
                    new Material { Code = "MAT-118", Name = "Ống uPVC nóng trơn Europipe C3 D90", Unit = "m", IsDecimalUnit = true, UnitPrice = 79700, Specification = "uPVC C3, D90" },
                    new Material { Code = "MAT-119", Name = "Ống uPVC nóng trơn Europipe C3 D110", Unit = "m", IsDecimalUnit = true, UnitPrice = 124800, Specification = "uPVC C3, D110" },
                    new Material { Code = "MAT-120", Name = "Ống uPVC nóng trơn Europipe C3 D160", Unit = "m", IsDecimalUnit = true, UnitPrice = 238900, Specification = "uPVC C3, D160" },
                    new Material { Code = "MAT-121", Name = "Ống HDPE100 D110 PN6", Unit = "m", IsDecimalUnit = true, UnitPrice = 97273, Specification = "HDPE100, D110, PN6" },
                    new Material { Code = "MAT-122", Name = "Ống HDPE100 D110 PN10", Unit = "m", IsDecimalUnit = true, UnitPrice = 151091, Specification = "HDPE100, D110, PN10" },
                    new Material { Code = "MAT-123", Name = "Ống PPR PN10 D20x2.3mm", Unit = "m", IsDecimalUnit = true, UnitPrice = 22182, Specification = "PPR PN10, D20x2.3mm" },
                    new Material { Code = "MAT-124", Name = "Ống PPR PN10 D32x2.9mm", Unit = "m", IsDecimalUnit = true, UnitPrice = 51364, Specification = "PPR PN10, D32x2.9mm" },

                    // ============================================================
                    // NHÓM 26: XI MĂNG - Sài Sơn
                    // ============================================================
                    new Material { Code = "MAT-125", Name = "Xi măng poóc lăng hỗn hợp bao PCB30 - Sài Sơn", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1177000, TechnicalStandard = "TCVN 6260:2020", Specification = "Bao 50kg, PCB30" },

                    // ============================================================
                    // NHÓM 27: XI MĂNG - Hoàng Long
                    // ============================================================
                    new Material { Code = "MAT-126", Name = "Xi măng bao PCB30 - Hoàng Long", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1300000, Specification = "PCB30, bao" },
                    new Material { Code = "MAT-127", Name = "Xi măng bao PCB40 - Hoàng Long", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1400000, Specification = "PCB40, bao" },
                    new Material { Code = "MAT-128", Name = "Xi măng rời PCB30 - Hoàng Long", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1100000, Specification = "PCB30, rời" },
                    new Material { Code = "MAT-129", Name = "Xi măng rời PCB40 - Hoàng Long", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1200000, Specification = "PCB40, rời" },

                    // ============================================================
                    // NHÓM 28: XI MĂNG - Bỉm Sơn
                    // ============================================================
                    new Material { Code = "MAT-130", Name = "Xi măng bao PCB30 - Bỉm Sơn", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1277000, TechnicalStandard = "TCVN 6260:2020", Specification = "PCB30, bao" },
                    new Material { Code = "MAT-131", Name = "Xi măng bao PCB40 - Bỉm Sơn", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1296000, Specification = "PCB40, bao" },
                    new Material { Code = "MAT-132", Name = "Xi măng rời PCB30 - Bỉm Sơn", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 740000, Specification = "PCB30, rời" },
                    new Material { Code = "MAT-133", Name = "Xi măng rời PCB40 - Bỉm Sơn", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 787000, Specification = "PCB40, rời" },

                    // ============================================================
                    // NHÓM 29: XI MĂNG - Vĩnh Sơn
                    // ============================================================
                    new Material { Code = "MAT-134", Name = "Xi măng bao PCB40 - Vĩnh Sơn", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1250000, Specification = "PCB40, bao" },
                    new Material { Code = "MAT-135", Name = "Xi măng bao PCB30 - Vĩnh Sơn", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1157000, Specification = "PCB30, bao" },
                    new Material { Code = "MAT-136", Name = "Xi măng rời PCB40 - Vĩnh Sơn", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1065000, Specification = "PCB40, rời" },

                    // ============================================================
                    // NHÓM 30: XI MĂNG - Thành Thắng
                    // ============================================================
                    new Material { Code = "MAT-137", Name = "Xi măng bao PCB30 - Thành Thắng", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1300000, Specification = "PCB30, bao 50kg" },
                    new Material { Code = "MAT-138", Name = "Xi măng bao PCB40 - Thành Thắng", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1400000, Specification = "PCB40, bao 50kg" },
                    new Material { Code = "MAT-139", Name = "Xi măng xây trát cao cấp - Thành Thắng", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1100000, Specification = "Xây trát, bao" },

                    // ============================================================
                    // NHÓM 31: XI MĂNG - Xuân Thành
                    // ============================================================
                    new Material { Code = "MAT-140", Name = "Xi măng bao PCB30 (Xuân Thành / Katio / Long Thành / Himars)", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1520000, Specification = "PCB30, bao" },
                    new Material { Code = "MAT-141", Name = "Xi măng bao PCB40 (Xuân Thành / Katio / Long Thành / Himars)", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1590000, Specification = "PCB40, bao" },
                    new Material { Code = "MAT-142", Name = "Xi măng rời PCB40 - Xuân Thành", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1370000, Specification = "PCB40, rời" },

                    // ============================================================
                    // NHÓM 32: XI MĂNG - La Hiên
                    // ============================================================
                    new Material { Code = "MAT-143", Name = "Xi măng bao PCB30 - La Hiên", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 981481, TechnicalStandard = "TCVN 6260:2020", Specification = "PCB30, bao 50kg" },
                    new Material { Code = "MAT-144", Name = "Xi măng bao PCB40 - La Hiên", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 1046296, TechnicalStandard = "TCVN 6260:2020", Specification = "PCB40, bao 50kg" },
                    new Material { Code = "MAT-145", Name = "Xi măng bột PCB30 - La Hiên", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 750000, Specification = "PCB30, bột (rời)" },
                    new Material { Code = "MAT-146", Name = "Xi măng bột PCB40 - La Hiên", Unit = "tấn", IsDecimalUnit = true, UnitPrice = 814814, Specification = "PCB40, bột (rời)" },
                };
                
                await context.Materials.AddRangeAsync(materials);
                await context.SaveChangesAsync();
            }

            // ===== Seed Warehouse =====
            if (!await context.Warehouses.AnyAsync())
            {
                var warehouses = new List<Warehouse>
                {
                    new Warehouse { Name = "Kho chính", Address = "Hà Nội" },  
                };

                await context.Warehouses.AddRangeAsync(warehouses);
                await context.SaveChangesAsync();
            }

            // ===== Seed BinLocation =====
            if (!await context.BinLocations.AnyAsync())
            {
                var mainWarehouse = await context.Warehouses.FirstAsync(w => w.Name == "Kho chính");
              

                var bins = new List<BinLocation>
                {
                    // Kho chính
                    new BinLocation { WarehouseId = mainWarehouse.WarehouseId, Code = "BIN-A01", Type = "STORAGE" },
                    new BinLocation { WarehouseId = mainWarehouse.WarehouseId, Code = "BIN-A02", Type = "STORAGE" },
                    new BinLocation { WarehouseId = mainWarehouse.WarehouseId, Code = "BIN-B01", Type = "STORAGE" },
                    new BinLocation { WarehouseId = mainWarehouse.WarehouseId, Code = "BIN-B02", Type = "STORAGE" },
                    new BinLocation { WarehouseId = mainWarehouse.WarehouseId, Code = "BIN-RECV", Type = "RECEIVING" },
                    new BinLocation { WarehouseId = mainWarehouse.WarehouseId, Code = "BIN-SHIP", Type = "SHIPPING" },
                };

                await context.BinLocations.AddRangeAsync(bins);
                await context.SaveChangesAsync();
            }

            // ===== Seed Batch =====
            // Mỗi vật liệu có 1-3 lô nhập kho khác nhau, với đầy đủ thông tin:
            // ngày sản xuất, hạn dùng (nếu có), số PO, nhà cung cấp tương ứng.
            if (!await context.Batches.AnyAsync())
            {
                // Lấy MaterialId theo Code để gán lô
                var matDict = await context.Materials
                    .ToDictionaryAsync(m => m.Code, m => m.MaterialId);

                // Lấy SupplierId theo Code
                var supDict = await context.Suppliers
                    .ToDictionaryAsync(s => s.Code, s => s.SupplierId);

                var now = DateTime.Now;

                // Helper tạo ngày sản xuất và hạn dùng
                DateTime Mfg(int daysAgo) => now.AddDays(-daysAgo);
                DateTime? Exp(int daysAgo, int validDays) => now.AddDays(-daysAgo + validDays);

                var batches = new List<Batch>
    {
        // ── BÊ TÔNG ĐÚC SẴN (Amaccao - SUP-001) ────────────────────────────
        new Batch { MaterialId = matDict["MAT-001"], BatchCode = "AMC-2025-001", MfgDate = Mfg(90),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-001"], BatchCode = "AMC-2025-002", MfgDate = Mfg(30),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-003"], BatchCode = "AMC-2025-003", MfgDate = Mfg(60),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-005"], BatchCode = "AMC-2025-004", MfgDate = Mfg(45),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-010"], BatchCode = "AMC-2025-005", MfgDate = Mfg(20),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-014"], BatchCode = "AMC-2025-006", MfgDate = Mfg(15),    ExpiryDate = null},

        // ── BÊ TÔNG NHỰA (Carbon Việt Nam - SUP-002) ────────────────────────
        new Batch { MaterialId = matDict["MAT-016"], BatchCode = "CVN-2025-001", MfgDate = Mfg(50),    ExpiryDate = Exp(51, 180)},
        new Batch { MaterialId = matDict["MAT-017"], BatchCode = "CVN-2025-002", MfgDate = Mfg(25),    ExpiryDate = Exp(26, 180)},
        new Batch { MaterialId = matDict["MAT-018"], BatchCode = "CVN-2025-003", MfgDate = Mfg(10),    ExpiryDate = Exp(11, 180)},

        // ── CỬA NHÔM Việt Pháp (Hợp Phát - SUP-003) ─────────────────────────
        new Batch { MaterialId = matDict["MAT-019"], BatchCode = "HPT-2025-001", MfgDate = Mfg(80),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-020"], BatchCode = "HPT-2025-002", MfgDate = Mfg(40),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-022"], BatchCode = "HPT-2025-003", MfgDate = Mfg(15),    ExpiryDate = null},

        // ── CỬA NHỰA uPVC (PAG - SUP-004) ────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-024"], BatchCode = "PAG-2025-001", MfgDate = Mfg(55),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-025"], BatchCode = "PAG-2025-002", MfgDate = Mfg(20),    ExpiryDate = null},

        // ── CỬA NHÔM Xingfa (Nhôm Việt Pháp - SUP-005) ───────────────────────
        new Batch { MaterialId = matDict["MAT-027"], BatchCode = "NVP-2025-001", MfgDate = Mfg(70),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-029"], BatchCode = "NVP-2025-002", MfgDate = Mfg(30),    ExpiryDate = null},

        // ── GẠCH XÂY (An Thịnh - SUP-008) ────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-031"], BatchCode = "ATH-2025-001", MfgDate = Mfg(120),  ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-031"], BatchCode = "ATH-2025-002", MfgDate = Mfg(45),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-033"], BatchCode = "ATH-2025-003", MfgDate = Mfg(60),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-035"], BatchCode = "ATH-2025-004", MfgDate = Mfg(15),    ExpiryDate = null},

        // ── GẠCH SECOIN (SUP-009) ─────────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-036"], BatchCode = "SCN-2025-001", MfgDate = Mfg(90),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-038"], BatchCode = "SCN-2025-002", MfgDate = Mfg(30),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-040"], BatchCode = "SCN-2025-003", MfgDate = Mfg(10),    ExpiryDate = null},

        // ── GẠCH AAC Viglacera (SUP-010) ─────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-042"], BatchCode = "VGA-2025-001", MfgDate = Mfg(75),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-044"], BatchCode = "VGA-2025-002", MfgDate = Mfg(35),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-046"], BatchCode = "VGA-2025-003", MfgDate = Mfg(12),    ExpiryDate = null},

        // ── THÉP Việt Nhật (SUP-011) ──────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-047"], BatchCode = "VNJ-2025-001", MfgDate = Mfg(100),  ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-047"], BatchCode = "VNJ-2025-002", MfgDate = Mfg(40),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-049"], BatchCode = "VNJ-2025-003", MfgDate = Mfg(60),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-051"], BatchCode = "VNJ-2025-004", MfgDate = Mfg(20),    ExpiryDate = null},

        // ── THÉP VGS Việt Đức (SUP-012) ───────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-052"], BatchCode = "VGS-2025-001", MfgDate = Mfg(80),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-053"], BatchCode = "VGS-2025-002", MfgDate = Mfg(25),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-054"], BatchCode = "VGS-2025-003", MfgDate = Mfg(10),    ExpiryDate = null},

        // ── THÉP Việt Ý (SUP-013) ─────────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-055"], BatchCode = "VIY-2025-001", MfgDate = Mfg(55),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-057"], BatchCode = "VIY-2025-002", MfgDate = Mfg(18),    ExpiryDate = null},

        // ── THÉP HÌNH Thái Nguyên (SUP-014) ───────────────────────────────────
        new Batch { MaterialId = matDict["MAT-059"], BatchCode = "TNG-2025-001", MfgDate = Mfg(90),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-060"], BatchCode = "TNG-2025-002", MfgDate = Mfg(40),    ExpiryDate = null},

        // ── THÉP VAS Nghi Sơn (SUP-015) ───────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-063"], BatchCode = "VAS-2025-001", MfgDate = Mfg(65),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-064"], BatchCode = "VAS-2025-002", MfgDate = Mfg(22),    ExpiryDate = null},

        // ── TRẦN THẠCH CAO Mikado (SUP-016) ───────────────────────────────────
        new Batch { MaterialId = matDict["MAT-065"], BatchCode = "MKD-2025-001", MfgDate = Mfg(70),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-067"], BatchCode = "MKD-2025-002", MfgDate = Mfg(30),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-069"], BatchCode = "MKD-2025-003", MfgDate = Mfg(12),    ExpiryDate = null},

        // ── SƠN Jotun (SUP-018) ────────────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-070"], BatchCode = "JTN-2025-001", MfgDate = Mfg(90),    ExpiryDate = Exp(95, 1095)},
        new Batch { MaterialId = matDict["MAT-070"], BatchCode = "JTN-2025-002", MfgDate = Mfg(20),    ExpiryDate = Exp(22, 1095)},
        new Batch { MaterialId = matDict["MAT-071"], BatchCode = "JTN-2025-003", MfgDate = Mfg(60),    ExpiryDate = Exp(63, 1095)},
        new Batch { MaterialId = matDict["MAT-072"], BatchCode = "JTN-2025-004", MfgDate = Mfg(30),    ExpiryDate = Exp(31, 730)},
        new Batch { MaterialId = matDict["MAT-074"], BatchCode = "JTN-2025-005", MfgDate = Mfg(15),    ExpiryDate = Exp(16, 365)},

        // ── SƠN NISHU (SUP-020) ────────────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-076"], BatchCode = "NSH-2025-001", MfgDate = Mfg(50),    ExpiryDate = Exp(52, 1095)},
        new Batch { MaterialId = matDict["MAT-077"], BatchCode = "NSH-2025-002", MfgDate = Mfg(15),    ExpiryDate = Exp(16, 1095)},
        new Batch { MaterialId = matDict["MAT-078"], BatchCode = "NSH-2025-003", MfgDate = Mfg(35),    ExpiryDate = Exp(37, 730)},

        // ── SƠN Sonata (SUP-021) ───────────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-080"], BatchCode = "SNA-2025-001", MfgDate = Mfg(45),    ExpiryDate = Exp(47, 1095)},
        new Batch { MaterialId = matDict["MAT-081"], BatchCode = "SNA-2025-002", MfgDate = Mfg(18),    ExpiryDate = Exp(20, 1095)},

        // ── SƠN JEP JAPAN (SUP-022) ───────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-083"], BatchCode = "JEP-2025-001", MfgDate = Mfg(60),    ExpiryDate = Exp(62, 1095)},
        new Batch { MaterialId = matDict["MAT-084"], BatchCode = "JEP-2025-002", MfgDate = Mfg(25),    ExpiryDate = Exp(27, 1095)},
        new Batch { MaterialId = matDict["MAT-085"], BatchCode = "JEP-2025-003", MfgDate = Mfg(10),    ExpiryDate = Exp(11, 730)},

        // ── CHỐNG THẤM Conmik (SUP-028) ───────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-100"], BatchCode = "CMK-2025-001", MfgDate = Mfg(80),    ExpiryDate = Exp(83, 730)},
        new Batch { MaterialId = matDict["MAT-102"], BatchCode = "CMK-2025-002", MfgDate = Mfg(30),    ExpiryDate = Exp(31, 1095)},
        new Batch { MaterialId = matDict["MAT-103"], BatchCode = "CMK-2025-003", MfgDate = Mfg(12),    ExpiryDate = Exp(13, 1095)},

        // ── TÔN Austnam (SUP-026) ─────────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-104"], BatchCode = "AUS-2025-001", MfgDate = Mfg(70),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-104"], BatchCode = "AUS-2025-002", MfgDate = Mfg(20),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-106"], BatchCode = "AUS-2025-003", MfgDate = Mfg(40),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-107"], BatchCode = "AUS-2025-004", MfgDate = Mfg(10),    ExpiryDate = null},

        // ── TÔN Poshaco (SUP-027) ─────────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-109"], BatchCode = "PSC-2025-001", MfgDate = Mfg(55),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-110"], BatchCode = "PSC-2025-002", MfgDate = Mfg(15),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-112"], BatchCode = "PSC-2025-003", MfgDate = Mfg(35),    ExpiryDate = null},

        // ── ỐNG NHỰA Europipe (SUP-037) ───────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-118"], BatchCode = "EUP-2025-001", MfgDate = Mfg(65),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-119"], BatchCode = "EUP-2025-002", MfgDate = Mfg(30),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-121"], BatchCode = "EUP-2025-003", MfgDate = Mfg(10),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-123"], BatchCode = "EUP-2025-004", MfgDate = Mfg(20),    ExpiryDate = null},

        // ── XI MĂNG Bỉm Sơn (SUP-031) ────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-130"], BatchCode = "BIS-2025-001", MfgDate = Mfg(90),    ExpiryDate = Exp(92, 90)},
        new Batch { MaterialId = matDict["MAT-130"], BatchCode = "BIS-2025-002", MfgDate = Mfg(30),    ExpiryDate = Exp(31, 90)},
        new Batch { MaterialId = matDict["MAT-131"], BatchCode = "BIS-2025-003", MfgDate = Mfg(45),    ExpiryDate = Exp(47, 90)},
        new Batch { MaterialId = matDict["MAT-132"], BatchCode = "BIS-2025-004", MfgDate = Mfg(15),    ExpiryDate = Exp(16, 90)},

        // ── XI MĂNG Hoàng Long (SUP-030) ──────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-126"], BatchCode = "HLG-2025-001", MfgDate = Mfg(60),    ExpiryDate = Exp(62, 90)},
        new Batch { MaterialId = matDict["MAT-127"], BatchCode = "HLG-2025-002", MfgDate = Mfg(20),    ExpiryDate = Exp(21, 90)},
        new Batch { MaterialId = matDict["MAT-128"], BatchCode = "HLG-2025-003", MfgDate = Mfg(10),    ExpiryDate = Exp(11, 90)},

        // ── XI MĂNG La Hiên (SUP-036) ─────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-143"], BatchCode = "LHN-2025-001", MfgDate = Mfg(75),    ExpiryDate = Exp(77, 90)},
        new Batch { MaterialId = matDict["MAT-144"], BatchCode = "LHN-2025-002", MfgDate = Mfg(25),    ExpiryDate = Exp(26, 90)},

        // ── VẬT LIỆU KHÁC ─────────────────────────────────────────────────────
        new Batch { MaterialId = matDict["MAT-093"], BatchCode = "MIS-2025-001", MfgDate = Mfg(50),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-095"], BatchCode = "MIS-2025-002", MfgDate = Mfg(40),    ExpiryDate = null},
        new Batch { MaterialId = matDict["MAT-099"], BatchCode = "MIS-2025-003", MfgDate = Mfg(20),    ExpiryDate = null},
    };

                await context.Batches.AddRangeAsync(batches);
                await context.SaveChangesAsync();
            }

            // ===== Seed InventoryCurrent =====
            // Phân bổ tồn kho thực tế theo từng lô, rải ra nhiều kho/bin khác nhau.
            if (!await context.InventoryCurrents.AnyAsync())
            {
                var mainWarehouse = await context.Warehouses.FirstAsync(w => w.Name == "Kho chính");
           

                // Lấy tất cả bins
                var binMain_A01 = await context.BinLocations.FirstAsync(b => b.Code == "BIN-A01");
                var binMain_A02 = await context.BinLocations.FirstAsync(b => b.Code == "BIN-A02");
                var binMain_B01 = await context.BinLocations.FirstAsync(b => b.Code == "BIN-B01");
                var binMain_B02 = await context.BinLocations.FirstAsync(b => b.Code == "BIN-B02");
                var binMain_RECV = await context.BinLocations.FirstAsync(b => b.Code == "BIN-RECV");

                // Lấy batch theo BatchCode để tra cứu
                var batchDict = await context.Batches
                    .ToDictionaryAsync(b => b.BatchCode, b => new { b.BatchId, b.MaterialId });

                // Helper tạo bản ghi tồn kho
                InventoryCurrent Inv(string batchCode, Warehouse wh, BinLocation bin, decimal qty) =>
                    new InventoryCurrent
                    {
                        WarehouseId = wh.WarehouseId,
                        BinId = bin.BinId,
                        MaterialId = batchDict[batchCode].MaterialId,
                        BatchId = batchDict[batchCode].BatchId,
                        QuantityOnHand = qty
                    };

                var inventoryRecords = new List<InventoryCurrent>
    {
        // ── BÊ TÔNG ĐÚC SẴN ─────────────────────────────────────────────────
        Inv("AMC-2025-001", mainWarehouse, binMain_A01,  120m),   // cống Ø500 lô cũ - kho chính A01
        Inv("AMC-2025-002", mainWarehouse, binMain_A02,   80m),   // cống Ø500 lô mới - kho chính A02
        Inv("AMC-2025-003", mainWarehouse, binMain_B01,   60m),   // cống Ø800
      
        Inv("AMC-2025-005", mainWarehouse, binMain_A01,   25m),   // cống hộp 1000x1000
        Inv("AMC-2025-006", mainWarehouse, binMain_B02,  200m),   // tấm bê tông ứng lực

        // ── BÊ TÔNG NHỰA ─────────────────────────────────────────────────────
        Inv("CVN-2025-001", mainWarehouse, binMain_A01,   15m),   // Carboncor lô cũ
        Inv("CVN-2025-002", mainWarehouse, binMain_A01,   20m),   // CA 95 lô mới


        // ── CỬA NHÔM Việt Pháp ───────────────────────────────────────────────
        Inv("HPT-2025-001", mainWarehouse, binMain_A02,  150m),   // vách kính lô cũ
        Inv("HPT-2025-002", mainWarehouse, binMain_A02,   80m),   // cửa sổ trượt
        Inv("HPT-2025-003", mainWarehouse, binMain_B01,   60m),   // cửa đi 2 cánh

        // ── CỬA NHỰA uPVC ────────────────────────────────────────────────────
        Inv("PAG-2025-001", mainWarehouse, binMain_B01,  100m),   // vách kính cố định

        // ── CỬA NHÔM Xingfa ──────────────────────────────────────────────────
        Inv("NVP-2025-001", mainWarehouse, binMain_A01,  120m),   // vách kính cố định
        Inv("NVP-2025-002", mainWarehouse, binMain_B02,   70m),   // cửa đi 1 cánh

        // ── GẠCH XÂY An Thịnh ────────────────────────────────────────────────
        Inv("ATH-2025-001", mainWarehouse, binMain_A01, 5000m),   // gạch đặc M10 lô cũ - kho chính
        Inv("ATH-2025-002", mainWarehouse, binMain_A02, 3000m),   // gạch đặc M10 lô mới
      
        Inv("ATH-2025-003", mainWarehouse, binMain_B01, 1500m),   // gạch đặc M10 105mm
        Inv("ATH-2025-004", mainWarehouse, binMain_B01,  800m),   // gạch rỗng M7.5

        // ── GẠCH SECOIN ──────────────────────────────────────────────────────
        Inv("SCN-2025-001", mainWarehouse, binMain_A01, 4000m),   // gạch block đặc

        Inv("SCN-2025-003", mainWarehouse, binMain_B02,  300m),   // gạch block lát hè

        // ── GẠCH AAC Viglacera ────────────────────────────────────────────────
        Inv("VGA-2025-001", mainWarehouse, binMain_A02,   50m),   // AAC dày 50mm
        Inv("VGA-2025-002", mainWarehouse, binMain_B01,   40m),   // AAC dày 100mm
   

        // ── THÉP Việt Nhật ────────────────────────────────────────────────────
        Inv("VNJ-2025-001", mainWarehouse, binMain_A01, 8000m),   // D10 CB300V lô cũ
        Inv("VNJ-2025-002", mainWarehouse, binMain_A01, 5000m),   // D10 CB300V lô mới
    
        Inv("VNJ-2025-003", mainWarehouse, binMain_B01, 6000m),   // D14-D32 CB300V
        Inv("VNJ-2025-004", mainWarehouse, binMain_B02, 4500m),   // D14-D32 CB400V

        // ── THÉP VGS Việt Đức ────────────────────────────────────────────────
        Inv("VGS-2025-001", mainWarehouse, binMain_A02, 3500m),   // cuộn CB240
        Inv("VGS-2025-002", mainWarehouse, binMain_B01, 4000m),   // D10 CB300V
    

        // ── THÉP Việt Ý ──────────────────────────────────────────────────────
        Inv("VIY-2025-001", mainWarehouse, binMain_A01, 2500m),   // cuộn CB240T
        Inv("VIY-2025-002", mainWarehouse, binMain_B01, 3000m),   // D14-D32 CB300V

        // ── THÉP HÌNH ─────────────────────────────────────────────────────────
        Inv("TNG-2025-001", mainWarehouse, binMain_B02, 2000m),   // thép góc L40
   
        Inv("VAS-2025-001", mainWarehouse, binMain_A02, 4000m),   // D10 VAS
        Inv("VAS-2025-002", mainWarehouse, binMain_B01, 3500m),   // D14-D20 VAS

        // ── TRẦN THẠCH CAO ───────────────────────────────────────────────────
        Inv("MKD-2025-001", mainWarehouse, binMain_A01,  500m),   // trần phẳng GOLD 9mm
        Inv("MKD-2025-002", mainWarehouse, binMain_A02,  300m),   // trần chống cháy
    

        // ── SƠN Jotun ────────────────────────────────────────────────────────
        Inv("JTN-2025-001", mainWarehouse, binMain_A01,  200m),   // Jotashield lô cũ
        Inv("JTN-2025-002", mainWarehouse, binMain_A01,  150m),   // Jotashield lô mới
        Inv("JTN-2025-003", mainWarehouse, binMain_A02,  180m),   // Majestic nội thất
      
        Inv("JTN-2025-005", mainWarehouse, binMain_B01,  120m),   // bột bả ngoại thất

        // ── SƠN NISHU ────────────────────────────────────────────────────────
        Inv("NSH-2025-001", mainWarehouse, binMain_A02,  100m),   // nội thất Nishu
        Inv("NSH-2025-002", mainWarehouse, binMain_B01,   80m),   // ngoại thất Nishu

        // ── SƠN Sonata ───────────────────────────────────────────────────────
        Inv("SNA-2025-001", mainWarehouse, binMain_A01,   90m),   // nội thất Sonata
        Inv("SNA-2025-002", mainWarehouse, binMain_B02,   70m),   // ngoại thất Sonata

        // ── SƠN JEP JAPAN ────────────────────────────────────────────────────
        Inv("JEP-2025-001", mainWarehouse, binMain_A01,   60m),   // nội thất JP-5200
        Inv("JEP-2025-002", mainWarehouse, binMain_A02,   40m),   // ngoại thất JP-7100
   

        // ── CHỐNG THẤM Conmik ────────────────────────────────────────────────
        Inv("CMK-2025-001", mainWarehouse, binMain_A01,  300m),   // Seal 100 CM75
        Inv("CMK-2025-002", mainWarehouse, binMain_B01,  500m),   // màng WP 590
     

        // ── TÔN Austnam ──────────────────────────────────────────────────────
        Inv("AUS-2025-001", mainWarehouse, binMain_B01,  800m),   // AC11 lô cũ
        Inv("AUS-2025-002", mainWarehouse, binMain_B01,  500m),   // AC11 lô mới
 
        Inv("AUS-2025-004", mainWarehouse, binMain_B02,  200m),   // Sandwich PU

        // ── TÔN Poshaco ──────────────────────────────────────────────────────
        Inv("PSC-2025-001", mainWarehouse, binMain_B02,  600m),   // Kazin 0.45mm
       
        Inv("PSC-2025-003", mainWarehouse, binMain_A02, 1500m),   // xà gồ mạ kẽm CZ150 (kg)

        // ── ỐNG NHỰA Europipe ────────────────────────────────────────────────
        Inv("EUP-2025-001", mainWarehouse, binMain_A01,  400m),   // uPVC D90
        Inv("EUP-2025-002", mainWarehouse, binMain_A01,  300m),   // uPVC D110
        Inv("EUP-2025-003", mainWarehouse, binMain_B01,  250m),   // HDPE100 D110 PN6
    

        // ── XI MĂNG Bỉm Sơn ──────────────────────────────────────────────────
        Inv("BIS-2025-001", mainWarehouse, binMain_A01,   50m),   // PCB30 bao lô cũ (tấn)
        Inv("BIS-2025-002", mainWarehouse, binMain_A02,   80m),   // PCB30 bao lô mới (tấn)
      
        Inv("BIS-2025-004", mainWarehouse, binMain_B01,   60m),   // PCB30 rời (tấn)

        // ── XI MĂNG Hoàng Long ────────────────────────────────────────────────
        Inv("HLG-2025-001", mainWarehouse, binMain_A02,   30m),   // PCB30 bao (tấn)
        Inv("HLG-2025-002", mainWarehouse, binMain_B01,   25m),   // PCB40 bao (tấn)
      

        // ── XI MĂNG La Hiên ───────────────────────────────────────────────────
        Inv("LHN-2025-001", mainWarehouse, binMain_B02,   35m),   // PCB30 bao (tấn)
        Inv("LHN-2025-002", mainWarehouse, binMain_A01,   28m),   // PCB40 bao (tấn)

        // ── VẬT LIỆU KHÁC ─────────────────────────────────────────────────────
        Inv("MIS-2025-001", mainWarehouse, binMain_B01,  500m),   // nhựa đường phuy (kg)
        Inv("MIS-2025-002", mainWarehouse, binMain_B02,   15m),   // gỗ cốt pha (m3)
        Inv("MIS-2025-003", mainWarehouse, binMain_A01,  100m),   // cây chống cao ≥4m (cây)
    };

                await context.InventoryCurrents.AddRangeAsync(inventoryRecords);
                await context.SaveChangesAsync();
            }
        }
    }
}