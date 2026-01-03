# Read App.tsx
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Add useCallback and useMemo to imports (line 1)
if lines[0].startswith("import { useEffect }"):
    lines[0] = "import { useEffect, useCallback, useMemo } from 'react'\n"

# Now process the file to find and wrap functions
output = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Check for motorsBySPS computation
    if 'const motorsBySPS = {' in line:
        output.append('  // Memoize motorsBySPS computation to prevent unnecessary re-calculations\n')
        output.append('  const motorsBySPS = useMemo(() => ({\n')
        i += 1
        # Copy lines until we find the closing
        while i < len(lines):
            line = lines[i]
            output.append(line)
            if line.strip() == '}':
                output.append('  ), [motors])\n')
                i += 1
                break
            i += 1
        continue
    
    # Check for function definitions that need useCallback
    if 'const updateMotorName = async (motorName: string, newDisplayName: string) => {' in line:
        output.append('  // Memoized to prevent unnecessary re-renders of child components\n')
        output.append('  const updateMotorName = useCallback(async (motorName: string, newDisplayName: string) => {\n')
        i += 1
        # Find the end of this function
        brace_count = 1
        while i < len(lines) and brace_count > 0:
            line = lines[i]
            if '{' in line:
                brace_count += line.count('{')
            if '}' in line:
                brace_count -= line.count('}')
            output.append(line)
            i += 1
        output.append('  }, [setMotors])\n')
        continue
    
    if 'const updateRoomIcon = async (roomName: string, icon: string) => {' in line:
        output.append('  // Memoized to prevent unnecessary re-renders of child components\n')
        output.append('  const updateRoomIcon = useCallback(async (roomName: string, icon: string) => {\n')
        i += 1
        brace_count = 1
        while i < len(lines) and brace_count > 0:
            line = lines[i]
            if '{' in line:
                brace_count += line.count('{')
            if '}' in line:
                brace_count -= line.count('}')
            output.append(line)
            i += 1
        output.append('  }, [setRoomIcons])\n')
        continue
    
    if 'const updateGroup = async (groupName: string, windows: string[]) => {' in line:
        output.append('  // Memoized to prevent unnecessary re-renders of child components\n')
        output.append('  const updateGroup = useCallback(async (groupName: string, windows: string[]) => {\n')
        i += 1
        brace_count = 1
        while i < len(lines) and brace_count > 0:
            line = lines[i]
            if '{' in line:
                brace_count += line.count('{')
            if '}' in line:
                brace_count -= line.count('}')
            output.append(line)
            i += 1
        output.append('  }, [setGroups])\n')
        continue
    
    if 'const deleteGroup = async (groupName: string) => {' in line:
        output.append('  // Memoized to prevent unnecessary re-renders of child components\n')
        output.append('  const deleteGroup = useCallback(async (groupName: string) => {\n')
        i += 1
        brace_count = 1
        while i < len(lines) and brace_count > 0:
            line = lines[i]
            if '{' in line:
                brace_count += line.count('{')
            if '}' in line:
                brace_count -= line.count('}')
            output.append(line)
            i += 1
        output.append('  }, [setGroups])\n')
        continue
    
    if "const handleAction = async (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => {" in line:
        output.append('  // Memoized to prevent unnecessary re-renders of child components\n')
        output.append("  const handleAction = useCallback(async (motor: Motor, action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => {\n")
        i += 1
        brace_count = 1
        while i < len(lines) and brace_count > 0:
            line = lines[i]
            if '{' in line:
                brace_count += line.count('{')
            if '}' in line:
                brace_count -= line.count('}')
            output.append(line)
            i += 1
        output.append('  }, [setIsLoading, setErrorMessage, setMotors])\n')
        continue
    
    if "const handleGroupAction = async (groupMotors: Motor[], action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => {" in line:
        output.append('  // Memoized to prevent unnecessary re-renders of child components\n')
        output.append("  const handleGroupAction = useCallback(async (groupMotors: Motor[], action: 'up' | 'down' | 'stop' | 'lamellen_open' | 'lamellen_close') => {\n")
        i += 1
        brace_count = 1
        while i < len(lines) and brace_count > 0:
            line = lines[i]
            if '{' in line:
                brace_count += line.count('{')
            if '}' in line:
                brace_count -= line.count('}')
            output.append(line)
            i += 1
        output.append('  }, [setIsLoading, setErrorMessage, setMotors])\n')
        continue
    
    # Default: copy line as-is
    output.append(line)
    i += 1

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(output)

print("App.tsx optimized successfully")
