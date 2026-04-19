"""Update saved cameras in background monitor to the correct URL."""
from app.background_monitor import save_cameras

cameras = [
    {
        "id": "mobile-cam-1",
        "name": "Mobile Camera",
        "url": "https://10.112.229.167:8080/video",
        "active": True
    }
]
save_cameras(cameras)
print("✅ Saved camera URL updated to:", cameras[0]["url"])
