import csv
import os
import sqlite3
import matplotlib.pyplot as plt
import subprocess

# Global variables to store our data
csv_data = []
current_filename = None
last_output = []

def create_csv_by_name():
    """Create a CSV file with the specified name"""
    global current_filename, csv_data
    filename = input("Enter CSV filename to create: ")
    current_filename = filename
    csv_data = []
    print(f"CSV file '{filename}' has been initialized.")

def display_all_csv_data():
    """Display all CSV data with row indices"""
    global csv_data
    if not csv_data:
        print("No data available. Please create or load a CSV file first.")
        return
    
    print("\nIndex | Date collected | Species | Sex | Weight")
    print("-" * 50)
    
    for idx, row in enumerate(csv_data):
        print(f"{idx:<5} | {row[0]:<15} | {row[1]:<8} | {row[2]:<4} | {row[3]}")

def read_user_input_for_new_row():
    """Read user input for a new row and add it to the data"""
    global csv_data
    date = input("Enter date (format: M/D): ")
    species = input("Enter species (e.g. OT, PF, NA): ")
    sex = input("Enter sex (M/F): ")
    weight = input("Enter weight: ")
    
    new_row = [date, species, sex, weight]
    csv_data.append(new_row)
    print(f"New row added: {new_row}")

def display_specie_and_avg_weight():
    """Display all items of a specific species and calculate average weight"""
    global csv_data, last_output
    specie = input("Enter species type to display (e.g. OT): ")
    
    filtered_data = [row for row in csv_data if row[1].upper() == specie.upper()]
    last_output = filtered_data
    
    if not filtered_data:
        print(f"No data found for species '{specie}'")
        return
    
    print(f"\nAll records for species '{specie}':")
    print("Date collected | Species | Sex | Weight")
    print("-" * 50)
    
    total_weight = 0
    count = 0
    
    for row in filtered_data:
        print(f"{row[0]:<15} | {row[1]:<8} | {row[2]:<4} | {row[3]}")
        try:
            weight = float(row[3])
            total_weight += weight
            count += 1
        except ValueError:
            pass
    
    if count > 0:
        avg_weight = total_weight / count
        print(f"\nAverage weight for species '{specie}': {avg_weight:.2f}")
    else:
        print(f"\nCouldn't calculate average weight for species '{specie}'")

def display_specie_sex():
    """Display all items of a specific species and sex"""
    global csv_data, last_output
    specie = input("Enter species (e.g. OT, PF, NA): ")
    sex = input("Enter sex (M/F): ")
    
    filtered_data = [row for row in csv_data if row[1].upper() == specie.upper() and row[2].upper() == sex.upper()]
    last_output = filtered_data
    
    if not filtered_data:
        print(f"No data found for species '{specie}' with sex '{sex}'")
        return
    
    print(f"\nAll records for species '{specie}' with sex '{sex}':")
    print("Date collected | Species | Sex | Weight")
    print("-" * 50)
    
    for row in filtered_data:
        print(f"{row[0]:<15} | {row[1]:<8} | {row[2]:<4} | {row[3]}")

def save_to_new_csv():
    """Save the last output to a new CSV file"""
    global last_output
    if not last_output:
        print("No output to save. Please run a query first.")
        return
    
    filename = input("Enter filename to save to: ")
    
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Date collected", "Species", "Sex", "Weight"])
        writer.writerows(last_output)
    
    print(f"Data saved to '{filename}' successfully.")

def delete_row_by_index():
    """Delete a row by index"""
    global csv_data
    display_all_csv_data()
    
    try:
        idx = int(input("Enter row index to delete: "))
        if 0 <= idx < len(csv_data):
            deleted_row = csv_data.pop(idx)
            print(f"Deleted row: {deleted_row}")
        else:
            print("Invalid index. Please enter a valid row index.")
    except ValueError:
        print("Please enter a valid number for the row index.")

