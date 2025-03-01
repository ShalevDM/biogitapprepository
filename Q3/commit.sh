#!/bin/bash

# Get bug information
bugid=$1
description=$2
dev_description=$3

# Get other information automatically
date_time=$(date +"%Y-%m-%d %H:%M:%S")
branch_name=$(git rev-parse --abbrev-ref HEAD)
developer_name=$(git config user.name)

priority="3"

# Format the commit message
commit_message="BugID:$bugid|CurrDateTime:$date_time|Branch.Name:$branch_name|DevName:$developer_name|Priority:$priority|Excel.Description:$description|Dev.Description:$dev_description"

# Perform the git commit
git commit -m "$commit_message"

# Remind user to push
echo "Commit created successfully. Remember to push your changes with 'git push'."