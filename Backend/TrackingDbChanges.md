## 1 - Thongdnm change

- Adding RefreshToken, Status, and PhoneNumber columns to Users table.
- To do this, please run this migration using the command:
  + dotnet ef migrations add AddAuthFieldsToUsers
  + dotnet ef database update
