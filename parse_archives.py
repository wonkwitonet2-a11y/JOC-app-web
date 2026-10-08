import re

with open('src/data/initialArchivesData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find row entries for akmJwp, absenYl, frekuensiAbsen, akmBb
jwps = [int(x) for x in re.findall(r'akmJwp:\s*(\d+)', content)]
absens = [int(x) for x in re.findall(r'absenYl:\s*(\d+)', content)]
freks = [int(x) for x in re.findall(r'frekuensiAbsen:\s*(\d+)', content)]
bbs = [int(x) for x in re.findall(r'akmBb:\s*(\d+)', content)]

print(f"Found {len(jwps)} JWP entries, sum of first 10: {sum(jwps[:10])}")
print(f"Found {len(absens)} Absen entries, sum of first 10: {sum(absens[:10])}")
print(f"Found {len(freks)} Frek entries, sum of first 10: {sum(freks[:10])}")
print(f"Found {len(bbs)} BB entries, sum of first 10: {sum(bbs[:10])}")

