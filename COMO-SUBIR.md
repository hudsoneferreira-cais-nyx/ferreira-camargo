# Ferreira Camargo — como colocar no ar (esteira Google Drive → dashboard)

Projeto já construído e testado. Visual da versão 7 preservado. Sobe no Vercel sem
precisar editar código. Depois disso, trocar o Excel na pasta do Drive atualiza o
painel sozinho — sem novo deploy.

## 1. Subir no Vercel
- Vercel → **Add New Project** → importar esta pasta (ou arrastar o zip).
- Framework: **Other** (nada a configurar). Ele detecta o `index.html` e as funções em `/api`.

## 2. Configurar as variáveis de ambiente (Settings → Environment Variables)
Credenciais ficam SÓ no backend; nada vai para o navegador.

| Variável | O que é |
|---|---|
| `GOOGLE_SA_JSON` | o JSON da conta de serviço do Google, **em base64** (`base64 -w0 chave.json`) |
| `DRIVE_FOLDER_ID` | ID da pasta do Drive (está na URL da pasta) |
| `DRIVE_FILE_NAME` | nome exato do arquivo, ex.: `Ferreira_Camargo.xlsx` |
| `APP_PASSWORD` | senha de acesso de Hudson e Anne |

## 3. Dar acesso da conta de serviço à pasta
No Google Drive, compartilhe a **pasta** com o e-mail da conta de serviço
(`...@...iam.gserviceaccount.com`), permissão de leitura. A pasta não fica pública.

## 4. Pronto
- Abra a URL do Vercel, entre com a `APP_PASSWORD`.
- O painel lê o arquivo mais recente com aquele nome (mesmo que o Drive gere um ID novo),
  valida com as regras da Fase 0.1, e mostra a data/hora da última sincronização.
- Se a planilha nova vier corrompida/incompatível, mantém os últimos dados válidos e mostra um aviso.

Conta de serviço (passo a passo rápido): Google Cloud Console → APIs → ativar **Google Drive API**
→ IAM → Service Accounts → criar → Keys → **Add key (JSON)**. Use esse JSON na variável acima.
