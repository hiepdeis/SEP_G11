
CREATE TABLE InventoryIssueDetails (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    InventoryIssueId BIGINT NOT NULL,
    IssueDetailId BIGINT NOT NULL,
    BatchId INT NOT NULL,
    Quantity DECIMAL(18,4) NOT NULL,

    CONSTRAINT FK_IssueDetail_InventoryIssues
        FOREIGN KEY (InventoryIssueId)
        REFERENCES InventoryIssues(Id),

    CONSTRAINT FK_IssueDetail_IssueDetails
        FOREIGN KEY (IssueDetailId)
        REFERENCES IssueDetails(DetailID),

    CONSTRAINT FK_IssueDetail_Batch
        FOREIGN KEY (BatchId)
        REFERENCES Batches(BatchID)
);