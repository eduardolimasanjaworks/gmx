#!/usr/bin/env python3
import sys
import os
import json
import traceback

# Force UTF-8 stdout/stderr to avoid Windows charmap encoding crashes
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='ignore')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='ignore')

# Ensure we can import CV2 and numpy
try:
    import cv2
    import numpy as np
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "Dependências do Python ausentes. Instale OpenCV e NumPy: pip install opencv-python numpy"
    }, ensure_ascii=False))
    sys.exit(1)

# Ensure we have an OCR engine
EASYOCR_AVAILABLE = False
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    pass

PYTESSERACT_AVAILABLE = False
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    pass


def resize_to_300dpi(img):
    """
    Redimensiona a imagem para simular ~300 DPI se ela for pequena.
    Target para uma página A4 em 300 DPI é aprox. 2480px de largura.
    """
    h, w = img.shape[:2]
    target_w = 2480
    if w < target_w:
        scale = target_w / w
        new_h = int(h * scale)
        # Interpolamento cúbico é ideal para ampliação mantendo nitidez de bordas de texto
        return cv2.resize(img, (target_w, new_h), interpolation=cv2.INTER_CUBIC)
    return img


def generate_variants(img):
    """
    Gera as 3 variantes da imagem:
    1. Original (apenas redimensionada para alta resolução)
    2. Grayscale (tons de cinza simples)
    3. CLAHE (contraste adaptativo local)
    """
    variants = {}
    
    # 1. Original (com redimensionamento)
    img_resized = resize_to_300dpi(img)
    variants["original"] = img_resized
    
    # 2. Grayscale
    if len(img_resized.shape) == 3:
        gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_resized.copy()
    variants["grayscale"] = gray
    
    # 3. CLAHE
    # CLAHE melhora o contraste local sem escurecer a imagem globalmente
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    clahe_img = clahe.apply(gray)
    variants["clahe"] = clahe_img
    
    return variants


