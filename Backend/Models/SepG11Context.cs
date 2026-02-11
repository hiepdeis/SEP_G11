using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Backend.Models;

public partial class SepG11Context : DbContext
{
    public SepG11Context()
    {
    }

    public SepG11Context(DbContextOptions<SepG11Context> options)
        : base(options)
    {
    }

    public virtual DbSet<AdjustmentReason> AdjustmentReasons { get; set; }

    public virtual DbSet<Batch> Batches { get; set; }

    public virtual DbSet<BinLocation> BinLocations { get; set; }

    public virtual DbSet<InventoryAdjustmentEntry> InventoryAdjustmentEntries { get; set; }

    public virtual DbSet<InventoryCurrent> InventoryCurrents { get; set; }

    public virtual DbSet<IssueDetail> IssueDetails { get; set; }

    public virtual DbSet<IssueSlip> IssueSlips { get; set; }

    public virtual DbSet<LossDetail> LossDetails { get; set; }

    public virtual DbSet<LossReport> LossReports { get; set; }

    public virtual DbSet<Material> Materials { get; set; }

    public virtual DbSet<MaterialCategory> MaterialCategories { get; set; }

    public virtual DbSet<MaterialLossNorm> MaterialLossNorms { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Project> Projects { get; set; }

    public virtual DbSet<Receipt> Receipts { get; set; }

    public virtual DbSet<ReceiptDetail> ReceiptDetails { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<StockTake> StockTakes { get; set; }

    public virtual DbSet<StockTakeDetail> StockTakeDetails { get; set; }

    public virtual DbSet<StockTakeSignature> StockTakeSignatures { get; set; }

    public virtual DbSet<StockTakeTeamMember> StockTakeTeamMembers { get; set; }

    public virtual DbSet<Supplier> Suppliers { get; set; }

    public virtual DbSet<SupplierQuotation> SupplierQuotations { get; set; }

    public virtual DbSet<TransferDetail> TransferDetails { get; set; }

    public virtual DbSet<TransferOrder> TransferOrders { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Warehouse> Warehouses { get; set; }

 protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    if (!optionsBuilder.IsConfigured)
        optionsBuilder.UseSqlServer("Server=localhost;Database=sep_g11;Trusted_Connection=True;TrustServerCertificate=True;");
}

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AdjustmentReason>(entity =>
        {
            entity.HasKey(e => e.ReasonId).HasName("PK__Adjustme__A4F8C0C7325BD484");

            entity.HasIndex(e => e.Code, "UX_AdjustmentReasons_Code").IsUnique();

            entity.Property(e => e.ReasonId).HasColumnName("ReasonID");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.Name).HasMaxLength(200);
        });

        modelBuilder.Entity<Batch>(entity =>
        {
            entity.HasKey(e => e.BatchId).HasName("PK__Batches__5D55CE38E53D7EE6");

            entity.HasIndex(e => e.MaterialId, "IX_Batches_MaterialID");

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
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Batches_Materials");
        });

        modelBuilder.Entity<BinLocation>(entity =>
        {
            entity.HasKey(e => e.BinId).HasName("PK__BinLocat__4BFF5A4EB0552000");

            entity.HasIndex(e => e.WarehouseId, "IX_BinLocations_WarehouseID");

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
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BinLocations_Warehouses");
        });

        modelBuilder.Entity<InventoryAdjustmentEntry>(entity =>
        {
            entity.HasKey(e => e.EntryId).HasName("PK__Inventor__F57BD2D77B4E6B52");

            entity.HasIndex(e => e.StockTakeDetailId, "IX_InvAdjEntries_StockTakeDetailID");

            entity.HasIndex(e => e.StockTakeId, "IX_InvAdjEntries_StockTakeID");

            entity.Property(e => e.EntryId).HasColumnName("EntryID");
            entity.Property(e => e.ApprovedAt).HasPrecision(0);
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.BinId).HasColumnName("BinID");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.PostedAt).HasPrecision(0);
            entity.Property(e => e.QtyDelta).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.ReasonId).HasColumnName("ReasonID");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false)
                .HasDefaultValue("Draft");
            entity.Property(e => e.StockTakeDetailId).HasColumnName("StockTakeDetailID");
            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.InventoryAdjustmentEntryApprovedByNavigations)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("FK_InvAdjEntries_ApprovedBy_Users");

            entity.HasOne(d => d.Batch).WithMany(p => p.InventoryAdjustmentEntries)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK_InvAdjEntries_Batches");

            entity.HasOne(d => d.Bin).WithMany(p => p.InventoryAdjustmentEntries)
                .HasForeignKey(d => d.BinId)
                .HasConstraintName("FK_InvAdjEntries_BinLocations");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.InventoryAdjustmentEntryCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK_InvAdjEntries_CreatedBy_Users");

            entity.HasOne(d => d.Material).WithMany(p => p.InventoryAdjustmentEntries)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK_InvAdjEntries_Materials");

            entity.HasOne(d => d.Reason).WithMany(p => p.InventoryAdjustmentEntries)
                .HasForeignKey(d => d.ReasonId)
                .HasConstraintName("FK_InvAdjEntries_AdjustmentReasons");

            entity.HasOne(d => d.StockTakeDetail).WithMany(p => p.InventoryAdjustmentEntries)
                .HasForeignKey(d => d.StockTakeDetailId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InvAdjEntries_StockTakeDetails");

            entity.HasOne(d => d.StockTake).WithMany(p => p.InventoryAdjustmentEntries)
                .HasForeignKey(d => d.StockTakeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_InvAdjEntries_StockTakes");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.InventoryAdjustmentEntries)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("FK_InvAdjEntries_Warehouses");
        });

        modelBuilder.Entity<InventoryCurrent>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Inventor__3214EC27F4BDF359");

            entity.ToTable("InventoryCurrent");

            entity.HasIndex(e => e.BatchId, "IX_InventoryCurrent_BatchID");

            entity.HasIndex(e => e.BinId, "IX_InventoryCurrent_BinID");

            entity.HasIndex(e => e.MaterialId, "IX_InventoryCurrent_MaterialID");

            entity.HasIndex(e => e.WarehouseId, "IX_InventoryCurrent_WarehouseID");

            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.BinId).HasColumnName("BinID");
            entity.Property(e => e.LastUpdated)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.QuantityAllocated)
                .HasDefaultValue(0.0m)
                .HasColumnType("decimal(18, 4)");
            entity.Property(e => e.QuantityOnHand)
                .HasDefaultValue(0.0m)
                .HasColumnType("decimal(18, 4)");
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.Batch).WithMany(p => p.InventoryCurrents)
                .HasForeignKey(d => d.BatchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventory_Batches");

            entity.HasOne(d => d.Bin).WithMany(p => p.InventoryCurrents)
                .HasForeignKey(d => d.BinId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventory_Bins");

            entity.HasOne(d => d.Material).WithMany(p => p.InventoryCurrents)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventory_Materials");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.InventoryCurrents)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventory_Warehouses");
        });

        modelBuilder.Entity<IssueDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__IssueDet__135C314D255F7FF3");

            entity.HasIndex(e => e.BatchId, "IX_IssueDetails_BatchID");

            entity.HasIndex(e => e.IssueId, "IX_IssueDetails_IssueID");

            entity.HasIndex(e => e.MaterialId, "IX_IssueDetails_MaterialID");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.IssueId).HasColumnName("IssueID");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Batch).WithMany(p => p.IssueDetails)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK_IssueDetails_Batches");

            entity.HasOne(d => d.Issue).WithMany(p => p.IssueDetails)
                .HasForeignKey(d => d.IssueId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IssueDetails_Issues");

            entity.HasOne(d => d.Material).WithMany(p => p.IssueDetails)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IssueDetails_Materials");
        });

        modelBuilder.Entity<IssueSlip>(entity =>
        {
            entity.HasKey(e => e.IssueId).HasName("PK__IssueSli__6C86162463E05F16");

            entity.HasIndex(e => e.CreatedBy, "IX_IssueSlips_CreatedBy");

            entity.HasIndex(e => e.ParentIssueId, "IX_IssueSlips_ParentIssueID");

            entity.HasIndex(e => e.ProjectId, "IX_IssueSlips_ProjectID");

            entity.HasIndex(e => e.WarehouseId, "IX_IssueSlips_WarehouseID");

            entity.HasIndex(e => e.IssueCode, "UQ__IssueSli__1CF9DA76384C2914").IsUnique();

            entity.Property(e => e.IssueId).HasColumnName("IssueID");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.IssueCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.IssueDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.ParentIssueId).HasColumnName("ParentIssueID");
            entity.Property(e => e.ProjectId).HasColumnName("ProjectID");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.IssueSlips)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IssueSlips_Users");

            entity.HasOne(d => d.ParentIssue).WithMany(p => p.InverseParentIssue).HasForeignKey(d => d.ParentIssueId);

            entity.HasOne(d => d.Project).WithMany(p => p.IssueSlips)
                .HasForeignKey(d => d.ProjectId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IssueSlips_Projects");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.IssueSlips)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("FK_IssueSlips_Warehouses");
        });

        modelBuilder.Entity<LossDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__LossDeta__135C314D29B31BE8");

            entity.HasIndex(e => e.BatchId, "IX_LossDetails_BatchID");

            entity.HasIndex(e => e.BinId, "IX_LossDetails_BinID");

            entity.HasIndex(e => e.LossId, "IX_LossDetails_LossID");

            entity.HasIndex(e => e.MaterialId, "IX_LossDetails_MaterialID");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.BinId).HasColumnName("BinID");
            entity.Property(e => e.LossId).HasColumnName("LossID");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.Reason).HasMaxLength(255);

            entity.HasOne(d => d.Batch).WithMany(p => p.LossDetails)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK_LossDetails_Batches");

            entity.HasOne(d => d.Bin).WithMany(p => p.LossDetails)
                .HasForeignKey(d => d.BinId)
                .HasConstraintName("FK_LossDetails_Bins");

            entity.HasOne(d => d.Loss).WithMany(p => p.LossDetails)
                .HasForeignKey(d => d.LossId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossDetails_LossReports");

            entity.HasOne(d => d.Material).WithMany(p => p.LossDetails)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossDetails_Materials");
        });

        modelBuilder.Entity<LossReport>(entity =>
        {
            entity.HasKey(e => e.LossId).HasName("PK__LossRepo__7025E3943DEC77AE");

            entity.HasIndex(e => e.ApprovedBy, "IX_LossReports_ApprovedBy");

            entity.HasIndex(e => e.CreatedBy, "IX_LossReports_CreatedBy");

            entity.HasIndex(e => e.WarehouseId, "IX_LossReports_WarehouseID");

            entity.HasIndex(e => e.LossCode, "UQ__LossRepo__B9216BF629D331BF").IsUnique();

            entity.Property(e => e.LossId).HasColumnName("LossID");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.LossCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ReportDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Type)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.LossReportApprovedByNavigations)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("FK_LossReports_Approvers");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.LossReportCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossReports_Creators");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.LossReports)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossReports_Warehouses");
        });

        modelBuilder.Entity<Material>(entity =>
        {
            entity.HasKey(e => e.MaterialId).HasName("PK__Material__C50613177E51101E");

            entity.HasIndex(e => e.CategoryId, "IX_Materials_CategoryID");

            entity.HasIndex(e => e.Code, "UQ__Material__A25C5AA759901DD0").IsUnique();

            entity.HasIndex(e => e.Code, "UQ__Material__A25C5AA789A34F1C").IsUnique();

            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.CategoryId).HasColumnName("CategoryID");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.MassPerUnit).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.Unit).HasMaxLength(20);
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Category).WithMany(p => p.Materials)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("FK_Materials_Category");
        });

        modelBuilder.Entity<MaterialCategory>(entity =>
        {
            entity.HasKey(e => e.CategoryId).HasName("PK__MaterialCategories");

            entity.HasIndex(e => e.Code, "UQ__MaterialCategories_Code").IsUnique();

            entity.Property(e => e.CategoryId).HasColumnName("CategoryID");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<MaterialLossNorm>(entity =>
        {
            entity.HasKey(e => e.NormId).HasName("PK__Material__02BC227BE15553C0");

            entity.HasIndex(e => e.CreatedBy, "IX_MaterialLossNorms_CreatedBy");

            entity.HasIndex(e => e.MaterialId, "IX_MaterialLossNorms_MaterialID");

            entity.HasIndex(e => e.ProjectId, "IX_MaterialLossNorms_ProjectID");

            entity.Property(e => e.NormId).HasColumnName("NormID");
            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.EffectiveDate).HasColumnType("datetime");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.LossPercentage).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.ProjectId).HasColumnName("ProjectID");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.MaterialLossNorms)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK_LossNorms_Users");

            entity.HasOne(d => d.Material).WithMany(p => p.MaterialLossNorms)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossNorms_Materials");

            entity.HasOne(d => d.Project).WithMany(p => p.MaterialLossNorms)
                .HasForeignKey(d => d.ProjectId)
                .HasConstraintName("FK_LossNorms_Projects");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotiId).HasName("PK__Notifica__EDC08EF21EEBC2DD");

            entity.HasIndex(e => e.UserId, "IX_Notifications_UserID");

            entity.Property(e => e.NotiId).HasColumnName("NotiID");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.IsRead).HasDefaultValue(false);
            entity.Property(e => e.Message).HasMaxLength(500);
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Notifications_Users");
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.ProjectId).HasName("PK__Projects__761ABED002E87244");

            entity.HasIndex(e => e.Code, "UQ__Projects__A25C5AA71AE31F84").IsUnique();

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
            entity.HasKey(e => e.ReceiptId).HasName("PK__Receipts__CC08C400A8F71B86");

            entity.HasIndex(e => e.CreatedBy, "IX_Receipts_CreatedBy");

            entity.HasIndex(e => e.WarehouseId, "IX_Receipts_WarehouseID");

            entity.HasIndex(e => e.ReceiptCode, "UQ__Receipts__1AB76D000841B5BB").IsUnique();

            entity.HasIndex(e => e.ReceiptCode, "UQ__Receipts__1AB76D008CF3FB06").IsUnique();

            entity.Property(e => e.ReceiptId).HasColumnName("ReceiptID");
            entity.Property(e => e.ApprovedAt).HasColumnType("datetime");
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.ReceiptCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.ReceiptDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.SubmittedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.SupplierId).HasColumnName("SupplierID");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Receipts)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Receipts_Users");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.Receipts)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Receipts_Warehouses");
        });

        modelBuilder.Entity<ReceiptDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__ReceiptD__135C314D324534DF");

            entity.HasIndex(e => e.BatchId, "IX_ReceiptDetails_BatchID");

            entity.HasIndex(e => e.MaterialId, "IX_ReceiptDetails_MaterialID");

            entity.HasIndex(e => e.ReceiptId, "IX_ReceiptDetails_ReceiptID");

            entity.HasIndex(e => e.SupplierId, "IX_ReceiptDetails_SupplierID");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.LineTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.ReceiptId).HasColumnName("ReceiptID");
            entity.Property(e => e.SupplierId).HasColumnName("SupplierID");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Batch).WithMany(p => p.ReceiptDetails)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK_ReceiptDetails_Batches");

            entity.HasOne(d => d.Material).WithMany(p => p.ReceiptDetails)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ReceiptDetails_Materials");

            entity.HasOne(d => d.Receipt).WithMany(p => p.ReceiptDetails)
                .HasForeignKey(d => d.ReceiptId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ReceiptDetails_Receipts");

            entity.HasOne(d => d.Supplier).WithMany(p => p.ReceiptDetails)
                .HasForeignKey(d => d.SupplierId)
                .HasConstraintName("FK__ReceiptDetail__Supplier");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__8AFACE3A1FD94F1F");

            entity.Property(e => e.RoleId).HasColumnName("RoleID");
            entity.Property(e => e.RoleName).HasMaxLength(50);
        });

        modelBuilder.Entity<StockTake>(entity =>
        {
            entity.HasKey(e => e.StockTakeId).HasName("PK__StockTak__6D3F3A76F3069398");

            entity.HasIndex(e => e.CreatedBy, "IX_StockTakes_CreatedBy");

            entity.HasIndex(e => e.WarehouseId, "IX_StockTakes_WarehouseID");

            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");
            entity.Property(e => e.CheckDate).HasColumnType("datetime");
            entity.Property(e => e.CompletedAt).HasPrecision(0);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.LockedAt).HasPrecision(0);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.PlannedEndDate).HasPrecision(0);
            entity.Property(e => e.PlannedStartDate).HasPrecision(0);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.CompletedByNavigation).WithMany(p => p.StockTakeCompletedByNavigations)
                .HasForeignKey(d => d.CompletedBy)
                .HasConstraintName("FK_StockTakes_CompletedBy_Users");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.StockTakeCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("FK__StockTake__Creat__14270015");

            entity.HasOne(d => d.LockedByNavigation).WithMany(p => p.StockTakeLockedByNavigations)
                .HasForeignKey(d => d.LockedBy)
                .HasConstraintName("FK_StockTakes_LockedBy_Users");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.StockTakes)
                .HasForeignKey(d => d.WarehouseId)
                .HasConstraintName("FK__StockTake__Wareh__1332DBDC");
        });

        modelBuilder.Entity<StockTakeDetail>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__StockTak__3214EC27058EA390");

            entity.HasIndex(e => e.BatchId, "IX_StockTakeDetails_BatchID");

            entity.HasIndex(e => e.MaterialId, "IX_StockTakeDetails_MaterialID");

            entity.HasIndex(e => e.StockTakeId, "IX_StockTakeDetails_StockTakeID");

            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.AdjustmentReasonId).HasColumnName("AdjustmentReasonID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.BinId).HasColumnName("BinID");
            entity.Property(e => e.CountQty).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.CountedAt).HasPrecision(0);
            entity.Property(e => e.DiscrepancyStatus)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Reason).HasMaxLength(255);
            entity.Property(e => e.ResolutionAction)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.ResolvedAt).HasPrecision(0);
            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");
            entity.Property(e => e.SystemQty).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.Variance).HasColumnType("decimal(18, 4)");

            entity.HasOne(d => d.AdjustmentReason).WithMany(p => p.StockTakeDetails)
                .HasForeignKey(d => d.AdjustmentReasonId)
                .HasConstraintName("FK_StockTakeDetails_AdjustmentReasons");

            entity.HasOne(d => d.Batch).WithMany(p => p.StockTakeDetails)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK__StockTake__Batch__18EBB532");

            entity.HasOne(d => d.Bin).WithMany(p => p.StockTakeDetails)
                .HasForeignKey(d => d.BinId)
                .HasConstraintName("FK_StockTakeDetails_BinLocations");

            entity.HasOne(d => d.CountedByNavigation).WithMany(p => p.StockTakeDetailCountedByNavigations)
                .HasForeignKey(d => d.CountedBy)
                .HasConstraintName("FK_StockTakeDetails_CountedBy_Users");

            entity.HasOne(d => d.Material).WithMany(p => p.StockTakeDetails)
                .HasForeignKey(d => d.MaterialId)
                .HasConstraintName("FK__StockTake__Mater__17F790F9");

            entity.HasOne(d => d.ResolvedByNavigation).WithMany(p => p.StockTakeDetailResolvedByNavigations)
                .HasForeignKey(d => d.ResolvedBy)
                .HasConstraintName("FK_StockTakeDetails_ResolvedBy_Users");

            entity.HasOne(d => d.StockTake).WithMany(p => p.StockTakeDetails)
                .HasForeignKey(d => d.StockTakeId)
                .HasConstraintName("FK__StockTake__Stock__17036CC0");
        });

        modelBuilder.Entity<StockTakeSignature>(entity =>
        {
            entity.HasKey(e => e.SignatureId).HasName("PK__StockTak__3DCA5789A2E77209");

            entity.HasIndex(e => e.StockTakeId, "IX_StockTakeSignatures_StockTakeID");

            entity.HasIndex(e => e.UserId, "IX_StockTakeSignatures_UserID");

            entity.HasIndex(e => new { e.StockTakeId, e.Role }, "UX_StockTakeSignatures_StockTake_Role").IsUnique();

            entity.Property(e => e.SignatureId).HasColumnName("SignatureID");
            entity.Property(e => e.Role)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.SignedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.StockTake).WithMany(p => p.StockTakeSignatures)
                .HasForeignKey(d => d.StockTakeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StockTakeSignatures_StockTakes");

            entity.HasOne(d => d.User).WithMany(p => p.StockTakeSignatures)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StockTakeSignatures_Users");
        });

        modelBuilder.Entity<StockTakeTeamMember>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__StockTak__3214EC27DBDFEB96");

            entity.HasIndex(e => e.StockTakeId, "IX_StockTakeTeamMembers_StockTakeID");

            entity.HasIndex(e => e.UserId, "IX_StockTakeTeamMembers_UserID");

            entity.HasIndex(e => new { e.StockTakeId, e.UserId }, "UX_StockTakeTeamMembers_StockTake_User").IsUnique();

            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.AssignedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.RemovedAt).HasPrecision(0);
            entity.Property(e => e.RoleInTeam)
                .HasMaxLength(30)
                .IsUnicode(false);
            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.StockTake).WithMany(p => p.StockTakeTeamMembers)
                .HasForeignKey(d => d.StockTakeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StockTakeTeamMembers_StockTakes");

            entity.HasOne(d => d.User).WithMany(p => p.StockTakeTeamMembers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StockTakeTeamMembers_Users");
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.SupplierId).HasName("PK__Supplier__4BE666940BC01D20");

            entity.HasIndex(e => e.Code, "UQ__Supplier__A25C5AA753AE5015").IsUnique();

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
            entity.HasKey(e => e.QuoteId).HasName("PK__Supplier__AF9688E1AA857063");

            entity.HasIndex(e => e.MaterialId, "IX_SupplierQuotations_MaterialID");

            entity.HasIndex(e => e.SupplierId, "IX_SupplierQuotations_SupplierID");

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
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Quotations_Materials");

            entity.HasOne(d => d.Supplier).WithMany(p => p.SupplierQuotations)
                .HasForeignKey(d => d.SupplierId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Quotations_Suppliers");
        });

        modelBuilder.Entity<TransferDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__Transfer__135C314D734A24C1");

            entity.HasIndex(e => e.BatchId, "IX_TransferDetails_BatchID");

            entity.HasIndex(e => e.FromBinId, "IX_TransferDetails_FromBinID");

            entity.HasIndex(e => e.MaterialId, "IX_TransferDetails_MaterialID");

            entity.HasIndex(e => e.ToBinId, "IX_TransferDetails_ToBinID");

            entity.HasIndex(e => e.TransferId, "IX_TransferDetails_TransferID");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.FromBinId).HasColumnName("FromBinID");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.ToBinId).HasColumnName("ToBinID");
            entity.Property(e => e.TransferId).HasColumnName("TransferID");

            entity.HasOne(d => d.Batch).WithMany(p => p.TransferDetails)
                .HasForeignKey(d => d.BatchId)
                .HasConstraintName("FK_TransferDetails_Batches");

            entity.HasOne(d => d.FromBin).WithMany(p => p.TransferDetailFromBins)
                .HasForeignKey(d => d.FromBinId)
                .HasConstraintName("FK_TransferDetails_FromBin");

            entity.HasOne(d => d.Material).WithMany(p => p.TransferDetails)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TransferDetails_Materials");

            entity.HasOne(d => d.ToBin).WithMany(p => p.TransferDetailToBins)
                .HasForeignKey(d => d.ToBinId)
                .HasConstraintName("FK_TransferDetails_ToBin");

            entity.HasOne(d => d.Transfer).WithMany(p => p.TransferDetails)
                .HasForeignKey(d => d.TransferId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TransferDetails_Transfers");
        });

        modelBuilder.Entity<TransferOrder>(entity =>
        {
            entity.HasKey(e => e.TransferId).HasName("PK__Transfer__9549017150467018");

            entity.HasIndex(e => e.AssignedTo, "IX_TransferOrders_AssignedTo");

            entity.HasIndex(e => e.CreatedBy, "IX_TransferOrders_CreatedBy");

            entity.HasIndex(e => e.WarehouseId, "IX_TransferOrders_WarehouseID");

            entity.Property(e => e.TransferId).HasColumnName("TransferID");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.TransferCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.TransferDate)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.Type)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.AssignedToNavigation).WithMany(p => p.TransferOrderAssignedToNavigations)
                .HasForeignKey(d => d.AssignedTo)
                .HasConstraintName("FK__TransferO__Assig__02FC7413");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TransferOrderCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Transfers_Creators");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TransferOrders)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Transfers_Warehouses");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CCACC0310C28");

            entity.HasIndex(e => e.Email, "IX_Users_Email")
                .IsUnique()
                .HasFilter("([Email] IS NOT NULL)");

            entity.HasIndex(e => e.RefreshToken, "IX_Users_RefreshToken")
                .IsUnique()
                .HasFilter("([RefreshToken] IS NOT NULL)");

            entity.HasIndex(e => e.RoleId, "IX_Users_RoleID");

            entity.HasIndex(e => e.Username, "UQ__Users__536C85E41DEBB7A3").IsUnique();

            entity.Property(e => e.UserId).HasColumnName("UserID");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.FullName).HasMaxLength(100);
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.RefreshToken)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.RefreshTokenExpiry).HasColumnType("datetime");
            entity.Property(e => e.RoleId).HasColumnName("RoleID");
            entity.Property(e => e.Status).HasDefaultValue(true);
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Users_Roles");
        });

        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.HasKey(e => e.WarehouseId).HasName("PK__Warehous__2608AFD9BF0EE584");

            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");
            entity.Property(e => e.Address).HasMaxLength(255);
            entity.Property(e => e.Name).HasMaxLength(100);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