def update_weight_by_index():
    """Update the weight of a row by index"""
    global csv_data
    display_all_csv_data()
    
    try:
        idx = int(input("Enter row index to update weight: "))
        if 0 <= idx < len(csv_data):
            new_weight = input("Enter new weight: ")
            csv_data[idx][3] = new_weight
            print(f"Updated weight for row {idx} to {new_weight}")
        else:
            print("Invalid index. Please enter a valid row index.")
    except ValueError:
        print("Please enter a valid number for the row index.")

def exit_program():
    """Exit the program"""
    print("Exiting program. Goodbye!")
    return True

def load_sample_data():
    """Load sample data from the assignment"""
    global csv_data
    # Sample data from the image
    csv_data = [
        ["1/8", "PF", "M", "7"],
        ["2/18", "OT", "M", "24"],
        ["2/19", "OT", "F", "23"],
        ["3/11", "NA", "M", "22"],
        ["3/11", "OT", "F", "22"],
        ["3/11", "OT", "M", "26"],
        ["3/11", "PF", "M", "8"],
        ["4/8", "NA", "F", "8"],
        ["5/6", "NA", "F", "45"],
        ["5/18", "NA", "F", "182"],
        ["6/9", "OT", "F", "29"]
    ]
    print("Sample data loaded successfully.")

