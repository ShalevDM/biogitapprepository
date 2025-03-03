#!/bin/bash
# Question 5 - Bash script to create CSV file

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