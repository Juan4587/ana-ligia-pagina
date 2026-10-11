from PIL import Image

src = r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\portal-legislativo-ana-ligia-mora\public\logo-blanco.png'
im = Image.open(src).convert('RGBA')
bbox = im.getchannel('A').getbbox()
cropped = im.crop(bbox)
cropped.save(src)
print('cropped to:', cropped.size)
