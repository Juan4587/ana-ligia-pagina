import shutil, os

galeria = r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\portal-legislativo-ana-ligia-mora\public\galeria'
recentes = os.path.join(galeria, 'recientes')

# Remove asamblea and corantioquia folders entirely
for item in ['asamblea', 'corantioquia']:
    item_path = os.path.join(galeria, item)
    if os.path.isdir(item_path):
        try:
            shutil.rmtree(item_path)
            print(f'Removed dir: {item}')
        except PermissionError:
            # Try to remove files inside
            for f in os.listdir(item_path):
                f_path = os.path.join(item_path, f)
                try:
                    if os.path.isfile(f_path):
                        os.remove(f_path)
                    elif os.path.isdir(f_path):
                        shutil.rmtree(f_path)
                except:
                    pass
            shutil.rmtree(item_path)
            print(f'Removed dir (force): {item}')

# Clear recientes and copy only recent photos
for f in os.listdir(recentes):
    f_path = os.path.join(recentes, f)
    if os.path.isfile(f_path):
        os.remove(f_path)

fotos_recientes = r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\fotos_imagen_identidadvisual\Fotos recientes'
count = 0
for f in os.listdir(fotos_recientes):
    src = os.path.join(fotos_recientes, f)
    dst = os.path.join(recentes, f)
    if os.path.isfile(src):
        shutil.copy2(src, dst)
        count += 1

print(f'Copied {count} recent photos to galeria/recientes')
print('GALERIA CLEANED - Only recent photos remain')
