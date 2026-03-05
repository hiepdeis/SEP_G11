
CREATE TABLE InventoryIssues (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    IssueSlipId BIGINT NOT NULL,
    IssueCode NVARCHAR(50) NOT NULL,
    CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
    Status NVARCHAR(50) NOT NULL,

    CONSTRAINT FK_InventoryIssue_IssueSlips
        FOREIGN KEY (IssueSlipId)
        REFERENCES IssueSlips(IssueID)
);