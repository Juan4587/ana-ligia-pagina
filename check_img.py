from PIL import Image
im = Image.open(r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\portal-legislativo-ana-ligia-mora\public\logo-blanco.png')
print(f'{im.width}x{im.height} ratio={im.width/im.height:.2f}')
