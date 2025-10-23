
# Data Restoration Instructions

## Available Data:
- Users: 11
- Customers: 5
- Requests: 15
- Products: 6
- Spare Parts: 1
- Departments: 4

## Restoration Methods:

### Method 1: Direct Database Copy
1. Copy the SQLite database file to your deployment
2. Run database migrations
3. Update environment variables

### Method 2: Use JSON Export
1. Use the exported JSON file: C:\Users\acer\Desktop\MEs\mes_program\backend\data-export.json
2. Import data into your deployment database
3. Run the migration script

### Method 3: Manual Import
1. Use the Excel files for reference
2. Manually enter critical data
3. Use the seed scripts for initial setup

## Next Steps:
1. Choose your preferred restoration method
2. Update your deployment database
3. Verify data integrity
4. Test the application
