import os

galeria = r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\portal-legislativo-ana-ligia-mora\public\galeria\recientes'

count = 0
for f in sorted(os.listdir(galeria)):
    f_path = os.path.join(galeria, f)
    if os.path.isfile(f_path):
        base, ext = os.path.splitext(f)
        if ext.upper() == '.JPG':
            new_ext = '.jpg'
            new_path = os.path.join(galeria, base + new_ext)
            os.rename(f_path, new_path)
            count += 1

print(f'Renamed {count} .JPG files to .jpg')
print('DONE')
