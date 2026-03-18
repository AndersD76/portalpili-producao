"""Train a custom YOLOv11 classifier for machine state detection.

Usage:
    1. Organize images in the following structure:
        datasets/
          machine_name/
            operating/
              img001.jpg
              img002.jpg
            idle/
              img001.jpg
              img002.jpg
            off/
              img001.jpg
              img002.jpg

    2. Run:
        python train_classifier.py --data datasets/machine_name --epochs 50

    3. Deploy the resulting model:
        cp runs/classify/train/weights/best.pt ../weights/machine_name_cls.pt

The trained model can then be loaded alongside YOLOv11-nano for
machine-specific state classification, improving accuracy over the
generic MOG2 + optical flow approach.
"""

import argparse
from pathlib import Path
from ultralytics import YOLO


def main():
    parser = argparse.ArgumentParser(
        description="Train YOLOv11 classifier for machine state"
    )
    parser.add_argument(
        "--data", type=str, required=True,
        help="Path to dataset (with operating/idle/off subdirs)",
    )
    parser.add_argument(
        "--epochs", type=int, default=50,
        help="Number of training epochs (default: 50)",
    )
    parser.add_argument(
        "--imgsz", type=int, default=224,
        help="Image size for training (default: 224)",
    )
    parser.add_argument(
        "--model", type=str, default="yolo11n-cls.pt",
        help="Base model for transfer learning (default: yolo11n-cls.pt)",
    )
    parser.add_argument(
        "--batch", type=int, default=16,
        help="Batch size (default: 16)",
    )
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        print(f"ERROR: Dataset path does not exist: {data_path}")
        return

    # Validate directory structure
    required_dirs = ["operating", "idle", "off"]
    for d in required_dirs:
        dir_path = data_path / d
        if not dir_path.exists():
            print(f"WARNING: Missing directory: {dir_path}")
            print(f"  Create it and add images of the machine in '{d}' state")

    # Count images
    total = 0
    for d in required_dirs:
        dir_path = data_path / d
        if dir_path.exists():
            count = len(list(dir_path.glob("*.jpg")) + list(dir_path.glob("*.png")))
            print(f"  {d}: {count} images")
            total += count

    if total < 30:
        print(f"\nWARNING: Only {total} images total. Recommend at least 50+ per class.")
        print("  You can collect images from the ESP32 snapshots via the Portal API.")

    print(f"\nStarting training: {args.epochs} epochs, {args.imgsz}px, batch={args.batch}")
    print(f"Base model: {args.model}\n")

    # Load base model and train
    model = YOLO(args.model)
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=10,        # Early stopping
        pretrained=True,
        optimizer="AdamW",
        lr0=0.001,
        weight_decay=0.01,
        augment=True,
        verbose=True,
    )

    print("\n=== Training complete ===")
    print(f"Best model saved at: {results.save_dir}/weights/best.pt")
    print(f"\nTo deploy, copy the model:")
    print(f"  cp {results.save_dir}/weights/best.pt ../weights/")


if __name__ == "__main__":
    main()
