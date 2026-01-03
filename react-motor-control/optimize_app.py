import re

# Read App.tsx
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add useCallback and useMemo to imports
content = content.replace(
    "import { useEffect } from 'react'",
    "import { useEffect, useCallback, useMemo } from 'react'"
)

# Find motorsBySPS computation - needs to be memoized
# Look for pattern where motors are split by SPS
motors_by_sps_pattern = r'(  const motorsBySPS[^}]+}[^}]+})'
if re.search(motors_by_sps_pattern, content):
    # Wrap with useMemo
    content = re.sub(
        r'  const motorsBySPS = {',
        '  // Memoize motorsBySPS computation to prevent unnecessary re-calculations\n  const motorsBySPS = useMemo(() => ({',
        content
    )
    # Find the closing and add dependency
    content = re.sub(
        r'(    SPS3: motors\.filter\(m => m\.sps === \'SPS3\'\)\n  })',
        r'\1), [motors])',
        content
    )

# Wrap updateMotorName with useCallback
content = re.sub(
    r'  const updateMotorName = async \(motorName: string, newDisplayName: string\) => {',
    '  // Memoized to prevent unnecessary re-renders of child components\n  const updateMotorName = useCallback(async (motorName: string, newDisplayName: string) => {',
    content
)
# Find its closing
content = re.sub(
    r'(      return false\n    }\n  }\n\n  const updateRoomIcon)',
    r'\1eback([setMotors])\n\n  const updateRoomIcon',
    content
)
content = content.replace('}\n  }eback([setMotors])', '}\n  }, [setMotors])')

# Wrap updateRoomIcon with useCallback
content = re.sub(
    r'  const updateRoomIcon = async \(roomName: string, icon: string\) => {',
    '  // Memoized to prevent unnecessary re-renders of child components\n  const updateRoomIcon = useCallback(async (roomName: string, icon: string) => {',
    content
)
# Find its closing
content = re.sub(
    r'(      return false\n    }\n  }\n\n  const updateGroup)',
    r'\1eback([setRoomIcons])\n\n  const updateGroup',
    content
)
content = content.replace('}\n  }eback([setRoomIcons])', '}\n  }, [setRoomIcons])')

# Wrap updateGroup with useCallback
content = re.sub(
    r'  const updateGroup = async \(groupName: string, windows: string\[\]\) => {',
    '  // Memoized to prevent unnecessary re-renders of child components\n  const updateGroup = useCallback(async (groupName: string, windows: string[]) => {',
    content
)
# Find its closing
content = re.sub(
    r'(      return false\n    }\n  }\n\n  const deleteGroup)',
    r'\1eback([setGroups])\n\n  const deleteGroup',
    content
)
content = content.replace('}\n  }eback([setGroups])', '}\n  }, [setGroups])')

# Wrap deleteGroup with useCallback
content = re.sub(
    r'  const deleteGroup = async \(groupName: string\) => {',
    '  // Memoized to prevent unnecessary re-renders of child components\n  const deleteGroup = useCallback(async (groupName: string) => {',
    content
)
# Find its closing
content = re.sub(
    r'(      return false\n    }\n  }\n\n  const handleAction)',
    r'\1eback([setGroups])\n\n  const handleAction',
    content
)
content = content.replace('}\n  }eback([setGroups])', '}\n  }, [setGroups])')

# Wrap handleAction with useCallback
content = re.sub(
    r'  const handleAction = async \(motor: Motor, action: \'up\' \| \'down\' \| \'stop\' \| \'lamellen_open\' \| \'lamellen_close\'\) => {',
    '  // Memoized to prevent unnecessary re-renders of child components\n  const handleAction = useCallback(async (motor: Motor, action: \'up\' | \'down\' | \'stop\' | \'lamellen_open\' | \'lamellen_close\') => {',
    content
)
# Find its closing
content = re.sub(
    r'(      setIsLoading\(false\)\n    }\n  }\n\n  const handleGroupAction)',
    r'\1eback([setIsLoading, setErrorMessage, setMotors])\n\n  const handleGroupAction',
    content
)
content = content.replace('}\n  }eback([setIsLoading, setErrorMessage, setMotors])', '}\n  }, [setIsLoading, setErrorMessage, setMotors])')

# Wrap handleGroupAction with useCallback
content = re.sub(
    r'  const handleGroupAction = async \(groupMotors: Motor\[\], action: \'up\' \| \'down\' \| \'stop\' \| \'lamellen_open\' \| \'lamellen_close\'\) => {',
    '  // Memoized to prevent unnecessary re-renders of child components\n  const handleGroupAction = useCallback(async (groupMotors: Motor[], action: \'up\' | \'down\' | \'stop\' | \'lamellen_open\' | \'lamellen_close\') => {',
    content
)
# Find its closing - look for the end of handleGroupAction
content = re.sub(
    r'(    } catch \(error\) {\n      setErrorMessage\(\'Verbindung zum Server fehlgeschlagen\'\)\n    } finally {\n      setIsLoading\(false\)\n    }\n  }\n\n  return)',
    r'\1eback([setIsLoading, setErrorMessage, setMotors])\n\n  return',
    content
)
content = content.replace('}\n  }eback([setIsLoading, setErrorMessage, setMotors])', '}\n  }, [setIsLoading, setErrorMessage, setMotors])')

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("App.tsx optimized with useCallback and useMemo")
