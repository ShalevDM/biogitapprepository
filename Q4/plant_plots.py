import csv

# Data from the sample
plant_data = [
    ["Plant", "Height", "Leaf_Count", "Dry_Weight"],
    ["Rose", "50 55 60 65 70", "35 40 45 50 55", "2.0 2.2 2.5 2.7 3.0"],
    ["Tulip", "30 35 40 42", "12 15 18 20", "1.5 1.6 1.7 1.8"],
    ["Sunflower", "120 125 130 135", "50 55 60 65", "5.0 5.5 6.0 6.5"],
    ["Daffodil", "40 45 50 55", "15 18 20 22", "1.8 2.0 2.2 2.5"],
    ["Lily", "60 65 70", "20 22 24", "2.5 2.7 3.0"]
]

# Write data to CSV file
with open('plants.csv', 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    for row in plant_data:
        writer.writerow(row)

print("CSV file 'plants.csv' has been created successfully.")