def validate_pixel_density(img_gray, threshold=0.45):
    """
    Failsafe de Densidade de Pixels:
    Calcula a proporção de pixels escuros. Se passar de 'threshold' (45%),
    identifica como falha do filtro (borrão/sombra pesada) e descarta.
    """
    # Se a imagem tiver 3 canais, converte temporariamente
    if len(img_gray.shape) == 3:
        gray = cv2.cvtColor(img_gray, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_gray
        
    # Aplica limiarização adaptativa para simular o comportamento de leitura de texto
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    # No THRESH_BINARY, fundo é 255 (branco) e texto é 0 (preto)
    black_pixels = np.sum(thresh == 0)
    total_pixels = thresh.size
    black_ratio = float(black_pixels) / float(total_pixels)
    
    is_valid = black_ratio <= threshold
    return is_valid, black_ratio


def run_local_ocr(img, reader=None):
    """
    Executa OCR na imagem usando EasyOCR ou PyTesseract.
    """
    if EASYOCR_AVAILABLE:
        if reader is None:
            # Inicializa leitor para Português e Inglês
            reader = easyocr.Reader(['pt', 'en'], gpu=False, verbose=False)
        
        # EasyOCR aceita numpy array diretamente
        results = reader.readtext(img, detail=0)
        return " ".join(results), reader
        
    elif PYTESSERACT_AVAILABLE:
        # Tesseract fallback
        text = pytesseract.image_to_string(img, lang="por+eng")
        return text, None
    else:
        raise RuntimeError("Nenhum motor de OCR (easyocr ou pytesseract) está disponível no Python.")


def call_llm_arbiter(ocr_results, api_key=None, provider=None):
    """
    Faz a chamada HTTP direta para o LLM para consolidar os resultados de OCR.
    Usa requisição HTTP pura via urllib para evitar problemas com dependências de SDK.
    """
    import urllib.request
    import json

    # Detecta automaticamente se não especificado
    if not provider:
        if os.environ.get("OPENAI_API_KEY"):
            provider = "openai"
            api_key = os.environ.get("OPENAI_API_KEY")
        elif os.environ.get("GEMINI_API_KEY"):
            provider = "gemini"
            api_key = os.environ.get("GEMINI_API_KEY")
        elif os.environ.get("ANTHROPIC_API_KEY"):
            provider = "anthropic"
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            
    if not api_key:
        # Se nenhuma chave for configurada, retorna os dados brutos consolidados localmente
        return {
            "success": True,
            "warning": "Nenhuma API Key de LLM configurada (OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY). Retornando dados brutos do OCR.",
            "data": {
                "texto_completo_consolidado": "\n---\n".join([f"[{k.upper()}]: {v}" for k, v in ocr_results.items()])
            }
        }

    ocr_results_str = json.dumps(ocr_results, indent=2, ensure_ascii=False)
    
    prompt = f"""Atue como um Árbitro Sênior de OCR e Consolidador de Dados Documentais.
Recebi múltiplas leituras de OCR extraídas da mesma página de documento utilizando diferentes filtros de imagem.
Algumas leituras podem conter lacunas, ruídos, caracteres quebrados ou omissões devido a variações do pré-processamento.
Sua tarefa é comparar todas as leituras, preencher as lacunas com inteligência (onde um filtro falhou mas o outro leu corretamente), corrigir erros óbvios de OCR de forma contextualizada e me retornar a transcrição final perfeita consolidada estruturada em JSON.

As leituras coletadas das variantes da imagem foram:
{ocr_results_str}

Por favor, identifique e extraia as seguintes informações estruturadas de forma limpa em um JSON com os campos:
- nome (nome completo do motorista, se disponível)
- cpf (apenas dígitos numéricos, se disponível)
- registro_cnh (número do registro da CNH, se disponível)
- validade_cnh (data de validade no formato YYYY-MM-DD, se disponível)
- categoria_cnh (categoria da CNH, ex: AC, D, E, se disponível)
- data_nascimento (data de nascimento no formato YYYY-MM-DD, se disponível)
- texto_completo_consolidado (toda a transcrição consolidada de texto legível de ponta a ponta)

Retorne APENAS o JSON puro nos campos especificados acima. Não inclua blocos de código markdown ou texto explicativo extra."""

    try:
        if provider == "openai":
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "Você é um formatador estrito de JSON."},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=45) as response:
                res_json = json.loads(response.read().decode())
                content = res_json["choices"][0]["message"]["content"]
                return json.loads(content)
                
        elif provider == "gemini":
            model = "gemini-2.5-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            headers = {
                "Content-Type": "application/json"
            }
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.1
                }
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=45) as response:
                res_json = json.loads(response.read().decode())
                content = res_json["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(content)
                
        elif provider == "anthropic":
            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01"
            }
            payload = {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 2048,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1
            }
            req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=45) as response:
                res_json = json.loads(response.read().decode())
                content = res_json["content"][0]["text"]
                return json.loads(content)
        else:
            raise ValueError(f"Provedor LLM inválido: {provider}")
            
    except Exception as e:
        # Fallback se a chamada do LLM falhar
        return {
            "success": False,
            "error": f"Erro de comunicação com o LLM: {str(e)}",
            "data": {
                "texto_completo_consolidado": "\n---\n".join([f"[{k.upper()}]: {v}" for k, v in ocr_results.items()])
            }
        }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Uso: python ocr_pipeline.py <caminho_da_imagem>"
        }, ensure_ascii=False))
        sys.exit(1)
        
    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({
            "success": False,
            "error": f"Arquivo não encontrado: {image_path}"
        }, ensure_ascii=False))
        sys.exit(1)
        
    try:
        # 1. Carrega imagem com OpenCV
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Não foi possível decodificar a imagem. Formato inválido ou corrompido.")
            
        # 2. Gera as variantes (Original, Grayscale, CLAHE)
        variants = generate_variants(img)
        
        # 3. Executa validação de densidade (Failsafe)
        ocr_results = {}
        rejected_variants = []
        metadata_stats = {}
        
        # Instancia leitor EasyOCR uma única vez para reaproveitar
        easyocr_reader = None
        
        for name, variant_img in variants.items():
            is_valid, black_ratio = validate_pixel_density(variant_img, threshold=0.45)
            metadata_stats[name] = {
                "pixel_density_black_ratio": round(black_ratio, 4),
                "status": "APPROVED" if is_valid else "REJECTED"
            }
            
            if not is_valid:
                rejected_variants.append(name)
                continue
                
            # 4. Se passou no failsafe, executa o OCR local
            try:
                text, easyocr_reader = run_local_ocr(variant_img, easyocr_reader)
                ocr_results[name] = text.strip()
            except Exception as ocr_err:
                ocr_results[name] = f"Erro no motor de OCR: {str(ocr_err)}"
                
        # 5. Verifica se sobrou alguma variante válida
        if not ocr_results:
            print(json.dumps({
                "success": False,
                "error": "Todas as variantes da imagem falharam no Failsafe de Densidade de Pixels (> 45% escuro).",
                "metadata": metadata_stats
            }, ensure_ascii=False, indent=2))
            sys.exit(0)
            
        # 6. Consolida com o Árbitro LLM
        final_data = call_llm_arbiter(ocr_results)
        
        # 7. Retorna a resposta final formatada em JSON no stdout
        output_response = {
            "success": True,
            "metadata": {
                "total_variants": len(variants),
                "rejected_variants": rejected_variants,
                "variant_stats": metadata_stats
            },
            "ocr_readings_raw": ocr_results,
            "consolidated": final_data
        }
        
        print(json.dumps(output_response, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }, ensure_ascii=False, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
