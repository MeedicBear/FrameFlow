import io
import sys
import zipfile
from pathlib import Path

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")


# Add backend directory to path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_full_pipeline():
    print("▶ Step 1: Health check...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("  ✓ Health check OK:", res.json())

    print("\n▶ Step 2: Upload sample video...")
    with open("sample_test.mp4", "rb") as f:
        res = client.post("/api/upload", files={"file": ("sample_test.mp4", f, "video/mp4")})
    assert res.status_code == 200, f"Upload failed: {res.text}"
    meta = res.json()
    video_id = meta["video_id"]
    print(f"  ✓ Uploaded video_id={video_id}, duration={meta['duration_seconds']}s, fps={meta['fps']}")

    print("\n▶ Step 3: Test Interval Mode (1 frame / 1s)...")
    payload = {
        "video_id": video_id,
        "mode": "interval",
        "interval_seconds": 1.0,
        "format": "jpg",
        "quality": 90
    }
    res = client.post("/api/extract", json=payload)
    assert res.status_code == 200, f"Extract failed: {res.text}"
    task_id = res.json()["task_id"]
    print(f"  ✓ Started task_id={task_id}")

    # Wait for completion
    import time
    for _ in range(30):
        p_res = client.get(f"/api/tasks/{task_id}/progress")
        status = p_res.json()["status"]
        if status in ["completed", "failed"]:
            break
        time.sleep(0.2)
    assert status == "completed", f"Task did not complete: {p_res.json()}"
    print(f"  ✓ Extraction completed in interval mode!")

    # Check frames
    f_res = client.get(f"/api/tasks/{task_id}/frames")
    assert f_res.status_code == 200
    frames = f_res.json()
    print(f"  ✓ Retrieved {len(frames)} frames. First frame: {frames[0]['filename']} ({frames[0]['timestamp_formatted']})")
    assert len(frames) >= 5, f"Expected at least 5 frames, got {len(frames)}"

    # Check single image serving
    img_res = client.get(f"/api/tasks/{task_id}/frames/{frames[0]['filename']}")
    assert img_res.status_code == 200
    assert len(img_res.content) > 1000
    print(f"  ✓ Image served successfully ({len(img_res.content)} bytes)")

    # Check ZIP export
    zip_res = client.get(f"/api/tasks/{task_id}/download-zip")
    assert zip_res.status_code == 200
    zf = zipfile.ZipFile(io.BytesIO(zip_res.content))
    zip_contents = zf.namelist()
    print(f"  ✓ ZIP downloaded successfully. Contains {len(zip_contents)} files: {zip_contents[:3]}...")
    assert len(zip_contents) == len(frames)

    print("\n▶ Step 4: Test Range Trim Mode (1.0s -> 3.0s, PNG lossless)...")
    payload_range = {
        "video_id": video_id,
        "mode": "range",
        "start_time": 1.0,
        "end_time": 3.0,
        "interval_seconds": 0.5,
        "format": "png"
    }
    res = client.post("/api/extract", json=payload_range)
    task_id_range = res.json()["task_id"]
    for _ in range(30):
        p_res = client.get(f"/api/tasks/{task_id_range}/progress")
        if p_res.json()["status"] in ["completed", "failed"]:
            break
        time.sleep(0.2)
    assert p_res.json()["status"] == "completed"
    f_range = client.get(f"/api/tasks/{task_id_range}/frames").json()
    print(f"  ✓ Range extraction completed. Frames count: {len(f_range)}. Format: {f_range[0]['filename']}")
    assert f_range[0]["filename"].endswith(".png")

    print("\n▶ Step 5: Test WebP format with custom scale (320x180)...")
    payload_scale = {
        "video_id": video_id,
        "mode": "interval",
        "interval_seconds": 2.0,
        "format": "webp",
        "scale_width": 320,
        "scale_height": 180
    }
    res = client.post("/api/extract", json=payload_scale)
    task_id_scale = res.json()["task_id"]
    for _ in range(30):
        p_res = client.get(f"/api/tasks/{task_id_scale}/progress")
        if p_res.json()["status"] in ["completed", "failed"]:
            break
        time.sleep(0.2)
    assert p_res.json()["status"] == "completed"
    f_scale = client.get(f"/api/tasks/{task_id_scale}/frames").json()
    print(f"  ✓ Scaled WebP extraction completed. Frames count: {len(f_scale)}. First: {f_scale[0]['filename']}")
    assert f_scale[0]["filename"].endswith(".webp")

    print("\n▶ Step 6: Test Frontend root route serving...")
    ui_res = client.get("/")
    assert ui_res.status_code == 200
    assert "FrameFlow" in ui_res.text
    print("  ✓ Root route successfully serves React production build (FrameFlow title detected)!")

    print("\n" + "=" * 60)
    print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_pipeline()
