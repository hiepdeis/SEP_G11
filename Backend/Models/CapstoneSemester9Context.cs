using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Backend.Models;

public partial class CapstoneSemester9Context : DbContext
{
    public CapstoneSemester9Context()
    {
    }

    public CapstoneSemester9Context(DbContextOptions<CapstoneSemester9Context> options)
        : base(options)
    {
    }

    public virtual DbSet<Batch> Batches { get; set; }

    public virtual DbSet<BinLocation> BinLocations { get; set; }

    public virtual DbSet<InventoryCurrent> InventoryCurrents { get; set; }

    public virtual DbSet<IssueDetail> IssueDetails { get; set; }

    public virtual DbSet<IssueSlip> IssueSlips { get; set; }

    public virtual DbSet<Material> Materials { get; set; }

    public virtual DbSet<MaterialLossNorm> MaterialLossNorms { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Project> Projects { get; set; }

    public virtual DbSet<Receipt> Receipts { get; set; }

    public virtual DbSet<ReceiptDetail> ReceiptDetails { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<StockTake> StockTakes { get; set; }

    public virtual DbSet<StockTakeDetail> StockTakeDetails { get; set; }
    public virtual DbSet<StockTakeTeamMember> StockTakeTeamMember { get; set; }

    public virtual DbSet<Supplier> Suppliers { get; set; }

    public virtual DbSet<SupplierQuotation> SupplierQuotations { get; set; }

    public virtual DbSet<TransferDetail> TransferDetails { get; set; }

    public virtual DbSet<TransferOrder> TransferOrders { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Warehouse> Warehouses { get; set; }

    private string GetConnectionString()
    {
        IConfiguration config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json")
            .Build();

        var strConn = config["ConnectionStrings:MyCnn"];
        return strConn;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseSqlServer(GetConnectionString());

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Batch>(entity =>
        {
            entity.HasKey(e => e.BatchId).HasName("PK__Batches__5D55CE383334EAF3");

            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.BatchCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.CertificateImage).IsUnicode(false);
            entity.Property(e => e.CreatedDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.MfgDate).HasColumnType("datetime");

            entity.HasOne(d => d.Material).WithMany(p => p.Batches)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__Batches__Materia__66603565");
        });

        modelBuilder.Entity<BinLocation>(entity =>
        {
            entity.HasKey(e => e.BinId).HasName("PK__BinLocat__4BFF5A4E2110A8A5");

            entity.Property(e => e.BinId).HasColumnName("BinID");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Type)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.BinLocations)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("FK__BinLocati__Wareh__5AEE82B9");
        });

        modelBuilder.Entity<InventoryCurrent>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Inventor__3214EC27714645CC");

            entity.ToTable("InventoryCurrent");

            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.BinId).HasColumnName("BinID");
            entity.Property(e => e.LastUpdated)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.QuantityAllocated).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.QuantityOnHand).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.Batch).WithMany(p => p.InventoryCurrents)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK__Inventory__Batch__0F624AF8");

            entity.HasOne(d => d.Bin).WithMany(p => p.InventoryCurrents)
                .HasForeignKey(d => d.BinId)
                .HasConstraintName("FK__Inventory__BinID__0D7A0286");

            entity.HasOne(d => d.Material).WithMany(p => p.InventoryCurrents)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__Inventory__Mater__0E6E26BF");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.InventoryCurrents)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("FK__Inventory__Wareh__0C85DE4D");
        });

        modelBuilder.Entity<IssueDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__IssueDet__135C314DBED84E56");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.IssueId).HasColumnName("IssueID");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Batch).WithMany(p => p.IssueDetails)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK__IssueDeta__Batch__7E37BEF6");

            entity.HasOne(d => d.Issue).WithMany(p => p.IssueDetails)
                .HasForeignKey(d => d.IssueId)
                .HasConstraintName("FK__IssueDeta__Issue__7C4F7684");

            entity.HasOne(d => d.Material).WithMany(p => p.IssueDetails)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__IssueDeta__Mater__7D439ABD");
        });

        modelBuilder.Entity<IssueSlip>(entity =>
        {
            entity.HasKey(e => e.IssueId).HasName("PK__IssueSli__6C86162457421495");

            entity.HasIndex(e => e.IssueCode, "UQ__IssueSli__1CF9DA760F8E2A83").IsUnique();

            entity.Property(e => e.IssueId).HasColumnName("IssueID");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.IssueCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.IssueDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.ProjectId).HasColumnName("ProjectID");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.IssueSlips)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__IssueSlip__Creat__787EE5A0");

            entity.HasOne(d => d.Project).WithMany(p => p.IssueSlips)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("FK__IssueSlip__Proje__76969D2E");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.IssueSlips)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("FK__IssueSlip__Wareh__778AC167");
        });

        modelBuilder.Entity<Material>(entity =>
        {
            entity.HasKey(e => e.MaterialId).HasName("PK__Material__C506131778C0255C");

            entity.HasIndex(e => e.Code, "UQ__Material__A25C5AA789A34F1C").IsUnique();

            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.MassPerUnit).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.Unit).HasMaxLength(20);
        });

        modelBuilder.Entity<MaterialLossNorm>(entity =>
        {
            entity.HasKey(e => e.NormId).HasName("PK__Material__02BC227B4ECCF2C6");

            entity.Property(e => e.NormId).HasColumnName("NormID");
            entity.Property(e => e.EffectiveDate).HasColumnType("datetime");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.LossPercentage).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.ProjectId).HasColumnName("ProjectID");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.MaterialLossNorms)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__MaterialL__Creat__1DB06A4F");

            entity.HasOne(d => d.Material).WithMany(p => p.MaterialLossNorms)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__MaterialL__Mater__1BC821DD");

            entity.HasOne(d => d.Project).WithMany(p => p.MaterialLossNorms)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("FK__MaterialL__Proje__1CBC4616");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotiId).HasName("PK__Notifica__EDC08EF2693EC77E");

            entity.Property(e => e.NotiId).HasColumnName("NotiID");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.IsRead).HasDefaultValue(false);
            entity.Property(e => e.Message).HasMaxLength(500);
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK__Notificat__UserI__4E88ABD4");
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.ProjectId).HasName("PK__Projects__761ABED05EEA7763");

            entity.HasIndex(e => e.Code, "UQ__Projects__A25C5AA7CBF51432").IsUnique();

            entity.Property(e => e.ProjectId).HasColumnName("ProjectID");
            entity.Property(e => e.Budget).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.EndDate).HasColumnType("datetime");
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.StartDate).HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
        });

        modelBuilder.Entity<Receipt>(entity =>
        {
            entity.HasKey(e => e.ReceiptId).HasName("PK__Receipts__CC08C400132165E6");

            entity.HasIndex(e => e.ReceiptCode, "UQ__Receipts__1AB76D008CF3FB06").IsUnique();

            entity.Property(e => e.ReceiptId).HasColumnName("ReceiptID");
            entity.Property(e => e.ReceiptCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ReceiptDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");

            entity.Property(e => e.SubmittedBy)
                .HasColumnName("SubmittedBy");

            entity.Property(e => e.SubmittedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnName("SubmittedAt")
                .HasColumnType("datetime");
              
            entity.Property(e => e.Notes).HasColumnName("Notes").HasMaxLength(500);

            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.SupplierId).HasColumnName("SupplierID");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Receipts)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__Receipts__Create__6D0D32F4");

            entity.HasOne(d => d.Supplier).WithMany(p => p.Receipts)
                .HasForeignKey(d => d.SupplierId)
                .HasConstraintName("FK__Receipts__Suppli__6B24EA82");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.Receipts)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("FK__Receipts__Wareho__6C190EBB");
        });

        modelBuilder.Entity<ReceiptDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__ReceiptD__135C314D0A64E3AD");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.LineTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.ReceiptId).HasColumnName("ReceiptID");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Batch).WithMany(p => p.ReceiptDetails)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK__ReceiptDe__Batch__72C60C4A");

            entity.HasOne(d => d.Material).WithMany(p => p.ReceiptDetails)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__ReceiptDe__Mater__71D1E811");

            entity.HasOne(d => d.Receipt).WithMany(p => p.ReceiptDetails)
                .HasForeignKey(d => d.ReceiptId)
                .HasConstraintName("FK__ReceiptDe__Recei__70DDC3D8");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__8AFACE3A5608C17A");

            entity.Property(e => e.RoleId).HasColumnName("RoleID");
            entity.Property(e => e.RoleName).HasMaxLength(50);
            entity.Property(e => e.RoleDescription).HasMaxLength(255);
            entity.HasData(
                new Role { RoleId = 1, RoleName = "Admin", RoleDescription = "Administrator role" },
                new Role { RoleId = 3, RoleName = "User", RoleDescription = "User role" });
        });

        modelBuilder.Entity<StockTake>(entity =>
        {
            entity.HasKey(e => e.StockTakeId).HasName("PK__StockTak__6D3F3A76F3069398");

            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");


            entity.Property(e => e.Title).HasMaxLength(255);
            entity.Property(e => e.Note).HasMaxLength(500);

            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            
            entity.Property(e => e.CreatedAt).HasColumnType("datetime");

            entity.Property(e => e.PlannedStartDate).HasColumnType("datetime");
            entity.Property(e => e.PlannedEndDate).HasColumnType("datetime");

            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.Property(e => e.LockedAt).HasColumnType("datetime");
            entity.Property(e => e.ApprovedAt).HasColumnType("datetime");
            entity.Property(e => e.CompletedAt).HasColumnType("datetime");

            // Index gợi ý
            
            entity.HasIndex(e => new { e.WarehouseId, e.Status });

            // FK: CreatedBy
            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.StockTakes)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__StockTake__Creat__14270015");

            // FK: Warehouse
            entity.HasOne(d => d.Warehouse).WithMany(p => p.StockTakes)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("FK__StockTake__Wareh__1332DBDC");

            // FK: LockedBy / ApprovedBy / CompletedBy (NEW)
            entity.HasOne(d => d.LockedByNavigation).WithMany()
                .HasForeignKey(d => d.LockedBy)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(d => d.ApprovedByNavigation).WithMany()
                .HasForeignKey(d => d.ApprovedBy)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(d => d.CompletedByNavigation).WithMany()
                .HasForeignKey(d => d.CompletedBy)
                .OnDelete(DeleteBehavior.NoAction);
        });


        modelBuilder.Entity<StockTakeDetail>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__StockTak__3214EC27058EA390");

            entity.Property(e => e.Id).HasColumnName("ID");

            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");

            // Bin (NEW) - map to BinLocations.BinID
            entity.Property(e => e.BinId).HasColumnName("BinID");

            entity.Property(e => e.SystemQty).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.CountQty).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.Variance).HasColumnType("decimal(18, 4)");

            // Reason split (NEW)
            entity.Property(e => e.ReasonCode)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.Property(e => e.ReasonNote).HasMaxLength(255);

            // LineStatus (NEW)
            entity.Property(e => e.LineStatus)
                .HasMaxLength(20)
                .IsUnicode(false);

            // CountedBy/At (NEW)
            entity.Property(e => e.CountedAt).HasColumnType("datetime");

            // Resolve fields (NEW)
            entity.Property(e => e.ResolutionAction)
                .HasMaxLength(30)
                .IsUnicode(false);

            entity.Property(e => e.ResolvedAt).HasColumnType("datetime");
            entity.Property(e => e.ManagerNote).HasMaxLength(255);

            // Index gợi ý
            entity.HasIndex(e => new { e.StockTakeId, e.LineStatus });

            entity.HasOne(d => d.StockTake).WithMany(p => p.StockTakeDetails)
                .HasForeignKey(d => d.StockTakeId)
                .HasConstraintName("FK__StockTake__Stock__17036CC0");

            entity.HasOne(d => d.Material).WithMany(p => p.StockTakeDetails)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__StockTake__Mater__17F790F9");

            entity.HasOne(d => d.Batch).WithMany(p => p.StockTakeDetails)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK__StockTake__Batch__18EBB532");

            // FK: Bin (NEW) => BinLocation
            entity.HasOne(d => d.Bin).WithMany()
                .HasForeignKey(d => d.BinId)
                .OnDelete(DeleteBehavior.NoAction);

            // FK: CountedBy / ResolvedBy (NEW)
            entity.HasOne(d => d.CountedByNavigation).WithMany()
                .HasForeignKey(d => d.CountedBy)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(d => d.ResolvedByNavigation).WithMany()
                .HasForeignKey(d => d.ResolvedBy)
                .OnDelete(DeleteBehavior.NoAction);
        });
        modelBuilder.Entity<StockTakeTeamMember>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.ToTable("StockTakeTeamMembers");

            entity.Property(e => e.Id).HasColumnName("ID");

            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.Property(e => e.RoleInAudit)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.Property(e => e.AssignedBy).HasColumnName("AssignedBy");

            entity.Property(e => e.AssignedAt)
                .HasColumnType("datetime")
                .HasDefaultValueSql("(getdate())");

            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);

            entity.Property(e => e.Note).HasMaxLength(255);

            // 1 audit -> nhiều member
            entity.HasOne(d => d.StockTake).WithMany(p => p.StockTakeAssignments)
                .HasForeignKey(d => d.StockTakeId)
                .OnDelete(DeleteBehavior.Cascade);

            // member staff
            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // manager assigned
            entity.HasOne(d => d.AssignedByNavigation).WithMany()
                .HasForeignKey(d => d.AssignedBy)
                .OnDelete(DeleteBehavior.NoAction);

            // tránh assign trùng 1 user vào 1 audit
            entity.HasIndex(e => new { e.StockTakeId, e.UserId }).IsUnique();
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.SupplierId).HasName("PK__Supplier__4BE66694302112C1");

            entity.HasIndex(e => e.Code, "UQ__Supplier__A25C5AA7DC395881").IsUnique();

            entity.Property(e => e.SupplierId).HasColumnName("SupplierID");
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.TaxCode)
                .HasMaxLength(50)
                .IsUnicode(false);
        });

        modelBuilder.Entity<SupplierQuotation>(entity =>
        {
            entity.HasKey(e => e.QuoteId).HasName("PK__Supplier__AF9688E19D45CD49");

            entity.Property(e => e.QuoteId).HasColumnName("QuoteID");
            entity.Property(e => e.Currency)
                .HasMaxLength(10)
                .IsUnicode(false)
                .HasDefaultValue("VND");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SupplierId).HasColumnName("SupplierID");
            entity.Property(e => e.ValidFrom).HasColumnType("datetime");
            entity.Property(e => e.ValidTo).HasColumnType("datetime");

            entity.HasOne(d => d.Material).WithMany(p => p.SupplierQuotations)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__SupplierQ__Mater__619B8048");

            entity.HasOne(d => d.Supplier).WithMany(p => p.SupplierQuotations)
                .HasForeignKey(d => d.SupplierId)
                .HasConstraintName("FK__SupplierQ__Suppl__60A75C0F");
        });

        modelBuilder.Entity<TransferDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__Transfer__135C314DD4B4AA0F");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.FromBinId).HasColumnName("FromBinID");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.ToBinId).HasColumnName("ToBinID");
            entity.Property(e => e.TransferId).HasColumnName("TransferID");

            entity.HasOne(d => d.Batch).WithMany(p => p.TransferDetails)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK__TransferD__Batch__07C12930");

            entity.HasOne(d => d.FromBin).WithMany(p => p.TransferDetailFromBins)
                .HasForeignKey(d => d.FromBinId)
                .HasConstraintName("FK__TransferD__FromB__08B54D69");

            entity.HasOne(d => d.Material).WithMany(p => p.TransferDetails)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__TransferD__Mater__06CD04F7");

            entity.HasOne(d => d.ToBin).WithMany(p => p.TransferDetailToBins)
                .HasForeignKey(d => d.ToBinId)
                .HasConstraintName("FK__TransferD__ToBin__09A971A2");

            entity.HasOne(d => d.Transfer).WithMany(p => p.TransferDetails)
                .HasForeignKey(d => d.TransferId)
                .HasConstraintName("FK__TransferD__Trans__05D8E0BE");
        });

        modelBuilder.Entity<TransferOrder>(entity =>
        {
            entity.HasKey(e => e.TransferId).HasName("PK__Transfer__95490171456C5DE7");

            entity.Property(e => e.TransferId).HasColumnName("TransferID");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.TransferCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TransferDate).HasColumnType("datetime");
            entity.Property(e => e.Type)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.AssignedToNavigation).WithMany(p => p.TransferOrderAssignedToNavigations)
                .HasForeignKey(d => d.AssignedTo)
                .HasConstraintName("FK__TransferO__Assig__02FC7413");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TransferOrderCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__TransferO__Creat__02084FDA");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TransferOrders)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("FK__TransferO__Wareh__01142BA1");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CCACBBF7B2E7");

            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.RefreshToken).IsUnique();

            entity.Property(e => e.UserId).HasColumnName("UserID");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FullName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.RoleId).HasColumnName("RoleID");
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.RefreshToken)
                 .HasMaxLength(255)
                 .IsUnicode(false);
            entity.Property(e => e.RefreshTokenExpiry)
                .HasColumnType("datetime");
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Status).HasDefaultValue(true);

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK__Users__RoleID__4BAC3F29");
        });

        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.HasKey(e => e.WarehouseId).HasName("PK__Warehous__2608AFD94F13912C");

            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");
            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
