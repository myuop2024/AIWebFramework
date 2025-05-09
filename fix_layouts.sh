#!/bin/bash

fix_file() {
  local file=$1
  echo "Fixing $file"
  
  # Remove MainLayout import
  sed -i "s/import MainLayout from \"@\/components\/layout\/main-layout\";//" "$file"
  
  # Remove MainLayout wrappers in loading states 
  sed -i "s/<MainLayout>[\s]*<Card/<Card/g" "$file"
  sed -i "s/<\/Card>[\s]*<\/MainLayout>/<\/Card>/g" "$file"
  
  # Remove MainLayout wrappers in return statements
  sed -i "s/return ([\s]*<MainLayout>/return (/g" "$file"
  sed -i "s/<\/MainLayout>[\s]*);/);/g" "$file"
}

# Find and fix files with MainLayout imports
for file in $(grep -l "import MainLayout" client/src/pages/*.tsx client/src/pages/*/*.tsx); do
  fix_file "$file"
  echo "Fixed $file"
done

echo "All files fixed!"
