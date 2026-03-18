"""Collect training images from the Portal Pili API.

Downloads snapshots from the machine's camera and saves them
organized by machine for later labeling and training.

Usage:
    python collect_snapshots.py \
        --url https://portalpili-producao-production.up.railway.app \
        --machine-id 34dacb1a-943c-4018-bcc8-838c397092c2 \
        --api-key YOUR_KEY \
        --interval 10 \
        --count 100 \
        --output datasets/minha_maquina
"""

import argparse
import os
import time

import httpx


def main():
    parser = argparse.ArgumentParser(
        description="Collect training snapshots from Portal Pili"
    )
    parser.add_argument("--url", required=True, help="Portal Pili base URL")
    parser.add_argument("--machine-id", required=True, help="Machine UUID")
    parser.add_argument("--api-key", required=True, help="Machine API key")
    parser.add_argument("--interval", type=int, default=10, help="Seconds between captures")
    parser.add_argument("--count", type=int, default=100, help="Number of images to collect")
    parser.add_argument("--output", required=True, help="Output directory")
    args = parser.parse_args()

    # Create output dirs
    for state in ["operating", "idle", "off", "unlabeled"]:
        os.makedirs(os.path.join(args.output, state), exist_ok=True)

    print(f"Collecting {args.count} snapshots every {args.interval}s")
    print(f"Saving to: {args.output}/unlabeled/")
    print("After collection, manually move images to operating/idle/off folders\n")

    client = httpx.Client(timeout=15)

    for i in range(args.count):
        try:
            url = f"{args.url}/api/machines/{args.machine_id}/snapshot"
            resp = client.get(url, headers={"X-Pili-Key": args.api_key})

            if resp.status_code == 200:
                timestamp = int(time.time())
                filename = f"snap_{timestamp}_{i:04d}.jpg"
                filepath = os.path.join(args.output, "unlabeled", filename)

                with open(filepath, "wb") as f:
                    f.write(resp.content)

                print(f"[{i + 1}/{args.count}] Saved: {filename} ({len(resp.content)} bytes)")
            else:
                print(f"[{i + 1}/{args.count}] Error: HTTP {resp.status_code}")

        except Exception as e:
            print(f"[{i + 1}/{args.count}] Failed: {e}")

        if i < args.count - 1:
            time.sleep(args.interval)

    print(f"\nDone! {args.count} snapshots saved to {args.output}/unlabeled/")
    print("Next steps:")
    print("  1. Review images and move to operating/, idle/, or off/ folders")
    print("  2. Run: python train_classifier.py --data", args.output)


if __name__ == "__main__":
    main()