def save_current_data():
    """Save current data to CSV file"""
    global csv_data, current_filename
    if not current_filename:
        current_filename = input("Enter filename to save to: ")
    
    with open(current_filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Date collected", "Species", "Sex", "Weight"])
        writer.writerows(csv_data)
    
    print(f"Data saved to '{current_filename}' successfully.")

# Advanced features implementation
def create_sqlite_db():
    """Create SQLite database from CSV data"""
    global csv_data
    
    conn = sqlite3.connect('species_data.db')
    c = conn.cursor()
    
    # Create table
    c.execute('''
    CREATE TABLE IF NOT EXISTS species_data
    (date_collected TEXT, species TEXT, sex TEXT, weight REAL)
    ''')
    
    # Insert data
    for row in csv_data:
        try:
            weight = float(row[3])
        except ValueError:
            weight = 0
        c.execute("INSERT INTO species_data VALUES (?, ?, ?, ?)", 
                 (row[0], row[1], row[2], weight))
    
    conn.commit()
    conn.close()
    print("SQLite database created successfully.")

def group_by_species_and_calculate_mean():
    """Group by species and calculate mean weight using SQLite"""
    conn = sqlite3.connect('species_data.db')
    c = conn.cursor()
    
    c.execute('''
    SELECT species, AVG(weight) 
    FROM species_data 
    GROUP BY species
    ''')
    
    results = c.fetchall()
    
    print("\nAverage Weight by Species:")
    print("-" * 30)
    for row in results:
        print(f"{row[0]:<8} | {row[1]:.2f}")
    
    conn.close()
    
    # Save results to output file
    with open('5_output.txt', 'a') as f:
        f.write("\nAverage Weight by Species:\n")
        f.write("-" * 30 + "\n")
        for row in results:
            f.write(f"{row[0]:<8} | {row[1]:.2f}\n")

def calculate_total_weight_by_species():
    """Calculate total weight by species using SQLite"""
    conn = sqlite3.connect('species_data.db')
    c = conn.cursor()
    
    c.execute('''
    SELECT species, SUM(weight) 
    FROM species_data 
    GROUP BY species
    ''')
    
    results = c.fetchall()
    
    print("\nTotal Weight by Species:")
    print("-" * 30)
    for row in results:
        print(f"{row[0]:<8} | {row[1]:.2f}")
    
    conn.close()
    
    # Save results to output file
    with open('5_output.txt', 'a') as f:
        f.write("\nTotal Weight by Species:\n")
        f.write("-" * 30 + "\n")
        for row in results:
            f.write(f"{row[0]:<8} | {row[1]:.2f}\n")

def sort_data_by_weight():
    """Sort data by weight using SQLite"""
    conn = sqlite3.connect('species_data.db')
    c = conn.cursor()
    
    c.execute('''
    SELECT date_collected, species, sex, weight 
    FROM species_data 
    ORDER BY weight DESC
    ''')
    
    results = c.fetchall()
    
    print("\nData Sorted by Weight (Descending):")
    print("Date collected | Species | Sex | Weight")
    print("-" * 50)
    for row in results:
        print(f"{row[0]:<15} | {row[1]:<8} | {row[2]:<4} | {row[3]}")
    
    conn.close()
    
    # Save results to output file
    with open('5_output.txt', 'a') as f:
        f.write("\nData Sorted by Weight (Descending):\n")
        f.write("Date collected | Species | Sex | Weight\n")
        f.write("-" * 50 + "\n")
        for row in results:
            f.write(f"{row[0]:<15} | {row[1]:<8} | {row[2]:<4} | {row[3]}\n")

def plot_weight_distribution_by_sex():
    """Create a plot of weight distribution by sex"""
    conn = sqlite3.connect('species_data.db')
    c = conn.cursor()
    
    c.execute('''
    SELECT sex, weight 
    FROM species_data
    ''')
    
    results = c.fetchall()
    
    male_weights = [r[1] for r in results if r[0].upper() == 'M']
    female_weights = [r[1] for r in results if r[0].upper() == 'F']
    
    plt.figure(figsize=(10, 6))
    plt.boxplot([male_weights, female_weights], labels=['Male', 'Female'])
    plt.title('Weight Distribution by Sex')
    plt.ylabel('Weight')
    plt.savefig('weight_distribution_by_sex.png')
    plt.close()
    
    print("Plot saved as 'weight_distribution_by_sex.png'")
    
    conn.close()

def count_records_by_species():
    """Count the number of records by species"""
    conn = sqlite3.connect('species_data.db')
    c = conn.cursor()
    
    c.execute('''
    SELECT species, COUNT(*) 
    FROM species_data 
    GROUP BY species
    ''')
    
    results = c.fetchall()
    
    print("\nNumber of Records by Species:")
    print("-" * 30)
    for row in results:
        print(f"{row[0]:<8} | {row[1]}")
    
    conn.close()
    
    # Save results to output file
    with open('5_output.txt', 'a') as f:
        f.write("\nNumber of Records by Species:\n")
        f.write("-" * 30 + "\n")
        for row in results:
            f.write(f"{row[0]:<8} | {row[1]}\n")

def count_males_and_females():
    """Count the number of males and females"""
    conn = sqlite3.connect('species_data.db')
    c = conn.cursor()
    
    c.execute('''
    SELECT sex, COUNT(*) 
    FROM species_data 
    GROUP BY sex
    ''')
    
    results = c.fetchall()
    
    print("\nNumber of Males and Females:")
    print("-" * 30)
    for row in results:
        print(f"{row[0]:<8} | {row[1]}")
    
    conn.close()
    
    # Save results to output file
    with open('5_output.txt', 'a') as f:
        f.write("\nNumber of Males and Females:\n")
        f.write("-" * 30 + "\n")
        for row in results:
            f.write(f"{row[0]:<8} | {row[1]}\n")

def filter_data_by_species():
    """Filter data by species"""
    specie = input("Enter species to filter by: ")
    
    conn = sqlite3.connect('species_data.db')
    c = conn.cursor()
    
    c.execute('''
    SELECT date_collected, species, sex, weight 
    FROM species_data 
    WHERE species = ?
    ''', (specie,))
    
    results = c.fetchall()
    
    print(f"\nFiltered Data for Species '{specie}':")
    print("Date collected | Species | Sex | Weight")
    print("-" * 50)
    for row in results:
        print(f"{row[0]:<15} | {row[1]:<8} | {row[2]:<4} | {row[3]}")
    
    conn.close()
    
    # Save results to output file
    with open('5_output.txt', 'a') as f:
        f.write(f"\nFiltered Data for Species '{specie}':\n")
        f.write("Date collected | Species | Sex | Weight\n")
        f.write("-" * 50 + "\n")
        for row in results:
            f.write(f"{row[0]:<15} | {row[1]:<8} | {row[2]:<4} | {row[3]}\n")

def create_csv_with_bash():
    """Create a CSV file using a bash script"""
    bash_script = """#!/bin/bash
    echo "Date collected,Species,Sex,Weight" > species_data_bash.csv
    echo "1/8,PF,M,7" >> species_data_bash.csv
    echo "2/18,OT,M,24" >> species_data_bash.csv
    echo "2/19,OT,F,23" >> species_data_bash.csv
    echo "3/11,NA,M,22" >> species_data_bash.csv
    echo "3/11,OT,F,22" >> species_data_bash.csv
    echo "3/11,OT,M,26" >> species_data_bash.csv
    echo "3/11,PF,M,8" >> species_data_bash.csv
    echo "4/8,NA,F,8" >> species_data_bash.csv
    echo "5/6,NA,F,45" >> species_data_bash.csv
    echo "5/18,NA,F,182" >> species_data_bash.csv
    echo "6/9,OT,F,29" >> species_data_bash.csv
    echo "CSV file created with Bash!"
    """
    
    # Write bash script to file
    with open('create_csv.sh', 'w') as f:
        f.write(bash_script)
    
    # Make it executable
    os.chmod('create_csv.sh', 0o755)
    
    # Execute the bash script
    subprocess.run(['./create_csv.sh'], shell=True)
    
    print("CSV file created using Bash script.")

def advanced_menu():
    """Show advanced features menu"""
    print("\n=== Advanced Features ===")
    print("1. Create SQLite Database")
    print("2. Group by Species and Calculate Mean Weight")
    print("3. Calculate the Total Weight by Species")
    print("4. Sorting the Data by Weight")
    print("5. Plotting in image Weight Distribution by Sex")
    print("6. Count the Number of Records per Species")
    print("7. Count the Number of Males and Females")
    print("8. Filter Data by Species")
    print("9. Create CSV with BASH Script")
    print("0. Return to main menu")
    
    choice = input("\nEnter your choice (0-9): ")
    
    if choice == '1':
        create_sqlite_db()
    elif choice == '2':
        group_by_species_and_calculate_mean()
    elif choice == '3':
        calculate_total_weight_by_species()
    elif choice == '4':
        sort_data_by_weight()
    elif choice == '5':
        plot_weight_distribution_by_sex()
    elif choice == '6':
        count_records_by_species()
    elif choice == '7':
        count_males_and_females()
    elif choice == '8':
        filter_data_by_species()
    elif choice == '9':
        create_csv_with_bash()
    elif choice == '0':
        return
    else:
        print("Invalid choice. Please try again.")

def main():
    """Main function to run the program"""
    # Initialize output file
    with open('5_output.txt', 'w') as f:
        f.write("===== Question 5 Output =====\n")
    
    # Load sample data for testing
    load_sample_data()
    
    while True:
        print("\n=== CSV Data Management ===")
        print("1. CREATE CSV by name")
        print("2. Display all CSV DATA with row INDEX")
        print("3. Read user input for new row")
        print("4. Read Specie (OT for example) And Display all items of that specie type and the AVG weight")
        print("5. Read Specie sex (M/F) and display all items of specie-sex")
        print("6. Save last output to new csv file")
        print("7. Delete row by row index")
        print("8. Update weight by row index")
        print("9. Exit")
        print("10. Advanced Features")
        
        choice = input("\nEnter your choice (1-10): ")
        
        if choice == '1':
            create_csv_by_name()
        elif choice == '2':
            display_all_csv_data()
        elif choice == '3':
            read_user_input_for_new_row()
        elif choice == '4':
            display_specie_and_avg_weight()
        elif choice == '5':
            display_specie_sex()
        elif choice == '6':
            save_to_new_csv()
        elif choice == '7':
            delete_row_by_index()
        elif choice == '8':
            update_weight_by_index()
        elif choice == '9':
            if exit_program():
                break
        elif choice == '10':
            advanced_menu()
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()