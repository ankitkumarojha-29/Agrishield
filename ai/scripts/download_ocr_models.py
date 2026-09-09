"""Download and cache EasyOCR pretrained models locally."""
import sys
import zipfile
from pathlib import Path
import requests

def download_file(url: str, dest: Path):
    print(f"Connecting to {url} ...")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get('content-length', 0))
        downloaded = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1048576): # 1MB chunks
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = (downloaded / total) * 100
                        print(f"Downloaded {downloaded // 1048576}MB / {total // 1048576}MB ({pct:.1f}%)", end="\r")
                    else:
                        print(f"Downloaded {downloaded // 1048576}MB", end="\r")
    print(f"\nSaved {dest.name} ({dest.stat().st_size} bytes)")

def main():
    model_dir = Path.home() / ".EasyOCR" / "model"
    model_dir.mkdir(parents=True, exist_ok=True)

    items = [
        ("craft_mlt_25k.zip", "https://github.com/JaidedAI/EasyOCR/releases/download/pre-v1.1.6/craft_mlt_25k.zip", "craft_mlt_25k.pth"),
        ("english_g2.zip", "https://github.com/JaidedAI/EasyOCR/releases/download/v1.3/english_g2.zip", "english_g2.pth")
    ]

    for zip_name, url, pth_name in items:
        pth_path = model_dir / pth_name
        if pth_path.exists() and pth_path.stat().st_size > 1_000_000:
            print(f"✅ {pth_name} already exists and valid ({pth_path.stat().st_size} bytes)")
            continue

        zip_path = model_dir / zip_name
        try:
            download_file(url, zip_path)
            print(f"Extracting {zip_name} to {model_dir} ...")
            with zipfile.ZipFile(zip_path, 'r') as z:
                z.extractall(model_dir)
            zip_path.unlink(missing_ok=True)
            print(f"✅ Extracted {pth_name} successfully!")
        except Exception as e:
            print(f"❌ Failed for {zip_name}: {e}")
            if zip_path.exists():
                zip_path.unlink(missing_ok=True)
            sys.exit(1)

    print("\n--- Summary of .EasyOCR/model ---")
    for f in model_dir.glob("*.pth"):
        print(f"  {f.name}: {f.stat().st_size:,} bytes")
    print("✅ All EasyOCR models ready for offline live inference!")

if __name__ == "__main__":
    main()
