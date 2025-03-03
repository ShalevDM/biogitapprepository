#!/bin/bash

# Check if CSV file exists
if [ ! -f "plants.csv" ]; then
    echo "Error: plants.csv file not found!"
    exit 1
fi

# Create directory for output if it doesn't exist
mkdir -p "Q4/4_1"

# Skip header line and read each row
tail -n +2 "plants.csv" | while IFS=, read -r plant height leaf_count dry_weight
do
    # Remove quotes if present
    plant=$(echo "$plant" | tr -d '"')
    height=$(echo "$height" | tr -d '"')
    leaf_count=$(echo "$leaf_count" | tr -d '"')
    dry_weight=$(echo "$dry_weight" | tr -d '"')
    
    echo "Processing data for $plant..."
    
    # Run the Python script with the parameters
    python plant_plots.py --plant "$plant" --height $height --leaf_count $leaf_count --dry_weight $dry_weight
    
    # Move generated plot files to Q4/4_1 directory
    mv "${plant}_scatter.png" "${plant}_histogram.png" "${plant}_line_plot.png" Q4/4_1/ 2>/dev/null
    
    echo "Completed processing for $plant"
    echo "------------------------"
done

echo "All plants have been processed successfully."