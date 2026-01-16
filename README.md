.net 8 
my sql 
node 22
backend : (gen database)  (5000)
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate
dotnet ef database update
fe : npm install (3000)
    npm run dev 
