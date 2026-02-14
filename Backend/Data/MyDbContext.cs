using Backend.Entities;
using Microsoft.AspNetCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
namespace Backend.Data;

public partial class MyDbContext : DbContext
{
    public MyDbContext()
    {
    }
    public MyDbContext(DbContextOptions<MyDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Batch> Batches { get; set; }

    public virtual DbSet<MaterialCategory> MaterialCategories { get; set; }

    public virtual DbSet<BinLocation> BinLocations { get; set; }

    public virtual DbSet<InventoryCurrent> InventoryCurrents { get; set; }

    public virtual DbSet<IssueDetail> IssueDetails { get; set; }

    public virtual DbSet<IssueSlip> IssueSlips { get; set; }

    public virtual DbSet<LossDetail> LossDetails { get; set; }

    public virtual DbSet<LossReport> LossReports { get; set; }

    public virtual DbSet<Material> Materials { get; set; }

    public virtual DbSet<MaterialLossNorm> MaterialLossNorms { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Project> Projects { get; set; }

    public virtual DbSet<Receipt> Receipts { get; set; }

    public virtual DbSet<ReceiptDetail> ReceiptDetails { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<StockTake> StockTakes { get; set; }

    public virtual DbSet<StockTakeDetail> StockTakeDetails { get; set; }

    public virtual DbSet<Supplier> Suppliers { get; set; }

    public virtual DbSet<SupplierQuotation> SupplierQuotations { get; set; }

    public virtual DbSet<TransferDetail> TransferDetails { get; set; }

    public virtual DbSet<TransferOrder> TransferOrders { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Warehouse> Warehouses { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Batch>(entity =>
        {
            entity.HasKey(e => e.BatchId).HasName("PK__Batches__5D55CE38E53D7EE6");

            entity.Property(e => e.BatchId)
                .ValueGeneratedOnAdd()
                .UseIdentityColumn(1, 1);

            entity.Property(e => e.CreatedDate).HasDefaultValueSql("(getdate())");

            entity.HasOne(d => d.Material).WithMany(p => p.Batches)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Batches_Materials");
        });

        modelBuilder.Entity<BinLocation>(entity =>
        {
            entity.HasKey(e => e.BinId).HasName("PK__BinLocat__4BFF5A4EB0552000");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.BinLocations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BinLocations_Warehouses");
        });

        modelBuilder.Entity<InventoryCurrent>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Inventor__3214EC27F4BDF359");

            entity.Property(e => e.LastUpdated).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.QuantityAllocated).HasDefaultValue(0m);
            entity.Property(e => e.QuantityOnHand).HasDefaultValue(0m);

            entity.HasOne(d => d.Batch).WithMany(p => p.InventoryCurrents)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventory_Batches");

            entity.HasOne(d => d.Bin).WithMany(p => p.InventoryCurrents)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventory_Bins");

            entity.HasOne(d => d.Material).WithMany(p => p.InventoryCurrents)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventory_Materials");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.InventoryCurrents)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Inventory_Warehouses");
        });

        modelBuilder.Entity<IssueDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__IssueDet__135C314D255F7FF3");

            entity.HasOne(d => d.Batch).WithMany(p => p.IssueDetails).HasConstraintName("FK_IssueDetails_Batches");

            entity.HasOne(d => d.Issue).WithMany(p => p.IssueDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IssueDetails_Issues");

            entity.HasOne(d => d.Material).WithMany(p => p.IssueDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IssueDetails_Materials");
        });

        modelBuilder.Entity<IssueSlip>(entity =>
        {
            entity.HasKey(e => e.IssueId).HasName("PK__IssueSli__6C86162463E05F16");

            entity.Property(e => e.IssueDate).HasDefaultValueSql("(getdate())");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.IssueSlips)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IssueSlips_Users");

            entity.HasOne(d => d.Project).WithMany(p => p.IssueSlips)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IssueSlips_Projects");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.IssueSlips)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IssueSlips_Warehouses");
        });

        modelBuilder.Entity<LossDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__LossDeta__135C314D29B31BE8");

            entity.HasOne(d => d.Batch).WithMany(p => p.LossDetails).HasConstraintName("FK_LossDetails_Batches");

            entity.HasOne(d => d.Bin).WithMany(p => p.LossDetails).HasConstraintName("FK_LossDetails_Bins");

            entity.HasOne(d => d.Loss).WithMany(p => p.LossDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossDetails_LossReports");

            entity.HasOne(d => d.Material).WithMany(p => p.LossDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossDetails_Materials");
        });

        modelBuilder.Entity<LossReport>(entity =>
        {
            entity.HasKey(e => e.LossId).HasName("PK__LossRepo__7025E3943DEC77AE");

            entity.Property(e => e.ReportDate).HasDefaultValueSql("(getdate())");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.LossReportApprovedByNavigations).HasConstraintName("FK_LossReports_Approvers");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.LossReportCreatedByNavigations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossReports_Creators");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.LossReports)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossReports_Warehouses");
        });

        modelBuilder.Entity<Material>(entity =>
        {
            entity.HasKey(e => e.MaterialId).HasName("PK__Material__C50613177E51101E");

            entity.HasIndex(e => e.Code, "UQ__Material__A25C5AA789A34F1C").IsUnique();

            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.MassPerUnit).HasColumnType("decimal(10, 2)");
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.Unit).HasMaxLength(20);
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");

            entity.Property(e => e.CategoryId).HasColumnName("CategoryID");

            entity.HasOne(d => d.Category)
                .WithMany(p => p.Materials)
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
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(255);
        });

        modelBuilder.Entity<MaterialLossNorm>(entity =>
        {
            entity.HasKey(e => e.NormId).HasName("PK__Material__02BC227BE15553C0");
            entity.Property(e => e.NormId).HasColumnName("NormID");
            entity.Property(e => e.EffectiveDate).HasColumnType("datetime");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.LossPercentage).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.ProjectId).HasColumnName("ProjectID");



            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.MaterialLossNorms).HasConstraintName("FK_LossNorms_Users");

            entity.HasOne(d => d.Material).WithMany(p => p.MaterialLossNorms)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LossNorms_Materials");

            entity.HasOne(d => d.Project).WithMany(p => p.MaterialLossNorms).HasConstraintName("FK_LossNorms_Projects");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotiId).HasName("PK__Notifica__EDC08EF21EEBC2DD");
            entity.Property(e => e.NotiId).HasColumnName("NotiID");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.IsRead).HasDefaultValue(false);
            entity.Property(e => e.Message).HasMaxLength(500);
            entity.Property(e => e.UserId).HasColumnName("UserID");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Notifications_Users");
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.ProjectId).HasName("PK__Projects__761ABED002E87244");
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
            entity.HasIndex(e => e.ReceiptCode, "UQ__Receipts__1AB76D008CF3FB06").IsUnique();

            entity.Property(e => e.ReceiptId).HasColumnName("ReceiptID");
            entity.Property(e => e.ReceiptCode)
                .HasMaxLength(50)
                .IsUnicode(false);


            entity.Property(e => e.ReceiptDate).HasDefaultValueSql("(getdate())");

            entity.Property(e => e.SubmittedBy)
               .HasColumnName("SubmittedBy");

            entity.Property(e => e.SubmittedAt)
                .HasDefaultValueSql("(getdate())")
                .HasColumnName("SubmittedAt")
                .HasColumnType("datetime");

            entity.Property(e => e.ApprovedBy).HasColumnName("ApprovedBy");
            entity.Property(e => e.ApprovedAt)
                .HasColumnName("ApprovedAt")
                .HasColumnType("datetime");

            entity.Property(e => e.Notes).HasColumnName("Notes").HasMaxLength(500);

            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");


            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Receipts)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Receipts_Users");
            entity.HasOne(d => d.Warehouse).WithMany(p => p.Receipts)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Receipts_Warehouses");

            // Self-referencing relationship for backorders
            entity.HasOne(d => d.ParentRequest)
                .WithMany(p => p.ChildRequests)
                .HasForeignKey(d => d.ParentRequestId)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName("FK_Receipts_ParentRequest");
        });

        modelBuilder.Entity<ReceiptDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__ReceiptD__135C314D324534DF");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.SupplierId).HasColumnName("SupplierID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.LineTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.ReceiptId).HasColumnName("ReceiptID");
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ActualQuantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.BinLocationId).HasColumnName("BinLocationID");



            entity.HasOne(d => d.Batch).WithMany(p => p.ReceiptDetails).HasConstraintName("FK_ReceiptDetails_Batches");

            entity.HasOne(d => d.BinLocation).WithMany(p => p.ReceiptDetails)
                .HasForeignKey(d => d.BinLocationId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_ReceiptDetails_BinLocations");

            entity.HasOne(d => d.Material).WithMany(p => p.ReceiptDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ReceiptDetails_Materials");

            entity.HasOne(d => d.Receipt).WithMany(p => p.ReceiptDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ReceiptDetails_Receipts");
            entity.HasOne(d => d.Supplier).WithMany(p => p.ReceiptDetails)
             .HasForeignKey(d => d.SupplierId)
            .HasConstraintName("FK__ReceiptDetail__Supplier");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PK__Roles__8AFACE3A1FD94F1F");
        });

        modelBuilder.Entity<StockTake>(entity =>
        {
            entity.HasKey(e => e.StockTakeId).HasName("PK__StockTak__6D3F3A76B7995198");
            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");

            entity.Property(e => e.CheckDate).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.Status)
             .HasMaxLength(20)
             .IsUnicode(false);
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");


            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.StockTakes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StockTakes_Users");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.StockTakes)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StockTakes_Warehouses");
        });

        modelBuilder.Entity<StockTakeDetail>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__StockTak__3214EC2798C2AD55");
            entity.Property(e => e.Id).HasColumnName("ID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.CountQty).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Reason).HasMaxLength(255);
            entity.Property(e => e.StockTakeId).HasColumnName("StockTakeID");
            entity.Property(e => e.SystemQty).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.Variance).HasColumnType("decimal(18, 4)");


            entity.HasOne(d => d.Batch).WithMany(p => p.StockTakeDetails).HasConstraintName("FK_StockTakeDetails_Batches");

            entity.HasOne(d => d.Material).WithMany(p => p.StockTakeDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StockTakeDetails_Materials");

            entity.HasOne(d => d.StockTake).WithMany(p => p.StockTakeDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StockTakeDetails_StockTakes");
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.SupplierId).HasName("PK__Supplier__4BE666940BC01D20");

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

            entity.Property(e => e.Currency).HasDefaultValue("VND");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SupplierId).HasColumnName("SupplierID");
            entity.Property(e => e.ValidFrom).HasColumnType("datetime");
            entity.Property(e => e.ValidTo).HasColumnType("datetime");



            entity.HasOne(d => d.Material).WithMany(p => p.SupplierQuotations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Quotations_Materials");

            entity.HasOne(d => d.Supplier).WithMany(p => p.SupplierQuotations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Quotations_Suppliers");
        });

        modelBuilder.Entity<TransferDetail>(entity =>
        {
            entity.HasKey(e => e.DetailId).HasName("PK__Transfer__135C314D734A24C1");

            entity.Property(e => e.DetailId).HasColumnName("DetailID");
            entity.Property(e => e.BatchId).HasColumnName("BatchID");
            entity.Property(e => e.FromBinId).HasColumnName("FromBinID");
            entity.Property(e => e.MaterialId).HasColumnName("MaterialID");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 4)");
            entity.Property(e => e.ToBinId).HasColumnName("ToBinID");
            entity.Property(e => e.TransferId).HasColumnName("TransferID");



            entity.HasOne(d => d.Batch).WithMany(p => p.TransferDetails).HasConstraintName("FK_TransferDetails_Batches");

            entity.HasOne(d => d.FromBin).WithMany(p => p.TransferDetailFromBins).HasConstraintName("FK_TransferDetails_FromBin");

            entity.HasOne(d => d.Material).WithMany(p => p.TransferDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TransferDetails_Materials");

            entity.HasOne(d => d.ToBin).WithMany(p => p.TransferDetailToBins).HasConstraintName("FK_TransferDetails_ToBin");

            entity.HasOne(d => d.Transfer).WithMany(p => p.TransferDetails)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TransferDetails_Transfers");
        });

        modelBuilder.Entity<TransferOrder>(entity =>
        {
            entity.HasKey(e => e.TransferId).HasName("PK__Transfer__9549017150467018");

            entity.Property(e => e.TransferId).HasColumnName("TransferID");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.TransferCode)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.Property(e => e.TransferDate).HasDefaultValueSql("(getdate())");
            entity.Property(e => e.Type)
               .HasMaxLength(20)
               .IsUnicode(false);
            entity.Property(e => e.WarehouseId).HasColumnName("WarehouseID");

            entity.HasOne(d => d.AssignedToNavigation).WithMany(p => p.TransferOrderAssignedToNavigations).HasConstraintName("FK_Transfers_Assignees");

            entity.HasOne(d => d.AssignedToNavigation).WithMany(p => p.TransferOrderAssignedToNavigations)
                .HasForeignKey(d => d.AssignedTo)
                .HasConstraintName("FK__TransferO__Assig__02FC7413");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.TransferOrderCreatedByNavigations)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Transfers_Creators");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.TransferOrders)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Transfers_Warehouses");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__Users__1788CCACC0310C28");

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
