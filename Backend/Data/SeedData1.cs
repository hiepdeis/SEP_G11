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
            await context.Database.MigrateAsync();

            // ===== Seed Supplier =====
            if (!await context.Suppliers.AnyAsync())
            {
                var suppliers = new List<Supplier>
                {

                    // --- Nhóm Kết cấu thép ---
                    new Supplier { Code = "SUP-011", Name = "Công ty Cổ phần Thép cao cấp Việt Nhật" },
                    new Supplier { Code = "SUP-012", Name = "Công ty Cổ phần Sản xuất Thép Việt Đức VGS" },
                    new Supplier { Code = "SUP-013", Name = "Công ty Cổ phần Thép Việt Ý" },
                    new Supplier { Code = "SUP-014", Name = "Công ty Cổ phần gang thép Thái Nguyên", Address = "Thái Nguyên" },
                    new Supplier { Code = "SUP-015", Name = "Công ty Cổ phần Tập đoàn VAS Nghi Sơn", Address = "Nghi Sơn, Thanh Hóa" },


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
                    // NHÓM 9: THÉP XÂY DỰNG - Việt Nhật
                    // ============================================================
                    new Material { Code = "MAT-047", Name = "Thép thanh vằn D10 CB300V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13700, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D10, CB300V" },
                    new Material { Code = "MAT-048", Name = "Thép thanh vằn D12 CB300V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13550, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D12, CB300V" },
                    new Material { Code = "MAT-049", Name = "Thép thanh vằn D14-D32 CB300V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13500, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D14-D32, CB300V" },
                    new Material { Code = "MAT-050", Name = "Thép thanh vằn D10 CB400V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13750, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D10, CB400V" },
                    new Material { Code = "MAT-051", Name = "Thép thanh vằn D14-D32 CB400V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13910, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D14-D32, CB400V" },
                    new Material { Code = "MAT-052", Name = "Thép thanh vằn D12 CB400V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13600, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D12, CB400V" },
                    new Material { Code = "MAT-053", Name = "Thép thanh vằn D10 CB500V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13800, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D10, CB500V" },
                    new Material { Code = "MAT-054", Name = "Thép thanh vằn D12 CB500V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13650, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D12, CB500V" },
                    new Material { Code = "MAT-055", Name = "Thép thanh vằn D14-D32 CB500V - Việt Nhật", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13600, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D14-D32, CB500V" },
                    // ============================================================
                    // NHÓM 10: THÉP XÂY DỰNG - VGS Việt Đức
                    // ============================================================
                    new Material { Code = "MAT-056", Name = "Thép cuộn trơn CB240 D6-D8 - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13640, TechnicalStandard = "TCVN 1651-1:2018", Specification = "D6-D8, CB240" },
                    new Material { Code = "MAT-057", Name = "Thép thanh vằn D10 CB300V - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13940, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D10, SD295/CB300/CII/Gr40" },
                    new Material { Code = "MAT-058", Name = "Thép thanh vằn D14-D32 CB400V - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13640, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D14-D32, SD390/CB400/CIII/Gr60" },
                    // CB300
                    new Material { Code = "MAT-059", Name = "Thép thanh vằn D12 CB300V - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13580, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D12, SD295/CB300/CII/Gr40" },
                    new Material { Code = "MAT-060", Name = "Thép thanh vằn D14-D32 CB300V - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13530, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D14-D32, SD295/CB300/CII/Gr40" },
                    // CB400
                    new Material { Code = "MAT-061", Name = "Thép thanh vằn D10 CB400V - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13640, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D10, SD390/CB400/CIII/Gr60" },
                    new Material { Code = "MAT-062", Name = "Thép thanh vằn D12 CB400V - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13640, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D12, SD390/CB400/CIII/Gr60" },
                    new Material { Code = "MAT-063", Name = "Thép thanh vằn D36-D40 CB400V - VGS", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13640, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D36-D40, SD390/CB400/CIII/Gr60" },
                                        // ============================================================
                    // NHÓM 11: THÉP XÂY DỰNG - Việt Ý
                    // ============================================================
                    new Material { Code = "MAT-064", Name = "Thép cuộn f6-f8 CB240T - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14850, TechnicalStandard = "CB240T", Specification = "f6-f8" },
                    new Material { Code = "MAT-065", Name = "Thép thanh vằn D10 CB300V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14900, TechnicalStandard = "CB300V", Specification = "D10" },
                    new Material { Code = "MAT-066", Name = "Thép thanh vằn D14-D32 CB300V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14650, TechnicalStandard = "CB300V", Specification = "D14-D32" },
                    new Material { Code = "MAT-067", Name = "Thép thanh vằn D10 CB400V/CB500V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15200, TechnicalStandard = "CB400V/CB500V", Specification = "D10" },
                    new Material { Code = "MAT-068", Name = "Thép thanh vằn D12 CB300V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14750, TechnicalStandard = "CB300V", Specification = "D12" },
                    new Material { Code = "MAT-069", Name = "Thép thanh vằn D12 CB400V/CB500V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15050, TechnicalStandard = "CB400V/CB500V", Specification = "D12" },
                    new Material { Code = "MAT-070", Name = "Thép thanh vằn D14-D32 CB400V/CB500V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14950, TechnicalStandard = "CB400V/CB500V", Specification = "D14-D32" },
                    new Material { Code = "MAT-071", Name = "Thép thanh vằn D36 CB400V/CB500V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15150, TechnicalStandard = "CB400V/CB500V", Specification = "D36" },
                    new Material { Code = "MAT-072", Name = "Thép thanh vằn D40 CB400V/CB500V - Việt Ý", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15450, TechnicalStandard = "CB400V/CB500V", Specification = "D40" },
                                        // ============================================================
                    // NHÓM 12: THÉP HÌNH - Gang thép Thái Nguyên & VAS Nghi Sơn
                    // ============================================================
                    new Material { Code = "MAT-073", Name = "Thép góc L40 SS400, L=6m/9m/12m - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14950, TechnicalStandard = "SS400/CT38/CT42", Specification = "L40, L=6m; 9m; 12m" },
                    new Material { Code = "MAT-074", Name = "Thép I10 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 16050, TechnicalStandard = "SS400/CT38/CT42", Specification = "I10" },
                    new Material { Code = "MAT-075", Name = "Thép I12 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15850, TechnicalStandard = "SS400/CT38/CT42", Specification = "I12" },
                    new Material { Code = "MAT-076", Name = "Thép C8-10 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 16950, TechnicalStandard = "SS400/CT38/CT42", Specification = "C8-10" },
                    new Material { Code = "MAT-077", Name = "Thép thanh vằn D10 CB300V - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13519, TechnicalStandard = "TCVN 1651-2:2018; ASTM A615/A615M-20", Specification = "D10, CB300V/GR40" },
                    new Material { Code = "MAT-078", Name = "Thép thanh vằn D14-D20 CB300V/GR40 - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13674, TechnicalStandard = "TCVN 1651-2:2018; ASTM A615/A615M-20", Specification = "D14-D20, CB300V/GR40" },
                    new Material { Code = "MAT-079", Name = "Thép góc L63-65; L70-80 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15600, TechnicalStandard = "SS400/CT38/CT42", Specification = "L63-65; L70-80" },
                    new Material { Code = "MAT-080", Name = "Thép góc L90-100 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15325, TechnicalStandard = "SS400/CT38/CT42", Specification = "L90-100" },
                    new Material { Code = "MAT-081", Name = "Thép góc L120-130 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15150, TechnicalStandard = "SS400/CT38/CT42", Specification = "L120-130" },
                    new Material { Code = "MAT-082", Name = "Thép góc L150 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 16600, TechnicalStandard = "SS400", Specification = "L150" },
                    new Material { Code = "MAT-083", Name = "Thép C12 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15300, TechnicalStandard = "SS400/CT38/CT42", Specification = "C12" },
                    new Material { Code = "MAT-084", Name = "Thép C14-16 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15350, TechnicalStandard = "SS400/CT38/CT42", Specification = "C14-16" },
                    new Material { Code = "MAT-085", Name = "Thép I15 SS400 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15800, TechnicalStandard = "SS400/CT38/CT42", Specification = "I15" },
                    new Material { Code = "MAT-086", Name = "Thép tròn CT3 CB240T D6-D8 cuộn - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14150, TechnicalStandard = "CT3/CB240T", Specification = "D6-D8 cuộn" },
                    new Material { Code = "MAT-087", Name = "Thép vằn SD295A CB300V D8 cuộn - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14150, TechnicalStandard = "SD295A/CB300V", Specification = "D8 cuộn" },
                    new Material { Code = "MAT-088", Name = "Thép thanh vằn SD295A CB300V D9 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14750, TechnicalStandard = "SD295A/CB300V", Specification = "D9" },
                    new Material { Code = "MAT-089", Name = "Thép vằn CT5 SD295A CB300V D10 cuộn - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14200, TechnicalStandard = "CT5/SD295A/CB300V", Specification = "D10 cuộn" },
                    new Material { Code = "MAT-090", Name = "Thép thanh vằn CT5 CB300V D10 thanh - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14800, TechnicalStandard = "CT5/CB300V", Specification = "D10 thanh" },
                    new Material { Code = "MAT-091", Name = "Thép thanh CT5 SD295A CB300V D12 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14500, TechnicalStandard = "CT5/SD295A/CB300V", Specification = "D12" },
                    new Material { Code = "MAT-092", Name = "Thép thanh vằn CT5 SD295A Gr40 CB300V D14-D40 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14450, TechnicalStandard = "CT5/SD295A/Gr40/CB300V", Specification = "D14-D40" },
                    new Material { Code = "MAT-093", Name = "Thép thanh vằn CB400V CB500V D10 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 15100, TechnicalStandard = "CB400V/CB500V", Specification = "D10" },
                    new Material { Code = "MAT-094", Name = "Thép thanh vằn CB400V CB500V D12 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14800, TechnicalStandard = "CB400V/CB500V", Specification = "D12" },
                    new Material { Code = "MAT-095", Name = "Thép thanh vằn CB400V CB500V D14-D40 - Thái Nguyên", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14750, TechnicalStandard = "CB400V/CB500V", Specification = "D14-D40" },
                   
                    // nghi sơn 
                    new Material { Code = "MAT-096", Name = "Thép trơn D6-D8 CB240T - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13590, TechnicalStandard = "TCVN 1651-1:2018", Specification = "D6-D8, CB240T" },
                    new Material { Code = "MAT-097", Name = "Thép vằn D8 CB300V - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13416, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D8, CB300V" },
                    new Material { Code = "MAT-098", Name = "Thép vằn D10 CB300V/GR40 - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13519, TechnicalStandard = "TCVN 1651-2:2018; ASTM A615/A615M-20", Specification = "D10, CB300V/GR40" },
                    new Material { Code = "MAT-099", Name = "Thép vằn D12 CB300V - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13416, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D12, CB300V" },
                    new Material { Code = "MAT-100", Name = "Thép vằn D14-D20 CB300V/GR40 - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13674, TechnicalStandard = "TCVN 1651-2:2018; ASTM A615/A615M-20", Specification = "D14-D20, CB300V/GR40" },
                    new Material { Code = "MAT-101", Name = "Thép vằn D10 CB400V/CB500V - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13571, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D10, CB400V/CB500V" },
                    new Material { Code = "MAT-102", Name = "Thép vằn D12 CB400V/CB500V - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13519, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D12, CB400V/CB500V" },
                    new Material { Code = "MAT-103", Name = "Thép vằn D14-D32 CB400V/CB500V - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 14020, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D14-D32, CB400V/CB500V" },
                    new Material { Code = "MAT-104", Name = "Thép vằn D36 CB400V/CB500V - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13777, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D36, CB400V/CB500V" },
                    new Material { Code = "MAT-105", Name = "Thép vằn D40 CB400V/CB500V - VAS Nghi Sơn", Unit = "kg", IsDecimalUnit = true, UnitPrice = 13674, TechnicalStandard = "TCVN 1651-2:2018", Specification = "D40, CB400V/CB500V" }
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

        }
    }
}