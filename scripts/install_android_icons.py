import os
from PIL import Image

def resize_and_save(img, size, path):
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(path)

def main():
    icon_path = 'resources/icon.png'
    if not os.path.exists(icon_path):
        print("Master icon not found!")
        return

    img = Image.open(icon_path).convert('RGB')
    
    mipmaps = [
        {'dir': 'mipmap-mdpi', 'size': 48, 'fgSize': 108},
        {'dir': 'mipmap-hdpi', 'size': 72, 'fgSize': 162},
        {'dir': 'mipmap-xhdpi', 'size': 96, 'fgSize': 216},
        {'dir': 'mipmap-xxhdpi', 'size': 144, 'fgSize': 324},
        {'dir': 'mipmap-xxxhdpi', 'size': 192, 'fgSize': 432}
    ]
    
    for m in mipmaps:
        d = f"android/app/src/main/res/{m['dir']}"
        os.makedirs(d, exist_ok=True)
        
        # Regular/Round icons
        resize_and_save(img, m['size'], f"{d}/ic_launcher.png")
        resize_and_save(img, m['size'], f"{d}/ic_launcher_round.png")
        
        # Adaptive UI foreground
        resize_and_save(img, m['fgSize'], f"{d}/ic_launcher_foreground.png")
        
        # Background
        bg = Image.new("RGB", (m['fgSize'], m['fgSize']), (255, 255, 255))
        bg.save(f"{d}/ic_launcher_background.png")
        
    print("All Android mipmap icons replaced!")
        
if __name__ == '__main__':
    main()
