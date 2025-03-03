import argparse
import matplotlib.pyplot as plt

# Set up argument parsing
parser = argparse.ArgumentParser(description="Generate plant growth plots.")
parser.add_argument("--plant", type=str, required=True, help="Name of the plant")
parser.add_argument("--height", type=float, nargs='+', required=True, help="List of height values")
parser.add_argument("--leaf_count", type=int, nargs='+', required=True, help="List of leaf count values")
parser.add_argument("--dry_weight", type=float, nargs='+', required=True, help="List of dry weight values")

# Parse the arguments
args = parser.parse_args()

# Assign values from arguments
plant = args.plant
height_data = args.height
leaf_count_data = args.leaf_count
dry_weight_data = args.dry_weight

# Print out the plant data (optional)
print(f"Plant: {plant}")
print(f"Height data: {height_data} cm")
print(f"Leaf count data: {leaf_count_data}")
print(f"Dry weight data: {dry_weight_data} g")

# Scatter Plot - Height vs Leaf Count
plt.figure(figsize=(10, 6))
plt.scatter(height_data, leaf_count_data, color='b')
plt.title(f"Height vs Leaf Count for {plant}")
plt.xlabel("Height (cm)")
plt.ylabel("Leaf Count")
plt.grid(True)
plt.savefig(f"{plant}_scatter.png")
plt.close()

# Histogram - Distribution of Dry Weight
plt.figure(figsize=(10, 6))
plt.hist(dry_weight_data, bins=5, color='g', edgecolor='black')
plt.title(f"Histogram of Dry Weight for {plant}")
plt.xlabel("Dry Weight (g)")
plt.ylabel("Frequency")
plt.grid(True)
plt.savefig(f"{plant}_histogram.png")
plt.close()

# Line Plot - Plant Height Over Time
weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']
plt.figure(figsize=(10, 6))
plt.plot(weeks, height_data, marker='o', color='r')
plt.title(f"{plant} Height Over Time")
plt.xlabel("Week")
plt.ylabel("Height (cm)")
plt.grid(True)
plt.savefig(f"{plant}_line_plot.png")
plt.close()

# Output confirmation
print(f"Generated plots for {plant}:")
print(f"Scatter plot saved as {plant}_scatter.png")
print(f"Histogram saved as {plant}_histogram.png")
print(f"Line plot saved as {plant}_line_plot.png")
