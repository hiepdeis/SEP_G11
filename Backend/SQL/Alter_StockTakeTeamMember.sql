-- 1) Add column nếu chưa có
IF COL_LENGTH('dbo.StockTakeTeamMembers', 'MemberCompletedAt') IS NULL
BEGIN
    ALTER TABLE dbo.StockTakeTeamMembers
    ADD MemberCompletedAt datetime2 NULL;
END
GO

-- 2) Backfill (tuỳ chọn): audit Completed => member cũng completed
UPDATE tm
SET MemberCompletedAt = st.CompletedAt      -- KHÔNG ghi tm.MemberCompletedAt
FROM dbo.StockTakeTeamMembers AS tm
JOIN dbo.StockTakes AS st
    ON st.StockTakeID = tm.StockTakeID
WHERE st.CompletedAt IS NOT NULL
  AND tm.MemberCompletedAt IS NULL;
GO

-- 3) Unique filtered index (khuyên dùng) nếu chưa có
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_TeamMembers_User_Busy'
      AND object_id = OBJECT_ID('dbo.StockTakeTeamMembers')
)
BEGIN
    CREATE UNIQUE INDEX UX_TeamMembers_User_Busy
    ON dbo.StockTakeTeamMembers(UserID)
    WHERE IsActive = 1 AND MemberCompletedAt IS NULL;
END
GO
