import os
from PIL import Image, ImageOps

def main():
    input_path = "C:/Users/FURKAN/.gemini/antigravity/brain/b17e2186-78ef-487d-b95f-79c5ed6d6753/uploaded_image_1786615823546.png"
    output_path = "resources/icon.png"
    
    os.makedirs("resources", exist_ok=True)
    
    img = Image.open(input_path).convert("RGBA")
    
    # Create white canvas matching img size for background removal testing
    white_bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    
    # Composite img onto white background to remove any transparent artifacts
    img_flat = Image.alpha_composite(white_bg, img)
    
    # Convert to grayscale
    gray = img_flat.convert("L")
    
    # Invert so black logo becomes white, white bg becomes black
    inv = ImageOps.invert(gray)
    
    # Threshold at say 10 to ignore tiny JPEG artifacts
    bw = inv.point(lambda x: 255 if x > 10 else 0, mode="1")
    
    bbox = bw.getbbox()
    
    if bbox:
        cropped = img_flat.crop(bbox)
        print(f"Cropped logo size: {cropped.width}x{cropped.height}")
    else:
        cropped = img_flat
        print("Could not find bounding box, using original image.")
        
    target_max = 665
    ratio = min(target_max / cropped.width, target_max / cropped.height)
    new_width = int(cropped.width * ratio)
    new_height = int(cropped.height * ratio)
    
    resized = cropped.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    final_img = Image.new("RGB", (1024, 1024), (255, 255, 255))
    x = (1024 - new_width) // 2
    y = (1024 - new_height) // 2
    final_img.paste(resized, (x, y))
    
    final_img.save(output_path)
    print(f"Saved perfectly centered master icon to {output_path}")

if __name__ == "__main__":
    main()
