import os, shutil

galeria = r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\portal-legislativo-ana-ligia-mora\public\galeria\recientes'
fotos_recientes = r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\fotos_imagen_identidadvisual\Fotos recientes'

# Get all files in recientes
recientes_files = os.listdir(galeria)

# Remove all old files in recientes
for f in recientes_files:
    f_path = os.path.join(galeria, f)
    if os.path.isfile(f_path):
        os.remove(f_path)

# Copy photos from Fotos recientes with numbered names
count = 0
for f in sorted(os.listdir(fotos_recientes)):
    src = os.path.join(fotos_recientes, f)
    if os.path.isfile(src):
        ext = os.path.splitext(f)[1]
        dst = os.path.join(galeria, f'{count + 1}{ext}')
        shutil.copy2(src, dst)
        count += 1

print(f'Copied {count} photos as numbered files (1.jpg to {count}.jpg)')

# Remove asamblea and corantioquia folders by renaming them to .deleted
for folder in ['asamblea', 'corantioquia']:
    folder_path = os.path.join(os.path.dirname(galeria), folder)
    if os.path.isdir(folder_path):
        try:
            os.rename(folder_path, folder_path + '.deleted')
            print(f'Renamed {folder} to {folder}.deleted')
        except Exception as e:
            print(f'Could not rename {folder}: {e}')

print('DONE')
