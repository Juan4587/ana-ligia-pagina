from PIL import Image

path = r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\portal-legislativo-ana-ligia-mora\public\logo-blanco.png'
im = Image.open(path).convert('RGBA')
bbox = im.getchannel('A').getbbox()
print('canvas:', im.size)
print('content bbox:', bbox)
if bbox:
    cw, ch = bbox[2] - bbox[0], bbox[3] - bbox[1]
    print('content size:', cw, 'x', ch)
    print('padding %:', round(100 * (1 - (cw * ch) / (im.size[0] * im.size[1]))))
