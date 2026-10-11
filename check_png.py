import struct

def png_size(path):
    with open(path, 'rb') as f:
        sig = f.read(8)
        if sig != b'\x89PNG\r\n\x1a\n':
            print('NOT PNG')
            return
        length = struct.unpack('>I', f.read(4))[0]
        chunk = f.read(4)
        if chunk != b'IHDR':
            print('NO IHDR')
            return
        w, h = struct.unpack('>II', f.read(8))
        print(f'{path}: {w}x{h}')

png_size(r'C:\Users\esteb\OneDrive\Desktop\Ana Ligia\portal-legislativo-ana-ligia-mora\public\logo-blanco.png')
