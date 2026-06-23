from ultralytics import YOLO

def main():
    # 1. Carrega o peso que você baixou do Colab (coloque o best.pt na mesma pasta do script)
    model = YOLO("best.pt") 
    
    # 2. Executa a validação apontando para o seu yaml local corrigido
    results = model.val(
        data="./datasets/hole_roboflow/data.yaml", # Caminho local do seu PC
        task="seg"                                 # Abreviação correta para segmentação no YOLOv8
    )
    print("Validação concluída com sucesso!")

if __name__ == "__main__":
    main()