import os
import re

# List of settings view files to optimize
view_files = [
    'src/components/settings/SpsView.tsx',
    'src/components/settings/GroupsView.tsx',
    'src/components/settings/AutomatikView.tsx',
    'src/components/settings/ZeitautomatikView.tsx',
    'src/components/settings/MotorTimesView.tsx'
]

for filepath in view_files:
    print(f"Processing {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already has memo import
    has_memo = 'memo' in content and 'from' in content.split('memo')[0].split('\n')[-1]
    
    if not has_memo:
        # Add memo to React import if not present
        # Find the react import line
        react_import_match = re.search(r"import.*from 'react'", content)
        if react_import_match:
            old_import = react_import_match.group(0)
            # Check if it already has { ... }
            if '{' in old_import and '}' in old_import:
                # Add memo to existing imports
                new_import = old_import.replace('}', ', memo }')
            else:
                # It's just "import React from 'react'", add named import
                new_import = old_import.replace("from 'react'", ", { memo } from 'react'")
            content = content.replace(old_import, new_import)
    
    # Find the component export
    export_match = re.search(r'export default function (\w+)', content)
    if export_match:
        component_name = export_match.group(1)
        
        # Change export default function to just function
        content = content.replace(
            f'export default function {component_name}',
            f'function {component_name}'
        )
        
        # Add memo export at the end if not present
        if f'export default memo({component_name})' not in content:
            content = content.rstrip() + f'\n\nexport default memo({component_name})\n'
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  Optimized: {filepath}")

print("\nAll Settings subviews optimized with React.memo!")
