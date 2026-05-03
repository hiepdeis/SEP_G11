create database h1;
USE [h1]
GO
/****** Object:  Table [dbo].[AdjustmentReasons]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AdjustmentReasons](
	[ReasonID] [int] IDENTITY(1,1) NOT NULL,
	[Code] [varchar](50) NOT NULL,
	[Name] [nvarchar](200) NOT NULL,
	[Description] [nvarchar](500) NULL,
	[IsActive] [bit] NOT NULL,
 CONSTRAINT [PK__Adjustme__A4F8C0C7325BD484] PRIMARY KEY CLUSTERED 
(
	[ReasonID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[AuditPenalties]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AuditPenalties](
	[PenaltyId] [int] IDENTITY(1,1) NOT NULL,
	[StockTakeId] [int] NOT NULL,
	[IssuedByUserId] [int] NOT NULL,
	[TargetUserId] [int] NOT NULL,
	[Reason] [nvarchar](500) NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[Notes] [nvarchar](1000) NULL,
	[CreatedAt] [datetime] NOT NULL,
 CONSTRAINT [PK_AuditPenalties] PRIMARY KEY CLUSTERED 
(
	[PenaltyId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Batches]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Batches](
	[BatchID] [int] IDENTITY(1,1) NOT NULL,
	[MaterialID] [int] NOT NULL,
	[BatchCode] [varchar](50) NOT NULL,
	[MfgDate] [datetime] NULL,
	[CertificateImage] [varchar](max) NULL,
	[ExpiryDate] [datetime] NULL,
	[CreatedDate] [datetime] NULL,
 CONSTRAINT [PK__Batches__5D55CE38E53D7EE6] PRIMARY KEY CLUSTERED 
(
	[BatchID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[BinLocations]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[BinLocations](
	[BinID] [int] IDENTITY(1,1) NOT NULL,
	[WarehouseID] [int] NOT NULL,
	[Code] [varchar](50) NOT NULL,
	[Type] [varchar](20) NULL,
 CONSTRAINT [PK__BinLocat__4BFF5A4EB0552000] PRIMARY KEY CLUSTERED 
(
	[BinID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DirectPurchaseDetails]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DirectPurchaseDetails](
	[DPODetailID] [bigint] IDENTITY(1,1) NOT NULL,
	[DPOID] [bigint] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[Quantity] [decimal](18, 4) NOT NULL,
	[NegotiatedUnitPrice] [decimal](18, 4) NOT NULL,
	[LineTotal] [decimal](18, 4) NULL,
	[SupplierID] [int] NULL,
 CONSTRAINT [PK_DirectPurchaseDetails] PRIMARY KEY CLUSTERED 
(
	[DPODetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DirectPurchaseOrders]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DirectPurchaseOrders](
	[DPOID] [bigint] IDENTITY(1,1) NOT NULL,
	[DpoCode] [nvarchar](50) NOT NULL,
	[ReferenceCode] [nvarchar](50) NOT NULL,
	[SupplierID] [int] NULL,
	[ProjectID] [int] NOT NULL,
	[CreatedBy] [int] NOT NULL,
	[OrderDate] [datetime2](7) NULL,
	[ExpectedDeliveryDate] [datetime2](7) NULL,
	[ActualDeliveryDate] [datetime2](7) NULL,
	[DeliveryAddress] [nvarchar](500) NULL,
	[Status] [nvarchar](50) NOT NULL,
	[TotalAmount] [decimal](18, 4) NOT NULL,
	[Description] [nvarchar](max) NULL,
 CONSTRAINT [PK_DirectPurchaseOrders] PRIMARY KEY CLUSTERED 
(
	[DPOID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[IncidentEvidenceImages]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[IncidentEvidenceImages](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[IncidentReportDetailID] [bigint] NOT NULL,
	[ImageData] [nvarchar](max) NOT NULL,
	[UploadedAt] [datetime] NOT NULL,
	[UploadedByStaffId] [int] NOT NULL,
 CONSTRAINT [PK_IncidentEvidenceImages] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[IncidentReportDetails]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[IncidentReportDetails](
	[DetailID] [bigint] IDENTITY(1,1) NOT NULL,
	[IncidentID] [bigint] NOT NULL,
	[ReceiptDetailID] [bigint] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[ExpectedQuantity] [decimal](18, 4) NOT NULL,
	[ActualQuantity] [decimal](18, 4) NOT NULL,
	[IssueType] [varchar](20) NOT NULL,
	[Notes] [nvarchar](1000) NULL,
 CONSTRAINT [PK_IncidentReportDetails] PRIMARY KEY CLUSTERED 
(
	[DetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[IncidentReports]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[IncidentReports](
	[IncidentID] [bigint] IDENTITY(1,1) NOT NULL,
	[IncidentCode] [varchar](50) NOT NULL,
	[ReceiptID] [bigint] NOT NULL,
	[PurchaseOrderID] [bigint] NULL,
	[QCCheckID] [bigint] NULL,
	[CreatedBy] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[Description] [nvarchar](2000) NOT NULL,
	[Status] [varchar](100) NOT NULL,
	[Resolution] [nvarchar](2000) NULL,
	[ResolvedAt] [datetime] NULL,
	[ResolvedBy] [int] NULL,
 CONSTRAINT [PK_IncidentReports] PRIMARY KEY CLUSTERED 
(
	[IncidentID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InventoryAdjustmentEntries]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InventoryAdjustmentEntries](
	[EntryID] [bigint] IDENTITY(1,1) NOT NULL,
	[StockTakeID] [int] NOT NULL,
	[StockTakeDetailID] [bigint] NOT NULL,
	[WarehouseID] [int] NULL,
	[BinID] [int] NULL,
	[MaterialID] [int] NULL,
	[BatchID] [int] NULL,
	[QtyDelta] [decimal](18, 4) NOT NULL,
	[ReasonID] [int] NULL,
	[Status] [varchar](20) NOT NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[CreatedBy] [int] NULL,
	[ApprovedAt] [datetime2](0) NULL,
	[ApprovedBy] [int] NULL,
	[PostedAt] [datetime2](0) NULL,
 CONSTRAINT [PK__Inventor__F57BD2D77B4E6B52] PRIMARY KEY CLUSTERED 
(
	[EntryID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InventoryCurrent]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InventoryCurrent](
	[ID] [bigint] IDENTITY(1,1) NOT NULL,
	[WarehouseID] [int] NULL,
	[BinID] [int] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[BatchID] [int] NOT NULL,
	[QuantityOnHand] [decimal](18, 4) NULL,
	[QuantityAllocated] [decimal](18, 4) NULL,
	[LastUpdated] [datetime] NULL,
 CONSTRAINT [PK__Inventor__3214EC27F4BDF359] PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InventoryIssueDetails]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InventoryIssueDetails](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[InventoryIssueId] [bigint] NOT NULL,
	[IssueDetailId] [bigint] NOT NULL,
	[BatchId] [int] NOT NULL,
	[Quantity] [decimal](18, 4) NOT NULL,
 CONSTRAINT [PK_InventoryIssueDetails] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InventoryIssues]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InventoryIssues](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[IssueSlipId] [bigint] NOT NULL,
	[IssueCode] [nvarchar](50) NOT NULL,
	[CreatedDate] [datetime2](7) NOT NULL,
	[Status] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_InventoryIssues] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[IssueDetails]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[IssueDetails](
	[DetailID] [bigint] IDENTITY(1,1) NOT NULL,
	[IssueID] [bigint] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[BatchID] [int] NULL,
	[Quantity] [decimal](18, 4) NOT NULL,
	[UnitPrice] [decimal](18, 2) NULL,
 CONSTRAINT [PK__IssueDet__135C314D255F7FF3] PRIMARY KEY CLUSTERED 
(
	[DetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[IssueSlipApprovals]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[IssueSlipApprovals](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[IssueID] [bigint] NOT NULL,
	[Step] [varchar](50) NOT NULL,
	[StepOrder] [int] NOT NULL,
	[ApprovedBy] [int] NULL,
	[ApprovedDate] [datetime] NULL,
	[Status] [varchar](20) NOT NULL,
	[Note] [nvarchar](500) NULL,
	[IsActive] [bit] NOT NULL,
 CONSTRAINT [PK_IssueSlipApprovals] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[IssueSlips]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[IssueSlips](
	[IssueID] [bigint] IDENTITY(1,1) NOT NULL,
	[IssueCode] [varchar](50) NOT NULL,
	[ProjectID] [int] NOT NULL,
	[WarehouseID] [int] NULL,
	[ParentIssueID] [bigint] NULL,
	[CreatedBy] [int] NOT NULL,
	[IssueDate] [datetime] NULL,
	[Status] [varchar](50) NULL,
	[Description] [nvarchar](500) NULL,
	[ApprovedDate] [datetime] NULL,
	[WorkItem] [nvarchar](255) NULL,
	[Department] [nvarchar](200) NULL,
	[DeliveryLocation] [nvarchar](500) NULL,
	[ReferenceCode] [nvarchar](100) NULL,
	[AssignedPickerId] [int] NULL,
	[VoucherNo] [nvarchar](50) NULL,
 CONSTRAINT [PK__IssueSli__6C86162463E05F16] PRIMARY KEY CLUSTERED 
(
	[IssueID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[LossDetails]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LossDetails](
	[DetailID] [bigint] IDENTITY(1,1) NOT NULL,
	[LossID] [bigint] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[BatchID] [int] NULL,
	[BinID] [int] NULL,
	[Quantity] [decimal](18, 4) NOT NULL,
	[Reason] [nvarchar](255) NULL,
 CONSTRAINT [PK__LossDeta__135C314D29B31BE8] PRIMARY KEY CLUSTERED 
(
	[DetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[LossReports]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LossReports](
	[LossID] [bigint] IDENTITY(1,1) NOT NULL,
	[LossCode] [varchar](50) NOT NULL,
	[WarehouseID] [int] NOT NULL,
	[CreatedBy] [int] NOT NULL,
	[ApprovedBy] [int] NULL,
	[ReportDate] [datetime] NULL,
	[Type] [varchar](20) NULL,
	[Status] [varchar](20) NULL,
	[Description] [nvarchar](500) NULL,
 CONSTRAINT [PK__LossRepo__7025E3943DEC77AE] PRIMARY KEY CLUSTERED 
(
	[LossID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MaterialCategories]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MaterialCategories](
	[CategoryID] [int] IDENTITY(1,1) NOT NULL,
	[Code] [varchar](50) NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[Description] [nvarchar](255) NULL,
 CONSTRAINT [PK__MaterialCategories] PRIMARY KEY CLUSTERED 
(
	[CategoryID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MaterialLossNorms]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MaterialLossNorms](
	[NormID] [int] IDENTITY(1,1) NOT NULL,
	[MaterialID] [int] NOT NULL,
	[ProjectID] [int] NULL,
	[LossPercentage] [decimal](5, 2) NULL,
	[EffectiveDate] [datetime] NULL,
	[Description] [nvarchar](255) NULL,
	[CreatedBy] [int] NULL,
	[IsActive] [bit] NULL,
 CONSTRAINT [PK__Material__02BC227BE15553C0] PRIMARY KEY CLUSTERED 
(
	[NormID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Materials]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Materials](
	[MaterialID] [int] IDENTITY(1,1) NOT NULL,
	[Code] [varchar](50) NOT NULL,
	[Name] [nvarchar](255) NOT NULL,
	[Unit] [nvarchar](20) NULL,
	[IsDecimalUnit] [bit] NOT NULL,
	[MassPerUnit] [decimal](10, 2) NULL,
	[MinStockLevel] [decimal](18, 4) NULL,
	[MaxStockLevel] [decimal](18, 4) NULL,
	[CategoryID] [int] NULL,
	[UnitPrice] [decimal](18, 2) NULL,
	[TechnicalStandard] [nvarchar](500) NULL,
	[Specification] [nvarchar](500) NULL,
 CONSTRAINT [PK__Material__C50613177E51101E] PRIMARY KEY CLUSTERED 
(
	[MaterialID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Notifications]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Notifications](
	[NotiID] [bigint] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[Message] [nvarchar](500) NULL,
	[RelatedEntityType] [varchar](50) NULL,
	[RelatedEntityId] [bigint] NULL,
	[IsRead] [bit] NULL,
	[CreatedAt] [datetime] NULL,
 CONSTRAINT [PK__Notifica__EDC08EF21EEBC2DD] PRIMARY KEY CLUSTERED 
(
	[NotiID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PickingLists]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PickingLists](
	[PickingID] [bigint] IDENTITY(1,1) NOT NULL,
	[IssueDetailID] [bigint] NOT NULL,
	[BatchID] [int] NOT NULL,
	[BinID] [int] NOT NULL,
	[QtyToPick] [decimal](18, 4) NOT NULL,
	[IsPicked] [bit] NOT NULL,
	[ActualPickerId] [int] NULL,
 CONSTRAINT [PK_PickingLists] PRIMARY KEY CLUSTERED 
(
	[PickingID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Projects]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Projects](
	[ProjectID] [int] IDENTITY(1,1) NOT NULL,
	[Code] [varchar](50) NOT NULL,
	[Name] [nvarchar](255) NOT NULL,
	[OverBudgetAllowance] [decimal](18, 2) NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL,
	[Budget] [decimal](18, 2) NULL,
	[Status] [varchar](20) NULL,
	[BudgetUsed] [decimal](18, 2) NULL,
 CONSTRAINT [PK__Projects__761ABED002E87244] PRIMARY KEY CLUSTERED 
(
	[ProjectID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PurchaseOrderItems]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PurchaseOrderItems](
	[ItemID] [bigint] IDENTITY(1,1) NOT NULL,
	[PurchaseOrderID] [bigint] NOT NULL,
	[SupplierID] [int] NULL,
	[MaterialID] [int] NOT NULL,
	[OrderedQuantity] [decimal](18, 4) NOT NULL,
	[UnitPrice] [decimal](18, 2) NULL,
	[LineTotal] [decimal](18, 2) NULL,
 CONSTRAINT [PK_PurchaseOrderItems] PRIMARY KEY CLUSTERED 
(
	[ItemID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PurchaseOrders]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PurchaseOrders](
	[PurchaseOrderID] [bigint] IDENTITY(1,1) NOT NULL,
	[PurchaseOrderCode] [varchar](50) NOT NULL,
	[RequestID] [bigint] NULL,
	[ProjectID] [int] NULL,
	[SupplierID] [int] NOT NULL,
	[SupplierContractID] [bigint] NULL,
	[ParentPOID] [bigint] NULL,
	[RevisionNumber] [int] NOT NULL,
	[RevisionNote] [nvarchar](500) NULL,
	[CreatedBy] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[Status] [varchar](30) NOT NULL,
	[AccountantApprovedBy] [int] NULL,
	[AccountantApprovedAt] [datetime] NULL,
	[AdminApprovedBy] [int] NULL,
	[AdminApprovedAt] [datetime] NULL,
	[SentToSupplierAt] [datetime] NULL,
	[ExpectedDeliveryDate] [datetime] NULL,
	[SupplierNote] [nvarchar](500) NULL,
	[TotalAmount] [decimal](18, 2) NULL,
 CONSTRAINT [PK_PurchaseOrders] PRIMARY KEY CLUSTERED 
(
	[PurchaseOrderID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PurchaseRequestItems]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PurchaseRequestItems](
	[ItemID] [bigint] IDENTITY(1,1) NOT NULL,
	[RequestID] [bigint] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[WarehouseID] [int] NULL,
	[Quantity] [decimal](18, 4) NOT NULL,
	[Notes] [nvarchar](500) NULL,
 CONSTRAINT [PK_PurchaseRequestItems] PRIMARY KEY CLUSTERED 
(
	[ItemID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PurchaseRequests]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PurchaseRequests](
	[RequestID] [bigint] IDENTITY(1,1) NOT NULL,
	[RequestCode] [varchar](50) NOT NULL,
	[ProjectID] [int] NULL,
	[AlertID] [bigint] NULL,
	[CreatedBy] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[Status] [varchar](20) NOT NULL,
 CONSTRAINT [PK_PurchaseRequests] PRIMARY KEY CLUSTERED 
(
	[RequestID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[QCCheckDetails]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[QCCheckDetails](
	[DetailID] [bigint] IDENTITY(1,1) NOT NULL,
	[QCCheckID] [bigint] NOT NULL,
	[ReceiptDetailID] [bigint] NOT NULL,
	[Result] [varchar](10) NOT NULL,
	[FailReason] [nvarchar](500) NULL,
	[PassQuantity] [decimal](18, 4) NOT NULL,
	[FailQuantity] [decimal](18, 4) NOT NULL,
	[FailQuantityQuantity] [decimal](18, 4) NULL,
	[FailQuantityQuality] [decimal](18, 4) NULL,
	[FailQuantityDamage] [decimal](18, 4) NULL,
 CONSTRAINT [PK_QCCheckDetails] PRIMARY KEY CLUSTERED 
(
	[DetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[QCChecks]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[QCChecks](
	[QCCheckID] [bigint] IDENTITY(1,1) NOT NULL,
	[QCCheckCode] [varchar](50) NOT NULL,
	[ReceiptID] [bigint] NOT NULL,
	[CheckedBy] [int] NOT NULL,
	[CheckedAt] [datetime] NOT NULL,
	[OverallResult] [varchar](10) NOT NULL,
	[Notes] [nvarchar](1000) NULL,
 CONSTRAINT [PK_QCChecks] PRIMARY KEY CLUSTERED 
(
	[QCCheckID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ReceiptDetailBinAllocations]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReceiptDetailBinAllocations](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[ReceiptDetailID] [bigint] NOT NULL,
	[BinID] [int] NOT NULL,
	[Quantity] [decimal](18, 4) NOT NULL,
	[BatchID] [int] NOT NULL,
 CONSTRAINT [PK_ReceiptDetailBinAllocations] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ReceiptDetails]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReceiptDetails](
	[DetailID] [bigint] IDENTITY(1,1) NOT NULL,
	[ReceiptID] [bigint] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[SupplierID] [int] NULL,
	[BatchID] [int] NULL,
	[Quantity] [decimal](18, 4) NOT NULL,
	[UnitPrice] [decimal](18, 2) NULL,
	[LineTotal] [decimal](18, 2) NULL,
	[ActualQuantity] [decimal](18, 4) NULL,
	[BinLocationID] [int] NULL,
 CONSTRAINT [PK__ReceiptD__135C314D324534DF] PRIMARY KEY CLUSTERED 
(
	[DetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ReceiptRejectionHistories]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ReceiptRejectionHistories](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[PurchaseOrderId] [bigint] NULL,
	[SupplementaryReceiptId] [bigint] NULL,
	[RejectedBy] [int] NOT NULL,
	[RejectedAt] [datetime2](7) NOT NULL,
	[RejectionReason] [nvarchar](max) NOT NULL,
	[ReceiptId] [bigint] NULL,
 CONSTRAINT [PK_ReceiptRejectionHistories] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Receipts]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Receipts](
	[ReceiptID] [bigint] IDENTITY(1,1) NOT NULL,
	[ReceiptCode] [varchar](50) NOT NULL,
	[WarehouseID] [int] NULL,
	[CreatedBy] [int] NOT NULL,
	[ReceiptDate] [datetime] NULL,
	[Status] [varchar](20) NULL,
	[TotalAmount] [decimal](18, 2) NULL,
	[SubmittedBy] [int] NULL,
	[SubmittedAt] [datetime] NULL,
	[ApprovedBy] [int] NULL,
	[ApprovedAt] [datetime] NULL,
	[RejectedBy] [int] NULL,
	[RejectedAt] [datetime] NULL,
	[ConfirmedBy] [int] NULL,
	[ConfirmedAt] [datetime] NULL,
	[ImportedCompleteNote] [nvarchar](500) NULL,
	[RejectionReason] [nvarchar](500) NULL,
	[AccountantNotes] [nvarchar](500) NULL,
	[BackorderReason] [nvarchar](500) NULL,
	[StampedByManagerId] [int] NULL,
	[StampedAt] [datetime] NULL,
	[StampNotes] [nvarchar](500) NULL,
	[ClosedByAccountantId] [int] NULL,
	[AccountingNote] [nvarchar](500) NULL,
	[ClosedBy] [int] NULL,
	[ClosedAt] [datetime] NULL,
	[PurchaseOrderID] [bigint] NULL,
	[SupplementaryReceiptID] [bigint] NULL,
	[ParentRequestID] [bigint] NULL,
 CONSTRAINT [PK__Receipts__CC08C400A8F71B86] PRIMARY KEY CLUSTERED 
(
	[ReceiptID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Roles]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Roles](
	[RoleID] [int] IDENTITY(1,1) NOT NULL,
	[RoleName] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK__Roles__8AFACE3A1FD94F1F] PRIMARY KEY CLUSTERED 
(
	[RoleID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StockShortageAlerts]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockShortageAlerts](
	[AlertID] [bigint] IDENTITY(1,1) NOT NULL,
	[MaterialID] [int] NOT NULL,
	[WarehouseID] [int] NULL,
	[CurrentQuantity] [decimal](18, 4) NOT NULL,
	[MinStockLevel] [decimal](18, 4) NULL,
	[SuggestedQuantity] [decimal](18, 4) NULL,
	[Status] [varchar](20) NOT NULL,
	[Priority] [varchar](20) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[ConfirmedAt] [datetime] NULL,
	[ConfirmedBy] [int] NULL,
	[Notes] [nvarchar](500) NULL,
 CONSTRAINT [PK_StockShortageAlerts] PRIMARY KEY CLUSTERED 
(
	[AlertID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StockTakeBinLocations]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockTakeBinLocations](
	[StockTakeBinLocationID] [int] IDENTITY(1,1) NOT NULL,
	[StockTakeID] [int] NOT NULL,
	[BinID] [int] NOT NULL,
 CONSTRAINT [PK__StockTakeBinLocations__ID] PRIMARY KEY CLUSTERED 
(
	[StockTakeBinLocationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StockTakeDetails]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockTakeDetails](
	[ID] [bigint] IDENTITY(1,1) NOT NULL,
	[StockTakeID] [int] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[BatchID] [int] NULL,
	[SystemQty] [decimal](18, 4) NULL,
	[CountQty] [decimal](18, 4) NULL,
	[CountRound] [int] NOT NULL,
	[Variance] [decimal](18, 4) NULL,
	[Reason] [nvarchar](255) NULL,
	[BinID] [int] NULL,
	[CountedBy] [int] NULL,
	[CountedAt] [datetime2](0) NULL,
	[DiscrepancyStatus] [varchar](20) NULL,
	[ResolutionAction] [varchar](20) NULL,
	[AdjustmentReasonID] [int] NULL,
	[ResolvedBy] [int] NULL,
	[ResolvedAt] [datetime2](0) NULL,
 CONSTRAINT [PK__StockTak__3214EC27058EA390] PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StockTakeLocks]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockTakeLocks](
	[LockId] [int] IDENTITY(1,1) NOT NULL,
	[StockTakeId] [int] NOT NULL,
	[ScopeType] [varchar](20) NOT NULL,
	[WarehouseId] [int] NOT NULL,
	[BinId] [int] NULL,
	[IsActive] [bit] NOT NULL,
	[LockedAt] [datetime2](0) NOT NULL,
	[LockedBy] [int] NULL,
	[UnlockedAt] [datetime2](0) NULL,
	[UnlockedBy] [int] NULL,
 CONSTRAINT [PK__StockTakeLocks__LockId] PRIMARY KEY CLUSTERED 
(
	[LockId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StockTakes]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockTakes](
	[StockTakeID] [int] IDENTITY(1,1) NOT NULL,
	[WarehouseID] [int] NOT NULL,
	[CheckDate] [datetime] NULL,
	[CreatedBy] [int] NOT NULL,
	[Status] [varchar](30) NULL,
	[Title] [nvarchar](200) NULL,
	[PlannedStartDate] [datetime2](0) NULL,
	[PlannedEndDate] [datetime2](0) NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[CompletedAt] [datetime2](0) NULL,
	[CompletedBy] [int] NULL,
	[Notes] [nvarchar](500) NULL,
 CONSTRAINT [PK__StockTak__6D3F3A76F3069398] PRIMARY KEY CLUSTERED 
(
	[StockTakeID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StockTakeSignatures]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockTakeSignatures](
	[SignatureID] [bigint] IDENTITY(1,1) NOT NULL,
	[StockTakeID] [int] NOT NULL,
	[UserID] [int] NOT NULL,
	[Role] [varchar](20) NOT NULL,
	[SignedAt] [datetime2](0) NOT NULL,
	[SignatureData] [nvarchar](max) NULL,
 CONSTRAINT [PK__StockTak__3DCA5789A2E77209] PRIMARY KEY CLUSTERED 
(
	[SignatureID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StockTakeTeamMembers]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockTakeTeamMembers](
	[ID] [bigint] IDENTITY(1,1) NOT NULL,
	[StockTakeID] [int] NOT NULL,
	[UserID] [int] NOT NULL,
	[AssignedAt] [datetime2](0) NOT NULL,
	[RemovedAt] [datetime2](0) NULL,
	[IsActive] [bit] NOT NULL,
	[MemberCompletedAt] [datetime2](0) NULL,
 CONSTRAINT [PK__StockTak__3214EC27DBDFEB96] PRIMARY KEY CLUSTERED 
(
	[ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SupplementaryReceiptItems]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SupplementaryReceiptItems](
	[ItemID] [bigint] IDENTITY(1,1) NOT NULL,
	[SupplementaryReceiptID] [bigint] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[SupplementaryQuantity] [decimal](18, 4) NOT NULL,
 CONSTRAINT [PK_SupplementaryReceiptItems] PRIMARY KEY CLUSTERED 
(
	[ItemID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SupplementaryReceipts]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SupplementaryReceipts](
	[SupplementaryReceiptID] [bigint] IDENTITY(1,1) NOT NULL,
	[ParentReceiptID] [bigint] NULL,
	[RevisionNumber] [int] NOT NULL,
	[PurchaseOrderID] [bigint] NOT NULL,
	[IncidentID] [bigint] NOT NULL,
	[Status] [varchar](30) NOT NULL,
	[SupplierNote] [nvarchar](1000) NULL,
	[ExpectedDeliveryDate] [datetime] NULL,
	[CreatedByPurchasingId] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[ApprovedByManagerId] [int] NULL,
	[ApprovedAt] [datetime] NULL,
 CONSTRAINT [PK_SupplementaryReceipts] PRIMARY KEY CLUSTERED 
(
	[SupplementaryReceiptID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SupplierContracts]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SupplierContracts](
	[ContractID] [bigint] IDENTITY(1,1) NOT NULL,
	[ContractCode] [varchar](50) NOT NULL,
	[ContractNumber] [varchar](50) NULL,
	[SupplierID] [int] NOT NULL,
	[EffectiveFrom] [datetime] NOT NULL,
	[EffectiveTo] [datetime] NULL,
	[LeadTimeDays] [int] NULL,
	[PaymentTerms] [varchar](200) NULL,
	[DeliveryTerms] [varchar](200) NULL,
	[Status] [varchar](20) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[Notes] [nvarchar](500) NULL,
 CONSTRAINT [PK_SupplierContracts] PRIMARY KEY CLUSTERED 
(
	[ContractID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SupplierQuotations]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SupplierQuotations](
	[QuoteID] [int] IDENTITY(1,1) NOT NULL,
	[SupplierID] [int] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[Price] [decimal](18, 2) NOT NULL,
	[Currency] [varchar](10) NULL,
	[ValidFrom] [datetime] NULL,
	[ValidTo] [datetime] NULL,
	[IsActive] [bit] NULL,
 CONSTRAINT [PK__Supplier__AF9688E1AA857063] PRIMARY KEY CLUSTERED 
(
	[QuoteID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Suppliers]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Suppliers](
	[SupplierID] [int] IDENTITY(1,1) NOT NULL,
	[Code] [varchar](50) NOT NULL,
	[Name] [nvarchar](255) NOT NULL,
	[TaxCode] [varchar](50) NULL,
	[Address] [nvarchar](500) NULL,
 CONSTRAINT [PK__Supplier__4BE666940BC01D20] PRIMARY KEY CLUSTERED 
(
	[SupplierID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SupplierTransactions]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SupplierTransactions](
	[TransactionID] [bigint] IDENTITY(1,1) NOT NULL,
	[SupplierID] [int] NOT NULL,
	[ReferenceID] [bigint] NULL,
	[ReferenceCode] [nvarchar](50) NULL,
	[TransactionType] [nvarchar](50) NOT NULL,
	[Amount] [decimal](18, 4) NOT NULL,
	[TransactionDate] [datetime2](7) NOT NULL,
	[Description] [nvarchar](max) NULL,
 CONSTRAINT [PK_SupplierTransactions] PRIMARY KEY CLUSTERED 
(
	[TransactionID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[totp_users]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[totp_users](
	[TotpID] [int] IDENTITY(1,1) NOT NULL,
	[UserID] [int] NOT NULL,
	[SecretKey] [nvarchar](100) NOT NULL,
	[IsEnabled] [bit] NOT NULL,
	[FailedAttempts] [int] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[VerifiedAt] [datetime2](7) NULL,
	[SetupAt] [datetime2](7) NULL,
 CONSTRAINT [PK_totp_users] PRIMARY KEY CLUSTERED 
(
	[TotpID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TransferDetails]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TransferDetails](
	[DetailID] [bigint] IDENTITY(1,1) NOT NULL,
	[TransferID] [bigint] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[BatchID] [int] NULL,
	[FromBinID] [int] NULL,
	[ToBinID] [int] NULL,
	[Quantity] [decimal](18, 4) NULL,
 CONSTRAINT [PK__Transfer__135C314D734A24C1] PRIMARY KEY CLUSTERED 
(
	[DetailID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TransferOrders]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TransferOrders](
	[TransferID] [bigint] IDENTITY(1,1) NOT NULL,
	[TransferCode] [varchar](50) NULL,
	[WarehouseID] [int] NOT NULL,
	[CreatedBy] [int] NOT NULL,
	[AssignedTo] [int] NULL,
	[TransferDate] [datetime] NULL,
	[Status] [varchar](20) NULL,
	[Type] [varchar](20) NULL,
 CONSTRAINT [PK__Transfer__9549017150467018] PRIMARY KEY CLUSTERED 
(
	[TransferID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Users]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Users](
	[UserID] [int] IDENTITY(1,1) NOT NULL,
	[Username] [varchar](50) NOT NULL,
	[PasswordHash] [varchar](255) NOT NULL,
	[RoleID] [int] NOT NULL,
	[FullName] [nvarchar](100) NULL,
	[Email] [varchar](100) NULL,
	[RefreshToken] [varchar](255) NULL,
	[RefreshTokenExpiry] [datetime] NULL,
	[PhoneNumber] [varchar](20) NULL,
	[Status] [bit] NOT NULL,
 CONSTRAINT [PK__Users__1788CCACC0310C28] PRIMARY KEY CLUSTERED 
(
	[UserID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[WarehouseCards]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[WarehouseCards](
	[CardID] [bigint] IDENTITY(1,1) NOT NULL,
	[CardCode] [varchar](50) NOT NULL,
	[WarehouseID] [int] NOT NULL,
	[MaterialID] [int] NOT NULL,
	[BinID] [int] NOT NULL,
	[BatchID] [int] NOT NULL,
	[TransactionType] [varchar](20) NOT NULL,
	[ReferenceID] [bigint] NOT NULL,
	[ReferenceType] [varchar](20) NOT NULL,
	[TransactionDate] [datetime] NOT NULL,
	[Quantity] [decimal](18, 4) NOT NULL,
	[QuantityBefore] [decimal](18, 4) NOT NULL,
	[QuantityAfter] [decimal](18, 4) NOT NULL,
	[CreatedBy] [int] NOT NULL,
	[Notes] [nvarchar](500) NULL,
 CONSTRAINT [PK_WarehouseCards] PRIMARY KEY CLUSTERED 
(
	[CardID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Warehouses]    Script Date: 4/26/2026 12:07:22 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Warehouses](
	[WarehouseID] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](100) NOT NULL,
	[Address] [nvarchar](255) NULL,
 CONSTRAINT [PK__Warehous__2608AFD9BF0EE584] PRIMARY KEY CLUSTERED 
(
	[WarehouseID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[AdjustmentReasons] ADD  DEFAULT (CONVERT([bit],(1))) FOR [IsActive]
GO
ALTER TABLE [dbo].[Batches] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[IncidentEvidenceImages] ADD  DEFAULT (getdate()) FOR [UploadedAt]
GO
ALTER TABLE [dbo].[IncidentReports] ADD  DEFAULT ('Open') FOR [Status]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] ADD  DEFAULT ('Draft') FOR [Status]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] ADD  DEFAULT (sysdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[InventoryCurrent] ADD  DEFAULT ((0.0)) FOR [QuantityOnHand]
GO
ALTER TABLE [dbo].[InventoryCurrent] ADD  DEFAULT ((0.0)) FOR [QuantityAllocated]
GO
ALTER TABLE [dbo].[InventoryCurrent] ADD  DEFAULT (getdate()) FOR [LastUpdated]
GO
ALTER TABLE [dbo].[IssueSlips] ADD  DEFAULT (getdate()) FOR [IssueDate]
GO
ALTER TABLE [dbo].[LossReports] ADD  DEFAULT (getdate()) FOR [ReportDate]
GO
ALTER TABLE [dbo].[MaterialLossNorms] ADD  DEFAULT (CONVERT([bit],(1))) FOR [IsActive]
GO
ALTER TABLE [dbo].[Materials] ADD  DEFAULT (CONVERT([bit],(0))) FOR [IsDecimalUnit]
GO
ALTER TABLE [dbo].[Notifications] ADD  DEFAULT (CONVERT([bit],(0))) FOR [IsRead]
GO
ALTER TABLE [dbo].[Notifications] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[PurchaseOrders] ADD  DEFAULT ((1)) FOR [RevisionNumber]
GO
ALTER TABLE [dbo].[PurchaseOrders] ADD  DEFAULT ('Draft') FOR [Status]
GO
ALTER TABLE [dbo].[PurchaseRequests] ADD  DEFAULT ('Submitted') FOR [Status]
GO
ALTER TABLE [dbo].[Receipts] ADD  DEFAULT (getdate()) FOR [ReceiptDate]
GO
ALTER TABLE [dbo].[StockShortageAlerts] ADD  DEFAULT ('Pending') FOR [Status]
GO
ALTER TABLE [dbo].[StockTakeDetails] ADD  DEFAULT ((1)) FOR [CountRound]
GO
ALTER TABLE [dbo].[StockTakeLocks] ADD  DEFAULT (CONVERT([bit],(1))) FOR [IsActive]
GO
ALTER TABLE [dbo].[StockTakeLocks] ADD  DEFAULT (sysutcdatetime()) FOR [LockedAt]
GO
ALTER TABLE [dbo].[StockTakes] ADD  DEFAULT (sysdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[StockTakeSignatures] ADD  DEFAULT (sysdatetime()) FOR [SignedAt]
GO
ALTER TABLE [dbo].[StockTakeTeamMembers] ADD  DEFAULT (sysdatetime()) FOR [AssignedAt]
GO
ALTER TABLE [dbo].[StockTakeTeamMembers] ADD  DEFAULT (CONVERT([bit],(1))) FOR [IsActive]
GO
ALTER TABLE [dbo].[SupplementaryReceipts] ADD  DEFAULT ((1)) FOR [RevisionNumber]
GO
ALTER TABLE [dbo].[SupplierContracts] ADD  DEFAULT ('Active') FOR [Status]
GO
ALTER TABLE [dbo].[SupplierContracts] ADD  DEFAULT (CONVERT([bit],(1))) FOR [IsActive]
GO
ALTER TABLE [dbo].[SupplierQuotations] ADD  DEFAULT ('VND') FOR [Currency]
GO
ALTER TABLE [dbo].[SupplierQuotations] ADD  DEFAULT (CONVERT([bit],(1))) FOR [IsActive]
GO
ALTER TABLE [dbo].[totp_users] ADD  DEFAULT (CONVERT([bit],(0))) FOR [IsEnabled]
GO
ALTER TABLE [dbo].[totp_users] ADD  DEFAULT ((0)) FOR [FailedAttempts]
GO
ALTER TABLE [dbo].[totp_users] ADD  DEFAULT (getutcdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[TransferOrders] ADD  DEFAULT (getdate()) FOR [TransferDate]
GO
ALTER TABLE [dbo].[Users] ADD  DEFAULT (CONVERT([bit],(1))) FOR [Status]
GO
ALTER TABLE [dbo].[AuditPenalties]  WITH CHECK ADD  CONSTRAINT [FK_AuditPenalties_IssuedBy_Users] FOREIGN KEY([IssuedByUserId])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[AuditPenalties] CHECK CONSTRAINT [FK_AuditPenalties_IssuedBy_Users]
GO
ALTER TABLE [dbo].[AuditPenalties]  WITH CHECK ADD  CONSTRAINT [FK_AuditPenalties_StockTakes] FOREIGN KEY([StockTakeId])
REFERENCES [dbo].[StockTakes] ([StockTakeID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[AuditPenalties] CHECK CONSTRAINT [FK_AuditPenalties_StockTakes]
GO
ALTER TABLE [dbo].[AuditPenalties]  WITH CHECK ADD  CONSTRAINT [FK_AuditPenalties_Target_Users] FOREIGN KEY([TargetUserId])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[AuditPenalties] CHECK CONSTRAINT [FK_AuditPenalties_Target_Users]
GO
ALTER TABLE [dbo].[Batches]  WITH CHECK ADD  CONSTRAINT [FK_Batches_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[Batches] CHECK CONSTRAINT [FK_Batches_Materials]
GO
ALTER TABLE [dbo].[BinLocations]  WITH CHECK ADD  CONSTRAINT [FK_BinLocations_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[BinLocations] CHECK CONSTRAINT [FK_BinLocations_Warehouses]
GO
ALTER TABLE [dbo].[DirectPurchaseDetails]  WITH CHECK ADD  CONSTRAINT [FK_DirectPurchaseDetails_DirectPurchaseOrders_DPOID] FOREIGN KEY([DPOID])
REFERENCES [dbo].[DirectPurchaseOrders] ([DPOID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[DirectPurchaseDetails] CHECK CONSTRAINT [FK_DirectPurchaseDetails_DirectPurchaseOrders_DPOID]
GO
ALTER TABLE [dbo].[DirectPurchaseDetails]  WITH CHECK ADD  CONSTRAINT [FK_DirectPurchaseDetails_Materials_MaterialID] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[DirectPurchaseDetails] CHECK CONSTRAINT [FK_DirectPurchaseDetails_Materials_MaterialID]
GO
ALTER TABLE [dbo].[DirectPurchaseDetails]  WITH CHECK ADD  CONSTRAINT [FK_DirectPurchaseDetails_Suppliers_SupplierID] FOREIGN KEY([SupplierID])
REFERENCES [dbo].[Suppliers] ([SupplierID])
GO
ALTER TABLE [dbo].[DirectPurchaseDetails] CHECK CONSTRAINT [FK_DirectPurchaseDetails_Suppliers_SupplierID]
GO
ALTER TABLE [dbo].[DirectPurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_DirectPurchaseOrders_Projects_ProjectID] FOREIGN KEY([ProjectID])
REFERENCES [dbo].[Projects] ([ProjectID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[DirectPurchaseOrders] CHECK CONSTRAINT [FK_DirectPurchaseOrders_Projects_ProjectID]
GO
ALTER TABLE [dbo].[IncidentEvidenceImages]  WITH CHECK ADD  CONSTRAINT [FK_IncidentEvidenceImages_IncidentReportDetails] FOREIGN KEY([IncidentReportDetailID])
REFERENCES [dbo].[IncidentReportDetails] ([DetailID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[IncidentEvidenceImages] CHECK CONSTRAINT [FK_IncidentEvidenceImages_IncidentReportDetails]
GO
ALTER TABLE [dbo].[IncidentReportDetails]  WITH CHECK ADD  CONSTRAINT [FK_IncidentReportDetails_IncidentReports] FOREIGN KEY([IncidentID])
REFERENCES [dbo].[IncidentReports] ([IncidentID])
GO
ALTER TABLE [dbo].[IncidentReportDetails] CHECK CONSTRAINT [FK_IncidentReportDetails_IncidentReports]
GO
ALTER TABLE [dbo].[IncidentReportDetails]  WITH CHECK ADD  CONSTRAINT [FK_IncidentReportDetails_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[IncidentReportDetails] CHECK CONSTRAINT [FK_IncidentReportDetails_Materials]
GO
ALTER TABLE [dbo].[IncidentReportDetails]  WITH CHECK ADD  CONSTRAINT [FK_IncidentReportDetails_ReceiptDetails] FOREIGN KEY([ReceiptDetailID])
REFERENCES [dbo].[ReceiptDetails] ([DetailID])
GO
ALTER TABLE [dbo].[IncidentReportDetails] CHECK CONSTRAINT [FK_IncidentReportDetails_ReceiptDetails]
GO
ALTER TABLE [dbo].[IncidentReports]  WITH CHECK ADD  CONSTRAINT [FK_IncidentReports_PurchaseOrders] FOREIGN KEY([PurchaseOrderID])
REFERENCES [dbo].[PurchaseOrders] ([PurchaseOrderID])
GO
ALTER TABLE [dbo].[IncidentReports] CHECK CONSTRAINT [FK_IncidentReports_PurchaseOrders]
GO
ALTER TABLE [dbo].[IncidentReports]  WITH CHECK ADD  CONSTRAINT [FK_IncidentReports_QCChecks] FOREIGN KEY([QCCheckID])
REFERENCES [dbo].[QCChecks] ([QCCheckID])
GO
ALTER TABLE [dbo].[IncidentReports] CHECK CONSTRAINT [FK_IncidentReports_QCChecks]
GO
ALTER TABLE [dbo].[IncidentReports]  WITH CHECK ADD  CONSTRAINT [FK_IncidentReports_Receipts] FOREIGN KEY([ReceiptID])
REFERENCES [dbo].[Receipts] ([ReceiptID])
GO
ALTER TABLE [dbo].[IncidentReports] CHECK CONSTRAINT [FK_IncidentReports_Receipts]
GO
ALTER TABLE [dbo].[IncidentReports]  WITH CHECK ADD  CONSTRAINT [FK_IncidentReports_Users_CreatedBy] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[IncidentReports] CHECK CONSTRAINT [FK_IncidentReports_Users_CreatedBy]
GO
ALTER TABLE [dbo].[IncidentReports]  WITH CHECK ADD  CONSTRAINT [FK_IncidentReports_Users_ResolvedBy] FOREIGN KEY([ResolvedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[IncidentReports] CHECK CONSTRAINT [FK_IncidentReports_Users_ResolvedBy]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries]  WITH CHECK ADD  CONSTRAINT [FK_InvAdjEntries_AdjustmentReasons] FOREIGN KEY([ReasonID])
REFERENCES [dbo].[AdjustmentReasons] ([ReasonID])
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] CHECK CONSTRAINT [FK_InvAdjEntries_AdjustmentReasons]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries]  WITH CHECK ADD  CONSTRAINT [FK_InvAdjEntries_ApprovedBy_Users] FOREIGN KEY([ApprovedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] CHECK CONSTRAINT [FK_InvAdjEntries_ApprovedBy_Users]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries]  WITH CHECK ADD  CONSTRAINT [FK_InvAdjEntries_Batches] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] CHECK CONSTRAINT [FK_InvAdjEntries_Batches]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries]  WITH CHECK ADD  CONSTRAINT [FK_InvAdjEntries_BinLocations] FOREIGN KEY([BinID])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] CHECK CONSTRAINT [FK_InvAdjEntries_BinLocations]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries]  WITH CHECK ADD  CONSTRAINT [FK_InvAdjEntries_CreatedBy_Users] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] CHECK CONSTRAINT [FK_InvAdjEntries_CreatedBy_Users]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries]  WITH CHECK ADD  CONSTRAINT [FK_InvAdjEntries_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] CHECK CONSTRAINT [FK_InvAdjEntries_Materials]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries]  WITH CHECK ADD  CONSTRAINT [FK_InvAdjEntries_StockTakeDetails] FOREIGN KEY([StockTakeDetailID])
REFERENCES [dbo].[StockTakeDetails] ([ID])
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] CHECK CONSTRAINT [FK_InvAdjEntries_StockTakeDetails]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries]  WITH CHECK ADD  CONSTRAINT [FK_InvAdjEntries_StockTakes] FOREIGN KEY([StockTakeID])
REFERENCES [dbo].[StockTakes] ([StockTakeID])
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] CHECK CONSTRAINT [FK_InvAdjEntries_StockTakes]
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries]  WITH CHECK ADD  CONSTRAINT [FK_InvAdjEntries_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[InventoryAdjustmentEntries] CHECK CONSTRAINT [FK_InvAdjEntries_Warehouses]
GO
ALTER TABLE [dbo].[InventoryCurrent]  WITH CHECK ADD  CONSTRAINT [FK_Inventory_Batches] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[InventoryCurrent] CHECK CONSTRAINT [FK_Inventory_Batches]
GO
ALTER TABLE [dbo].[InventoryCurrent]  WITH CHECK ADD  CONSTRAINT [FK_Inventory_Bins] FOREIGN KEY([BinID])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[InventoryCurrent] CHECK CONSTRAINT [FK_Inventory_Bins]
GO
ALTER TABLE [dbo].[InventoryCurrent]  WITH CHECK ADD  CONSTRAINT [FK_Inventory_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[InventoryCurrent] CHECK CONSTRAINT [FK_Inventory_Materials]
GO
ALTER TABLE [dbo].[InventoryCurrent]  WITH CHECK ADD  CONSTRAINT [FK_Inventory_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[InventoryCurrent] CHECK CONSTRAINT [FK_Inventory_Warehouses]
GO
ALTER TABLE [dbo].[InventoryIssueDetails]  WITH CHECK ADD  CONSTRAINT [FK_InventoryIssueDetails_Batches_BatchId] FOREIGN KEY([BatchId])
REFERENCES [dbo].[Batches] ([BatchID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[InventoryIssueDetails] CHECK CONSTRAINT [FK_InventoryIssueDetails_Batches_BatchId]
GO
ALTER TABLE [dbo].[InventoryIssueDetails]  WITH CHECK ADD  CONSTRAINT [FK_InventoryIssueDetails_InventoryIssues_InventoryIssueId] FOREIGN KEY([InventoryIssueId])
REFERENCES [dbo].[InventoryIssues] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[InventoryIssueDetails] CHECK CONSTRAINT [FK_InventoryIssueDetails_InventoryIssues_InventoryIssueId]
GO
ALTER TABLE [dbo].[InventoryIssueDetails]  WITH CHECK ADD  CONSTRAINT [FK_InventoryIssueDetails_IssueDetails_IssueDetailId] FOREIGN KEY([IssueDetailId])
REFERENCES [dbo].[IssueDetails] ([DetailID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[InventoryIssueDetails] CHECK CONSTRAINT [FK_InventoryIssueDetails_IssueDetails_IssueDetailId]
GO
ALTER TABLE [dbo].[InventoryIssues]  WITH CHECK ADD  CONSTRAINT [FK_InventoryIssues_IssueSlips_IssueSlipId] FOREIGN KEY([IssueSlipId])
REFERENCES [dbo].[IssueSlips] ([IssueID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[InventoryIssues] CHECK CONSTRAINT [FK_InventoryIssues_IssueSlips_IssueSlipId]
GO
ALTER TABLE [dbo].[IssueDetails]  WITH CHECK ADD  CONSTRAINT [FK_IssueDetails_Batches] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[IssueDetails] CHECK CONSTRAINT [FK_IssueDetails_Batches]
GO
ALTER TABLE [dbo].[IssueDetails]  WITH CHECK ADD  CONSTRAINT [FK_IssueDetails_Issues] FOREIGN KEY([IssueID])
REFERENCES [dbo].[IssueSlips] ([IssueID])
GO
ALTER TABLE [dbo].[IssueDetails] CHECK CONSTRAINT [FK_IssueDetails_Issues]
GO
ALTER TABLE [dbo].[IssueDetails]  WITH CHECK ADD  CONSTRAINT [FK_IssueDetails_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[IssueDetails] CHECK CONSTRAINT [FK_IssueDetails_Materials]
GO
ALTER TABLE [dbo].[IssueSlipApprovals]  WITH CHECK ADD  CONSTRAINT [FK_IssueSlipApprovals_IssueSlips_IssueID] FOREIGN KEY([IssueID])
REFERENCES [dbo].[IssueSlips] ([IssueID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[IssueSlipApprovals] CHECK CONSTRAINT [FK_IssueSlipApprovals_IssueSlips_IssueID]
GO
ALTER TABLE [dbo].[IssueSlipApprovals]  WITH CHECK ADD  CONSTRAINT [FK_IssueSlipApprovals_Users_ApprovedBy] FOREIGN KEY([ApprovedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[IssueSlipApprovals] CHECK CONSTRAINT [FK_IssueSlipApprovals_Users_ApprovedBy]
GO
ALTER TABLE [dbo].[IssueSlips]  WITH CHECK ADD  CONSTRAINT [FK_IssueSlips_IssueSlips_ParentIssueID] FOREIGN KEY([ParentIssueID])
REFERENCES [dbo].[IssueSlips] ([IssueID])
GO
ALTER TABLE [dbo].[IssueSlips] CHECK CONSTRAINT [FK_IssueSlips_IssueSlips_ParentIssueID]
GO
ALTER TABLE [dbo].[IssueSlips]  WITH CHECK ADD  CONSTRAINT [FK_IssueSlips_Projects] FOREIGN KEY([ProjectID])
REFERENCES [dbo].[Projects] ([ProjectID])
GO
ALTER TABLE [dbo].[IssueSlips] CHECK CONSTRAINT [FK_IssueSlips_Projects]
GO
ALTER TABLE [dbo].[IssueSlips]  WITH CHECK ADD  CONSTRAINT [FK_IssueSlips_Users] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[IssueSlips] CHECK CONSTRAINT [FK_IssueSlips_Users]
GO
ALTER TABLE [dbo].[IssueSlips]  WITH CHECK ADD  CONSTRAINT [FK_IssueSlips_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[IssueSlips] CHECK CONSTRAINT [FK_IssueSlips_Warehouses]
GO
ALTER TABLE [dbo].[LossDetails]  WITH CHECK ADD  CONSTRAINT [FK_LossDetails_Batches] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[LossDetails] CHECK CONSTRAINT [FK_LossDetails_Batches]
GO
ALTER TABLE [dbo].[LossDetails]  WITH CHECK ADD  CONSTRAINT [FK_LossDetails_Bins] FOREIGN KEY([BinID])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[LossDetails] CHECK CONSTRAINT [FK_LossDetails_Bins]
GO
ALTER TABLE [dbo].[LossDetails]  WITH CHECK ADD  CONSTRAINT [FK_LossDetails_LossReports] FOREIGN KEY([LossID])
REFERENCES [dbo].[LossReports] ([LossID])
GO
ALTER TABLE [dbo].[LossDetails] CHECK CONSTRAINT [FK_LossDetails_LossReports]
GO
ALTER TABLE [dbo].[LossDetails]  WITH CHECK ADD  CONSTRAINT [FK_LossDetails_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[LossDetails] CHECK CONSTRAINT [FK_LossDetails_Materials]
GO
ALTER TABLE [dbo].[LossReports]  WITH CHECK ADD  CONSTRAINT [FK_LossReports_Approvers] FOREIGN KEY([ApprovedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[LossReports] CHECK CONSTRAINT [FK_LossReports_Approvers]
GO
ALTER TABLE [dbo].[LossReports]  WITH CHECK ADD  CONSTRAINT [FK_LossReports_Creators] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[LossReports] CHECK CONSTRAINT [FK_LossReports_Creators]
GO
ALTER TABLE [dbo].[LossReports]  WITH CHECK ADD  CONSTRAINT [FK_LossReports_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[LossReports] CHECK CONSTRAINT [FK_LossReports_Warehouses]
GO
ALTER TABLE [dbo].[MaterialLossNorms]  WITH CHECK ADD  CONSTRAINT [FK_LossNorms_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[MaterialLossNorms] CHECK CONSTRAINT [FK_LossNorms_Materials]
GO
ALTER TABLE [dbo].[MaterialLossNorms]  WITH CHECK ADD  CONSTRAINT [FK_LossNorms_Projects] FOREIGN KEY([ProjectID])
REFERENCES [dbo].[Projects] ([ProjectID])
GO
ALTER TABLE [dbo].[MaterialLossNorms] CHECK CONSTRAINT [FK_LossNorms_Projects]
GO
ALTER TABLE [dbo].[MaterialLossNorms]  WITH CHECK ADD  CONSTRAINT [FK_LossNorms_Users] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[MaterialLossNorms] CHECK CONSTRAINT [FK_LossNorms_Users]
GO
ALTER TABLE [dbo].[Materials]  WITH CHECK ADD  CONSTRAINT [FK_Materials_Category] FOREIGN KEY([CategoryID])
REFERENCES [dbo].[MaterialCategories] ([CategoryID])
GO
ALTER TABLE [dbo].[Materials] CHECK CONSTRAINT [FK_Materials_Category]
GO
ALTER TABLE [dbo].[Notifications]  WITH CHECK ADD  CONSTRAINT [FK_Notifications_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[Notifications] CHECK CONSTRAINT [FK_Notifications_Users]
GO
ALTER TABLE [dbo].[PickingLists]  WITH CHECK ADD  CONSTRAINT [FK_PickingList_Batches] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[PickingLists] CHECK CONSTRAINT [FK_PickingList_Batches]
GO
ALTER TABLE [dbo].[PickingLists]  WITH CHECK ADD  CONSTRAINT [FK_PickingList_BinLocations] FOREIGN KEY([BinID])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[PickingLists] CHECK CONSTRAINT [FK_PickingList_BinLocations]
GO
ALTER TABLE [dbo].[PickingLists]  WITH CHECK ADD  CONSTRAINT [FK_PickingList_IssueDetails] FOREIGN KEY([IssueDetailID])
REFERENCES [dbo].[IssueDetails] ([DetailID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[PickingLists] CHECK CONSTRAINT [FK_PickingList_IssueDetails]
GO
ALTER TABLE [dbo].[PurchaseOrderItems]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrderItems_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[PurchaseOrderItems] CHECK CONSTRAINT [FK_PurchaseOrderItems_Materials]
GO
ALTER TABLE [dbo].[PurchaseOrderItems]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrderItems_PurchaseOrders] FOREIGN KEY([PurchaseOrderID])
REFERENCES [dbo].[PurchaseOrders] ([PurchaseOrderID])
GO
ALTER TABLE [dbo].[PurchaseOrderItems] CHECK CONSTRAINT [FK_PurchaseOrderItems_PurchaseOrders]
GO
ALTER TABLE [dbo].[PurchaseOrderItems]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrderItems_Suppliers] FOREIGN KEY([SupplierID])
REFERENCES [dbo].[Suppliers] ([SupplierID])
GO
ALTER TABLE [dbo].[PurchaseOrderItems] CHECK CONSTRAINT [FK_PurchaseOrderItems_Suppliers]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrders_ParentPO] FOREIGN KEY([ParentPOID])
REFERENCES [dbo].[PurchaseOrders] ([PurchaseOrderID])
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [FK_PurchaseOrders_ParentPO]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrders_Projects] FOREIGN KEY([ProjectID])
REFERENCES [dbo].[Projects] ([ProjectID])
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [FK_PurchaseOrders_Projects]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrders_PurchaseRequests] FOREIGN KEY([RequestID])
REFERENCES [dbo].[PurchaseRequests] ([RequestID])
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [FK_PurchaseOrders_PurchaseRequests]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrders_SupplierContracts] FOREIGN KEY([SupplierContractID])
REFERENCES [dbo].[SupplierContracts] ([ContractID])
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [FK_PurchaseOrders_SupplierContracts]
GO
ALTER TABLE [dbo].[PurchaseOrders]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseOrders_Suppliers] FOREIGN KEY([SupplierID])
REFERENCES [dbo].[Suppliers] ([SupplierID])
GO
ALTER TABLE [dbo].[PurchaseOrders] CHECK CONSTRAINT [FK_PurchaseOrders_Suppliers]
GO
ALTER TABLE [dbo].[PurchaseRequestItems]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseRequestItems_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[PurchaseRequestItems] CHECK CONSTRAINT [FK_PurchaseRequestItems_Materials]
GO
ALTER TABLE [dbo].[PurchaseRequestItems]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseRequestItems_PurchaseRequests] FOREIGN KEY([RequestID])
REFERENCES [dbo].[PurchaseRequests] ([RequestID])
GO
ALTER TABLE [dbo].[PurchaseRequestItems] CHECK CONSTRAINT [FK_PurchaseRequestItems_PurchaseRequests]
GO
ALTER TABLE [dbo].[PurchaseRequestItems]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseRequestItems_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[PurchaseRequestItems] CHECK CONSTRAINT [FK_PurchaseRequestItems_Warehouses]
GO
ALTER TABLE [dbo].[PurchaseRequests]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseRequests_Projects] FOREIGN KEY([ProjectID])
REFERENCES [dbo].[Projects] ([ProjectID])
GO
ALTER TABLE [dbo].[PurchaseRequests] CHECK CONSTRAINT [FK_PurchaseRequests_Projects]
GO
ALTER TABLE [dbo].[PurchaseRequests]  WITH CHECK ADD  CONSTRAINT [FK_PurchaseRequests_StockShortageAlerts] FOREIGN KEY([AlertID])
REFERENCES [dbo].[StockShortageAlerts] ([AlertID])
GO
ALTER TABLE [dbo].[PurchaseRequests] CHECK CONSTRAINT [FK_PurchaseRequests_StockShortageAlerts]
GO
ALTER TABLE [dbo].[QCCheckDetails]  WITH CHECK ADD  CONSTRAINT [FK_QCCheckDetails_QCChecks] FOREIGN KEY([QCCheckID])
REFERENCES [dbo].[QCChecks] ([QCCheckID])
GO
ALTER TABLE [dbo].[QCCheckDetails] CHECK CONSTRAINT [FK_QCCheckDetails_QCChecks]
GO
ALTER TABLE [dbo].[QCCheckDetails]  WITH CHECK ADD  CONSTRAINT [FK_QCCheckDetails_ReceiptDetails] FOREIGN KEY([ReceiptDetailID])
REFERENCES [dbo].[ReceiptDetails] ([DetailID])
GO
ALTER TABLE [dbo].[QCCheckDetails] CHECK CONSTRAINT [FK_QCCheckDetails_ReceiptDetails]
GO
ALTER TABLE [dbo].[QCChecks]  WITH CHECK ADD  CONSTRAINT [FK_QCChecks_Receipts] FOREIGN KEY([ReceiptID])
REFERENCES [dbo].[Receipts] ([ReceiptID])
GO
ALTER TABLE [dbo].[QCChecks] CHECK CONSTRAINT [FK_QCChecks_Receipts]
GO
ALTER TABLE [dbo].[QCChecks]  WITH CHECK ADD  CONSTRAINT [FK_QCChecks_Users] FOREIGN KEY([CheckedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[QCChecks] CHECK CONSTRAINT [FK_QCChecks_Users]
GO
ALTER TABLE [dbo].[ReceiptDetailBinAllocations]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptDetailBinAllocations_Batches] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[ReceiptDetailBinAllocations] CHECK CONSTRAINT [FK_ReceiptDetailBinAllocations_Batches]
GO
ALTER TABLE [dbo].[ReceiptDetailBinAllocations]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptDetailBinAllocations_BinLocations] FOREIGN KEY([BinID])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[ReceiptDetailBinAllocations] CHECK CONSTRAINT [FK_ReceiptDetailBinAllocations_BinLocations]
GO
ALTER TABLE [dbo].[ReceiptDetailBinAllocations]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptDetailBinAllocations_ReceiptDetails] FOREIGN KEY([ReceiptDetailID])
REFERENCES [dbo].[ReceiptDetails] ([DetailID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ReceiptDetailBinAllocations] CHECK CONSTRAINT [FK_ReceiptDetailBinAllocations_ReceiptDetails]
GO
ALTER TABLE [dbo].[ReceiptDetails]  WITH CHECK ADD  CONSTRAINT [FK__ReceiptDetail__Supplier] FOREIGN KEY([SupplierID])
REFERENCES [dbo].[Suppliers] ([SupplierID])
GO
ALTER TABLE [dbo].[ReceiptDetails] CHECK CONSTRAINT [FK__ReceiptDetail__Supplier]
GO
ALTER TABLE [dbo].[ReceiptDetails]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptDetails_Batches] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[ReceiptDetails] CHECK CONSTRAINT [FK_ReceiptDetails_Batches]
GO
ALTER TABLE [dbo].[ReceiptDetails]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptDetails_BinLocations] FOREIGN KEY([BinLocationID])
REFERENCES [dbo].[BinLocations] ([BinID])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[ReceiptDetails] CHECK CONSTRAINT [FK_ReceiptDetails_BinLocations]
GO
ALTER TABLE [dbo].[ReceiptDetails]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptDetails_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[ReceiptDetails] CHECK CONSTRAINT [FK_ReceiptDetails_Materials]
GO
ALTER TABLE [dbo].[ReceiptDetails]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptDetails_Receipts] FOREIGN KEY([ReceiptID])
REFERENCES [dbo].[Receipts] ([ReceiptID])
GO
ALTER TABLE [dbo].[ReceiptDetails] CHECK CONSTRAINT [FK_ReceiptDetails_Receipts]
GO
ALTER TABLE [dbo].[ReceiptRejectionHistories]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptRejectionHistories_PurchaseOrders_PurchaseOrderId] FOREIGN KEY([PurchaseOrderId])
REFERENCES [dbo].[PurchaseOrders] ([PurchaseOrderID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[ReceiptRejectionHistories] CHECK CONSTRAINT [FK_ReceiptRejectionHistories_PurchaseOrders_PurchaseOrderId]
GO
ALTER TABLE [dbo].[ReceiptRejectionHistories]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptRejectionHistories_Receipts_ReceiptId] FOREIGN KEY([ReceiptId])
REFERENCES [dbo].[Receipts] ([ReceiptID])
GO
ALTER TABLE [dbo].[ReceiptRejectionHistories] CHECK CONSTRAINT [FK_ReceiptRejectionHistories_Receipts_ReceiptId]
GO
ALTER TABLE [dbo].[ReceiptRejectionHistories]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptRejectionHistories_SupplementaryReceipts_SupplementaryReceiptId] FOREIGN KEY([SupplementaryReceiptId])
REFERENCES [dbo].[SupplementaryReceipts] ([SupplementaryReceiptID])
GO
ALTER TABLE [dbo].[ReceiptRejectionHistories] CHECK CONSTRAINT [FK_ReceiptRejectionHistories_SupplementaryReceipts_SupplementaryReceiptId]
GO
ALTER TABLE [dbo].[ReceiptRejectionHistories]  WITH CHECK ADD  CONSTRAINT [FK_ReceiptRejectionHistories_Users_RejectedBy] FOREIGN KEY([RejectedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[ReceiptRejectionHistories] CHECK CONSTRAINT [FK_ReceiptRejectionHistories_Users_RejectedBy]
GO
ALTER TABLE [dbo].[Receipts]  WITH CHECK ADD  CONSTRAINT [FK_Receipts_ParentRequest] FOREIGN KEY([ParentRequestID])
REFERENCES [dbo].[Receipts] ([ReceiptID])
GO
ALTER TABLE [dbo].[Receipts] CHECK CONSTRAINT [FK_Receipts_ParentRequest]
GO
ALTER TABLE [dbo].[Receipts]  WITH CHECK ADD  CONSTRAINT [FK_Receipts_PurchaseOrders] FOREIGN KEY([PurchaseOrderID])
REFERENCES [dbo].[PurchaseOrders] ([PurchaseOrderID])
GO
ALTER TABLE [dbo].[Receipts] CHECK CONSTRAINT [FK_Receipts_PurchaseOrders]
GO
ALTER TABLE [dbo].[Receipts]  WITH CHECK ADD  CONSTRAINT [FK_Receipts_SupplementaryReceipts_SupplementaryReceiptID] FOREIGN KEY([SupplementaryReceiptID])
REFERENCES [dbo].[SupplementaryReceipts] ([SupplementaryReceiptID])
GO
ALTER TABLE [dbo].[Receipts] CHECK CONSTRAINT [FK_Receipts_SupplementaryReceipts_SupplementaryReceiptID]
GO
ALTER TABLE [dbo].[Receipts]  WITH CHECK ADD  CONSTRAINT [FK_Receipts_Users] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[Receipts] CHECK CONSTRAINT [FK_Receipts_Users]
GO
ALTER TABLE [dbo].[Receipts]  WITH CHECK ADD  CONSTRAINT [FK_Receipts_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[Receipts] CHECK CONSTRAINT [FK_Receipts_Warehouses]
GO
ALTER TABLE [dbo].[StockShortageAlerts]  WITH CHECK ADD  CONSTRAINT [FK_StockShortageAlerts_ConfirmedBy_Users] FOREIGN KEY([ConfirmedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[StockShortageAlerts] CHECK CONSTRAINT [FK_StockShortageAlerts_ConfirmedBy_Users]
GO
ALTER TABLE [dbo].[StockShortageAlerts]  WITH CHECK ADD  CONSTRAINT [FK_StockShortageAlerts_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[StockShortageAlerts] CHECK CONSTRAINT [FK_StockShortageAlerts_Materials]
GO
ALTER TABLE [dbo].[StockShortageAlerts]  WITH CHECK ADD  CONSTRAINT [FK_StockShortageAlerts_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[StockShortageAlerts] CHECK CONSTRAINT [FK_StockShortageAlerts_Warehouses]
GO
ALTER TABLE [dbo].[StockTakeBinLocations]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeBinLocations_BinLocations] FOREIGN KEY([BinID])
REFERENCES [dbo].[BinLocations] ([BinID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[StockTakeBinLocations] CHECK CONSTRAINT [FK_StockTakeBinLocations_BinLocations]
GO
ALTER TABLE [dbo].[StockTakeBinLocations]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeBinLocations_StockTakes] FOREIGN KEY([StockTakeID])
REFERENCES [dbo].[StockTakes] ([StockTakeID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[StockTakeBinLocations] CHECK CONSTRAINT [FK_StockTakeBinLocations_StockTakes]
GO
ALTER TABLE [dbo].[StockTakeDetails]  WITH CHECK ADD  CONSTRAINT [FK__StockTake__Batch__18EBB532] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[StockTakeDetails] CHECK CONSTRAINT [FK__StockTake__Batch__18EBB532]
GO
ALTER TABLE [dbo].[StockTakeDetails]  WITH CHECK ADD  CONSTRAINT [FK__StockTake__Mater__17F790F9] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[StockTakeDetails] CHECK CONSTRAINT [FK__StockTake__Mater__17F790F9]
GO
ALTER TABLE [dbo].[StockTakeDetails]  WITH CHECK ADD  CONSTRAINT [FK__StockTake__Stock__17036CC0] FOREIGN KEY([StockTakeID])
REFERENCES [dbo].[StockTakes] ([StockTakeID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[StockTakeDetails] CHECK CONSTRAINT [FK__StockTake__Stock__17036CC0]
GO
ALTER TABLE [dbo].[StockTakeDetails]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeDetails_AdjustmentReasons] FOREIGN KEY([AdjustmentReasonID])
REFERENCES [dbo].[AdjustmentReasons] ([ReasonID])
GO
ALTER TABLE [dbo].[StockTakeDetails] CHECK CONSTRAINT [FK_StockTakeDetails_AdjustmentReasons]
GO
ALTER TABLE [dbo].[StockTakeDetails]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeDetails_BinLocations] FOREIGN KEY([BinID])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[StockTakeDetails] CHECK CONSTRAINT [FK_StockTakeDetails_BinLocations]
GO
ALTER TABLE [dbo].[StockTakeDetails]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeDetails_CountedBy_Users] FOREIGN KEY([CountedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[StockTakeDetails] CHECK CONSTRAINT [FK_StockTakeDetails_CountedBy_Users]
GO
ALTER TABLE [dbo].[StockTakeDetails]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeDetails_ResolvedBy_Users] FOREIGN KEY([ResolvedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[StockTakeDetails] CHECK CONSTRAINT [FK_StockTakeDetails_ResolvedBy_Users]
GO
ALTER TABLE [dbo].[StockTakeLocks]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeLocks_BinLocations] FOREIGN KEY([BinId])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[StockTakeLocks] CHECK CONSTRAINT [FK_StockTakeLocks_BinLocations]
GO
ALTER TABLE [dbo].[StockTakeLocks]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeLocks_LockedBy_Users] FOREIGN KEY([LockedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[StockTakeLocks] CHECK CONSTRAINT [FK_StockTakeLocks_LockedBy_Users]
GO
ALTER TABLE [dbo].[StockTakeLocks]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeLocks_StockTakes] FOREIGN KEY([StockTakeId])
REFERENCES [dbo].[StockTakes] ([StockTakeID])
GO
ALTER TABLE [dbo].[StockTakeLocks] CHECK CONSTRAINT [FK_StockTakeLocks_StockTakes]
GO
ALTER TABLE [dbo].[StockTakeLocks]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeLocks_UnlockedBy_Users] FOREIGN KEY([UnlockedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[StockTakeLocks] CHECK CONSTRAINT [FK_StockTakeLocks_UnlockedBy_Users]
GO
ALTER TABLE [dbo].[StockTakeLocks]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeLocks_Warehouses] FOREIGN KEY([WarehouseId])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[StockTakeLocks] CHECK CONSTRAINT [FK_StockTakeLocks_Warehouses]
GO
ALTER TABLE [dbo].[StockTakes]  WITH CHECK ADD  CONSTRAINT [FK__StockTake__Creat__14270015] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[StockTakes] CHECK CONSTRAINT [FK__StockTake__Creat__14270015]
GO
ALTER TABLE [dbo].[StockTakes]  WITH CHECK ADD  CONSTRAINT [FK__StockTake__Wareh__1332DBDC] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[StockTakes] CHECK CONSTRAINT [FK__StockTake__Wareh__1332DBDC]
GO
ALTER TABLE [dbo].[StockTakes]  WITH CHECK ADD  CONSTRAINT [FK_StockTakes_CompletedBy_Users] FOREIGN KEY([CompletedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[StockTakes] CHECK CONSTRAINT [FK_StockTakes_CompletedBy_Users]
GO
ALTER TABLE [dbo].[StockTakeSignatures]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeSignatures_StockTakes] FOREIGN KEY([StockTakeID])
REFERENCES [dbo].[StockTakes] ([StockTakeID])
GO
ALTER TABLE [dbo].[StockTakeSignatures] CHECK CONSTRAINT [FK_StockTakeSignatures_StockTakes]
GO
ALTER TABLE [dbo].[StockTakeSignatures]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeSignatures_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[StockTakeSignatures] CHECK CONSTRAINT [FK_StockTakeSignatures_Users]
GO
ALTER TABLE [dbo].[StockTakeTeamMembers]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeTeamMembers_StockTakes] FOREIGN KEY([StockTakeID])
REFERENCES [dbo].[StockTakes] ([StockTakeID])
GO
ALTER TABLE [dbo].[StockTakeTeamMembers] CHECK CONSTRAINT [FK_StockTakeTeamMembers_StockTakes]
GO
ALTER TABLE [dbo].[StockTakeTeamMembers]  WITH CHECK ADD  CONSTRAINT [FK_StockTakeTeamMembers_Users] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[StockTakeTeamMembers] CHECK CONSTRAINT [FK_StockTakeTeamMembers_Users]
GO
ALTER TABLE [dbo].[SupplementaryReceiptItems]  WITH CHECK ADD  CONSTRAINT [FK_SupplementaryReceiptItems_Materials_MaterialID] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SupplementaryReceiptItems] CHECK CONSTRAINT [FK_SupplementaryReceiptItems_Materials_MaterialID]
GO
ALTER TABLE [dbo].[SupplementaryReceiptItems]  WITH CHECK ADD  CONSTRAINT [FK_SupplementaryReceiptItems_SupplementaryReceipts_SupplementaryReceiptID] FOREIGN KEY([SupplementaryReceiptID])
REFERENCES [dbo].[SupplementaryReceipts] ([SupplementaryReceiptID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SupplementaryReceiptItems] CHECK CONSTRAINT [FK_SupplementaryReceiptItems_SupplementaryReceipts_SupplementaryReceiptID]
GO
ALTER TABLE [dbo].[SupplementaryReceipts]  WITH CHECK ADD  CONSTRAINT [FK_SupplementaryReceipts_IncidentReports_IncidentID] FOREIGN KEY([IncidentID])
REFERENCES [dbo].[IncidentReports] ([IncidentID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SupplementaryReceipts] CHECK CONSTRAINT [FK_SupplementaryReceipts_IncidentReports_IncidentID]
GO
ALTER TABLE [dbo].[SupplementaryReceipts]  WITH CHECK ADD  CONSTRAINT [FK_SupplementaryReceipts_PurchaseOrders_PurchaseOrderID] FOREIGN KEY([PurchaseOrderID])
REFERENCES [dbo].[PurchaseOrders] ([PurchaseOrderID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SupplementaryReceipts] CHECK CONSTRAINT [FK_SupplementaryReceipts_PurchaseOrders_PurchaseOrderID]
GO
ALTER TABLE [dbo].[SupplementaryReceipts]  WITH CHECK ADD  CONSTRAINT [FK_SupplementaryReceipts_SupplementaryReceipts_ParentReceiptID] FOREIGN KEY([ParentReceiptID])
REFERENCES [dbo].[SupplementaryReceipts] ([SupplementaryReceiptID])
GO
ALTER TABLE [dbo].[SupplementaryReceipts] CHECK CONSTRAINT [FK_SupplementaryReceipts_SupplementaryReceipts_ParentReceiptID]
GO
ALTER TABLE [dbo].[SupplierContracts]  WITH CHECK ADD  CONSTRAINT [FK_SupplierContracts_Suppliers] FOREIGN KEY([SupplierID])
REFERENCES [dbo].[Suppliers] ([SupplierID])
GO
ALTER TABLE [dbo].[SupplierContracts] CHECK CONSTRAINT [FK_SupplierContracts_Suppliers]
GO
ALTER TABLE [dbo].[SupplierQuotations]  WITH CHECK ADD  CONSTRAINT [FK_Quotations_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[SupplierQuotations] CHECK CONSTRAINT [FK_Quotations_Materials]
GO
ALTER TABLE [dbo].[SupplierQuotations]  WITH CHECK ADD  CONSTRAINT [FK_Quotations_Suppliers] FOREIGN KEY([SupplierID])
REFERENCES [dbo].[Suppliers] ([SupplierID])
GO
ALTER TABLE [dbo].[SupplierQuotations] CHECK CONSTRAINT [FK_Quotations_Suppliers]
GO
ALTER TABLE [dbo].[SupplierTransactions]  WITH CHECK ADD  CONSTRAINT [FK_SupplierTransactions_Suppliers_SupplierID] FOREIGN KEY([SupplierID])
REFERENCES [dbo].[Suppliers] ([SupplierID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SupplierTransactions] CHECK CONSTRAINT [FK_SupplierTransactions_Suppliers_SupplierID]
GO
ALTER TABLE [dbo].[totp_users]  WITH CHECK ADD  CONSTRAINT [FK_totp_users_Users_UserID] FOREIGN KEY([UserID])
REFERENCES [dbo].[Users] ([UserID])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[totp_users] CHECK CONSTRAINT [FK_totp_users_Users_UserID]
GO
ALTER TABLE [dbo].[TransferDetails]  WITH CHECK ADD  CONSTRAINT [FK_TransferDetails_Batches] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[TransferDetails] CHECK CONSTRAINT [FK_TransferDetails_Batches]
GO
ALTER TABLE [dbo].[TransferDetails]  WITH CHECK ADD  CONSTRAINT [FK_TransferDetails_FromBin] FOREIGN KEY([FromBinID])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[TransferDetails] CHECK CONSTRAINT [FK_TransferDetails_FromBin]
GO
ALTER TABLE [dbo].[TransferDetails]  WITH CHECK ADD  CONSTRAINT [FK_TransferDetails_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[TransferDetails] CHECK CONSTRAINT [FK_TransferDetails_Materials]
GO
ALTER TABLE [dbo].[TransferDetails]  WITH CHECK ADD  CONSTRAINT [FK_TransferDetails_ToBin] FOREIGN KEY([ToBinID])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[TransferDetails] CHECK CONSTRAINT [FK_TransferDetails_ToBin]
GO
ALTER TABLE [dbo].[TransferDetails]  WITH CHECK ADD  CONSTRAINT [FK_TransferDetails_Transfers] FOREIGN KEY([TransferID])
REFERENCES [dbo].[TransferOrders] ([TransferID])
GO
ALTER TABLE [dbo].[TransferDetails] CHECK CONSTRAINT [FK_TransferDetails_Transfers]
GO
ALTER TABLE [dbo].[TransferOrders]  WITH CHECK ADD  CONSTRAINT [FK__TransferO__Assig__02FC7413] FOREIGN KEY([AssignedTo])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[TransferOrders] CHECK CONSTRAINT [FK__TransferO__Assig__02FC7413]
GO
ALTER TABLE [dbo].[TransferOrders]  WITH CHECK ADD  CONSTRAINT [FK_Transfers_Creators] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[TransferOrders] CHECK CONSTRAINT [FK_Transfers_Creators]
GO
ALTER TABLE [dbo].[TransferOrders]  WITH CHECK ADD  CONSTRAINT [FK_Transfers_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[TransferOrders] CHECK CONSTRAINT [FK_Transfers_Warehouses]
GO
ALTER TABLE [dbo].[Users]  WITH CHECK ADD  CONSTRAINT [FK_Users_Roles] FOREIGN KEY([RoleID])
REFERENCES [dbo].[Roles] ([RoleID])
GO
ALTER TABLE [dbo].[Users] CHECK CONSTRAINT [FK_Users_Roles]
GO
ALTER TABLE [dbo].[WarehouseCards]  WITH CHECK ADD  CONSTRAINT [FK_WarehouseCards_Batches] FOREIGN KEY([BatchID])
REFERENCES [dbo].[Batches] ([BatchID])
GO
ALTER TABLE [dbo].[WarehouseCards] CHECK CONSTRAINT [FK_WarehouseCards_Batches]
GO
ALTER TABLE [dbo].[WarehouseCards]  WITH CHECK ADD  CONSTRAINT [FK_WarehouseCards_BinLocations] FOREIGN KEY([BinID])
REFERENCES [dbo].[BinLocations] ([BinID])
GO
ALTER TABLE [dbo].[WarehouseCards] CHECK CONSTRAINT [FK_WarehouseCards_BinLocations]
GO
ALTER TABLE [dbo].[WarehouseCards]  WITH CHECK ADD  CONSTRAINT [FK_WarehouseCards_Materials] FOREIGN KEY([MaterialID])
REFERENCES [dbo].[Materials] ([MaterialID])
GO
ALTER TABLE [dbo].[WarehouseCards] CHECK CONSTRAINT [FK_WarehouseCards_Materials]
GO
ALTER TABLE [dbo].[WarehouseCards]  WITH CHECK ADD  CONSTRAINT [FK_WarehouseCards_Users] FOREIGN KEY([CreatedBy])
REFERENCES [dbo].[Users] ([UserID])
GO
ALTER TABLE [dbo].[WarehouseCards] CHECK CONSTRAINT [FK_WarehouseCards_Users]
GO
ALTER TABLE [dbo].[WarehouseCards]  WITH CHECK ADD  CONSTRAINT [FK_WarehouseCards_Warehouses] FOREIGN KEY([WarehouseID])
REFERENCES [dbo].[Warehouses] ([WarehouseID])
GO
ALTER TABLE [dbo].[WarehouseCards] CHECK CONSTRAINT [FK_WarehouseCards_Warehouses]
GO
ALTER TABLE [dbo].[StockTakeLocks]  WITH CHECK ADD  CONSTRAINT [CK_StockTakeLocks_BinRequired] CHECK  (([ScopeType]='Warehouse' AND [BinId] IS NULL OR [ScopeType]='Bin' AND [BinId] IS NOT NULL))
GO
ALTER TABLE [dbo].[StockTakeLocks] CHECK CONSTRAINT [CK_StockTakeLocks_BinRequired]
GO
ALTER TABLE [dbo].[StockTakeLocks]  WITH CHECK ADD  CONSTRAINT [CK_StockTakeLocks_ScopeType] CHECK  (([ScopeType]='Bin' OR [ScopeType]='Warehouse'))
GO
ALTER TABLE [dbo].[StockTakeLocks] CHECK CONSTRAINT [CK_StockTakeLocks_ScopeType]
GO
