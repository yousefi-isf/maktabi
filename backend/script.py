import re

schema_path = "packages/db/prisma/schema.prisma"
with open(schema_path, "r", encoding="utf-8") as f:
    content = f.read()

models = re.findall(r'model\s+\w+\s+\{[^}]+\}', content)
for m in models:
    if "createdAt" not in m and "updatedAt" not in m:
        lines = m.split('\n')
        new_lines = []
        added = False
        
        for i, line in enumerate(lines):
            if not added and (re.match(r'^\s*deletedAt\s+', line) or re.match(r'^\s*@@', line)):
                new_lines.append('  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz')
                new_lines.append('  updatedAt DateTime @updatedAt @default(now()) @map("updated_at") @db.Timestamptz')
                added = True
            new_lines.append(line)
        
        if not added:
            new_lines.pop() # remove '}'
            new_lines.append('  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz')
            new_lines.append('  updatedAt DateTime @updatedAt @default(now()) @map("updated_at") @db.Timestamptz')
            new_lines.append('}')
            added = True
        
        new_m = '\n'.join(new_lines)
        content = content.replace(m, new_m)
    elif "updatedAt" not in m:
        lines = m.split('\n')
        new_lines = []
        for line in lines:
            new_lines.append(line)
            if re.match(r'^\s*createdAt\s+', line):
                new_lines.append('  updatedAt DateTime @updatedAt @default(now()) @map("updated_at") @db.Timestamptz')
        new_m = '\n'.join(new_lines)
        content = content.replace(m, new_m)

with open(schema_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
