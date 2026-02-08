## 1 - Thongdnm change


- In this commit, we have added three new columns to the Users table in our database:
  + RefreshToken: This column will store the refresh token for user authentication.
  + Status: This column will indicate the current status of the user (e.g., active, inactive).
  + PhoneNumber: This column will store the user's phone number.

- And we also added three new columns to the Receipts table:
  + Notes
  + SubmittedAt
  + SubmittedBy

- To do this, please run this migration using the command:
  + dotnet ef database update
	+ 

## 2 - Thongdnm change
