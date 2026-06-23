import io
import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from ultralytics import YOLO
import cv2


MODEL_PATH = r"best.pt"
app = FastAPI(title="YOLO Segmentation API - Buracos")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO(MODEL_PATH)

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_PATH}

@app.post("/predict/image")
async def predict_image(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
):
    
    img_bytes = await file.read()
    np_arr = np_from_buffer(img_bytes)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        return JSONResponse({"error": "Arquivo de imagem inválido."}, status_code=400)

    
    results = model.predict(source=img, conf=conf, task="segment", verbose=False)

    
    plotted = results[0].plot()  
    ok, encoded = cv2.imencode(".png", plotted)
    if not ok:
        return JSONResponse({"error": "Falha ao gerar imagem de saída."}, status_code=500)

    return StreamingResponse(io.BytesIO(encoded.tobytes()), media_type="image/png")

@app.post("/predict/video")
async def predict_video(
    file: UploadFile = File(...),
    conf: float = Form(0.25),
):
    
    with tempfile.TemporaryDirectory() as tmpdir:
        in_path = os.path.join(tmpdir, file.filename)
        out_dir = os.path.join(tmpdir, "out")

        with open(in_path, "wb") as f:
            f.write(await file.read())

        
        model.predict(
            source=in_path,
            conf=conf,
            task="segment",
            save=True,
            project=out_dir,
            name="pred",
            verbose=False
        )

        pred_folder = os.path.join(out_dir, "pred")
        generated = None
        for root, _, files in os.walk(pred_folder):
            for fn in files:
                if fn.lower().endswith((".mp4", ".avi", ".mov", ".mkv")):
                    generated = os.path.join(root, fn)
                    break
            if generated:
                break

        if not generated:
            return JSONResponse({"error": "Não foi possível localizar o vídeo de saída."}, status_code=500)

        
        return FileResponse(generated, media_type="video/mp4", filename="resultado.mp4")

def np_from_buffer(b: bytes):
    import numpy as np
    return np.frombuffer(b, np.uint8)