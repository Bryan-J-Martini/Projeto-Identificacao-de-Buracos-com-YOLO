
import argparse
from ultralytics import YOLO

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Imagem, pasta, vídeo ou webcam (0). Ex: datasets/.../test/images")
    parser.add_argument("--model", default="best.pt", help="Caminho do modelo best.pt")
    parser.add_argument("--conf", type=float, default=0.25, help="Threshold de confiança")
    args = parser.parse_args()

    model = YOLO(args.model)
    model.predict(
        source=args.source,
        task="segment",
        conf=args.conf,
        save=True
    )
    print("✅ Resultados salvos")

if __name__ == "__main__":
    main()