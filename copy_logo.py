import shutil, os

src = r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\fotos_imagen_identidadvisual\TIpos de letra y colores\LOGO BLANCO.png'
dst = r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\portal-legislativo-ana-ligia-mora\public\logo-blanco.png'

shutil.copy2(src, dst)
print('COPIED LOGO BLANCO.png')
