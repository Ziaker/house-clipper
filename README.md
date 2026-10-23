<div align="center">

# 🏠 House Clipper

### O estúdio moderno para clipar trechos do YouTube sem baixar o vídeo inteiro e baixar vídeos completos de YouTube, Twitter (X), Twitch, TikTok, Instagram e Reddit.

[![Acessar no Navegador](https://img.shields.io/badge/🌐_Acessar_Online-GitHub_Pages-f59e0b?style=for-the-badge)](https://ziaker.github.io/house-clipper/)
[![Baixar para Windows](https://img.shields.io/badge/💻_Baixar_App_Windows-HouseClipper.exe-2563eb?style=for-the-badge)](https://github.com/Ziaker/house-clipper/raw/main/HouseClipper.exe)
[![Versão](https://img.shields.io/badge/Versão-v1.4.0-emerald?style=for-the-badge)](#)
[![Licença Open Source](https://img.shields.io/badge/Código_Aberto-100%25_Auditável-green?style=for-the-badge)](#)

---

### 🔗 **Link de Acesso Direto (Web Pages):**
## 🌐 **[https://ziaker.github.io/house-clipper/](https://ziaker.github.io/house-clipper/)**

*(Funciona em qualquer navegador, computador, celular ou tablet)*

---

</div>

## 🛡️ Segurança & Privacidade Garantida (100% Seguro)

O **House Clipper** foi desenvolvido seguindo as melhores práticas de transparência, privacidade e segurança. Qualquer pessoa pode usar com total tranquilidade:

- 🟢 **Código 100% Aberto e Auditável**: Todo o código-fonte (executável em C# `launcher.cs`, backend em Python e frontend em JS/HTML) está disponível abertamente neste repositório. Não há código oculto, binários ofuscados ou comportamento disfarçado.
- 🟢 **Zero Telemetria & Sem Coleta de Dados**: O aplicativo **não coleta, não rastreia e não envia** nenhum dado de uso, URLs pesquisadas, vídeos baixados ou informações pessoais para servidores de terceiros.
- 🟢 **Execução Segura em Localhost**: O servidor desktop local roda exclusivamente em `127.0.0.1` (localhost), garantindo que ninguém na sua rede Wi-Fi ou na internet possa acessar o seu aplicativo.
- 🟢 **Livre de Anúncios, Adware e Mineradores**: Interface 100% limpa, sem anúncios intrusivos, sem redirecionamentos suspeitos e sem scripts maliciosos.
- 🟢 **Privacidade dos seus Cookies**: O arquivo `cookies.json` é utilizado apenas localmente na sua máquina para comunicar com os serviços suportados. O repositório possui proteção no `.gitignore` para que nenhum dado ou histórico local de download seja compartilhado.
- 🟢 **Sandbox no Navegador**: Ao utilizar via GitHub Pages, o aplicativo roda sob a proteção e isolamento nativo de segurança (sandbox) do seu próprio navegador web via conexão criptografada HTTPS.

---

## ✨ Recursos de Clipagem, Multi-Plataforma & Edição Avançada (v1.4.0)

1. **🌐 Suporte a Múltiplas Redes Sociais (Downloads Completos & Clipes)**:
   - Suporte expandido nativo para **YouTube**, **Twitter / X**, **Twitch** (VODs e clipes), **TikTok**, **Instagram** (Reels e posts) e **Reddit**.
   - Validação inteligente e detecção automática do provedor com exibição de badges na interface.

2. **✂️ Clipagem Visual com Régua de Minutos & Balão Flutuante (Hover Time Bubble)**:
   - Divisões clicáveis de minuto a minuto (`00:00`, `01:00`, `02:00`...).
   - **Balão flutuante animado** e linha vertical guia em neon dourado que acompanham o mouse na timeline mostrando o minuto e segundo exatos em tempo real.
   - Seletores diretos de minutos e segundos com ajuste fino (`-1s`, `-0.2s`, `+0.2s`, `+1s`).
   - Pré-visualização do corte em loop para você ter certeza antes de baixar.

3. **📱 Modos Avançados de Conversão 9:16 (Shorts / Reels / TikTok)**:
   - Quatro modos de enquadramento inteligente para celular:
     - **Fundo Desfocado (Blur)**: O vídeo original 16:9 é centralizado e as barras superior e inferior são preenchidas com o fundo desfocado estético.
     - **Recorte Centralizado (Crop Center)**: Preenchimento vertical 1080x1920 com foco total no centro.
     - **Foco à Esquerda (Crop Left)**: Ideal para vídeos com foco ou câmera no canto esquerdo.
     - **Foco à Direita (Crop Right)**: Ideal para gameplays ou podcasts com foco no lado direito.

4. **✨ Transição Suave Fade In & Fade Out**:
   - Aplica transições de entrada e saída suaves (vídeo e áudio) para um encerramento profissional sem cortes secos.

5. **✍️ Queima de Texto / Marca d'Água (Overlay Text)**:
   - Adicione seu arroba, título ou créditos gravados diretamente no vídeo via FFmpeg `drawtext` com caixa protetora semitransparente.

6. **⚡ Controle de Velocidade do Clipe Exportado**:
   - Ajuste o ritmo do clipe gerado entre **0.8x** (câmera lenta suave), **1.0x** (normal), **1.15x** (dinâmico para retenção) ou **1.25x** (rápido), com preservação e ajuste automático do tom de áudio (`atempo`).

7. **🌊 Onda Sonora Visual Dinâmica na Timeline (Organic Waveform Bars)**:
   - Barras de frequência e amplitude de áudio geradas dinamicamente na faixa da timeline.
   - O trecho selecionado acende com brilho vívido na cor do tema enquanto o restante fica suavemente atenuado.

8. **📌 Mini-Player Flutuante Sticky (Picture-in-Picture)**:
   - Ao rolar a página para baixo para configurar os downloads ou gerenciar o histórico, o player de vídeo se desprende suavemente e vira um elegante mini-player no canto inferior direito com badge `Mini-Player PiP`.

9. **📐 Máscaras Visuais de Enquadramento no Player (Overlay 9:16 e 1:1)**:
   - Guias semitransparentes com badges informativos sobre o vídeo para você checar se o momento principal ficará perfeito para Reels/Shorts ou posts quadrados.

10. **🎞️ Gerador de GIF Animado Otimizado com 1 Clique**:
    - Exporte trechos curtos de 2 a 10 segundos diretamente como `.GIF` leve e nítido para enviar no Discord, Telegram ou WhatsApp.

11. **🔊 Normalização de Áudio Inteligente (Loudness Equalizer)**:
    - Filtro FFmpeg `loudnorm` opcional com 1 clique que equilibra trechos muito baixos ou estourados para o padrão de transmissão EBU R128.

12. **💬 Embutir Legendas Automáticas no Clipe**:
    - Grava legendas diretamente no vídeo cortado quando disponíveis.

13. **🎨 Filtros de Cores da Interface & Vídeo (Amarelo, Azul, Vermelho, Verde, Roxo, Rosa)**:
    - Seletor de 6 paletas neon completas no topo da tela:
      - 🟡 **Amarelo Queimado / Dourado** *(Clássico House Clipper)*
      - 🔵 **Azul Neon** *(Cyber Cobalt)*
      - 🔴 **Vermelho Carmim** *(Ruby Scarlet)*
      - 🟢 **Verde Esmeralda** *(Matrix Emerald)*
      - 🟣 **Roxo Ametista** *(Royal Cyberpunk)*
      - 🌸 **Rosa Choque** *(Neon Vaporwave)*
    - Todos os componentes, sliders, brilhos neon do logo, waveforms e menus transformam-se instantaneamente na cor escolhida.

14. **🌙 Modo Noturno Amarelo Escuro (*Deep Night Amber*)**:
    - Alterne com 1 clique entre o tema ativo e o **Noturno Escuro** com fundo preto profundo para descanso visual prolongado.

15. **📦 Arrastar e Soltar Direto para Outros Apps (Drag & Drop)**:
    - Arraste os cards de clipes salvos no histórico diretamente para o Discord, Telegram, WhatsApp Web, Premiere ou pastas do Windows.

---

## 🚀 Como Usar

### Opção 1: Direto pelo Navegador (Sem Instalação)
Basta abrir o link:
👉 **[https://ziaker.github.io/house-clipper/](https://ziaker.github.io/house-clipper/)**

### Opção 2: Aplicativo Desktop no Windows
1. Baixe o executável: [**`HouseClipper.exe`**](https://github.com/Ziaker/house-clipper/raw/main/HouseClipper.exe)
2. Coloque na pasta do projeto e dê dois cliques.
3. O aplicativo abre instantaneamente em modo janela nativa moderna com aceleração por hardware e auto-atualização contínua.

*(Ou execute via terminal com `python main.py` ou clicando em `iniciar_house_clipper.bat`)*

## Melhorias de edição e downloads

- **Downloads**: fila com uma tarefa por vez, progresso individual, cancelamento do processo de download e do FFmpeg, e nova tentativa para tarefas canceladas ou com erro.
- **Editor**: ajustes com décimos de segundo, zoom de até 16×, navegação pela timeline, atalhos `I` / `O` e espaço fora dos campos e do iframe do YouTube. A prévia repete o trecho selecionado.
- **Vários trechos**: adicione intervalos à lista e envie o lote à fila. Cada intervalo guarda o formato, a resolução e o título escolhidos quando foi adicionado. Em caso de falha no envio, os trechos ainda não enviados permanecem na lista.
- **Miniaturas**: a timeline usa os storyboards do vídeo quando o YouTube os disponibiliza. Sem storyboard, informa a indisponibilidade; não simula imagens de momentos.
- **Meus Clipes**: busca por título, filtros, miniaturas, aviso de arquivo ausente e abertura da pasta original de cada arquivo.
- **Configurações**: pasta, cookies e qualidade padrão em aba própria. O seletor de resolução mostra as qualidades encontradas no vídeo.
- **Confiabilidade**: sucesso somente após localizar o arquivo final, conferir tamanho e validar duração/tipo de mídia com FFprobe. Histórico e configurações usam escrita atômica; alterações concorrentes do histórico são serializadas.
- **Proteção local**: API restrita à origem local com cabeçalho de requisição obrigatório, títulos renderizados como texto e abertura limitada a arquivos de mídia conhecidos. O endpoint de status dos cookies não devolve seus valores.

A fila pertence à sessão atual: trocar de aba ou recarregar a página não interrompe os downloads, mas fechar o aplicativo encerra as tarefas. A fila não é retomada após reiniciar. O histórico permanece salvo. Cookies persistem localmente em `cookies.json`; não compartilhe esse arquivo. Downloads parciais podem permanecer no destino após cancelamento.

### Executar e verificar

Use o executável ou `python main.py`. O ponto de entrada desktop é `backend.local_api:app`; os módulos `backend/app.py` e `backend/downloader.py` foram preservados para integração com os recursos de exportação desenvolvidos em paralelo. A fila usa `backend/tasks.py`, processos isolados em `backend/worker.py` e extração em `backend/media.py`.

Requisitos: Python, Node.js, FFmpeg e FFprobe no PATH, além de `requirements.txt`.

```powershell
python -m pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
node --check frontend/app.js
node --check frontend/features.js
```

Teste opcional com rede: baixa um trecho de dois segundos de um vídeo público, valida o MP4 e verifica o cancelamento de uma tarefa na fila. Usa pasta e histórico temporários dentro de `tests/`, removidos ao terminar:

```powershell
python tests/smoke_download.py
```

A prévia estática continua disponível sem backend; downloads locais, histórico, configurações e fila exigem o aplicativo desktop. A interface ainda carrega bibliotecas visuais de CDNs e o player do YouTube, portanto depende de conexão com esses serviços.
